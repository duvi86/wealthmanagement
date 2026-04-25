"""Capacity route contracts."""

from fastapi import APIRouter

from ...schemas.capacity import CapacityInput, CapacityResult
from ...services.capacity_service import calculate_capacity

router = APIRouter(prefix="/capacity", tags=["capacity"])


@router.post("/rag", response_model=CapacityResult)
def calculate_capacity_rag(payload: CapacityInput) -> CapacityResult:
    """Calculate capacity RAG for one initiative payload."""
    return calculate_capacity(payload)
