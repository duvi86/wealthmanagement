"""Pydantic schemas for OKR domain contracts."""

from pydantic import BaseModel, Field


class Initiative(BaseModel):
    """Initiative under a key result."""

    id: str
    title: str
    owner_id: int
    main_responsible_id: int
    support_team_ids: list[int] = Field(default_factory=list)
    fte_effort: float
    status: str
    priority: str
    story_points_owner: int
    story_points_supporting: dict[str, int] = Field(default_factory=dict)


class KeyResult(BaseModel):
    """Key result with initiatives."""

    id: int
    title: str
    description: str
    progress: int = Field(ge=0, le=100)
    from_value: float
    to_value: float
    current_value: float
    unit_type: str
    initiatives: list[Initiative] = Field(default_factory=list)


class Objective(BaseModel):
    """Objective with nested key results."""

    id: int
    title: str
    department: str
    progress: int = Field(ge=0, le=100)
    key_results: list[KeyResult] = Field(default_factory=list)
    key_wins: list[str] = Field(default_factory=list)


class OkrStructureResponse(BaseModel):
    """OKR tree response contract."""

    objectives: list[Objective]
