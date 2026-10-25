"""Pydantic shape of one ``plugins:`` entry in ``config.yaml``."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExtensionSpec(BaseModel):
    """One entry of the `plugins:` list in config.yaml."""

    model_config = ConfigDict(extra="forbid")

    use: str = Field(description="Entry point path, e.g. 'my_extension:install'")
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Extension-private configuration, passed to install() verbatim",
    )
    required: bool = Field(
        default=False,
        description="When true, a load failure aborts startup instead of being skipped",
    )
