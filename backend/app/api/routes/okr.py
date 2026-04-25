"""OKR route contracts."""

from fastapi import APIRouter

from ...schemas.okr import OkrStructureResponse
from ...services.okr_service import get_okr_structure

router = APIRouter(prefix="/okr", tags=["okr"])


@router.get("/structure", response_model=OkrStructureResponse)
def read_okr_structure() -> OkrStructureResponse:
    """Return nested OKR structure."""
    return get_okr_structure()
