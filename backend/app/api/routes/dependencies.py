"""Dependency route contracts."""

from fastapi import APIRouter

from ...schemas.dependencies import (
    DependentProgressResponse,
    DependenciesResponse,
    DependencyCreateRequest,
    DependencyCreateResponse,
    DependencyDeleteResponse,
)
from ...services.dependency_service import (
    create_dependency,
    delete_dependency,
    get_dependent_progress,
    list_dependencies_for_kr,
)

router = APIRouter(prefix="/dependencies", tags=["dependencies"])


@router.get("/kr/{source_kr_id}", response_model=DependenciesResponse)
def list_dependencies(source_kr_id: int) -> DependenciesResponse:
    """List dependencies for one source KR."""
    return list_dependencies_for_kr(source_kr_id)


@router.post("", response_model=DependencyCreateResponse)
def create(payload: DependencyCreateRequest) -> DependencyCreateResponse:
    """Create dependency."""
    return create_dependency(payload)


@router.delete("/{dependency_id}", response_model=DependencyDeleteResponse)
def remove(dependency_id: int) -> DependencyDeleteResponse:
    """Delete dependency."""
    return delete_dependency(dependency_id)


@router.get("/kr/{source_kr_id}/progress", response_model=DependentProgressResponse)
def dependent_progress(source_kr_id: int) -> DependentProgressResponse:
    """Return weighted dependent progress for one source KR."""
    return get_dependent_progress(source_kr_id)
