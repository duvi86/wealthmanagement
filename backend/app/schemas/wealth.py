"""Pydantic schemas for the Wealth domain."""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Sub-types ──────────────────────────────────────────────────────────────────

AccountType = Literal["Cash", "Savings", "Investment", "Private Equity", "Property", "Loan", "Cryptocurrency"]
AllocationBucket = Literal[
    "Cash", "Savings", "Stocks", "Bonds", "REIT",
    "Real Estate", "Commodities", "Crypto", "Private Equity",
]
SupportedCurrency = Literal["EUR", "USD", "CHF"]
MortgageType = Literal["Fixed", "Variable"]
DecisionType = Literal["Investment", "Rebalance", "Strategy", "Risk", "Other"]
ProfileScope = Literal["p-1", "p-2", "both"]
CapitalStrategy = Literal["protect", "deplete"]
TaxCountry = Literal[
    "Belgium",
    "Luxembourg",
    "USA",
    "Spain",
    "UK",
    "Switzerland",
    "Netherlands",
    "Italy",
    "Singapore",
    "New Zealand",
    "Ireland",
    "Belgium 2009",
    "UAE",
    "Hong Kong",
    "Portugal",
]


# ── Portfolio line ─────────────────────────────────────────────────────────────

class PortfolioLineBase(BaseModel):
    label: str
    allocation_bucket: AllocationBucket
    currency: SupportedCurrency = "EUR"
    native_amount: float = 0.0
    fx_to_eur: float = 1.0
    expected_return_pct: float = 0.0


class PortfolioLineCreate(PortfolioLineBase):
    id: str


class PortfolioLineOut(PortfolioLineBase):
    id: str

    model_config = {"from_attributes": True}


# ── Mortgage ───────────────────────────────────────────────────────────────────

class MortgageBase(BaseModel):
    principal: float
    annual_rate_pct: float
    term_months: int
    start_date: str = Field(..., description="YYYY-MM")
    mortgage_type: MortgageType = "Fixed"


class MortgageCreate(MortgageBase):
    pass


class MortgageOut(MortgageBase):
    id: int
    account_id: str

    model_config = {"from_attributes": True}


# ── Account ────────────────────────────────────────────────────────────────────

class AccountBase(BaseModel):
    owner_id: str
    owner_name: str
    co_owner_name: Optional[str] = None
    co_owner_id: Optional[str] = None
    account_name: str
    institution: str
    type: AccountType
    currency: SupportedCurrency = "EUR"
    native_balance: float = 0.0
    fx_to_eur: float = 1.0
    expected_return_pct: float = 0.0
    allocation_bucket: Optional[AllocationBucket] = None
    updated_at: str


class AccountCreate(AccountBase):
    id: str
    portfolio_lines: list[PortfolioLineCreate] = []
    mortgage: Optional[MortgageCreate] = None


class AccountUpdate(BaseModel):
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    co_owner_name: Optional[str] = None
    co_owner_id: Optional[str] = None
    account_name: Optional[str] = None
    institution: Optional[str] = None
    type: Optional[AccountType] = None
    currency: Optional[SupportedCurrency] = None
    native_balance: Optional[float] = None
    fx_to_eur: Optional[float] = None
    expected_return_pct: Optional[float] = None
    allocation_bucket: Optional[AllocationBucket] = None
    updated_at: Optional[str] = None
    portfolio_lines: Optional[list[PortfolioLineCreate]] = None
    mortgage: Optional[MortgageCreate] = None


class AccountOut(AccountBase):
    id: str
    portfolio_lines: list[PortfolioLineOut] = []
    mortgage: Optional[MortgageOut] = None

    model_config = {"from_attributes": True}


class AccountImportError(BaseModel):
    row: int
    column: str
    message: str


class AccountImportSummary(BaseModel):
    created_count: int
    skipped_count: int
    error_count: int
    errors: list[AccountImportError] = []


# ── Snapshot ───────────────────────────────────────────────────────────────────

