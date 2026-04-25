"""Service layer for the Wealth domain (CRUD operations)."""

from __future__ import annotations

import csv
import io
import re
import ssl
import uuid
from datetime import date
from urllib.error import URLError, HTTPError
from urllib.request import urlopen
from typing import Any
from typing import Optional

from sqlalchemy.orm import Session

from ..db.models import (
    WealthAccount,
    WealthDecision,
    WealthFireScenario,
    WealthMortgage,
    WealthPortfolioLine,
    WealthSnapshot,
)
from ..schemas.wealth import (
    AccountCreate,
    AccountImportError,
    AccountImportSummary,
    AccountUpdate,
    DecisionCreate,
    DecisionUpdate,
    FireScenarioCreate,
    FireScenarioUpdate,
    SnapshotCreate,
    TaxCalculatorInput,
)
from .investment_tax_service import calculate_tax_bundle, tax_config_payload


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


_DATE_COLUMN_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_FRANKFURTER_DEV_ENDPOINT = "https://api.frankfurter.dev/v1/{date}?from={currency}&to=EUR"
_FRANKFURTER_APP_ENDPOINT = "https://api.frankfurter.app/{date}?from={currency}&to=EUR"
_FALLBACK_FX_RATES = {
    "USD": 0.93,
    "CHF": 1.02,
    "EUR": 1.0,
}
_REQUIRED_COLUMNS = [
    "owner_name",
    "account_name",
    "institution",
    "account_type",
    "currency",
    "expected_return_pct",
    "allocation_bucket",
]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "unknown"


def _normalize(value: str) -> str:
    return value.strip().lower()


def _derive_owner_id(owner_name: str, owner_name_to_id: dict[str, str], used_owner_ids: set[str]) -> str:
    normalized_name = _normalize(owner_name)
    if normalized_name in owner_name_to_id:
        return owner_name_to_id[normalized_name]

    base_id = f"owner-{_slugify(owner_name)}"
    candidate = base_id
    suffix = 2
    while candidate in used_owner_ids:
        candidate = f"{base_id}-{suffix}"
        suffix += 1

    owner_name_to_id[normalized_name] = candidate
    used_owner_ids.add(candidate)
    return candidate


def _fetch_live_fx_to_eur(currency: str, date: str) -> float:
    if currency == "EUR":
        return 1.0

    # Create SSL context that allows self-signed certificates (for dev environment)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    last_error: Exception | None = None
    for endpoint in (_FRANKFURTER_DEV_ENDPOINT, _FRANKFURTER_APP_ENDPOINT):
        try:
            url = endpoint.format(date=date, currency=currency)
            with urlopen(url, context=ssl_context, timeout=5) as response:
                payload = response.read().decode("utf-8")
            match = re.search(r'"EUR"\s*:\s*([0-9]+(?:\.[0-9]+)?)', payload)
            if not match:
                raise ValueError("EUR rate not found in provider response")
            rate = float(match.group(1))
            if rate <= 0:
                raise ValueError("EUR rate must be positive")
            return rate
        except (URLError, HTTPError, TimeoutError, ValueError) as exc:
            last_error = exc
            continue

    # Fallback to default rate if API fails
    if currency in _FALLBACK_FX_RATES:
        return _FALLBACK_FX_RATES[currency]

    raise ValueError(f"Unable to fetch live FX rate for currency '{currency}' on {date}: {last_error}")


