"""Service layer for the Wealth domain (CRUD operations)."""

from __future__ import annotations

import csv
import io
import re
import ssl
import uuid
from datetime import date
from datetime import datetime, timezone
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
    WealthPersonProfile,
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
    FireProjectionInput,
    FireScenarioUpdate,
    PersonProfileCreate,
    PersonProfileUpdate,
    SnapshotCreate,
    TaxCalculatorInput,
)
from .investment_tax_service import calculate_tax_bundle, tax_config_payload


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


_DATE_COLUMN_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATE_COLUMN_MDY_PATTERN = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})$")


def _normalise_date_header(header: str) -> str | None:
    """Convert a header to YYYY-MM-DD. Returns None if not a date."""
    if _DATE_COLUMN_PATTERN.match(header):
        return header
    m = _DATE_COLUMN_MDY_PATTERN.match(header)
    if m:
        month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if len(m.group(3)) == 2:
            year += 2000 if year <= 30 else 1900
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None
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


def _weighted_expected_return_from_lines(portfolio_lines: list[Any]) -> float:
    weighted_return_sum = 0.0
    total_exposure_eur = 0.0

    for line in portfolio_lines:
        exposure_eur = float(getattr(line, "native_amount", 0.0)) * float(getattr(line, "fx_to_eur", 0.0))
        if exposure_eur <= 0:
            continue
        expected_return_pct = float(getattr(line, "expected_return_pct", 0.0))
        weighted_return_sum += exposure_eur * expected_return_pct
        total_exposure_eur += exposure_eur

    if total_exposure_eur <= 0:
        return 0.0

    return weighted_return_sum / total_exposure_eur


def _native_balance_from_lines(portfolio_lines: list[Any], account_fx_to_eur: float) -> float:
    if account_fx_to_eur <= 0:
        return 0.0

    total_exposure_eur = 0.0
    for line in portfolio_lines:
        total_exposure_eur += float(getattr(line, "native_amount", 0.0)) * float(getattr(line, "fx_to_eur", 0.0))

    return total_exposure_eur / account_fx_to_eur


_MORTGAGE_COLUMNS = {
    "mortgage_principal",
    "mortgage_annual_rate_pct",
    "mortgage_term_months",
    "mortgage_start_date",
    "mortgage_type",
}


def _compute_amortized_balance(principal: float, annual_rate_pct: float, term_months: int, start_date: str, at_date: str) -> float:
    """Return the remaining loan balance at `at_date` (YYYY-MM-DD) using a fixed-rate amortization schedule.
    Returns `principal` if `at_date` is before the start month.
    Returns 0.0 if the loan would be fully paid off.
    """
    if principal <= 0 or annual_rate_pct <= 0 or term_months <= 0:
        return 0.0

    # Parse start month
    start_parts = start_date.split("-")
    start_year = int(start_parts[0])
    start_month = int(start_parts[1]) if len(start_parts) > 1 else 1

    # Parse target month from YYYY-MM-DD
    at_parts = at_date.split("-")
    at_year = int(at_parts[0])
    at_month = int(at_parts[1]) if len(at_parts) > 1 else 1

    months_elapsed = (at_year - start_year) * 12 + (at_month - start_month)
    if months_elapsed <= 0:
        return principal

    n = min(months_elapsed, term_months)
    r = annual_rate_pct / 100 / 12
    # Remaining balance formula: B = P * [(1+r)^N - (1+r)^n] / [(1+r)^N - 1]
    total = pow(1 + r, term_months)
    paid = pow(1 + r, n)
    balance = principal * (total - paid) / (total - 1)
    return max(0.0, balance)


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


def _compute_snapshot_totals(db: Session, snapshot_date_str: str, allow_empty: bool = False) -> tuple[float, float, float]:
    effective_inventory_date = (
        db.query(WealthAccount.updated_at)
        .filter(WealthAccount.updated_at <= snapshot_date_str)
        .order_by(WealthAccount.updated_at.desc())
        .first()
    )
    if not effective_inventory_date:
        if allow_empty:
            return 0.0, 0.0, 0.0
        raise ValueError("No account values exist on or before the selected date.")

    accounts = db.query(WealthAccount).filter(WealthAccount.updated_at == effective_inventory_date[0]).all()

    assets_eur = 0.0
    liabilities_eur = 0.0
    for account in accounts:
        if account.type == "Loan" and account.mortgage:
            mtg = account.mortgage
            balance = _compute_amortized_balance(
                mtg.principal,
                mtg.annual_rate_pct,
                mtg.term_months,
                mtg.start_date,
                snapshot_date_str,
            )
            value_eur = -balance * account.fx_to_eur

            liabilities_eur += abs(value_eur)
            continue

        if account.portfolio_lines:
            for line in account.portfolio_lines:
                line_value_eur = float(line.native_amount) * float(line.fx_to_eur)
                if line_value_eur < 0:
                    liabilities_eur += abs(line_value_eur)
                else:
                    assets_eur += line_value_eur
            continue

        value_eur = account.native_balance * account.fx_to_eur

        if account.type == "Loan" or value_eur < 0:
            liabilities_eur += abs(value_eur)
        else:
            assets_eur += value_eur

    return assets_eur - liabilities_eur, assets_eur, liabilities_eur


