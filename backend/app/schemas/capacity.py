"""Pydantic schemas for capacity calculation contracts."""

from typing import Literal

from pydantic import BaseModel, Field


class CapacityInput(BaseModel):
    """Input payload for initiative capacity status calculation."""

    milestone_date: str | None = None
    fte_next_milestone: float | None = Field(default=0.0, ge=0.0)
    story_points_owner: int | None = Field(default=0, ge=0)
    story_points_supporting: dict[str, int] = Field(default_factory=dict)


class CapacityResult(BaseModel):
    """Output payload for capacity RAG result."""

    rag_status: Literal["red", "amber", "green"] | None
    at_risk: bool
