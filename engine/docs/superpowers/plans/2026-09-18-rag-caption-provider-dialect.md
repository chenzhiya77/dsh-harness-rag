# 图片描述腿的协议分派（先做 Anthropic） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-18-rag-caption-provider-dialect-design.md](../specs/2026-09-18-rag-caption-provider-dialect-design.md)
**Status:** Task 0 完成（五项核实，两项修正已写回 spec：SDK 的 `base_url` 拼接是"原始路径相接"⇒ 定甲；形状断言清单补 `test_parser.py`）· **Task 1 完成**（RED 8 红→GREEN→neuter 四条 8/1/1/2 红→ruff 双净 + 全量 146 红对照 HEAD 145 重合、唯一差集是 flake；提交 `a02fe455`）· **Task 2 完成**（RED 5 红→GREEN→neuter 两条 4/1 红→`pnpm check` exit 0 + prettier 五文件全部 ≤HEAD + 全量前端 238/2563/0；提交 `7bff8c61`）· **Task 3 完成**（两份 AGENTS.md 三处 + 真栈两腿过、桩验过未打真端点；**文档与记录待提交**，2026-09-18）
**Parent:** [2026-09-14-rag-model-provider-adaptation.md](2026-09-14-rag-model-provider-adaptation.md)（那条线把 caption 腿的模型/端点/密钥收进"条目三元组"；本计划补上**第三个问题：这条腿说哪种协议**）

**Architecture:** 这条腿是**手写 HTTP**（不是 LangChain），所以协议得自己实现。三处**纯加法**：**方言从条目的 `use` 推**（复用现成的 `reverse_lookup_provider`，**不新增任何配置字段**）、**一个共用的出网入口**（顺手消掉今天两条腿各抄一份的同一段请求）、**前端拿掉 anthropic 的候选排除**（后端能跑了，界面就不用再挡）。`openai` 方言**逐字节不变**；认不出的 `use`（`config.yaml` 里的自研类）**沿用 `openai`**，不报错。

**依赖顺序**：Task 1（后端）→ Task 2（前端）→ Task 3（文档 + 真栈桩）。

---

## Task 0 — 开工前的五项核实（只读，不改代码）

- [x] 1. 两个调用点的**逐字现状**与既有形状用例清单：`captioner.py::_caption_one`（1 张图）、`video/captioner.py::_caption_one_shot`（≤3 张）——按**请求词汇**（`chat/completions`、`image_url`、`choices`、`max_tokens`）与**界面词汇**两把 grep，列出会被"改成共用"动到的断言（尤其"发几次请求""content 里的顺序"这类）；**两条腿真正的形状断言在 `test_vlm_target.py`：`:115` 文档腿、`:136` 视频腿**（`tests/knowledge/` 下没有、也不该去找 `test_captioner.py`）。
     **核实结果**：现状与 spec §1 表逐字一致（两份请求确实逐字相同）。**清单要加一个文件**：文档腿的形状钉子还有 **`test_parser.py:219`**（`Authorization: Bearer`）、**`:224`**（`image_part["type"] == "image_url"` + `data:image/jpeg;base64,` 前缀）、**`:281`**（`body["max_tokens"] == 1024`）——换成共用入口后，这三条就是文档腿"逐字节不变"的真正看门人。
- [x] 2. 方言来源的三个前提：`reverse_lookup_provider` 的确切签名与**认不出时的返回值**；`ModelConfig.model_dump()` 里 `use` 的**键名**；`config.get_model_config(name)` 对 **`config.yaml` 里的条目**是否也返回条目（决定 D1 兜底与 legacy 分支的边界）。
     **核实结果**：三条全成立——`reverse_lookup_provider(use: str) -> str | None`（`models_config.py:66`，不在 allowlist 就 `None`）；`model_dump()` 的键名就是 `use`（字段名无别名）；`get_model_config` 读 `_models_by_name`，其来源是 `merge_ui_models(config.yaml 的 models, models_config.json)`（`app_config.py:546-547`）⇒ **两种来源的条目都能推方言**。附带一条对 D1 有用的：`use="deerflow.models.patched_deepseek:PatchedChatDeepSeek"` 反查出 `"deepseek"`，不在 `_DIALECT_BY_PROVIDER` ⇒ 落 `openai`，**正确**（该适配器本就是 OpenAI 形状）。
