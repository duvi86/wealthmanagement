"""Backend API smoke tests for Phase 6 QA gate."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint() -> None:
    """Health endpoint should return ok status."""
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_config_endpoint_contract() -> None:
    """Config endpoint should expose expected app settings keys."""
    with TestClient(app) as client:
        response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.json()
    assert "app_settings" in payload
    settings = payload["app_settings"]
    assert {"app_version", "data_source", "chatbot_mode", "fte_story_points_rate"} <= set(
        settings.keys()
    )


def test_capacity_endpoint_contract() -> None:
    """Capacity endpoint should return rag_status and at_risk fields."""
    with TestClient(app) as client:
        response = client.post(
            "/api/capacity/rag",
            json={
                "milestone_date": "2030-01-15T00:00:00Z",
                "fte_next_milestone": 2.0,
                "story_points_owner": 16,
                "story_points_supporting": {"13": 8, "14": 5},
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert "rag_status" in payload
    assert "at_risk" in payload


