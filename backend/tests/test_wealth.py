"""Smoke tests for the Wealth domain endpoints."""

import pytest
from uuid import uuid4
from httpx import AsyncClient

from app.services import wealth_service


@pytest.mark.anyio
async def test_list_accounts(client: AsyncClient):
    resp = await client.get("/api/wealth/accounts")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 11  # seeded accounts


@pytest.mark.anyio
async def test_get_account_ok(client: AsyncClient):
    resp = await client.get("/api/wealth/accounts/a-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "a-1"
    assert body["owner_name"] == "Sylvie"


@pytest.mark.anyio
async def test_get_account_not_found(client: AsyncClient):
    resp = await client.get("/api/wealth/accounts/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_create_and_delete_account(client: AsyncClient):
    payload = {
        "id": "a-test",
        "owner_id": "owner-matthieu-duvinage",
        "owner_name": "Matthieu Duvinage",
        "account_name": "Test Account",
        "institution": "Test Bank",
        "type": "Cash",
        "currency": "EUR",
        "native_balance": 1000.0,
        "fx_to_eur": 1.0,
        "allocation_bucket": "Cash",
        "updated_at": "2026-01-01",
        "portfolio_lines": [],
    }
    create_resp = await client.post("/api/wealth/accounts", json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["id"] == "a-test"

    delete_resp = await client.delete("/api/wealth/accounts/a-test")
    assert delete_resp.status_code == 204

    gone_resp = await client.get("/api/wealth/accounts/a-test")
    assert gone_resp.status_code == 404


@pytest.mark.anyio
async def test_list_snapshots(client: AsyncClient):
    resp = await client.get("/api/wealth/snapshots")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 5


@pytest.mark.anyio
async def test_create_snapshot(client: AsyncClient):
    payload = {
        "id": "s-test",
        "date": "2026-04-10",
        "note": "Derived from account values",
    }
    resp = await client.post("/api/wealth/snapshots", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["assets_eur"] == pytest.approx(242577.0)
    assert body["liabilities_eur"] == pytest.approx(0.0)
    assert body["net_worth_eur"] == pytest.approx(242577.0)


@pytest.mark.anyio
async def test_snapshots_refresh_when_accounts_change(client: AsyncClient):
    snapshot_payload = {
        "id": "s-refresh",
        "date": "2026-04-10",
        "note": "Should auto-refresh",
    }
    snapshot_resp = await client.post("/api/wealth/snapshots", json=snapshot_payload)
    assert snapshot_resp.status_code == 201
    original = snapshot_resp.json()

    account_payload = {
        "id": "a-refresh",
        "owner_id": "owner-matthieu-duvinage",
        "owner_name": "Matthieu Duvinage",
        "account_name": "Refresh Account",
        "institution": "Test Bank",
        "type": "Cash",
        "currency": "EUR",
        "native_balance": 500.0,
        "fx_to_eur": 1.0,
        "expected_return_pct": 0.0,
        "allocation_bucket": "Cash",
        "updated_at": "2026-04-10",
        "portfolio_lines": [],
    }
    account_resp = await client.post("/api/wealth/accounts", json=account_payload)
    assert account_resp.status_code == 201

    refreshed_resp = await client.get("/api/wealth/snapshots/s-refresh")
    assert refreshed_resp.status_code == 200
    refreshed = refreshed_resp.json()
    assert refreshed["assets_eur"] == pytest.approx(original["assets_eur"] + 500.0)
    assert refreshed["net_worth_eur"] == pytest.approx(original["net_worth_eur"] + 500.0)


@pytest.mark.anyio
async def test_create_snapshot_rejects_future_date(client: AsyncClient):
    resp = await client.post(
        "/api/wealth/snapshots",
        json={"id": "s-future", "date": "2999-01-01", "note": "Future"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Snapshot date cannot be in the future."


@pytest.mark.anyio
async def test_create_snapshot_requires_accounts_for_date(client: AsyncClient):
    resp = await client.post(
        "/api/wealth/snapshots",
        json={"id": "s-missing", "date": "2020-01-01", "note": "No account values"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No account values exist on or before the selected date."


@pytest.mark.anyio
async def test_list_fire_scenarios(client: AsyncClient):
    resp = await client.get("/api/wealth/fire-scenarios")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.anyio
async def test_update_fire_scenario(client: AsyncClient):
    patch = {"withdrawal_rate_pct": 4.0}
    resp = await client.patch("/api/wealth/fire-scenarios/fs-1", json=patch)
    assert resp.status_code == 200
    assert resp.json()["withdrawal_rate_pct"] == 4.0


@pytest.mark.anyio
async def test_list_decisions(client: AsyncClient):
    resp = await client.get("/api/wealth/decisions")
    assert resp.status_code == 200
    assert len(resp.json()) >= 3


@pytest.mark.anyio
async def test_create_decision(client: AsyncClient):
    payload = {
        "id": "d-test",
        "title": "Test Decision",
        "type": "Strategy",
        "date": "2026-05-01",
        "author": "Tester",
    }
    resp = await client.post("/api/wealth/decisions", json=payload)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Test Decision"


@pytest.mark.anyio
async def test_mortgage_present_on_account(client: AsyncClient):
    resp = await client.get("/api/wealth/accounts/a-6")
    assert resp.status_code == 200
    body = resp.json()
    assert body["mortgage"] is not None
    assert body["mortgage"]["annual_rate_pct"] == pytest.approx(2.15)


@pytest.mark.anyio
async def test_tax_calculator_config(client: AsyncClient):
    resp = await client.get("/api/wealth/tax-calculator/config")
    assert resp.status_code == 200
    body = resp.json()
    assert "country_options" in body
    assert "scenarios" in body
    assert "defaults" in body
    assert len(body["country_options"]) >= 10


@pytest.mark.anyio
async def test_tax_calculator_compute(client: AsyncClient):
    payload = {
        "country": "Belgium",
        "portfolio_value": 1000000,
        "inflation_rate_pct": 2,
        "shares_return_pct": 7,
        "bonds_return_pct": 4,
        "dividend_yield_pct": 4,
        "num_persons": 1,
        "belgium_wealth_tax_pct": 1,
        "shares_allocation_pct": 70,
    }
    resp = await client.post("/api/wealth/tax-calculator/compute", json=payload)
    assert resp.status_code == 200
    body = resp.json()

    assert "single_result" in body
    assert "country_comparison" in body
    assert "scenario_comparison" in body
    assert body["reference_country"] == "Belgium"
    assert len(body["country_comparison"]) >= 10
    assert len(body["scenario_comparison"]) >= 3


@pytest.mark.anyio
async def test_import_accounts_csv_success(client: AsyncClient):
    suffix = uuid4().hex[:8]
    csv_payload = (
        "owner_name,account_name,institution,account_type,currency,fx_to_eur,expected_return_pct,allocation_bucket,2026-01-31,2026-02-28\n"
        f"Matthieu Duvinage,Imported Portfolio {suffix},Interactive Brokers,Investment,USD,0.92,7.0,Stocks,100000,101500\n"
    )
    resp = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("import.csv", csv_payload, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["error_count"] == 0
    assert body["created_count"] == 2
    assert body["skipped_count"] == 0


@pytest.mark.anyio
async def test_import_accounts_csv_missing_date_headers(client: AsyncClient):
    csv_payload = (
        "owner_name,account_name,institution,account_type,currency,expected_return_pct,allocation_bucket\n"
        "Matthieu Duvinage,Imported Portfolio Missing Date,Interactive Brokers,Investment,USD,7.0,Stocks\n"
    )
    resp = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("invalid.csv", csv_payload, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["created_count"] == 0
    assert body["error_count"] >= 1
    assert any("No date columns found" in err["message"] for err in body["errors"])


@pytest.mark.anyio
async def test_import_accounts_csv_rerun_skips_duplicates(client: AsyncClient):
    suffix = uuid4().hex[:8]
    csv_payload = (
        "owner_name,account_name,institution,account_type,currency,expected_return_pct,allocation_bucket,2026-03-31,2026-04-30\n"
        f"Sylvie Duvinage,Duplicate Check {suffix},Boursorama,Savings,EUR,2.0,Savings,9000,9200\n"
    )

    first = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("dupes.csv", csv_payload, "text/csv")},
    )
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["error_count"] == 0
    assert first_body["created_count"] == 2

    second = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("dupes.csv", csv_payload, "text/csv")},
    )
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["error_count"] == 0
    assert second_body["created_count"] == 0
    assert second_body["skipped_count"] == 2


@pytest.mark.anyio
async def test_import_accounts_csv_accepts_optional_fx_to_eur(client: AsyncClient):
    suffix = uuid4().hex[:8]
    csv_payload = (
        "owner_name,account_name,institution,account_type,currency,fx_to_eur,expected_return_pct,allocation_bucket,2026-05-31\n"
        f"Matthieu Duvinage,Optional FX {suffix},Interactive Brokers,Investment,USD,0.93,6.8,Stocks,120000\n"
    )

    resp = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("optional_fx.csv", csv_payload, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["error_count"] == 0
    assert body["created_count"] == 1

    accounts_resp = await client.get("/api/wealth/accounts")
    assert accounts_resp.status_code == 200
    imported = next(
        item
        for item in accounts_resp.json()
        if item["account_name"] == f"Optional FX {suffix}" and item["updated_at"] == "2026-05-31"
    )
    assert imported["fx_to_eur"] == pytest.approx(0.93)


@pytest.mark.anyio
async def test_import_accounts_csv_uses_live_fx_when_missing(client: AsyncClient, monkeypatch):
    suffix = uuid4().hex[:8]

    def fake_live_fx(currency: str, date: str) -> float:
        if currency == "USD":
            return 0.95
        return 1.0

    monkeypatch.setattr(wealth_service, "_fetch_live_fx_to_eur", fake_live_fx)

    csv_payload = (
        "owner_name,account_name,institution,account_type,currency,expected_return_pct,allocation_bucket,2026-06-30\n"
        f"Matthieu Duvinage,Live FX {suffix},Interactive Brokers,Investment,USD,6.8,Stocks,120000\n"
    )

    resp = await client.post(
        "/api/wealth/accounts/import",
        files={"file": ("live_fx.csv", csv_payload, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["error_count"] == 0
    assert body["created_count"] == 1

    accounts_resp = await client.get("/api/wealth/accounts")
    assert accounts_resp.status_code == 200
    imported = next(
        item
        for item in accounts_resp.json()
        if item["account_name"] == f"Live FX {suffix}" and item["updated_at"] == "2026-06-30"
    )
    assert imported["fx_to_eur"] == pytest.approx(0.95)