- [x] 3. **Anthropic Messages 契约的权威来源 = 本机已装的 SDK**（`anthropic` 0.97.0 / `langchain_anthropic` 1.4.1，就在 venv 里），**逐条核到能冻结 spec D2 那张表**。**起草后的审查已核掉大部分**（开工时只剩两项复核）：
  - ✅ 路径 `/v1/messages`（`anthropic/resources/messages/messages.py` 4 处，逐字）——**不是** `/messages`；
  - ✅ `anthropic-version` 默认值 `"2023-06-01"`（`anthropic/_client.py:180/420`）；
  - ✅ `max_tokens: Required[int]`（`types/message_create_params.py:35`）；
  - ✅ 图片块 `type` 与 `source` 必填（`types/image_block_param.py`）、base64 源三字段 `data` / `media_type` / `type` 全必填且 `media_type` 只收 **jpeg/png/gif/webp**（`types/base64_image_source_param.py`）；
  - ✅ 响应 `content: List[ContentBlock]`（`types/message.py:30`）⇒ "可能有非文本块、要拼 text 块"成立；
  - ✅ `langchain_anthropic` 把条目的 `base_url` **原样**作为 SDK 的 `base_url`（`chat_models.py:777` 别名 `alias="base_url"`、`:1017/:1032` 透传）⇒ **同一个条目在两条腿上必须拼出同一个 URL**；
  - ⬜ 开工时复核两项：`x-api-key` 在 SDK 里的**确切拼法**（auth 头构造处），以及 `base_url` 规范化的边界（尾斜杠 / 尾 `/v1` 各会拼成什么）。
    ⇒ 与 spec D2 表不符的地方**就地改 spec**（本轮审查已改过一次：路径与规范化那两条）。
    **✅ 开工时两项都已复核，且第二项推翻了 spec 原来的写法（spec 已就地改）**：
    - `X-Api-Key`：`_client.py:165` 逐字就是 `{"X-Api-Key": api_key}`；`Authorization: Bearer` 只在 `auth_token` 那条路（`:172`）。
    - **`base_url` 拼接是"原始路径相接"，不是"绝对路径替换"**：`anthropic/_base_client.py:482` = `base_url.raw_path + path.lstrip("/")`。实测（**用聊天腿自己的对象** `ChatAnthropic(base_url=…)._client._prepare_url("/v1/messages")`）：`…` 与 `…/` ⇒ `…/v1/messages`；**`…/v1` 与 `…/v1/` ⇒ `…/v1/v1/messages`**。⇒ 定为**甲（照 SDK 逐字拼、不剥尾 `/v1`）**，理由是 spec D2 那条硬要求"同一条目两条腿同 URL"。
- [x] 4. 前端爆炸半径：`isCaptionCapable` 的既有断言（**两条**：`config-form.test.ts:428` 断言 anthropic ⇒ `false`；以及 `:413-418` 那条**反向**断言 `expect(values).not.toContain("claude")` —— 连它那句 `// Anthropic is not OpenAI-compatible` 注释与用例名"…could never call…"一起，都在本期的炸点里）+ **按界面词汇**扫全部前端测试（那句中英文案的原文、`visionReferenceOptions`）；i18n 那句的**键名**与三处位置（`zh-CN` / `en-US` / `types`），以及**是否还有别处**提到"Anthropic 不能用于这条腿"（中英各扫一遍）。
     **核实结果**：键名 = **`captionModelHint`**（`zh-CN.ts:1735` / `en-US.ts:1828` / `types.ts:1744`，三处齐）；全前端只有 `config-form.ts:571` 的 docstring 另有那句排除说法，别处没有。**炸点是三处不是两处**：`:404-411` 那条 `toEqual` 列表也会红（`claude` 插到 `vl` 与 `legacy` 之间）。**另有一个行为面**：`isCaptionCapable` 还喂 `functional-models-view.tsx:498` 的 `hasVisionModel`（驱动 `vlmNoVisionModel` 提示），D4 之后"只有 anthropic 视觉模型"不再提示——今天**零用例覆盖**，Task 2 补一条。
