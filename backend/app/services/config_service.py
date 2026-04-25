"""Service layer for frontend-facing app configuration."""

import os

from ..schemas.config import AppSettingsResponse, ConfigResponse


def _resolve_data_source(database_url: str) -> str:
    """Map DB URL scheme to a compact source label for UI display."""
    if database_url.startswith("postgresql"):
        return "postgres"
    if database_url.startswith("sqlite"):
        return "sqlite"
    return "unknown"


def get_public_config() -> ConfigResponse:
    """Return minimal app config contract used by the frontend.

    Returns:
        Typed config payload.
    """
    database_url = os.getenv("DATABASE_URL", "sqlite:///./twinops_template.db")
    return ConfigResponse(
        app_settings=AppSettingsResponse(
            app_version="0.1.0",
            data_source=_resolve_data_source(database_url),
            chatbot_mode="mock",
            fte_story_points_rate=8.0,
        )
    )
