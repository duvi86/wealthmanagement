"""Config route contracts."""

from fastapi import APIRouter

from ...schemas.config import ConfigResponse
from ...services.config_service import get_public_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=ConfigResponse)
def get_config() -> ConfigResponse:
    """Return frontend-facing runtime config."""
    return get_public_config()