- [x] 5. 降级用例仍在：既有用例里"VLM 失败 ⇒ 占位、不中止文档"那几条——**文档腿在 `test_parser.py:236`（`test_vlm_failure_degrades_to_filename_placeholder`）与 `:247`（缺密钥那一档，`:253` 断言 `{"images/p1.jpg": "图片 p1.jpg"}`）；视频腿在 `video/test_captioner.py`（`test_caption_shots_missing_key_degrades_all` 等）与 `video/test_recaption.py`**（⚠️ **`tests/knowledge/test_captioner.py` 不存在**，别照名字去找）——确认换成共用入口后它们仍钉得住，别让"失败即降级"把**形状写错**吞成绿色。

**门禁**：无（只读）。

---

## Task 1 — 后端：方言 + 一个共用入口（D1–D3）

- [x] **RED**（桩一个假 Anthropic 端点，**桩法照 `test_vlm_target.py:115` 的 `_recording_transport` + `httpx.MockTransport`**——它已经在断言 URL 拼法与应答解析）：
  1. **方言判定**（`test_vlm_target.py`）：`use="langchain_anthropic:ChatAnthropic"` ⇒ `anthropic`；`use="langchain_openai:ChatOpenAI"` ⇒ `openai`；**自研/认不出的 `use` ⇒ `openai`**；legacy（命名不到条目）⇒ `openai`；
  2. **形状（文档腿）**：`anthropic` 方言 ⇒ 请求路径 **`/v1/messages`**、头里有 `x-api-key` 与 `anthropic-version` 且**没有 `Authorization`**、`content[0]` 是 `{"type":"image","source":{"type":"base64","media_type":…,"data":…}}`、末块是文本块、`max_tokens` 存在；桩回 Anthropic 形状 ⇒ 取到的 caption 文本正确；
  3. **形状（视频腿）**：同一桩、`frames=3` ⇒ body 里**恰好 3 个图片块 + 1 个文本块**（图在前）、**只发一次请求**；
  4. **`base_url` 拼接照 SDK 逐字（两条腿同 URL）**：四种写法 `https://api.anthropic.com` / `…/` / `…/v1` / `…/v1/` ⇒ 拼出的 URL **逐个字符等于 SDK 算出来的那条**（前两者 `…/v1/messages`，后两者 **`…/v1/v1/messages`**）——**不许自作聪明剥尾 `/v1`**；
  5. **非文本块**：桩回 `content=[{type:"thinking",…},{type:"text",text:"X"}]` ⇒ 取到 `"X"`（不空、不炸）；
  6. **回归（`openai` 方言不变）**：既有 OpenAI 形状用例全绿——`test_vlm_target.py:115`/`:136`（URL + `Authorization`）**与 `test_parser.py:219`/`:224`/`:281`（文档腿的 body 形状：鉴权头、`image_url` 块、`max_tokens`）**，外加 `video/test_captioner.py`；再补"认不出的条目仍发 OpenAI 形状"一条；
  7. **降级不变**：500 / 空文本仍走各自的占位与失败计数，**不中止**（**文档腿 `test_parser.py:236`/`:247`**、视频腿 `video/test_captioner.py`，确认未回归）。
- [x] **GREEN**：
  - `vlm_target.py`：`VlmTarget` 加方言字段（`Literal["openai", "anthropic"]`），判定 = `_DIALECT_BY_PROVIDER.get(reverse_lookup_provider(entry.use), "openai")`；legacy 分支给 `"openai"`；**并把 `:3` 那句 "Both caption legs are raw OpenAI-compatible calls (`POST {base_url}/chat/completions`)" 改准**（本期之后不再成立）；
  - 新增 `knowledge/caption_client.py`：一个出网入口（`request_caption(client, *, target, prompt, images) -> str`），内部按 `target.dialect` 拼请求/解析；`anthropic-version` 用**模块常量 `"2023-06-01"`**；URL 拼接 = **`base.rstrip("/") + "/v1/messages"`（照 SDK 的"原始路径相接"逐字，`_base_client.py:482`，不剥尾 `/v1`）**；
  - `captioner.py::_caption_one` 与 `video/captioner.py::_caption_one_shot` 改调它，**各自只留 prompt 与降级语义**（今天那份抄出来的请求删掉）；
  - `openai` 方言的路径/头/body/解析**逐字节保持**。
