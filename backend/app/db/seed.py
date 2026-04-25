"""Database seed data generator for Phase 3."""

from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session

from .models import (
    AuthorizedEmail,
    Dependency,
    Initiative,
    KeyResult,
    Objective,
    WealthAccount,
    WealthDecision,
    WealthFireScenario,
    WealthMortgage,
    WealthSnapshot,
)


def seed_sample_data(db: Session) -> None:
    """Populate database with sample OKR structure.

    Args:
        db: Active database session.
    """
    if db.query(Objective).count() > 0:
        _seed_wealth(db)
        return  # Already seeded

    # Create objective
    obj = Objective(
        id=1,
        title="Improve operational reliability",
        department="Platform",
        progress=62,
        key_wins=["Incident response playbook rolled out"],
    )
    db.add(obj)
    db.flush()

    # Create key result
    kr = KeyResult(
        id=101,
        objective_id=obj.id,
        title="Reduce P1 incident count",
        description="Bring quarterly P1 count below target",
        progress=58,
        from_value=20,
        to_value=8,
        current_value=12,
        unit_type="count",
    )
    db.add(kr)
    db.flush()

    # Create initiative
    init = Initiative(
        id="i-1001",
        kr_id=kr.id,
        title="Service ownership matrix",
        owner_id=11,
        main_responsible_id=11,
        support_team_ids=[13, 14],
        fte_effort=2,
        status="in_progress",
        priority="high",
        story_points_owner=18,
        story_points_supporting={"13": 8, "14": 5},
    )
    db.add(init)
    db.flush()

    # Create dependencies
    dep1 = Dependency(
        source_kr_id=kr.id,
        target_id=102,
        target_type="key_result",
        relationship_type="positive",
        dependency_weight=60,
        threshold_value=70,
        impact_multiplier=100,
        minimum_base=0,
    )
    dep2 = Dependency(
        source_kr_id=kr.id,
        target_id=103,
        target_type="key_result",
        relationship_type="positive",
        dependency_weight=40,
        threshold_value=60,
        impact_multiplier=100,
        minimum_base=0,
    )
    db.add(dep1)
    db.add(dep2)

    db.commit()

    _seed_wealth(db)


