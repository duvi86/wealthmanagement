"""Authentication dependencies (FastAPI Depends)."""

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..db.models import AuthorizedEmail, User
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


def get_current_authorized_user(
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """Return current user ID only if user email is in authorized allowlist."""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth_service.is_email_authorized(user.email, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not authorized to access this resource",
        )

    return current_user_id


def get_current_user_with_authorization_bootstrap(
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """Allow authenticated users when allowlist is empty; otherwise require authorization."""
    allowlist_count = db.query(AuthorizedEmail).count()
    if allowlist_count == 0:
        return current_user_id
    return get_current_authorized_user(current_user_id=current_user_id, db=db)