def import_accounts_from_csv(db: Session, content: bytes) -> AccountImportSummary:
    errors: list[AccountImportError] = []

    try:
        csv_text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=1,
            errors=[
                AccountImportError(
                    row=1,
                    column="file",
                    message="File must be UTF-8 encoded CSV.",
                )
            ],
        )

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=1,
            errors=[
                AccountImportError(
                    row=1,
                    column="header",
                    message="CSV header row is missing.",
                )
            ],
        )

    headers = [header.strip() for header in reader.fieldnames if header is not None]
    missing_columns = [column for column in _REQUIRED_COLUMNS if column not in headers]
    for column in missing_columns:
        errors.append(
            AccountImportError(
                row=1,
                column=column,
                message="Missing required column.",
            )
        )

    date_columns = [header for header in headers if _DATE_COLUMN_PATTERN.match(header)]
    if not date_columns:
        errors.append(
            AccountImportError(
                row=1,
                column="header",
                message="No date columns found. Use YYYY-MM-DD column names.",
            )
        )

    if errors:
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=len(errors),
            errors=errors,
        )

    existing_accounts = db.query(WealthAccount).all()
    existing_keys = {
        (
            _normalize(account.owner_name),
            _normalize(account.account_name),
            _normalize(account.institution),
            account.type,
            account.currency,
            account.updated_at,
        )
        for account in existing_accounts
    }

    owner_name_to_id: dict[str, str] = {}
    used_owner_ids = {account.owner_id for account in existing_accounts}
    for account in existing_accounts:
        owner_name_to_id[_normalize(account.owner_name)] = account.owner_id

    allowed_types = {"Cash", "Savings", "Investment", "Private Equity", "Property", "Loan", "Cryptocurrency"}
    allowed_currencies = {"EUR", "USD", "CHF"}
    allowed_buckets = {
        "Cash",
        "Savings",
        "Stocks",
        "Bonds",
        "REIT",
        "Real Estate",
        "Commodities",
        "Crypto",
        "Private Equity",
    }

    rows_to_create: list[dict[str, Any]] = []
    skipped_count = 0
    fx_cache: dict[str, float] = {"EUR": 1.0}

    for row_index, row in enumerate(reader, start=2):
        if row is None:
            continue

        if all((value or "").strip() == "" for value in row.values()):
            continue

        def required(column: str) -> str:
            raw = (row.get(column) or "").strip()
            if not raw:
                errors.append(
                    AccountImportError(
                        row=row_index,
                        column=column,
                        message="Value is required.",
                    )
                )
            return raw

        owner_name = required("owner_name")
        account_name = required("account_name")
        institution = required("institution")
        account_type = required("account_type")
        currency = required("currency")
        expected_return_raw = required("expected_return_pct")
        fx_to_eur_raw = (row.get("fx_to_eur") or "").strip()
        allocation_bucket_raw = (row.get("allocation_bucket") or "").strip()

        if account_type and account_type not in allowed_types:
            errors.append(
                AccountImportError(
                    row=row_index,
                    column="account_type",
                    message="Invalid account_type value.",
                )
            )

        if currency and currency not in allowed_currencies:
            errors.append(
                AccountImportError(
                    row=row_index,
                    column="currency",
                    message="Invalid currency value.",
                )
            )

        if allocation_bucket_raw and allocation_bucket_raw not in allowed_buckets:
            errors.append(
                AccountImportError(
                    row=row_index,
                    column="allocation_bucket",
                    message="Invalid allocation_bucket value.",
                )
            )

        try:
            expected_return_pct = float(expected_return_raw)
        except ValueError:
            errors.append(
                AccountImportError(
                    row=row_index,
                    column="expected_return_pct",
                    message="Must be a numeric value.",
                )
            )
            expected_return_pct = 0.0

        owner_id = _derive_owner_id(owner_name, owner_name_to_id, used_owner_ids)

        for date_column in date_columns:
            balance_raw = (row.get(date_column) or "").strip()
            if not balance_raw:
                continue

            try:
                native_balance = float(balance_raw)
            except ValueError:
                errors.append(
                    AccountImportError(
                        row=row_index,
                        column=date_column,
                        message="Date column balance must be numeric.",
                    )
                )
                continue

            # Determine FX rate for this specific date
            fx_to_eur = 1.0
            if fx_to_eur_raw:
                try:
                    fx_to_eur = float(fx_to_eur_raw)
                except ValueError:
                    errors.append(
                        AccountImportError(
                            row=row_index,
                            column="fx_to_eur",
                            message="Must be a numeric value when provided.",
                        )
                    )
                    continue
            elif currency in allowed_currencies:
                cache_key = f"{currency}:{date_column}"
                if cache_key not in fx_cache:
                    try:
                        fx_to_eur = _fetch_live_fx_to_eur(currency, date_column)
                        fx_cache[cache_key] = fx_to_eur
                    except ValueError as exc:
                        errors.append(
                            AccountImportError(
                                row=row_index,
                                column="fx_to_eur",
                                message=str(exc),
                            )
                        )
                        continue
                else:
                    fx_to_eur = fx_cache[cache_key]

            dedupe_key = (
                _normalize(owner_name),
                _normalize(account_name),
                _normalize(institution),
                account_type,
                currency,
                date_column,
            )
            if dedupe_key in existing_keys:
                skipped_count += 1
                continue

            existing_keys.add(dedupe_key)
            rows_to_create.append(
                {
                    "id": _new_id("a-"),
                    "owner_id": owner_id,
                    "owner_name": owner_name,
                    "account_name": account_name,
                    "institution": institution,
                    "type": account_type,
                    "currency": currency,
                    "native_balance": native_balance,
                    "fx_to_eur": fx_to_eur,
                    "expected_return_pct": expected_return_pct,
                    "allocation_bucket": allocation_bucket_raw or None,
                    "updated_at": date_column,
                }
            )

    if errors:
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=len(errors),
            errors=errors,
        )

    try:
        for row in rows_to_create:
            db.add(WealthAccount(**row))
        db.commit()
    except Exception:
        db.rollback()
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=1,
            errors=[
                AccountImportError(
                    row=0,
                    column="database",
                    message="Failed to import accounts due to a database error.",
                )
            ],
        )

    return AccountImportSummary(
        created_count=len(rows_to_create),
        skipped_count=skipped_count,
        error_count=0,
        errors=[],
    )