def _refresh_saved_snapshots(db: Session) -> None:
    snapshots = db.query(WealthSnapshot).all()
    if not snapshots:
        return

    for snapshot in snapshots:
        net_worth_eur, assets_eur, liabilities_eur = _compute_snapshot_totals(db, snapshot.date, allow_empty=True)
        snapshot.net_worth_eur = net_worth_eur
        snapshot.assets_eur = assets_eur
        snapshot.liabilities_eur = liabilities_eur

    db.commit()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_profile_name_if_valid(
    db: Session,
    profile_id: str,
    role_label: str,
) -> str:
    profile = db.query(WealthPersonProfile).filter(WealthPersonProfile.id == profile_id).first()
    has_profiles = db.query(WealthPersonProfile.id).first() is not None

    if profile:
        return profile.name

    # Compatibility mode: before profiles are introduced for a tenant, keep legacy behavior.
    if not has_profiles:
        return ""

    raise ValueError(f"Unknown {role_label} id '{profile_id}'. Please select an existing person profile.")


def _normalize_ownership_split(
    db: Session,
    ownership_split: list[dict[str, Any]] | None,
    fallback_owner_id: str,
    fallback_owner_name: str,
) -> list[dict[str, Any]]:
    """Validate and normalize ownership split entries.

    - Filters out zero/negative shares
    - Resolves owner names from person profiles when available
    - Ensures at least one valid owner exists
    """
    if not ownership_split:
        return [{"owner_id": fallback_owner_id, "owner_name": fallback_owner_name, "share_pct": 100.0}]

    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in ownership_split:
        owner_id = str(entry.get("owner_id", "")).strip()
        share_pct = float(entry.get("share_pct", 0) or 0)
        if not owner_id or share_pct <= 0:
            continue
        if owner_id in seen:
            continue
        owner_name = _get_profile_name_if_valid(db, owner_id, "owner") or str(entry.get("owner_name") or "").strip()
        normalized.append({"owner_id": owner_id, "owner_name": owner_name, "share_pct": round(share_pct, 2)})
        seen.add(owner_id)

    if not normalized:
        return [{"owner_id": fallback_owner_id, "owner_name": fallback_owner_name, "share_pct": 100.0}]

    normalized.sort(key=lambda item: item["share_pct"], reverse=True)
    return normalized


def list_person_profiles(db: Session, owner_user_id: str) -> list[WealthPersonProfile]:
    from sqlalchemy import or_
    return (
        db.query(WealthPersonProfile)
        .filter(
            or_(
                WealthPersonProfile.owner_user_id == owner_user_id,
                WealthPersonProfile.owner_user_id.is_(None),
            )
        )
        .order_by(WealthPersonProfile.created_at.asc())
        .all()
    )


def get_person_profile(db: Session, owner_user_id: str, profile_id: str) -> Optional[WealthPersonProfile]:
    from sqlalchemy import or_
    return (
        db.query(WealthPersonProfile)
        .filter(
            WealthPersonProfile.id == profile_id,
            or_(
                WealthPersonProfile.owner_user_id == owner_user_id,
                WealthPersonProfile.owner_user_id.is_(None),
            ),
        )
        .first()
    )


def _compute_age(birth_date_str: Optional[str]) -> Optional[float]:
    """Return current age in years (1 decimal) from an ISO date string, or None."""
    if not birth_date_str:
        return None
    try:
        from datetime import date
        birth = date.fromisoformat(birth_date_str)
        today = date.today()
        days = (today - birth).days
        return round(days / 365.25, 1)
    except Exception:
        return None


