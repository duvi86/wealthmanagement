"""Authentication routes for Google SSO, logout, and email allowlist management."""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ...db import get_db
from ...db.models import AuthorizedEmail, User
from ...schemas.auth import (
    AuthorizedEmailCreate,
    AuthorizedEmailResponse,
    GoogleTokenRequest,
    MicrosoftTokenRequest,
    TokenResponse,
    UserResponse,
)
from ...schemas.auth_dependencies import get_current_user
from ...services.auth_service import auth_service
from ...services.sso_activity_service import sso_activity_service

router = APIRouter(tags=["auth"])


@router.post("/auth/google")
def google_signin(
    request: GoogleTokenRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Sign in with Google OAuth token."""
    try:
        user, is_authorized, access_token = sso_activity_service.sign_in_with_google_token(
            request.credential,
            db,
        )
        sso_activity_service.set_session_cookie(response, access_token)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                profile_picture_url=user.profile_picture_url,
                is_authorized=is_authorized,
            ),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/auth/microsoft")
def microsoft_signin(
    request: MicrosoftTokenRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Sign in with Microsoft Entra ID token."""
    try:
        user, is_authorized, access_token = sso_activity_service.sign_in_with_microsoft_token(
            request.credential,
            db,
        )
        sso_activity_service.set_session_cookie(response, access_token)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                profile_picture_url=user.profile_picture_url,
                is_authorized=is_authorized,
            ),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/auth/logout")
def logout(response: Response):
    """Logout endpoint - frontend will clear HttpOnly cookie."""
    sso_activity_service.clear_session_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/auth/me")
def get_current_user_info(current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)) -> UserResponse:
    """Get current authenticated user info."""
    user = db.query(User).filter(User.id == current_user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_authorized = auth_service.is_email_authorized(user.email, db)

    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        profile_picture_url=user.profile_picture_url,
        is_authorized=is_authorized,
    )


@router.get("/auth/authorized-emails", response_model=list[AuthorizedEmailResponse])
def list_authorized_emails(current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)) -> list[AuthorizedEmailResponse]:
    """List all authorized emails."""
    emails = db.query(AuthorizedEmail).order_by(AuthorizedEmail.approved_at.desc()).all()

    return [
        AuthorizedEmailResponse(
            id=email.id,
            email=email.email,
            approved_by_user_id=email.approved_by_user_id,
            approved_at=email.approved_at,
            notes=email.notes,
        )
        for email in emails
    ]


@router.post("/auth/authorized-emails", response_model=AuthorizedEmailResponse)
def add_authorized_email(
    request: AuthorizedEmailCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthorizedEmailResponse:
    """Add an email to the allowlist."""
    # Check if email already exists
    existing = db.query(AuthorizedEmail).filter(AuthorizedEmail.email == request.email).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already authorized")

    now = datetime.utcnow().isoformat()
    new_email = AuthorizedEmail(
        id=str(uuid4()),
        email=request.email,
        approved_by_user_id=current_user_id,
        approved_at=now,
        notes=request.notes,
    )

    db.add(new_email)
    db.commit()
    db.refresh(new_email)

    return AuthorizedEmailResponse(
        id=new_email.id,
        email=new_email.email,
        approved_by_user_id=new_email.approved_by_user_id,
        approved_at=new_email.approved_at,
        notes=new_email.notes,
    )


@router.delete("/auth/authorized-emails/{email}")
def remove_authorized_email(
    email: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Remove an email from the allowlist."""
    authorized_email = db.query(AuthorizedEmail).filter(AuthorizedEmail.email == email).first()

    if not authorized_email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found in allowlist")

    db.delete(authorized_email)
    db.commit()

    return {"message": f"Email {email} removed from allowlist"}
