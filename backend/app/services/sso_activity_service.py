"""Reusable SSO activity orchestration for auth routes.

This module centralizes the provider-linked login activities so routes stay thin
and the same flow can be reused across templates/providers.
"""

import os
from typing import Any

from fastapi import Response
from sqlalchemy.orm import Session

from ..db.models import User
from .auth_service import auth_service


class SSOActivityService:
    """Orchestrates linked SSO activities for sign-in/session lifecycle."""

    @staticmethod
    def extract_google_identity(claims: dict[str, Any]) -> tuple[str, str, str | None, str | None]:
        """Extract and validate identity fields from Google claims."""
        google_id = claims.get("sub")
        email = claims.get("email")
        if not google_id:
            raise ValueError("Google token missing subject claim")
        if not email:
            raise ValueError("Google token missing email claim")

        display_name = claims.get("name")
        profile_picture_url = claims.get("picture")
        return google_id, email, display_name, profile_picture_url

    @staticmethod
    def sign_in_with_google_token(credential: str, db: Session) -> tuple[User, bool, str]:
        """Run full Google SSO sign-in flow and return session payload.

        Returns:
            tuple: (user, is_authorized, access_token)
        """
        claims = auth_service.verify_google_token(credential)
        google_id, email, display_name, profile_picture_url = (
            SSOActivityService.extract_google_identity(claims)
        )

        user = auth_service.get_or_create_user(
            google_id,
            email,
            display_name,
            profile_picture_url,
            db,
        )
        is_authorized = auth_service.is_email_authorized(email, db)
        access_token = auth_service.create_access_token(user.id, user.email)
        return user, is_authorized, access_token

    @staticmethod
    def extract_microsoft_identity(claims: dict[str, Any]) -> tuple[str, str, str | None, str | None]:
        """Extract and validate identity fields from Microsoft claims."""
        tenant_id = claims.get("tid")
        object_id = claims.get("oid")
        email = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
        display_name = claims.get("name")

        if not tenant_id:
            raise ValueError("Microsoft token missing tenant claim (tid)")
        if not object_id:
            raise ValueError("Microsoft token missing object claim (oid)")
        if not email:
            raise ValueError("Microsoft token missing email-like claim")

        google_id_like = f"microsoft:{tenant_id}:{object_id}"
        profile_picture_url = None
        return google_id_like, email, display_name, profile_picture_url

    @staticmethod
    def sign_in_with_microsoft_token(credential: str, db: Session) -> tuple[User, bool, str]:
        """Run full Microsoft SSO sign-in flow and return session payload.

        Returns:
            tuple: (user, is_authorized, access_token)
        """
        claims = auth_service.verify_microsoft_token(credential)
        provider_id, email, display_name, profile_picture_url = (
            SSOActivityService.extract_microsoft_identity(claims)
        )

        user = auth_service.get_or_create_user(
            provider_id,
            email,
            display_name,
            profile_picture_url,
            db,
        )
        is_authorized = auth_service.is_email_authorized(email, db)
        access_token = auth_service.create_access_token(user.id, user.email)
        return user, is_authorized, access_token

    @staticmethod
    def set_session_cookie(response: Response, access_token: str) -> None:
        """Attach auth session cookie to outgoing response."""
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            samesite="lax",
            max_age=60 * 60 * 24,
            path="/",
        )

    @staticmethod
    def clear_session_cookie(response: Response) -> None:
        """Clear auth session cookie from outgoing response."""
        response.delete_cookie(key="access_token", path="/")


sso_activity_service = SSOActivityService()
