"""Default OpenAI-compatible client that captures and replays reasoning fields.

The settings UI's ``openai-compatible`` entry used to be a plain
``langchain_openai:ChatOpenAI``, which neither keeps the reasoning fields some
endpoints emit (``reasoning_content`` / ``reasoning`` / ``reasoning_text``) nor
sends them back. This class captures them on both response paths and echoes the
name the endpoint actually used on later turns, so interleaved thinking and
tool-call conversations keep working.

Capture is display-first: the text always lands in
``additional_kwargs["reasoning_content"]`` (the key DeerFlow's frontend reads)
while the wire name is recorded once per message. Replay sends back exactly that
recorded name and nothing else, so an endpoint that never emits a reasoning field
produces a byte-identical request to ``ChatOpenAI``.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_openai import ChatOpenAI

from deerflow.models.assistant_payload_replay import restore_assistant_payloads, restore_tool_call_signatures
from deerflow.models.vllm_provider import _normalize_vllm_chat_template_kwargs

_WIRE_REASONING_FIELDS: tuple[str, ...] = ("reasoning_content", "reasoning", "reasoning_text")
"""Wire field names captured and echoed back same-name. The display text always
lands in ``additional_kwargs["reasoning_content"]`` — two keys coexist when the
wire name differs (the shape ``VllmChatModel`` already produces). The third name
follows pi's read path (``openai-completions.ts:320``)."""

_DISPLAY_FIELD = "reasoning_content"
_WIRE_FIELD_KEY = "_wire_reasoning_field"
_MISSING = object()


def _lookup(value: Any, field: str) -> Any:
    """Read *field* from a dict, a Pydantic attribute, or ``model_extra``."""
    if isinstance(value, Mapping):
        return value.get(field)

    candidate = getattr(value, field, None)
    if candidate is not None:
        return candidate

    model_extra = getattr(value, "model_extra", None)
    if isinstance(model_extra, Mapping):
        return model_extra.get(field)
    return None


def _first_present(value: Any) -> tuple[str, Any] | object:
    """First wire field present with a non-``None`` value (empty strings count)."""
    for field in _WIRE_REASONING_FIELDS:
        candidate = _lookup(value, field)
        if candidate is not None:
            return field, candidate
    return _MISSING


def _reasoning_details_text(value: Any) -> str | None:
    """Flatten a MiniMax-style ``reasoning_details`` list into display text."""
    if not isinstance(value, list):
        return None

    parts: list[str] = []
    for item in value:
        if not isinstance(item, Mapping):
            continue
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts) if parts else None


def _captured_kwargs(message: AIMessage | AIMessageChunk, source: Any) -> dict[str, Any] | None:
    """Additional kwargs carrying the captured reasoning value, or ``None`` when unchanged."""
    captured = _first_present(source)
    additional_kwargs = dict(message.additional_kwargs)

    if captured is not _MISSING:
        wire_name, value = captured
        if additional_kwargs.get(_DISPLAY_FIELD) != value:
            additional_kwargs[_DISPLAY_FIELD] = value
        if wire_name != _DISPLAY_FIELD and additional_kwargs.get(wire_name) != value:
            additional_kwargs[wire_name] = value
        # Recorded once: LangChain merges strings by concatenation, so a key that
        # repeats on every chunk would end up as "reasoningreasoning".
        if value and _WIRE_FIELD_KEY not in additional_kwargs:
            additional_kwargs[_WIRE_FIELD_KEY] = wire_name
    else:
        details_text = _reasoning_details_text(_lookup(source, "reasoning_details"))
        if details_text and additional_kwargs.get(_DISPLAY_FIELD) != details_text:
            additional_kwargs[_DISPLAY_FIELD] = details_text

    if additional_kwargs == message.additional_kwargs:
        return None
    return additional_kwargs


def _typed_choice_message(response: Any, index: int) -> Any:
    """Extract the SDK-typed choice message at *index*, if available."""
    choices = getattr(response, "choices", None)
    if choices is None:
        return None
    try:
        return choices[index].message
    except (AttributeError, IndexError, TypeError):
        return None


