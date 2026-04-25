"""Chatbot route contracts."""

from fastapi import APIRouter

from ...schemas.chatbot import ChatRequest, ChatResponse
from ...services.chatbot_service import reply

router = APIRouter(prefix="/chat", tags=["chatbot"])


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    """Return chatbot response for one message payload."""
    return reply(payload)
