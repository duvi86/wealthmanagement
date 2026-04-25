"""Pydantic schemas for chatbot contracts."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Inbound chatbot message."""

    message: str = Field(min_length=1)
    session_id: str | None = None


class ChatResponse(BaseModel):
    """Outbound chatbot response payload."""

    session_id: str
    mode: str
    reply: str