- [x] **neuter 四条（都必须有牙）**：① 方言判定改回"恒 openai" ⇒ ~~用例 2/3 红~~ **实测 8 红**（方言 1 + 文档腿形状 1 + 视频腿 1 + 拼接 4 + 非文本块 1）；② `anthropic` 分支照抄 OpenAI 的头（仍发 `Authorization`）⇒ **实测 1 红**（断言头的那条）；③ 解析只取 `content[0]`（忽略非文本块）⇒ **实测 1 红**；④ **改成"剥尾 `/v1` 再拼"（即旧 spec 那套自作聪明的规范化）⇒ 实测 2 红**（`…/v1` 与 `…/v1/` 两档拼成 `/v1/messages` 而非 SDK 的 `/v1/v1/messages`）。四条都**回退后复跑确认回到绿**。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`tests/knowledge/` + `tests/knowledge/video/`）绿；**全量后端后台跑**（`145 failed / 12353 passed / 1 error`，13:10），跑完抽全部 FAILED+ERROR 的 node id 去 HEAD 跑同一批、**双向 diff**（`xargs -d '\n'`，别 pipe 长跑）。
      **结果**：工作树 146 红 vs HEAD（`dbdceefc`，detached worktree）146 红——**145 完全重合**，唯一差集是 `test_delta_channel_state::test_merge_message_writes_randomized_differential`（**主树复跑即绿 = flake**）。⚠️ 两条方法学要点：① id 清单里有参数名自带空格与 shell 元字符的（`test_metacharacters_abort_with_nonzero_exit[; rm -rf /]`）⇒ **必须 `xargs -d '\n'`**，用 `$(cat ids)` 会被拆成独立 argv；② 新 worktree **没有被 gitignore 的本地环境文件**（`config.yaml` / `models_config.json` / …）⇒ 不补进去的话，4 条环境条件红会假报成"我引入的新红"（补进 worktree 后 HEAD 复现同一批）。

## Task 2 — 前端：拿掉 anthropic 的排除 + 改文案（D4）

- [x] **RED**：
  1. 纯函数：`isCaptionCapable({supports_vision: true, provider: "anthropic"})` ⇒ **`true`**（旧断言 `config-form.test.ts:428` 由 `false` 改 `true`）；并补一条"不支持视觉的仍被排除"（证明不是"一律放行"）；
  2. **既有断言要翻面（三处，不是两处）**：`config-form.test.ts:404-411` 的 `toEqual` 列表（`claude` 会插进 `vl` 与 `legacy` 之间）、`:413-418` 的反向断言 `expect(values).not.toContain("claude")`（连同注释 `// Anthropic is not OpenAI-compatible` 与用例名里的"could never call"）**都必须先红**——别只改 `:428` 那条布尔就以为改完了；
  3. `visionReferenceOptions`：anthropic 条目**出现在候选里**（列表内容断言，不只断言布尔）；
  4. **文案**：渲染出的那句不再含"Anthropic 条目无法用于这条腿"（中英各一条）；
  5. **行为面**（`hasVisionModel` / `vlmNoVisionModel`，今天零覆盖）：只有 anthropic 视觉模型时**不再**提示"还没配置支持视觉的模型"。
     **实测 RED = 5 红**：`config-form.test.ts` 3 条（列表 / 翻面 / 谓词）+ dom 2 条（文案、anthropic 不再触发无视觉提示）。⚠️ 首版 dom 那条文案用例里我多写了一句 `getByLabelText(F.captionModel)` 含 "Claude X" —— **前提是错的**（触发器显示的是**已存值** `vlm_model`，不是候选），当场删掉只留行为面。对照组（`[TEXT_MODEL]` ⇒ 提示仍在）**首跑即绿**，说明它是控制组而不是待修的断言。