# ── Accounts ───────────────────────────────────────────────────────────────────

def list_accounts(db: Session) -> list[WealthAccount]:
    return db.query(WealthAccount).all()


def get_account(db: Session, account_id: str) -> Optional[WealthAccount]:
    return db.query(WealthAccount).filter(WealthAccount.id == account_id).first()


def create_account(db: Session, data: AccountCreate) -> WealthAccount:
    account = WealthAccount(
        id=data.id or _new_id("a-"),
        owner_id=data.owner_id,
        owner_name=data.owner_name,
        account_name=data.account_name,
        institution=data.institution,
        type=data.type,
        currency=data.currency,
        native_balance=data.native_balance,
        fx_to_eur=data.fx_to_eur,
        expected_return_pct=data.expected_return_pct,
        allocation_bucket=data.allocation_bucket,
        updated_at=data.updated_at,
    )
    db.add(account)
    db.flush()

    for line in data.portfolio_lines:
        db.add(WealthPortfolioLine(
            id=line.id or _new_id("pl-"),
            account_id=account.id,
            label=line.label,
            allocation_bucket=line.allocation_bucket,
            currency=line.currency,
            native_amount=line.native_amount,
            fx_to_eur=line.fx_to_eur,
            expected_return_pct=line.expected_return_pct,
        ))

    if data.mortgage:
        db.add(WealthMortgage(
            account_id=account.id,
            principal=data.mortgage.principal,
            annual_rate_pct=data.mortgage.annual_rate_pct,
            term_months=data.mortgage.term_months,
            start_date=data.mortgage.start_date,
            mortgage_type=data.mortgage.mortgage_type,
        ))

    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, account_id: str, data: AccountUpdate) -> Optional[WealthAccount]:
    account = get_account(db, account_id)
    if not account:
        return None

    for field, value in data.model_dump(exclude_unset=True, exclude={"portfolio_lines", "mortgage"}).items():
        setattr(account, field, value)

    if data.portfolio_lines is not None:
        for line in account.portfolio_lines:
            db.delete(line)
        db.flush()
        for line in data.portfolio_lines:
            db.add(WealthPortfolioLine(
                id=line.id or _new_id("pl-"),
                account_id=account_id,
                label=line.label,
                allocation_bucket=line.allocation_bucket,
                currency=line.currency,
                native_amount=line.native_amount,
                fx_to_eur=line.fx_to_eur,
                expected_return_pct=line.expected_return_pct,
            ))

    if data.mortgage is not None:
        if account.mortgage:
            db.delete(account.mortgage)
            db.flush()
        db.add(WealthMortgage(
            account_id=account_id,
            principal=data.mortgage.principal,
            annual_rate_pct=data.mortgage.annual_rate_pct,
            term_months=data.mortgage.term_months,
            start_date=data.mortgage.start_date,
            mortgage_type=data.mortgage.mortgage_type,
        ))

    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account_id: str) -> bool:
    account = get_account(db, account_id)
    if not account:
        return False
    db.delete(account)
    db.commit()
    return True


# ── Snapshots ──────────────────────────────────────────────────────────────────

