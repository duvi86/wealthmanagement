"""Service layer for dependency domain contracts."""

from copy import deepcopy

from ..schemas.dependencies import (
    DependentProgressResponse,
    DependenciesResponse,
    Dependency,
    DependencyCreateRequest,
    DependencyCreateResponse,
    DependencyDeleteResponse,
)

_DEPENDENCIES: list[Dependency] = [
    Dependency(
        id=1,
        source_kr_id=101,
        target_id=102,
        target_type="key_result",
        relationship_type="positive",
        dependency_weight=0.6,
        threshold_value=70.0,
        impact_multiplier=1.0,
        minimum_base=0.0,
        target_title="Improve deployment success rate",
        target_progress=75,
    ),
    Dependency(
        id=2,
        source_kr_id=101,
        target_id=103,
        target_type="key_result",
        relationship_type="positive",
        dependency_weight=0.4,
        threshold_value=60.0,
        impact_multiplier=1.0,
        minimum_base=0.0,
        target_title="Increase test automation coverage",
        target_progress=50,
    ),
]


def list_dependencies_for_kr(source_kr_id: int) -> DependenciesResponse:
    """List dependencies where source key result matches provided ID."""
    deps = [deepcopy(dep) for dep in _DEPENDENCIES if dep.source_kr_id == source_kr_id]
    return DependenciesResponse(dependencies=deps)


def create_dependency(payload: DependencyCreateRequest) -> DependencyCreateResponse:
    """Create dependency in memory and return typed response."""
    next_id = max((dep.id for dep in _DEPENDENCIES), default=0) + 1
    dependency = Dependency(id=next_id, **payload.model_dump())
    _DEPENDENCIES.append(dependency)
    return DependencyCreateResponse(created=True, dependency=deepcopy(dependency))


def delete_dependency(dependency_id: int) -> DependencyDeleteResponse:
    """Delete dependency by ID from in-memory list."""
    global _DEPENDENCIES  # noqa: PLW0603
    _DEPENDENCIES = [dep for dep in _DEPENDENCIES if dep.id != dependency_id]
    return DependencyDeleteResponse(deleted=True, dependency_id=dependency_id)


def get_dependent_progress(source_kr_id: int) -> DependentProgressResponse:
    """Compute weighted dependent progress for source key result."""
    selected = [dep for dep in _DEPENDENCIES if dep.source_kr_id == source_kr_id]
    if not selected:
        return DependentProgressResponse(source_kr_id=source_kr_id, dependent_progress=None)

    total_weight = sum(dep.dependency_weight for dep in selected)
    if total_weight <= 0:
        return DependentProgressResponse(source_kr_id=source_kr_id, dependent_progress=None)

    weighted = sum((dep.target_progress or 0) * dep.dependency_weight for dep in selected)
    progress = round(weighted / total_weight, 2)
    return DependentProgressResponse(source_kr_id=source_kr_id, dependent_progress=progress)
