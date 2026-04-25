"""Authentication dependencies (FastAPI Depends)."""

from fastapi import Cookie, HTTPException, status

from ..db import get_db
from ..services.auth_service import auth_service


def get_current_user(access_token: str = Cookie(None)) -> str:
    """Get current authenticated user ID from JWT token in HttpOnly cookie.

    Args:
        access_token: JWT token from HttpOnly cookie

    Returns:
        User ID string

    Raises:
        HTTPException: If token is missing or invalid
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = auth_service.decode_jwt_token(access_token)
        if not user_id:
            raise ValueError("Invalid token payload")
        return user_id
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
