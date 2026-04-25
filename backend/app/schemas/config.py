"""Pydantic schemas for application configuration responses."""

from pydantic import BaseModel, Field


class AppSettingsResponse(BaseModel):
    """Public application settings used by the frontend."""

    app_version: str = Field(description="Version string displayed in UI")
    data_source: str = Field(description="Configured data source")
    chatbot_mode: str = Field(description="Configured chatbot mode")
    fte_story_points_rate: float = Field(description="Story points per FTE per sprint")


class ConfigResponse(BaseModel):
    """Top-level config response payload."""

    app_settings: AppSettingsResponse
