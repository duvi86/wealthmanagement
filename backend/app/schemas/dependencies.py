"""Pydantic schemas for dependency domain contracts."""

from pydantic import BaseModel, Field


class Dependency(BaseModel):
    """Dependency relationship between key results."""

    id: int
    source_kr_id: int
    target_id: int
    target_type: str
    relationship_type: str
    dependency_weight: float = Field(ge=0.0, le=1.0)
    threshold_value: float | None = None
    impact_multiplier: float = 1.0
    minimum_base: float = 0.0
    target_title: str | None = None
    target_progress: int | None = None


class DependencyCreateRequest(BaseModel):
    """Create dependency payload contract."""

    source_kr_id: int
    target_id: int
    target_type: str
    relationship_type: str
    dependency_weight: float = Field(ge=0.0, le=1.0)
    threshold_value: float | None = None
    impact_multiplier: float = 1.0
    minimum_base: float = 0.0


class DependencyCreateResponse(BaseModel):
    """Create dependency response contract."""

    created: bool
    dependency: Dependency


class DependencyDeleteResponse(BaseModel):
    """Delete dependency response contract."""

    deleted: bool
    dependency_id: int


class DependentProgressResponse(BaseModel):
    """Weighted dependent progress response."""

    source_kr_id: int
    dependent_progress: float | None


class DependenciesResponse(BaseModel):
    """List response for dependencies."""

    dependencies: list[Dependency] = Field(default_factory=list)
