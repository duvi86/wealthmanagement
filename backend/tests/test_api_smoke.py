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


def test_okr_structure_endpoint_contract() -> None:
    """OKR structure endpoint should return at least one objective tree."""
    with TestClient(app) as client:
        response = client.get("/api/okr/structure")

    assert response.status_code == 200
    payload = response.json()
    assert "objectives" in payload
    assert isinstance(payload["objectives"], list)


def test_dependencies_lifecycle_endpoints() -> None:
    """Dependency endpoints should support list, create, progress, and delete."""
    with TestClient(app) as client:
        list_response = client.get("/api/dependencies/kr/101")
        assert list_response.status_code == 200

        create_response = client.post(
            "/api/dependencies",
            json={
                "source_kr_id": 101,
                "target_id": 555,
                "target_type": "key_result",
                "relationship_type": "positive",
                "dependency_weight": 0.3,
            },
        )
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["created"] is True

        created_id = created["dependency"]["id"]

        progress_response = client.get("/api/dependencies/kr/101/progress")
        assert progress_response.status_code == 200
        progress_payload = progress_response.json()
        assert "dependent_progress" in progress_payload

        delete_response = client.delete(f"/api/dependencies/{created_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["deleted"] is True


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


def test_chatbot_endpoint_contract() -> None:
    """Chat endpoint should return a mock response payload with session metadata."""
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"message": "Summarize OKR status"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert isinstance(payload["session_id"], str)
    assert isinstance(payload["reply"], str)
