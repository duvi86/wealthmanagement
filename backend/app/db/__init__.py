"""Database connection and session management."""

import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./twinops_template.db",
)

_ENGINE_KWARGS: dict[str, object] = {"echo": False}
if DATABASE_URL.startswith("sqlite"):
    _ENGINE_KWARGS["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **_ENGINE_KWARGS)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Dependency for FastAPI route handlers to inject DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables from declarative models."""
    from .models import Base  # Import within function to avoid circular imports

    Base.metadata.create_all(bind=engine)
    _ensure_wealth_account_expected_return_column()
    _ensure_wealth_portfolio_line_expected_return_column()


def _ensure_wealth_account_expected_return_column() -> None:
    """Backfill schema drift for local SQLite where Alembic is not applied."""
    inspector = inspect(engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("wealth_accounts")}
    except Exception:
        return

    if "expected_return_pct" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE wealth_accounts ADD COLUMN expected_return_pct FLOAT NOT NULL DEFAULT 0.0"))


def _ensure_wealth_portfolio_line_expected_return_column() -> None:
    """Backfill schema drift for portfolio lines when Alembic is not applied."""
    inspector = inspect(engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("wealth_portfolio_lines")}
    except Exception:
        return

    if "expected_return_pct" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE wealth_portfolio_lines ADD COLUMN expected_return_pct FLOAT NOT NULL DEFAULT 0.0"))