def _seed_wealth(db: Session) -> None:
    """Seed wealth domain with realistic mock data."""
    if db.query(WealthAccount).count() > 0:
        return

    accounts = [
        WealthAccount(id="a-1", owner_id="p-1", owner_name="Sylvie",
                      account_name="Main Checking", institution="BNP Paribas",
                      type="Cash", currency="EUR", native_balance=14200, fx_to_eur=1,
                      expected_return_pct=1.0, allocation_bucket="Cash", updated_at="2026-04-10"),
        WealthAccount(id="a-2", owner_id="p-1", owner_name="Sylvie",
                      account_name="Emergency Savings", institution="Boursorama",
                      type="Savings", currency="EUR", native_balance=48500, fx_to_eur=1,
                      expected_return_pct=2.5, allocation_bucket="Savings", updated_at="2026-04-10"),
        WealthAccount(id="a-3", owner_id="p-2", owner_name="Matthieu",
                      account_name="Broker Portfolio", institution="Interactive Brokers",
                      type="Investment", currency="USD", native_balance=102000, fx_to_eur=0.92,
                      expected_return_pct=7.0, allocation_bucket="Stocks", updated_at="2026-04-10"),
        WealthAccount(id="a-4", owner_id="p-2", owner_name="Matthieu",
                      account_name="Swiss ETF Bucket", institution="Swissquote",
                      type="Investment", currency="CHF", native_balance=35500, fx_to_eur=1.03,
                      expected_return_pct=4.5, allocation_bucket="Bonds", updated_at="2026-04-10"),
        WealthAccount(id="a-5", owner_id="p-1", owner_name="Sylvie",
                      account_name="Primary Home", institution="Manual valuation",
                      type="Property", currency="EUR", native_balance=430000, fx_to_eur=1,
                      expected_return_pct=3.0, allocation_bucket="Real Estate", updated_at="2026-04-01"),
        WealthAccount(id="a-6", owner_id="p-2", owner_name="Matthieu",
                      account_name="Home Mortgage", institution="Credit Agricole",
                      type="Loan", currency="EUR", native_balance=-248000, fx_to_eur=1,
                      expected_return_pct=0.0, updated_at="2026-04-01"),
        WealthAccount(id="a-7", owner_id="p-1", owner_name="Sylvie",
                      account_name="Crypto Wallet", institution="Ledger",
                      type="Cryptocurrency", currency="USD", native_balance=12200, fx_to_eur=0.92,
                      expected_return_pct=9.0, allocation_bucket="Crypto", updated_at="2026-04-09"),
        WealthAccount(id="a-8", owner_id="p-2", owner_name="Matthieu",
                      account_name="Global Bond Fund", institution="Interactive Brokers",
                      type="Investment", currency="USD", native_balance=18400, fx_to_eur=0.92,
                      expected_return_pct=4.0, allocation_bucket="Bonds", updated_at="2026-04-10"),
        WealthAccount(id="a-9", owner_id="p-1", owner_name="Sylvie",
                      account_name="European REIT ETF", institution="Boursorama",
                      type="Investment", currency="EUR", native_balance=9600, fx_to_eur=1,
                      expected_return_pct=5.0, allocation_bucket="REIT", updated_at="2026-04-10"),
        WealthAccount(id="a-10", owner_id="p-2", owner_name="Matthieu",
                      account_name="Gold ETC", institution="Interactive Brokers",
                      type="Investment", currency="USD", native_balance=8200, fx_to_eur=0.92,
                      expected_return_pct=3.5, allocation_bucket="Commodities", updated_at="2026-04-10"),
        WealthAccount(id="a-11", owner_id="p-1", owner_name="Sylvie",
                      account_name="PE Co-Invest", institution="Private Fund",
                      type="Investment", currency="EUR", native_balance=15400, fx_to_eur=1,
                      expected_return_pct=8.5, allocation_bucket="Private Equity", updated_at="2026-04-10"),
    ]
    for acc in accounts:
        db.add(acc)
    db.flush()

    db.add(WealthMortgage(
        account_id="a-6", principal=280000, annual_rate_pct=2.15,
        term_months=300, start_date="2021-03", mortgage_type="Fixed",
    ))

    snapshots = [
        WealthSnapshot(id="s-1", date="2026-04-30", net_worth_eur=283500, assets_eur=531500, liabilities_eur=248000, note="April 2026 close"),
        WealthSnapshot(id="s-2", date="2026-03-31", net_worth_eur=277800, assets_eur=525800, liabilities_eur=248000, note="March 2026 close"),
        WealthSnapshot(id="s-3", date="2026-02-28", net_worth_eur=273100, assets_eur=521100, liabilities_eur=248000, note="Feb 2026 close"),
        WealthSnapshot(id="s-4", date="2026-01-31", net_worth_eur=268500, assets_eur=516500, liabilities_eur=248000, note="Jan 2026 close"),
        WealthSnapshot(id="s-5", date="2025-12-31", net_worth_eur=263800, assets_eur=511800, liabilities_eur=248000, note="Year-end 2025"),
    ]
    for snap in snapshots:
        db.add(snap)

    fire = WealthFireScenario(
        id="fs-1", name="Base FIRE @ 52", annual_income_eur=128000,
        annual_expenses_eur=70000, return_pct=6.0, tax_rate_pct=24.0,
        inflation_pct=2.2, withdrawal_rate_pct=3.8, profile_scope="both",
        target_retirement_age=52, post_retirement_work_income_eur=12000,
        capital_strategy="protect", starting_portfolio_eur=283500, on_trajectory=True,
    )
    db.add(fire)

    decisions = [
        WealthDecision(id="d-1", title="Increase bond allocation to 20%",
                       description="Rebalance IB portfolio after Q1 equity run-up.",
                       type="Rebalance", date="2026-03-15", author="Matthieu",
                       related_scenario="fs-1"),
        WealthDecision(id="d-2", title="Add REIT ETF position",
                       description="EUR-denominated REIT ETF via Boursorama for yield.",
                       type="Investment", date="2026-01-20", author="Sylvie",
                       related_scenario=""),
        WealthDecision(id="d-3", title="Fix withdrawal rate at 3.8%",
                       description="Agreed on conservative SWR to protect capital.",
                       type="Strategy", date="2025-12-10", author="Sylvie",
                       related_scenario="fs-1"),
    ]
    for dec in decisions:
        db.add(dec)

    # Seed authorized emails
    now = datetime.utcnow().isoformat()
    authorized_emails = [
        AuthorizedEmail(
            id=str(uuid4()),
            email="matthieu.duvinage@gmail.com",
            approved_by_user_id=None,
            approved_at=now,
            notes="Initial setup - Matthieu",
        ),
        AuthorizedEmail(
            id=str(uuid4()),
            email="scolas.sylvie@gmail.com",
            approved_by_user_id=None,
            approved_at=now,
            notes="Initial setup - Sylvie",
        ),
    ]
    for email in authorized_emails:
        db.add(email)

    db.commit()