def create_person_profile(db: Session, owner_user_id: str, data: PersonProfileCreate) -> WealthPersonProfile:
    now = _utc_now_iso()
    computed_age = _compute_age(data.birth_date) if data.birth_date else data.current_age
    profile = WealthPersonProfile(
        id=data.id or _new_id("pp-"),
        owner_user_id=owner_user_id,
        email=data.email,
        name=data.name,
        birth_date=data.birth_date,
        current_age=computed_age,
        expected_lifetime=data.expected_lifetime,
        is_active=data.is_active,
        created_at=now,
        updated_at=now,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_person_profile(
    db: Session,
    owner_user_id: str,
    profile_id: str,
    data: PersonProfileUpdate,
) -> Optional[WealthPersonProfile]:
    profile = get_person_profile(db, owner_user_id, profile_id)
    if not profile:
        return None

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    # If birth_date changed, recompute current_age automatically
    if "birth_date" in data.model_dump(exclude_unset=True):
        computed = _compute_age(profile.birth_date)
        if computed is not None:
            profile.current_age = computed
    profile.updated_at = _utc_now_iso()

    db.commit()
    db.refresh(profile)
    return profile


def delete_person_profile(db: Session, owner_user_id: str, profile_id: str) -> bool:
    profile = get_person_profile(db, owner_user_id, profile_id)
    if not profile:
        return False

    is_owner_used = db.query(WealthAccount).filter(WealthAccount.owner_id == profile_id).first() is not None
    is_co_owner_used = db.query(WealthAccount).filter(WealthAccount.co_owner_id == profile_id).first() is not None
    split_used = any(
        any((entry or {}).get("owner_id") == profile_id for entry in (account.ownership_split or []))
        for account in db.query(WealthAccount).all()
    )
    if is_owner_used or is_co_owner_used or split_used:
        raise ValueError("Cannot delete person profile while it is referenced by an account.")

    db.delete(profile)
    db.commit()
    return True


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
            created_profile_count=0,
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
            created_profile_count=0,
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

    # Build mapping from original header -> normalised YYYY-MM-DD
    date_header_map: dict[str, str] = {}
    for header in headers:
        normalised = _normalise_date_header(header)
        if normalised:
            date_header_map[header] = normalised
    date_columns = list(date_header_map.values())

    if not date_columns:
        errors.append(
            AccountImportError(
                row=1,
                column="header",
                message="No date columns found. Use YYYY-MM-DD or M/D/YY column names.",
            )
        )

    if errors:
        return AccountImportSummary(
            created_count=0,
            skipped_count=0,
            error_count=len(errors),
            errors=errors,
            created_profile_count=0,
        )

    existing_accounts = db.query(WealthAccount).all()
    existing_profiles = db.query(WealthPersonProfile).all()
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
    profile_name_to_id = {
        _normalize(profile.name): profile.id
        for profile in existing_profiles
    }
    used_owner_ids = {
        *(account.owner_id for account in existing_accounts),
        *(account.co_owner_id for account in existing_accounts if account.co_owner_id),
        *(profile.id for profile in existing_profiles),
    }

    for normalized_name, profile_id in profile_name_to_id.items():
        owner_name_to_id[normalized_name] = profile_id

    for account in existing_accounts:
        owner_name_to_id.setdefault(_normalize(account.owner_name), account.owner_id)
        if account.co_owner_name and account.co_owner_id:
            owner_name_to_id.setdefault(_normalize(account.co_owner_name), account.co_owner_id)

    profiles_to_create: dict[str, str] = {}

    allowed_types = {"Cash", "Savings", "Investment", "Private Equity", "Property", "Loan", "Cryptocurrency"}
    allowed_currencies = {"EUR", "USD", "CHF"}
    allowed_buckets = {
        "Cash",
        "Savings",
        "Stocks",
        "Bonds",
        "REIT",
        "Loan",
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
        co_owner_name_raw = (row.get("co_owner_name") or "").strip() or None

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
        co_owner_id = _derive_owner_id(co_owner_name_raw, owner_name_to_id, used_owner_ids) if co_owner_name_raw else None

        normalized_owner_name = _normalize(owner_name)
        if normalized_owner_name not in profile_name_to_id:
            profiles_to_create[owner_id] = owner_name
            profile_name_to_id[normalized_owner_name] = owner_id

        if co_owner_name_raw:
            normalized_co_owner_name = _normalize(co_owner_name_raw)
            if normalized_co_owner_name not in profile_name_to_id and co_owner_id:
                profiles_to_create[co_owner_id] = co_owner_name_raw
                profile_name_to_id[normalized_co_owner_name] = co_owner_id

        # ── Mortgage auto-amortization ──────────────────────────────────────
        mortgage_principal_raw = (row.get("mortgage_principal") or "").strip()
        is_mortgage_loan = account_type == "Loan" and bool(mortgage_principal_raw)
        mortgage_data: dict[str, Any] | None = None

        if is_mortgage_loan:
            try:
                mtg_principal = float(mortgage_principal_raw)
            except ValueError:
                errors.append(AccountImportError(row=row_index, column="mortgage_principal", message="Must be numeric."))
                is_mortgage_loan = False
                mtg_principal = 0.0

            mtg_rate_raw = (row.get("mortgage_annual_rate_pct") or "").strip()
            mtg_term_raw = (row.get("mortgage_term_months") or "").strip()
            mtg_start = (row.get("mortgage_start_date") or "").strip()
            mtg_type = (row.get("mortgage_type") or "Fixed").strip() or "Fixed"

            try:
                mtg_rate = float(mtg_rate_raw) if mtg_rate_raw else 0.0
            except ValueError:
                errors.append(AccountImportError(row=row_index, column="mortgage_annual_rate_pct", message="Must be numeric."))
                mtg_rate = 0.0

            try:
                mtg_term = int(mtg_term_raw) if mtg_term_raw else 0
            except ValueError:
                errors.append(AccountImportError(row=row_index, column="mortgage_term_months", message="Must be an integer."))
                mtg_term = 0

            if not mtg_start:
                errors.append(AccountImportError(row=row_index, column="mortgage_start_date", message="Required for mortgage loans (YYYY-MM)."))
                is_mortgage_loan = False
            elif mtg_rate <= 0 or mtg_term <= 0:
                is_mortgage_loan = False
            else:
                mortgage_data = {
                    "principal": mtg_principal,
                    "annual_rate_pct": mtg_rate,
                    "term_months": mtg_term,
                    "start_date": mtg_start,
                    "mortgage_type": mtg_type,
                }

        if is_mortgage_loan and mortgage_data:
            # Generate one account row per CSV date column on/after mortgage start
            latest_account_id: str | None = None
            for orig_header, date_column in sorted(date_header_map.items(), key=lambda kv: kv[1]):
                # Skip dates before mortgage start
                date_ym = date_column[:7]  # YYYY-MM
                if date_ym < mortgage_data["start_date"]:
                    continue

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

                # Compute amortized balance (stored as negative — liability)
                balance = _compute_amortized_balance(
                    mortgage_data["principal"],
                    mortgage_data["annual_rate_pct"],
                    mortgage_data["term_months"],
                    mortgage_data["start_date"],
                    date_column,
                )
                native_balance = -round(balance, 2)

                # FX rate
                fx_to_eur = 1.0
                if fx_to_eur_raw:
                    try:
                        fx_to_eur = float(fx_to_eur_raw)
                    except ValueError:
                        fx_to_eur = 1.0
                elif currency in allowed_currencies:
                    cache_key = f"{currency}:{date_column}"
                    if cache_key not in fx_cache:
                        try:
                            fx_to_eur = _fetch_live_fx_to_eur(currency, date_column)
                            fx_cache[cache_key] = fx_to_eur
                        except ValueError:
                            fx_to_eur = _FALLBACK_FX_RATES.get(currency, 1.0)
                    else:
                        fx_to_eur = fx_cache[cache_key]

                account_id = _new_id("a-")
                latest_account_id = account_id
                existing_keys.add(dedupe_key)
                rows_to_create.append({
                    "id": account_id,
                    "owner_id": owner_id,
                    "owner_name": owner_name,
                    "co_owner_name": co_owner_name_raw,
                    "co_owner_id": co_owner_id,
                    "account_name": account_name,
                    "institution": institution,
                    "type": account_type,
                    "currency": currency,
                    "native_balance": native_balance,
                    "fx_to_eur": fx_to_eur,
                    "expected_return_pct": expected_return_pct,
                    "allocation_bucket": allocation_bucket_raw or None,
                    "updated_at": date_column,
                    "_mortgage": mortgage_data if date_column == sorted(date_header_map.values())[-1] else None,
                    "_latest": False,
                })

            # Mark the last row as the one receiving the WealthMortgage record
            if latest_account_id and rows_to_create:
                for r in reversed(rows_to_create):
                    if r.get("id") == latest_account_id:
                        r["_latest"] = True
                        break

        else:
            # ── Regular (non-mortgage) account rows ─────────────────────────
            for orig_header, date_column in date_header_map.items():
                balance_raw = (row.get(orig_header) or "").strip()
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
                        "co_owner_name": co_owner_name_raw,
                        "co_owner_id": co_owner_id,
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
            created_profile_count=0,
        )

    try:
        if profiles_to_create:
            now_iso = _utc_now_iso()
            for profile_id, profile_name in profiles_to_create.items():
                db.add(
                    WealthPersonProfile(
                        id=profile_id,
                        owner_user_id=None,
                        email=None,
                        name=profile_name,
                        birth_date=None,
                        current_age=None,
                        expected_lifetime=None,
                        is_active=True,
                        created_at=now_iso,
                        updated_at=now_iso,
                    )
                )

        for row in rows_to_create:
            mortgage_payload = row.pop("_mortgage", None)
            is_latest = row.pop("_latest", False)
            account = WealthAccount(**row)
            db.add(account)
            db.flush()
            if is_latest and mortgage_payload:
                db.add(WealthMortgage(
                    account_id=account.id,
                    principal=mortgage_payload["principal"],
                    annual_rate_pct=mortgage_payload["annual_rate_pct"],
                    term_months=mortgage_payload["term_months"],
                    start_date=mortgage_payload["start_date"],
                    mortgage_type=mortgage_payload["mortgage_type"],
                ))
        db.commit()
        _refresh_saved_snapshots(db)
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
            created_profile_count=0,
        )

    return AccountImportSummary(
        created_count=len(rows_to_create),
        skipped_count=skipped_count,
        error_count=0,
        errors=[],
        created_profile_count=len(profiles_to_create),
    )