def _recorded_wire_name(additional_kwargs: Mapping[str, Any]) -> str | None:
    """Resolve the recorded wire name, tolerating chunk-merge concatenation.

    ``additional_kwargs`` merges strings by concatenation, so a name recorded on
    every chunk of one streamed message arrives as ``"reasoningreasoning"``. Only
    a single repeated name is accepted — anything else reads as unrecorded, so
    nothing is echoed back rather than something guessed.
    """
    recorded = additional_kwargs.get(_WIRE_FIELD_KEY)
    if not isinstance(recorded, str) or not recorded:
        return None

    for name in _WIRE_REASONING_FIELDS:
        repeats = len(recorded) // len(name)
        if repeats and recorded == name * repeats:
            return name
    return None


def _restore_assistant_fields(payload_msg: dict[str, Any], orig_msg: AIMessage) -> None:
    """Echo the recorded wire name back; derived display keys never go out."""
    wire_name = _recorded_wire_name(orig_msg.additional_kwargs)
    if wire_name is not None:
        value = orig_msg.additional_kwargs.get(wire_name)
        if value is not None:
            payload_msg[wire_name] = value
    restore_tool_call_signatures(payload_msg, orig_msg)


class ReasoningReplayChatOpenAI(ChatOpenAI):
    """ChatOpenAI with capture + same-name replay for non-standard reasoning fields."""

    def _get_request_payload(
        self,
        input_: LanguageModelInput,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> dict:
        original_messages = self._convert_input(input_).to_messages()
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)
        # Same normalization the dedicated vLLM client performs, reused as-is so
        # the legacy `chat_template_kwargs.thinking` spelling keeps working here.
        _normalize_vllm_chat_template_kwargs(payload)
        restore_assistant_payloads(payload.get("messages", []), original_messages, _restore_assistant_fields)
        return payload

    def _convert_chunk_to_generation_chunk(
        self,
        chunk: dict,
        default_chunk_class: type,
        base_generation_info: dict | None,
    ) -> ChatGenerationChunk | None:
        generation_chunk = super()._convert_chunk_to_generation_chunk(
            chunk,
            default_chunk_class,
            base_generation_info,
        )
        if generation_chunk is None:
            return None

        choices = chunk.get("choices", [])
        if choices and isinstance(generation_chunk.message, AIMessageChunk):
            delta = choices[0].get("delta") or {}
            additional_kwargs = _captured_kwargs(generation_chunk.message, delta)
            if additional_kwargs is not None:
                generation_chunk = ChatGenerationChunk(
                    message=generation_chunk.message.model_copy(update={"additional_kwargs": additional_kwargs}),
                    generation_info=generation_chunk.generation_info,
                )

        return generation_chunk

    def _create_chat_result(
        self,
        response: dict | Any,
        generation_info: dict | None = None,
    ) -> ChatResult:
        result = super()._create_chat_result(response, generation_info)
        response_dict = response if isinstance(response, dict) else response.model_dump()
        choices = response_dict.get("choices", [])

        patched_generations: list[ChatGeneration] | None = None
        for index, generation in enumerate(result.generations):
            message = generation.message
            if not isinstance(message, AIMessage):
                continue

            choice = choices[index] if index < len(choices) else {}
            source = choice.get("message", {}) if isinstance(choice, Mapping) else {}
            if _first_present(source) is _MISSING and _lookup(source, "reasoning_details") is None and not isinstance(response, dict):
                typed_message = _typed_choice_message(response, index)
                if typed_message is not None:
                    source = typed_message

            additional_kwargs = _captured_kwargs(message, source)
            if additional_kwargs is None:
                continue

            if patched_generations is None:
                patched_generations = list(result.generations)
            patched_generations[index] = ChatGeneration(
                message=message.model_copy(update={"additional_kwargs": additional_kwargs}),
                generation_info=generation.generation_info,
            )

        return ChatResult(generations=patched_generations or result.generations, llm_output=result.llm_output)
