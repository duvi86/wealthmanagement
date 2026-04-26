"""FastAPI entrypoint for the TwinOps template backend."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth, capacity, chatbot, config, dependencies, okr, wealth
from .events import startup_event


def _resolve_cors_origins() -> list[str]:
    """Resolve allowed CORS origins from environment.

    Priority:
    1) CORS_ORIGINS (comma-separated)
    2) FRONTEND_URL (single URL)
    3) Localhost defaults for development
    """
    cors_origins = os.getenv("CORS_ORIGINS", "").strip()
    if cors_origins:
        return [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

    frontend_url = os.getenv("FRONTEND_URL", "").strip()
    if frontend_url:
        return [frontend_url]

    return [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]


# Load backend/.env for local development; Azure App Settings still override at runtime.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="TwinOps API", version="0.3.0")

# CORS configuration - allow credentials for HttpOnly cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=_resolve_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)


@app.on_event("startup")
async def startup() -> None:
    """Initialize database on application startup."""
    await startup_event()


@app.get("/health")
def health() -> dict[str, str]:
    """Return health status for smoke checks."""
    return {"status": "ok"}


# Auth routes
app.include_router(auth.router, prefix="/api", tags=["auth"])

# Domain routes
app.include_router(config.router, prefix="/api")
app.include_router(okr.router, prefix="/api")
app.include_router(dependencies.router, prefix="/api")
app.include_router(capacity.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(wealth.router, prefix="/api")
app.include_router(wealth.public_router, prefix="/api")