- [x] **GREEN**：`config-form.ts` 的 `isCaptionCapable` 去掉 `provider !== "anthropic"` 并改 docstring；`zh-CN.ts` / `en-US.ts` 那句改措辞（**键名 `captionModelHint` 不动**；`types.ts` 只在键名/结构变化时才动）。
      **新文案**：zh = "…仅列出支持视觉的条目——Anthropic 条目按其 Messages 协议调用，其余按 OpenAI 形状。"；en = "…Only vision-capable entries are listed — an Anthropic entry is called over its Messages protocol, and every other entry keeps the OpenAI shape."
- [x] **neuter 两条**：① 把 `!== "anthropic"` 加回去 ⇒ **实测 4 红**（config-form 3 + dom 的 `vlmNoVisionModel` 1）；② 文案改回旧句 ⇒ **实测 1 红**（中英一起断言的那条）。两条都回退后复跑确认回到绿。
- [x] **门禁**：`pnpm check`（eslint + tsc，**应为零诊断**）；prettier **逐文件与 HEAD 比数字**（别对本来有格式债的文件跑 `--write`）；**全量前端**。
      **实测**：`pnpm check` **exit 0、零诊断**；prettier 五个文件与 HEAD 比 = `config-form.ts` 58/58、`zh-CN.ts` 24/24、`en-US.ts` 36/36、`config-form.test.ts` **180/194**（修完自己那几行后**低于** HEAD，零新增债）、`functional-models.dom.test.tsx` 129/129；**全量前端 238 文件 / 2563 用例 / 0 失败**。
      ⚠️ 本轮我自己的新行有两批超宽（`isCaptionCapable({…4 字段…})` 与两条 `expect(enUS…).toContain(…)`，prettier `printWidth` 默认 80）⇒ 按规矩**不跑 `--write`**，只把那几行改成 prettier 会产出的写法（抽出 `anthropic` / `textOnly` / `openaiVision` 三个局部常量后每行 ≤80）。**判据仍是「工作树数字 == 同一文件 HEAD 的数字」**，别背绝对值——这个 dom 文件的 HEAD 值已是 129（历史债），我改前一度到 145。

## Task 3 — 文档同步与真栈验收

- [x] `backend/AGENTS.md` **两处**：① `:653` 那句 "the two caption legs are raw OpenAI-compatible calls (not LangChain models), so they need a `(wire model, endpoint, key)`" ⇒ 改成"**两种方言**（OpenAI 形状 / Anthropic Messages），方言从条目的 `use` 推、认不出沿用 OpenAI"；并在 caption target 那一节补一句"协议不再恒为 OpenAI"。② `:800` 那句 "That asymmetry is why the settings view labels the caption rows as OpenAI-compatible only." ⇒ **界面不再这样标了**，改成"条目能跑哪条腿取决于它的 `use` 说的是哪种协议（两种都实现了）"这一类说法。
- [x] `frontend/AGENTS.md`：先核 `:171` 那处（"caption VLM … all plain pickers over the configured `models:` entries"）——**本处没有"排除 anthropic"的措辞，大概率不用动**；要补的话只补一句"这条腿的候选 = 支持视觉的条目，协议由条目决定"。
      **实测**：那处原文没有排除措辞（只有"all plain pickers"），所以按计划补了**一句**候选规则（"The caption row's candidates are every vision-capable entry — the entry's `use:` class decides which protocol…"）。prettier 两份都与 HEAD 同数：`backend/AGENTS.md` **282/282**、`frontend/AGENTS.md` **16/16**（后者**必须在 `frontend/` 里量**，否则插件解析失败给假数字）。
- [x] **真栈腿①（桩）**：起一个**一次性本地桩**假装 Anthropic 端点（跑完即删）⇒ 加/改一个指向它的 anthropic 条目 ⇒ 这一行**能选到它**、保存成功；用桩回显**实际收到的请求形状**（路径/头/body）来证明方言生效。
      **实测**（栈由他起：网关 :8001 + 前端 :3000，都在 200）：`PUT /api/models/config` 加 `claude-stub`（`provider: "anthropic"`、`base_url: http://127.0.0.1:8765`、`supports_vision: true`）⇒ 200；`PUT /api/rag/config`（`{extract_model, vlm_model:"claude-stub"}`）⇒ **200 + `warning: null`**；设置页那一行**候选列表里就有 `Claude (local stub)`**（合成 `pointerdown` 打开 Radix Select 读到 6 个选项，含"（使用配置默认）"），且**不支持视觉的 `deepseek-v4-flash` 被排除**（真栈里的天然对照组）；行上那句提示（`uid=2_59`）逐字就是新文案。
