"""Authentication schemas for Google SSO and JWT tokens."""

from pydantic import BaseModel


class GoogleTokenRequest(BaseModel):
    """Google ID token from frontend."""

    credential: str  # Google ID token (JWT)


class MicrosoftTokenRequest(BaseModel):
    """Microsoft Entra ID token from frontend."""

    credential: str  # Microsoft ID token (JWT)


class UserResponse(BaseModel):
    """User profile response."""

    id: str
    email: str
    display_name: str | None
    profile_picture_url: str | None
    is_authorized: bool


class TokenResponse(BaseModel):
    """Token response after successful authentication."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthorizedEmailCreate(BaseModel):
    """Request to add an email to the allowlist."""

    email: str
    notes: str | None = None


class AuthorizedEmailResponse(BaseModel):
    """Response with authorized email details."""

    id: str
    email: str
    approved_by_user_id: str | None
    approved_at: str
    notes: str | None
