"""SQLAlchemy ORM models for the TwinOps domain."""

from sqlalchemy import JSON, Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class Objective(Base):
    """Objective ORM model."""

    __tablename__ = "objectives"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    progress = Column(Integer, default=0)
    key_wins = Column(JSON, default={})

    key_results = relationship("KeyResult", back_populates="objective", cascade="all, delete-orphan")


class KeyResult(Base):
    """Key result ORM model."""

    __tablename__ = "key_results"

    id = Column(Integer, primary_key=True)
    objective_id = Column(Integer, ForeignKey("objectives.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    progress = Column(Integer, default=0)
    from_value = Column(Integer, default=0)
    to_value = Column(Integer, default=100)
    current_value = Column(Integer, default=0)
    unit_type = Column(String, default="percent")

    objective = relationship("Objective", back_populates="key_results")
    initiatives = relationship("Initiative", back_populates="key_result", cascade="all, delete-orphan")


class Initiative(Base):
    """Initiative ORM model."""

    __tablename__ = "initiatives"

    id = Column(String, primary_key=True)
    kr_id = Column(Integer, ForeignKey("key_results.id"), nullable=False)
    title = Column(String, nullable=False)
    owner_id = Column(Integer, nullable=False)
    main_responsible_id = Column(Integer, nullable=False)
    support_team_ids = Column(JSON, default={})
    fte_effort = Column(Integer, default=0)
    status = Column(String, default="backlog")
    priority = Column(String, default="medium")
    story_points_owner = Column(Integer, default=0)
    story_points_supporting = Column(JSON, default={})

    key_result = relationship("KeyResult", back_populates="initiatives")


class Dependency(Base):
    """Dependency ORM model."""

    __tablename__ = "dependencies"

    id = Column(Integer, primary_key=True)
    source_kr_id = Column(Integer, ForeignKey("key_results.id"), nullable=False)
    target_id = Column(Integer, nullable=False)
    target_type = Column(String, default="key_result")
    relationship_type = Column(String, default="positive")
    dependency_weight = Column(Integer, default=50)
    threshold_value = Column(Integer, nullable=True)
    impact_multiplier = Column(Integer, default=100)
    minimum_base = Column(Integer, default=0)

    source_kr = relationship("KeyResult", foreign_keys="[Dependency.source_kr_id]")


# ── Wealth domain ──────────────────────────────────────────────────────────────


class WealthAccount(Base):
    """Wealth account (asset or liability)."""

    __tablename__ = "wealth_accounts"

    id = Column(String, primary_key=True)
    owner_id = Column(String, nullable=False)
    owner_name = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Cash | Savings | Investment | Property | Loan | Cryptocurrency
    currency = Column(String, nullable=False, default="EUR")
    native_balance = Column(Float, nullable=False, default=0.0)
    fx_to_eur = Column(Float, nullable=False, default=1.0)
    expected_return_pct = Column(Float, nullable=False, default=0.0)
    allocation_bucket = Column(String, nullable=True)
    updated_at = Column(String, nullable=False)

    portfolio_lines = relationship("WealthPortfolioLine", back_populates="account", cascade="all, delete-orphan")
    mortgage = relationship("WealthMortgage", back_populates="account", uselist=False, cascade="all, delete-orphan")


class WealthPortfolioLine(Base):
    """Portfolio holding line within an investment account."""

    __tablename__ = "wealth_portfolio_lines"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("wealth_accounts.id"), nullable=False)
    label = Column(String, nullable=False)
    allocation_bucket = Column(String, nullable=False)
    currency = Column(String, nullable=False, default="EUR")
    native_amount = Column(Float, nullable=False, default=0.0)
    fx_to_eur = Column(Float, nullable=False, default=1.0)
    expected_return_pct = Column(Float, nullable=False, default=0.0)

    account = relationship("WealthAccount", back_populates="portfolio_lines")


class WealthMortgage(Base):
    """Mortgage details attached to a Loan / Property account."""

    __tablename__ = "wealth_mortgages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(String, ForeignKey("wealth_accounts.id"), nullable=False, unique=True)
    principal = Column(Float, nullable=False)
    annual_rate_pct = Column(Float, nullable=False)
    term_months = Column(Integer, nullable=False)
    start_date = Column(String, nullable=False)  # "YYYY-MM"
    mortgage_type = Column(String, nullable=False, default="Fixed")  # Fixed | Variable

    account = relationship("WealthAccount", back_populates="mortgage")


class WealthSnapshot(Base):
    """Monthly net-worth checkpoint."""

    __tablename__ = "wealth_snapshots"

    id = Column(String, primary_key=True)
    date = Column(String, nullable=False)  # "YYYY-MM-DD"
    net_worth_eur = Column(Float, nullable=False)
    assets_eur = Column(Float, nullable=False)
    liabilities_eur = Column(Float, nullable=False)
    note = Column(Text, default="")


class WealthFireScenario(Base):
    """FIRE retirement planning scenario."""

    __tablename__ = "wealth_fire_scenarios"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    annual_income_eur = Column(Float, nullable=False)
    annual_expenses_eur = Column(Float, nullable=False)
    return_pct = Column(Float, nullable=False)
    tax_rate_pct = Column(Float, nullable=False)
    inflation_pct = Column(Float, nullable=False)
    withdrawal_rate_pct = Column(Float, nullable=False)
    profile_scope = Column(String, nullable=False, default="both")  # p-1 | p-2 | both
    target_retirement_age = Column(Integer, nullable=False)
    post_retirement_work_income_eur = Column(Float, default=0.0)
    capital_strategy = Column(String, default="protect")  # protect | deplete
    starting_portfolio_eur = Column(Float, nullable=False)
    on_trajectory = Column(Boolean, default=True)


class WealthDecision(Base):
    """Investment / planning decision log entry."""

    __tablename__ = "wealth_decisions"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    type = Column(String, nullable=False, default="Strategy")  # Investment | Rebalance | Strategy | Risk | Other
    date = Column(String, nullable=False)  # "YYYY-MM-DD"
    author = Column(String, nullable=False)
    related_scenario = Column(String, default="")



# ── Authentication ─────────────────────────────────────────────────────────

class User(Base):
    """User account created via Google SSO."""

    __tablename__ = "users"

    id = Column(String, primary_key=True)  # UUID
    google_id = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    display_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    created_at = Column(String, nullable=False)  # ISO 8601
    updated_at = Column(String, nullable=False)  # ISO 8601


class AuthorizedEmail(Base):
    """Email address approved for access."""

    __tablename__ = "authorized_emails"

    id = Column(String, primary_key=True)  # UUID
    email = Column(String, nullable=False, unique=True, index=True)
    approved_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(String, nullable=False)  # ISO 8601
    notes = Column(String, nullable=True)