- [x] **真栈腿②（取回文本）**：让桩返回 Anthropic 形状的 caption ⇒ 走一次真实 caption 调用 ⇒ 拿到**非占位**的 caption 文本。**触发路径要点名（caption 只在 ingest 流水线里跑，不是随手一个请求）**：**首选文档腿**——往可写库上传一个**带小图的 `.docx`**，让 worker 走 parse → `caption_images`（`worker.py:443`）⇒ 桩收到请求；**备选视频腿**——对已有视频文档调 `POST /{kb_id}/documents/{doc_id}/video/recaption`（202）。**两条都有前提**（前者 MinerU 可达、后者该库已有一份到 `video_shots` 的视频），动手前先确认前提，别临场找路。
      **实测（走文档腿，且换了文件格式）**：`.pptx` 也在上传白名单里、本机有 `python-pptx`（`.docx` 没有 `python-docx`）⇒ 造了「一页文字 + 一张小图」的 pptx，走**应用自己的上传接口**进「测试2」⇒ 文档 `ready`（1 切片，vector/graph/wiki 三腿全 done）⇒ **桩收到的是真实管线发出的请求**：路径 `/v1/messages`、有 `X-Api-Key`（len 8）**无 `Authorization`**、`anthropic-version: 2023-06-01`、body 键 `[max_tokens, messages, model, temperature]`、`model: claude-x`、块序 `[image, text]`、**真图 12912 字节 base64**、prompt 是文档腿自己的中文串；切片正文 = `## Caption dialect verification` + `![STUB-ANTHROPIC-CAPTION-OK](images/…jpg)` ⇒ **取回的是真 caption 不是占位**（占位会长成「图片 xxx.jpg」），且桩故意把 `thinking` 块放最前、**非文本块确实被跳过**。**视频腿没走**：`recaption` 会覆写他现有文档的 caption（测试1 那两份带 shots 的），是对他数据的破坏。
- [x] **收尾**：配置**逐字节还原**（md5 与动手前相同；**动手前先 `cp` 一份原始字节**——网关写这个文件在 Windows 上是 CRLF）、密钥不落盘、不新建文件（桩脚本已删）、页面重载丢弃表单；「重建索引」入口**只确认在、不实际重建**。
      **实测**：上传的测试文档已 `DELETE`（204，库回到原有两份；按 `doc_id` 扫全部表 **0 残留**）；`rag_config.json` **15fa768a…** 与 `models_config.json` **543846d5…** 都按动手前字节还原、md5 逐字相同（含 CRLF 形态）；桩/夹具/日志与 `/tmp` 快照全删；页面重载后 `vlm_model` 回到 `qwen3.7-flash`、UI 条目仍是原来两条、全仓搜不到 `claude-stub`；设置页快照里「重建索引」按钮**在且为禁用态**（未选库），表单态是"没有需要保存的改动"。**结论：桩验过、未打真端点**（本机没有真 Anthropic key）。密钥处理：桩只记 `X-Api-Key` 的**有无与长度**、不记值；条目里用的是假 key `stub-key`；`/tmp` 下那三个 `rag_config.*.json` 是**更早会话**的遗留，未动。
- [x] **门禁**：两份 `AGENTS.md` 的 prettier 与 HEAD 同数（**量 `frontend/AGENTS.md` 必须在 `frontend/` 里跑**）；`rag_config.json` md5 未变。

---

## 提交切分

| 提交 | 内容                                          |
| ---- | --------------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**                   |
| 1    | Task 1（方言 + 共用入口 + 两个调用点 + 用例） |
| 2    | Task 2（前端去排除 + 文案 + 用例）            |
| 3    | Task 3（文档 + 真栈桩结论）                   |

不改表、不改 `rag_config.json` schema、**不动任何默认值**、**不给 `openai` 方言加任何新行为**；不做第三种方言、不新增用户可见的配置字段。
