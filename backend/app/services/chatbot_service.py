"""Service layer for chatbot contract (mock mode)."""

from uuid import uuid4

from ..schemas.chatbot import ChatRequest, ChatResponse


def reply(payload: ChatRequest) -> ChatResponse:
    """Return mock chatbot response contract.

    Args:
        payload: Inbound user message.

    Returns:
        Typed chatbot response.
    """
    session_id = payload.session_id or str(uuid4())
    return ChatResponse(
        session_id=session_id,
        mode="mock",
        reply=(
            "Mock assistant response: Phase 2 contract is active. "
            f"You said: {payload.message}"
        ),
    )