def list_snapshots(db: Session) -> list[WealthSnapshot]:
    return db.query(WealthSnapshot).order_by(WealthSnapshot.date.desc()).all()


def get_snapshot(db: Session, snapshot_id: str) -> Optional[WealthSnapshot]:
    return db.query(WealthSnapshot).filter(WealthSnapshot.id == snapshot_id).first()


def create_snapshot(db: Session, data: SnapshotCreate) -> WealthSnapshot:
    try:
        snapshot_date = date.fromisoformat(data.date)
    except ValueError as exc:
        raise ValueError("Snapshot date must use YYYY-MM-DD format.") from exc

    if snapshot_date > date.today():
        raise ValueError("Snapshot date cannot be in the future.")

    effective_inventory_date = (
        db.query(WealthAccount.updated_at)
        .filter(WealthAccount.updated_at <= data.date)
        .order_by(WealthAccount.updated_at.desc())
        .first()
    )
    if not effective_inventory_date:
        raise ValueError("No account values exist on or before the selected date.")

    accounts = db.query(WealthAccount).filter(WealthAccount.updated_at == effective_inventory_date[0]).all()

    assets_eur = 0.0
    liabilities_eur = 0.0
    for account in accounts:
        value_eur = account.native_balance * account.fx_to_eur
        if account.type == "Loan" or value_eur < 0:
            liabilities_eur += abs(value_eur)
        else:
            assets_eur += value_eur

    snapshot = WealthSnapshot(
        id=data.id or _new_id("s-"),
        date=data.date,
        net_worth_eur=assets_eur - liabilities_eur,
        assets_eur=assets_eur,
        liabilities_eur=liabilities_eur,
        note=data.note,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def delete_snapshot(db: Session, snapshot_id: str) -> bool:
    snapshot = get_snapshot(db, snapshot_id)
    if not snapshot:
        return False
    db.delete(snapshot)
    db.commit()
    return True


# ── FIRE Scenarios ─────────────────────────────────────────────────────────────

def list_fire_scenarios(db: Session) -> list[WealthFireScenario]:
    return db.query(WealthFireScenario).all()


def get_fire_scenario(db: Session, scenario_id: str) -> Optional[WealthFireScenario]:
    return db.query(WealthFireScenario).filter(WealthFireScenario.id == scenario_id).first()


def create_fire_scenario(db: Session, data: FireScenarioCreate) -> WealthFireScenario:
    scenario = WealthFireScenario(**data.model_dump())
    if not scenario.id:
        scenario.id = _new_id("fs-")
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def update_fire_scenario(db: Session, scenario_id: str, data: FireScenarioUpdate) -> Optional[WealthFireScenario]:
    scenario = get_fire_scenario(db, scenario_id)
    if not scenario:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(scenario, field, value)
    db.commit()
    db.refresh(scenario)
    return scenario


def delete_fire_scenario(db: Session, scenario_id: str) -> bool:
    scenario = get_fire_scenario(db, scenario_id)
    if not scenario:
        return False
    db.delete(scenario)
    db.commit()
    return True


# ── Decisions ──────────────────────────────────────────────────────────────────

def list_decisions(db: Session) -> list[WealthDecision]:
    return db.query(WealthDecision).order_by(WealthDecision.date.desc()).all()


def get_decision(db: Session, decision_id: str) -> Optional[WealthDecision]:
    return db.query(WealthDecision).filter(WealthDecision.id == decision_id).first()


def create_decision(db: Session, data: DecisionCreate) -> WealthDecision:
    decision = WealthDecision(**data.model_dump())
    if not decision.id:
        decision.id = _new_id("d-")
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


def update_decision(db: Session, decision_id: str, data: DecisionUpdate) -> Optional[WealthDecision]:
    decision = get_decision(db, decision_id)
    if not decision:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(decision, field, value)
    db.commit()
    db.refresh(decision)
    return decision


def delete_decision(db: Session, decision_id: str) -> bool:
    decision = get_decision(db, decision_id)
    if not decision:
        return False
    db.delete(decision)
    db.commit()
    return True


# ── Investment Tax Calculator ────────────────────────────────────────────────

def get_tax_calculator_config() -> dict:
    return tax_config_payload()


def compute_tax_calculator(data: TaxCalculatorInput) -> dict:
    return calculate_tax_bundle(data)