# ── Accounts ───────────────────────────────────────────────────────────────────

def list_accounts(db: Session) -> list[WealthAccount]:
    return db.query(WealthAccount).all()


def get_account(db: Session, account_id: str) -> Optional[WealthAccount]:
    return db.query(WealthAccount).filter(WealthAccount.id == account_id).first()


def create_account(db: Session, data: AccountCreate) -> WealthAccount:
    owner_name = data.owner_name
    resolved_owner_name = _get_profile_name_if_valid(db, data.owner_id, "owner")
    if resolved_owner_name:
        owner_name = resolved_owner_name

    co_owner_name = data.co_owner_name
    if data.co_owner_id:
        resolved_co_owner_name = _get_profile_name_if_valid(db, data.co_owner_id, "co-owner")
        if resolved_co_owner_name:
            co_owner_name = resolved_co_owner_name

    split_entries = _normalize_ownership_split(
        db,
        [entry.model_dump() for entry in (data.ownership_split or [])],
        data.owner_id,
        owner_name,
    )
    primary = split_entries[0]
    secondary = split_entries[1] if len(split_entries) > 1 else None

    derived_expected_return_pct = data.expected_return_pct
    derived_native_balance = data.native_balance
    if data.portfolio_lines:
        derived_expected_return_pct = _weighted_expected_return_from_lines(data.portfolio_lines)
        derived_native_balance = _native_balance_from_lines(data.portfolio_lines, float(data.fx_to_eur))

    account = WealthAccount(
        id=data.id or _new_id("a-"),
        owner_id=primary["owner_id"],
        owner_name=primary["owner_name"] or owner_name,
        co_owner_id=secondary["owner_id"] if secondary else data.co_owner_id,
        co_owner_name=(secondary["owner_name"] if secondary else co_owner_name),
        ownership_split=split_entries,
        account_name=data.account_name,
        institution=data.institution,
        type=data.type,
        currency=data.currency,
        native_balance=derived_native_balance,
        fx_to_eur=data.fx_to_eur,
        expected_return_pct=derived_expected_return_pct,
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
            area=line.area,
            market_type=line.market_type,
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
    _refresh_saved_snapshots(db)
    db.refresh(account)
    return account


def update_account(db: Session, account_id: str, data: AccountUpdate) -> Optional[WealthAccount]:
    account = get_account(db, account_id)
    if not account:
        return None

    update_payload = data.model_dump(exclude_unset=True, exclude={"portfolio_lines", "mortgage"})

    if "owner_id" in update_payload and update_payload["owner_id"]:
        resolved_owner_name = _get_profile_name_if_valid(db, update_payload["owner_id"], "owner")
        if resolved_owner_name:
            update_payload["owner_name"] = resolved_owner_name

    if "co_owner_id" in update_payload:
        co_owner_id = update_payload["co_owner_id"]
        if co_owner_id:
            resolved_co_owner_name = _get_profile_name_if_valid(db, co_owner_id, "co-owner")
            if resolved_co_owner_name:
                update_payload["co_owner_name"] = resolved_co_owner_name
        else:
            update_payload["co_owner_name"] = None

    if "ownership_split" in update_payload:
        split_entries = _normalize_ownership_split(
            db,
            update_payload.get("ownership_split") or [],
            account.owner_id,
            account.owner_name,
        )
        primary = split_entries[0]
        secondary = split_entries[1] if len(split_entries) > 1 else None
        update_payload["ownership_split"] = split_entries
        update_payload["owner_id"] = primary["owner_id"]
        update_payload["owner_name"] = primary["owner_name"]
        update_payload["co_owner_id"] = secondary["owner_id"] if secondary else None
        update_payload["co_owner_name"] = secondary["owner_name"] if secondary else None

    for field, value in update_payload.items():
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
                area=line.area,
                market_type=line.market_type,
                currency=line.currency,
                native_amount=line.native_amount,
                fx_to_eur=line.fx_to_eur,
                expected_return_pct=line.expected_return_pct,
            ))
        if data.portfolio_lines:
            account.expected_return_pct = _weighted_expected_return_from_lines(data.portfolio_lines)
            account.native_balance = _native_balance_from_lines(data.portfolio_lines, float(account.fx_to_eur))

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
    _refresh_saved_snapshots(db)
    db.refresh(account)
    return account


