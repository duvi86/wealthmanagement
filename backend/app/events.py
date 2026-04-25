"""Application startup event to initialize database."""

import logging

from .db import init_db
from .db.seed import seed_sample_data
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .db import SessionLocal
import os

logger = logging.getLogger(__name__)


async def startup_event() -> None:
    """Initialize database and seed sample data on startup."""
    try:
        _run_migrations()
        init_db()
        db = SessionLocal()
        try:
            seed_sample_data(db)
        finally:
            db.close()
    except SQLAlchemyError as exc:
        # Allow API startup for local UI/docs usage when DB is not available.
        logger.warning("Database init skipped at startup: %s", exc)


def _run_migrations() -> None:
    """Apply Alembic migrations when a DATABASE_URL env var is present (i.e. prod/container)."""
    if not os.getenv("DATABASE_URL"):
        return  # SQLite dev — create_all handles schema
    try:
        from alembic.config import Config
        from alembic import command

        cfg = Config()
        cfg.set_main_option("script_location", "alembic")
        cfg.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
        command.upgrade(cfg, "head")
        logger.info("Alembic migrations applied.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Alembic migration failed, continuing: %s", exc)
