"""Pytest configuration for backend test imports."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_db
from app.db.models import Base
from app.db.seed import seed_sample_data
from app.main import app
from app.schemas.auth_dependencies import (
    get_current_authorized_user,
    get_current_user,
    get_current_user_with_authorization_bootstrap,
)

TEST_DATABASE_URL = "sqlite:///./test_twinops.db"


@pytest.fixture(scope="session")
def engine():
    _engine = create_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=_engine)
    yield _engine
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture(scope="session")
def db_session(engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    seed_sample_data(session)
    yield session
    session.close()


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: "test-user"
    app.dependency_overrides[get_current_authorized_user] = lambda: "test-user"
    app.dependency_overrides[get_current_user_with_authorization_bootstrap] = lambda: "test-user"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