class SnapshotBase(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    net_worth_eur: float
    assets_eur: float
    liabilities_eur: float
    note: str = ""


class SnapshotCreate(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    note: str = ""
    id: str | None = None


class SnapshotOut(SnapshotBase):
    id: str

    model_config = {"from_attributes": True}


# ── FIRE Scenario ──────────────────────────────────────────────────────────────

class FireScenarioBase(BaseModel):
    name: str
    annual_income_eur: float
    annual_expenses_eur: float
    return_pct: float
    tax_rate_pct: float
    inflation_pct: float
    withdrawal_rate_pct: float
    profile_scope: ProfileScope = "both"
    target_retirement_age: int
    post_retirement_work_income_eur: float = 0.0
    capital_strategy: CapitalStrategy = "protect"
    starting_portfolio_eur: float
    on_trajectory: bool = True


class FireScenarioCreate(FireScenarioBase):
    id: str


class FireScenarioUpdate(BaseModel):
    name: Optional[str] = None
    annual_income_eur: Optional[float] = None
    annual_expenses_eur: Optional[float] = None
    return_pct: Optional[float] = None
    tax_rate_pct: Optional[float] = None
    inflation_pct: Optional[float] = None
    withdrawal_rate_pct: Optional[float] = None
    profile_scope: Optional[ProfileScope] = None
    target_retirement_age: Optional[int] = None
    post_retirement_work_income_eur: Optional[float] = None
    capital_strategy: Optional[CapitalStrategy] = None
    starting_portfolio_eur: Optional[float] = None
    on_trajectory: Optional[bool] = None


class FireScenarioOut(FireScenarioBase):
    id: str

    model_config = {"from_attributes": True}


# ── Decision ───────────────────────────────────────────────────────────────────

class DecisionBase(BaseModel):
    title: str
    description: str = ""
    type: DecisionType = "Strategy"
    date: str = Field(..., description="YYYY-MM-DD")
    author: str
    related_scenario: str = ""


class DecisionCreate(DecisionBase):
    id: str


class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[DecisionType] = None
    date: Optional[str] = None
    author: Optional[str] = None
    related_scenario: Optional[str] = None


class DecisionOut(DecisionBase):
    id: str

    model_config = {"from_attributes": True}


# ── Investment Tax Calculator ────────────────────────────────────────────────

class TaxCountryOption(BaseModel):
    label: str
    value: TaxCountry


class TaxScenario(BaseModel):
    portfolio: float
    shares: float
    bonds: float
    inflation_rate: float


class TaxDefaults(BaseModel):
    country: TaxCountry
    portfolio: float
    inflation_rate_pct: float
    shares_return_pct: float
    bonds_return_pct: float
    dividend_yield_pct: float
    num_persons: int
    belgium_wealth_tax_pct: float
    shares_allocation_pct: float


class TaxCalculatorConfigOut(BaseModel):
    country_options: list[TaxCountryOption]
    scenarios: list[TaxScenario]
    defaults: TaxDefaults


class TaxCalculatorInput(BaseModel):
    country: TaxCountry
    portfolio_value: float
    inflation_rate_pct: float
    shares_return_pct: float
    bonds_return_pct: float
    dividend_yield_pct: float
    num_persons: int
    belgium_wealth_tax_pct: float
    shares_allocation_pct: float


class TaxCalculationResult(BaseModel):
    portfolio_value: float
    shares_value: float
    bonds_value: float
    inflation_rate: float
    inflation_amount: float
    shares_return: float
    bonds_return: float
    dividend_yield: float
    share_dividends: float
    share_capital_gains: float
    share_revenue: float
    bond_revenue: float
    capital_gains: float
    capital_gains_exemption: float
    taxable_capital_gains: float
    capital_gains_tax: float
    dividend_tax: float
    bond_tax: float
    wealth_tax: float
    total_tax: float
    revenue: float
    tax_rate: float
    inflation_adjusted_rate: float
    net_income: float
    net_income_after_inflation: float
    wealth_growth_rate: float


class TaxCountryComparisonRow(BaseModel):
    country: TaxCountry
    result: TaxCalculationResult


class TaxScenarioComparisonRow(BaseModel):
    portfolio: float
    shares: float
    bonds: float
    inflation_rate: float
    result: TaxCalculationResult


class TaxCalculatorComputeOut(BaseModel):
    single_result: TaxCalculationResult
    country_comparison: list[TaxCountryComparisonRow]
    scenario_comparison: list[TaxScenarioComparisonRow]
    reference_country: TaxCountry