def delete_account(db: Session, account_id: str) -> bool:
    account = get_account(db, account_id)
    if not account:
        return False
    db.delete(account)
    db.commit()
    _refresh_saved_snapshots(db)
    return True


def delete_all_accounts(db: Session) -> int:
    accounts = db.query(WealthAccount).all()
    count = len(accounts)
    for account in accounts:
        db.delete(account)
    db.commit()
    _refresh_saved_snapshots(db)
    return count


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

    net_worth_eur, assets_eur, liabilities_eur = _compute_snapshot_totals(db, data.date)

    snapshot = WealthSnapshot(
        id=data.id or _new_id("s-"),
        date=data.date,
        net_worth_eur=net_worth_eur,
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


def _get_retirement_annual_expense(
    annual_expenses_eur: float,
    use_custom_retirement_expense: bool,
    retirement_annual_expense_eur: float,
) -> float:
    fallback = max(0.0, annual_expenses_eur)
    if not use_custom_retirement_expense:
        return fallback
    return max(0.0, retirement_annual_expense_eur)


def _build_capital_trajectory(
    start_year: int,
    retirement_year: int,
    end_year: int,
    starting_portfolio_eur: float,
    annual_savings_eur: float,
    after_tax_return_pct: float,
    annual_expenses_eur: float,
    post_retirement_work_income_eur: float,
    inflation_pct: float,
) -> list[dict[str, int | str]]:
    data: list[dict[str, int | str]] = []
    portfolio = starting_portfolio_eur

    for year in range(start_year, end_year + 1):
        if year > start_year:
            growth = portfolio * (after_tax_return_pct / 100)
            current_expense_gap = 0.0

            if year > retirement_year:
                years_from_start = year - start_year
                inflation_factor = (1 + inflation_pct / 100) ** years_from_start
                indexed_expenses = annual_expenses_eur * inflation_factor
                indexed_income = post_retirement_work_income_eur * inflation_factor
                current_expense_gap = max(0.0, indexed_expenses - indexed_income)

            cash_flow = annual_savings_eur if year <= retirement_year else -current_expense_gap
            portfolio += growth + cash_flow

        data.append({
            "period": str(year),
            "portfolio_eur": round(max(0.0, portfolio)),
        })

    return data


def _find_fire_milestone_from_trajectory(
    trajectory: list[dict[str, int | str]],
    start_year: int,
    annual_expenses_eur: float,
    post_retirement_work_income_eur: float,
    inflation_pct: float,
    withdrawal_rate_pct: float,
    capital_strategy: str,
    after_tax_return_pct: float,
    current_age: float,
    expected_lifetime: float,
) -> dict[str, float | int | bool]:
    safe_withdrawal_rate = max(0.1, withdrawal_rate_pct) / 100
    previous: dict[str, float] | None = None

    for point in trajectory:
        year = int(point["period"])
        years_from_start = max(0, year - start_year)
        inflation_factor = (1 + inflation_pct / 100) ** years_from_start
        annual_need = max(0.0, annual_expenses_eur * inflation_factor - post_retirement_work_income_eur * inflation_factor)
        required_portfolio = annual_need / safe_withdrawal_rate

        if capital_strategy == "deplete":
            years_remaining = max(1.0, expected_lifetime - (current_age + years_from_start))
            r = after_tax_return_pct / 100
            if abs(r) < 1e-9:
                required_portfolio = annual_need * years_remaining
            else:
                required_portfolio = annual_need * ((1 - (1 + r) ** -years_remaining) / r)

        portfolio_eur = float(point["portfolio_eur"])
        surplus = portfolio_eur - required_portfolio

        if surplus >= 0:
            if previous and previous["surplus"] < 0:
                denominator = previous["surplus"] - surplus
                frac = previous["surplus"] / denominator if denominator != 0 else 1.0
                frac = min(1.0, max(0.0, frac))
                years_to_fire = max(0.0, (previous["year"] - start_year) + frac * (year - previous["year"]))
                portfolio_at_fire = round(previous["portfolio"] + frac * (portfolio_eur - previous["portfolio"]))
                return {
                    "reached": True,
                    "year": year,
                    "years_to_fire": years_to_fire,
                    "portfolio_at_fire": portfolio_at_fire,
                }

            return {
                "reached": True,
                "year": year,
                "years_to_fire": float(max(0, year - start_year)),
                "portfolio_at_fire": round(portfolio_eur),
            }

        previous = {
            "year": float(year),
            "portfolio": portfolio_eur,
            "surplus": surplus,
        }

    last = trajectory[-1] if trajectory else {"period": str(start_year), "portfolio_eur": 0}
    fallback_year = int(last["period"])
    return {
        "reached": False,
        "year": fallback_year,
        "years_to_fire": -1.0,
        "portfolio_at_fire": round(float(last["portfolio_eur"])),
    }


def _simulate_success_rate(
    payload: FireProjectionInput,
    target_retirement_year: int,
) -> float:
    years_to_target_age = max(0, target_retirement_year - 2026)
    retirement_years_estimate = max(1, round(payload.expected_lifetime - payload.target_retirement_age))
    simulation_end_year = target_retirement_year + retirement_years_estimate
    annual_savings = max(0.0, payload.annual_income_eur - payload.annual_expenses_eur)
    retirement_annual_expense_eur = _get_retirement_annual_expense(
        payload.annual_expenses_eur,
        payload.use_custom_retirement_expense,
        payload.retirement_annual_expense_eur,
    )
    scenario_adjustments = [-3.0, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
    safe_withdrawal_rate = max(0.1, payload.withdrawal_rate_pct) / 100

    success_count = 0
    for adjustment in scenario_adjustments:
        scenario_after_tax_return = max(-0.95, (payload.return_pct + adjustment) * (1 - payload.tax_rate_pct / 100))
        series = _build_capital_trajectory(
            2026,
            target_retirement_year,
            simulation_end_year,
            payload.starting_portfolio_eur,
            annual_savings,
            scenario_after_tax_return,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
        )

        target_year_idx = min(len(series) - 1, years_to_target_age)
        target_year_portfolio = float(series[target_year_idx]["portfolio_eur"]) if series else 0.0
        target_inflation_factor = (1 + payload.inflation_pct / 100) ** years_to_target_age
        target_year_gap = max(
            0.0,
            retirement_annual_expense_eur * target_inflation_factor
            - payload.post_retirement_work_income_eur * target_inflation_factor,
        )
        required_portfolio = target_year_gap / safe_withdrawal_rate
        final_value = float(series[-1]["portfolio_eur"]) if series else 0.0

        if payload.capital_strategy == "protect":
            can_sustain = True
            for i in range(target_year_idx, len(series)):
                year = 2026 + i
                if year > target_retirement_year:
                    years_from_start = year - 2026
                    inflation_factor = (1 + payload.inflation_pct / 100) ** years_from_start
                    current_expense_gap = max(
                        0.0,
                        retirement_annual_expense_eur * inflation_factor
                        - payload.post_retirement_work_income_eur * inflation_factor,
                    )
                    current_required = current_expense_gap / safe_withdrawal_rate
                    if float(series[i]["portfolio_eur"]) < current_required:
                        can_sustain = False
                        break
            is_success = can_sustain and final_value > 0
        else:
            is_success = target_year_portfolio > 0 and final_value > 0

        if is_success:
            success_count += 1

    return (success_count / len(scenario_adjustments)) * 100


def calculate_fire_projection(payload: FireProjectionInput) -> dict[str, Any]:
    base_year = 2026
    max_projection_years = 80
    max_projection_year = base_year + max_projection_years

    annual_savings = max(0.0, payload.annual_income_eur - payload.annual_expenses_eur)
    retirement_annual_expense_eur = _get_retirement_annual_expense(
        payload.annual_expenses_eur,
        payload.use_custom_retirement_expense,
        payload.retirement_annual_expense_eur,
    )
    years_to_target_age_exact = max(0.0, payload.target_retirement_age - payload.current_age)
    target_retirement_year = base_year + round(years_to_target_age_exact)
    years_to_target_retirement_year = max(0, target_retirement_year - base_year)
    inflation_to_target = (1 + payload.inflation_pct / 100) ** years_to_target_retirement_year
    annual_expense_gap_in_retirement = max(
        0.0,
        retirement_annual_expense_eur * inflation_to_target
        - payload.post_retirement_work_income_eur * inflation_to_target,
    )
    retirement_years_estimate = max(10, int(payload.expected_lifetime - payload.target_retirement_age))
    adjusted_withdrawal_rate = payload.withdrawal_rate_pct
    after_tax_return = max(-0.95, payload.return_pct * (1 - payload.tax_rate_pct / 100))

    full_trajectory = _build_capital_trajectory(
        base_year,
        target_retirement_year,
        max_projection_year,
        payload.starting_portfolio_eur,
        annual_savings,
        after_tax_return,
        retirement_annual_expense_eur,
        payload.post_retirement_work_income_eur,
        payload.inflation_pct,
    )

    years_to_fire_sim = _find_fire_milestone_from_trajectory(
        full_trajectory,
        base_year,
        retirement_annual_expense_eur,
        payload.post_retirement_work_income_eur,
        payload.inflation_pct,
        adjusted_withdrawal_rate,
        payload.capital_strategy,
        after_tax_return,
        payload.current_age,
        float(payload.expected_lifetime),
    )

    years_to_fire = float(years_to_fire_sim["years_to_fire"])
    reached = bool(years_to_fire_sim["reached"])
    fire_year = float(years_to_fire_sim["year"]) if reached else -1.0
    projected = int(years_to_fire_sim["portfolio_at_fire"])

    alt_years_to_fire_sim: dict[str, Any] | None = None
    if not reached:
        alt_trajectory = _build_capital_trajectory(
            base_year,
            max_projection_year,
            max_projection_year,
            payload.starting_portfolio_eur,
            annual_savings,
            after_tax_return,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
        )
        alt_years_to_fire_sim = _find_fire_milestone_from_trajectory(
            alt_trajectory,
            base_year,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
            adjusted_withdrawal_rate,
            payload.capital_strategy,
            after_tax_return,
            payload.current_age,
            float(payload.expected_lifetime),
        )

    portfolio_at_target_age = int(next(
        (p["portfolio_eur"] for p in full_trajectory if int(p["period"]) == target_retirement_year),
        full_trajectory[-1]["portfolio_eur"] if full_trajectory else 0,
    ))
    target_annual_need_at_target_age = max(
        0.0,
        retirement_annual_expense_eur * inflation_to_target
        - payload.post_retirement_work_income_eur * inflation_to_target,
    )
    required_portfolio_at_target_age = round(target_annual_need_at_target_age / max(0.001, adjusted_withdrawal_rate / 100))

    retirement_year_gap = fire_year - target_retirement_year if reached else -1.0
    alt_reached = bool(alt_years_to_fire_sim["reached"]) if alt_years_to_fire_sim else False
    alt_retirement_year_gap = (
        float(alt_years_to_fire_sim["year"]) - target_retirement_year
        if alt_years_to_fire_sim and alt_reached
        else -1.0
    )
    retirement_amount_gap = round(portfolio_at_target_age - required_portfolio_at_target_age)

    series_end_year = min(
        max_projection_year,
        max(
            target_retirement_year + round(retirement_years_estimate),
            (int(fire_year) + 12) if reached else target_retirement_year + 12,
        ),
    )
    yearly_trajectory = [p for p in full_trajectory if int(p["period"]) <= series_end_year]

    key_chart_years = {target_retirement_year, series_end_year}
    if reached:
        key_chart_years.add(int(fire_year))

    series = [
        p for idx, p in enumerate(yearly_trajectory)
        if idx % 2 == 0 or idx == len(yearly_trajectory) - 1 or int(p["period"]) in key_chart_years
    ]

    scenario_adjustments = [-3.0, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
    all_scenarios: list[dict[str, Any]] = []
    for adjustment in scenario_adjustments:
        scenario_after_tax_return = max(-0.95, (payload.return_pct + adjustment) * (1 - payload.tax_rate_pct / 100))
        scenario_trajectory = _build_capital_trajectory(
            base_year,
            target_retirement_year,
            series_end_year,
            payload.starting_portfolio_eur,
            annual_savings,
            scenario_after_tax_return,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
        )
        scenario_series = [
            p for idx, p in enumerate(scenario_trajectory)
            if idx % 2 == 0 or idx == len(scenario_trajectory) - 1 or int(p["period"]) in key_chart_years
        ]
        label = "Base Case (0%)" if adjustment == 0 else (f"+{adjustment:.1f}%" if adjustment > 0 else f"{adjustment:.1f}%")
        all_scenarios.append({
            "adjustment": adjustment,
            "label": label,
            "series": scenario_series,
        })

    monte_carlo_trajectory = _build_capital_trajectory(
        base_year,
        target_retirement_year,
        series_end_year,
        payload.starting_portfolio_eur,
        annual_savings,
        after_tax_return - 2,
        retirement_annual_expense_eur,
        payload.post_retirement_work_income_eur,
        payload.inflation_pct,
    )
    monte_carlo_by_period = {str(p["period"]): int(p["portfolio_eur"]) for p in monte_carlo_trajectory}
    monte_carlo_series = [
        {
            "period": str(point["period"]),
            "monte_carlo_eur": int(monte_carlo_by_period.get(str(point["period"]), int(point["portfolio_eur"]))),
        }
        for point in series
    ]

    success_rate = _simulate_success_rate(payload, target_retirement_year)

    def years_to_fire_at_return(return_pct: float) -> float:
        scenario_after_tax_return = max(-0.95, return_pct * (1 - payload.tax_rate_pct / 100))
        scenario_trajectory = _build_capital_trajectory(
            base_year,
            max_projection_year,
            max_projection_year,
            payload.starting_portfolio_eur,
            annual_savings,
            scenario_after_tax_return,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
        )
        result = _find_fire_milestone_from_trajectory(
            scenario_trajectory,
            base_year,
            retirement_annual_expense_eur,
            payload.post_retirement_work_income_eur,
            payload.inflation_pct,
            adjusted_withdrawal_rate,
            payload.capital_strategy,
            scenario_after_tax_return,
            payload.current_age,
            float(payload.expected_lifetime),
        )
        return float(result["years_to_fire"])

    sensitivity = [
        {"bucket": "4%", "years": years_to_fire_at_return(4)},
        {"bucket": "5%", "years": years_to_fire_at_return(5)},
        {"bucket": "6%", "years": years_to_fire_at_return(6)},
        {"bucket": "7%", "years": years_to_fire_at_return(7)},
        {"bucket": "8%", "years": years_to_fire_at_return(8)},
    ]

    return {
        "years_to_fire": years_to_fire,
        "success_rate": success_rate,
        "fire_year": fire_year,
        "projected": projected,
        "portfolio_at_target_age": portfolio_at_target_age,
        "fire_target_eur": required_portfolio_at_target_age,
        "alt_years_to_fire": float(alt_years_to_fire_sim["years_to_fire"]) if alt_years_to_fire_sim and alt_reached else -1.0,
        "alt_fire_year": float(alt_years_to_fire_sim["year"]) if alt_years_to_fire_sim and alt_reached else -1.0,
        "alt_retirement_year_gap": alt_retirement_year_gap,
        "after_tax_return": after_tax_return,
        "series": series,
        "monte_carlo_series": monte_carlo_series,
        "all_scenarios": all_scenarios,
        "sensitivity": sensitivity,
        "retirement_years_estimate": retirement_years_estimate,
        "annual_expense_gap_in_retirement": annual_expense_gap_in_retirement,
        "adjusted_withdrawal_rate": adjusted_withdrawal_rate,
        "profile_current_age": payload.current_age,
        "profile_expected_lifetime": payload.expected_lifetime,
        "target_retirement_year": target_retirement_year,
        "retirement_year_gap": retirement_year_gap,
        "retirement_amount_gap": retirement_amount_gap,
    }


def calculate_fire_projection_for_scenario(
    db: Session,
    scenario_id: str,
    current_age: float | None = None,
    expected_lifetime: int | None = None,
) -> dict[str, Any] | None:
    scenario = get_fire_scenario(db, scenario_id)
    if not scenario:
        return None

    fallback_age = 40.0
    fallback_lifetime = 90
    active_profiles = (
        db.query(WealthPersonProfile)
        .filter(WealthPersonProfile.is_active.is_(True))
        .order_by(WealthPersonProfile.created_at.asc())
        .limit(2)
        .all()
    )
    if active_profiles:
        ages = [float(p.current_age) for p in active_profiles if p.current_age is not None]
        lifetimes = [int(p.expected_lifetime) for p in active_profiles if p.expected_lifetime is not None]
        if scenario.profile_scope == "both":
            if ages:
                fallback_age = sum(ages) / len(ages)
            if lifetimes:
                fallback_lifetime = round(sum(lifetimes) / len(lifetimes))
        else:
            idx = 0 if scenario.profile_scope == "p-1" else 1
            if idx < len(active_profiles):
                selected = active_profiles[idx]
                if selected.current_age is not None:
                    fallback_age = float(selected.current_age)
                if selected.expected_lifetime is not None:
                    fallback_lifetime = int(selected.expected_lifetime)

    payload = FireProjectionInput(
        annual_income_eur=scenario.annual_income_eur,
        annual_expenses_eur=scenario.annual_expenses_eur,
        use_custom_retirement_expense=scenario.use_custom_retirement_expense,
        retirement_annual_expense_eur=scenario.retirement_annual_expense_eur,
        return_pct=scenario.return_pct,
        tax_rate_pct=scenario.tax_rate_pct,
        inflation_pct=scenario.inflation_pct,
        withdrawal_rate_pct=scenario.withdrawal_rate_pct,
        profile_scope=scenario.profile_scope,
        target_retirement_age=scenario.target_retirement_age,
        post_retirement_work_income_eur=scenario.post_retirement_work_income_eur,
        capital_strategy=scenario.capital_strategy,
        starting_portfolio_eur=scenario.starting_portfolio_eur,
        current_age=float(current_age if current_age is not None else fallback_age),
        expected_lifetime=int(expected_lifetime if expected_lifetime is not None else fallback_lifetime),
    )
    return calculate_fire_projection(payload)
