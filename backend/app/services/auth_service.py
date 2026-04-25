"""Authentication service for Google SSO and JWT token management."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import jwt
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from ..db.models import AuthorizedEmail, User
from ..schemas.auth import UserResponse


class AuthService:
    """Service for handling Google SSO authentication and token management."""

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
    JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY", "dev-secret-key")
    JWT_ALGORITHM = "HS256"
    TOKEN_EXPIRY_HOURS = 24

    @staticmethod
    def verify_google_token(token: str) -> dict:
        """Verify Google ID token and extract claims.

        Args:
            token: Google ID token from frontend.

        Returns:
            Token claims if valid.

        Raises:
            ValueError: If token is invalid.
        """
        try:
            claims = id_token.verify_oauth2_token(
                token, requests.Request(), AuthService.GOOGLE_CLIENT_ID
            )
            return claims
        except Exception as exc:
            raise ValueError(f"Invalid Google token: {exc}") from exc

    @staticmethod
    def verify_microsoft_token(token: str) -> dict:
        """Verify Microsoft Entra ID token and extract claims.

        This uses Microsoft common JWKS discovery for signature verification,
        then validates audience against MICROSOFT_CLIENT_ID and issuer against
        tenant-specific issuer derived from the token's tid claim.
        """
        if not AuthService.MICROSOFT_CLIENT_ID:
            raise ValueError("MICROSOFT_CLIENT_ID is not configured")

        try:
            unverified_claims = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["RS256", "RS384", "RS512"],
            )
            tenant_id = unverified_claims.get("tid")
            if not tenant_id:
                raise ValueError("Microsoft token missing tenant claim (tid)")

            issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
            jwks_client = jwt.PyJWKClient(
                "https://login.microsoftonline.com/common/discovery/v2.0/keys"
            )
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=AuthService.MICROSOFT_CLIENT_ID,
                issuer=issuer,
            )
            return claims
        except Exception as exc:
            raise ValueError(f"Invalid Microsoft token: {exc}") from exc

    @staticmethod
    def is_email_authorized(email: str, db: Session) -> bool:
        """Check if email is on the allowlist.

        Args:
            email: Email address to check.
            db: Database session.

        Returns:
            True if authorized, False otherwise.
        """
        authorized = db.query(AuthorizedEmail).filter(
            AuthorizedEmail.email == email
        ).first()
        return authorized is not None

    @staticmethod
    def get_or_create_user(
        google_id: str,
        email: str,
        display_name: str | None,
        profile_picture_url: str | None,
        db: Session,
    ) -> User:
        """Get or create user from Google claims.

        Args:
            google_id: Stable Google subject identifier (sub claim).
            email: User email from Google.
            display_name: User display name.
            profile_picture_url: User profile picture URL.
            db: Database session.

        Returns:
            User instance.
        """
        user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            user = db.query(User).filter(User.email == email).first()

        now = datetime.now(timezone.utc).isoformat()

        if not user:
            user = User(
                id=str(uuid4()),
                google_id=google_id,
                email=email,
                display_name=display_name,
                profile_picture_url=profile_picture_url,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

        # Keep profile details in sync on returning logins.
        user.google_id = google_id
        user.email = email
        user.display_name = display_name
        user.profile_picture_url = profile_picture_url
        user.updated_at = now
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def create_access_token(user_id: str, email: str) -> str:
        """Create JWT access token.

        Args:
            user_id: User ID.
            email: User email.

        Returns:
            JWT token string.
        """
        expiry = datetime.now(timezone.utc) + timedelta(
            hours=AuthService.TOKEN_EXPIRY_HOURS
        )
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expiry,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(
            payload, AuthService.JWT_SECRET, algorithm=AuthService.JWT_ALGORITHM
        )

    @staticmethod
    def verify_access_token(token: str) -> dict:
        """Verify JWT access token.

        Args:
            token: JWT token string.

        Returns:
            Token payload if valid.

        Raises:
            ValueError: If token is invalid or expired.
        """
        try:
            payload = jwt.decode(
                token,
                AuthService.JWT_SECRET,
                algorithms=[AuthService.JWT_ALGORITHM],
            )
            return payload
        except jwt.ExpiredSignatureError as exc:
            raise ValueError("Token expired") from exc
        except jwt.InvalidTokenError as exc:
            raise ValueError("Invalid token") from exc

    @staticmethod
    def decode_jwt_token(token: str) -> Optional[str]:
        """Decode JWT token and return user ID.

        Args:
            token: JWT token string.

        Returns:
            User ID (sub claim) if valid, None otherwise.

        Raises:
            ValueError: If token is invalid or expired.
        """
        try:
            payload = jwt.decode(
                token,
                AuthService.JWT_SECRET,
                algorithms=[AuthService.JWT_ALGORITHM],
            )
            return payload.get("sub")
        except jwt.ExpiredSignatureError as exc:
            raise ValueError("Token expired") from exc
        except jwt.InvalidTokenError as exc:
            raise ValueError("Invalid token") from exc

    @staticmethod
    def user_to_response(user: User) -> UserResponse:
        """Convert User model to response schema.

        Args:
            user: User database model.

        Returns:
            UserResponse schema.
        """
        return UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            profile_picture_url=user.profile_picture_url,
            is_authorized=True,
        )


# Create singleton instance
auth_service = AuthService()
