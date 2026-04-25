"""Business logic for investment tax calculator computations."""

from __future__ import annotations

from dataclasses import dataclass

from ..schemas.wealth import TaxCalculatorInput, TaxCountry


TAX_COUNTRY_OPTIONS = [
    {"label": "Belgium", "value": "Belgium"},
    {"label": "Luxembourg", "value": "Luxembourg"},
    {"label": "USA", "value": "USA"},
    {"label": "Spain", "value": "Spain"},
    {"label": "UK", "value": "UK"},
    {"label": "Switzerland", "value": "Switzerland"},
    {"label": "Netherlands", "value": "Netherlands"},
    {"label": "Italy", "value": "Italy"},
    {"label": "Singapore", "value": "Singapore"},
    {"label": "New Zealand", "value": "New Zealand"},
    {"label": "Ireland", "value": "Ireland"},
    {"label": "Belgium 2009", "value": "Belgium 2009"},
    {"label": "UAE", "value": "UAE"},
    {"label": "Hong Kong", "value": "Hong Kong"},
    {"label": "Portugal", "value": "Portugal"},
]

TAX_SCENARIOS = [
    {"portfolio": 500000, "shares": 350000, "bonds": 150000, "inflation_rate": 0.02},
    {"portfolio": 1000000, "shares": 700000, "bonds": 300000, "inflation_rate": 0.02},
    {"portfolio": 1800000, "shares": 1260000, "bonds": 540000, "inflation_rate": 0.02},
    {"portfolio": 3000000, "shares": 2100000, "bonds": 900000, "inflation_rate": 0.02},
    {"portfolio": 10000000, "shares": 7000000, "bonds": 3000000, "inflation_rate": 0.02},
]

TAX_DEFAULTS = {
    "country": "Belgium",
    "portfolio": 1000000,
    "inflation_rate_pct": 2,
    "shares_return_pct": 7,
    "bonds_return_pct": 4,
    "dividend_yield_pct": 4,
    "num_persons": 1,
    "belgium_wealth_tax_pct": 1,
    "shares_allocation_pct": 70,
}


@dataclass
class TaxInputs:
    portfolio_value: float
    shares_value: float
    bonds_value: float
    inflation_rate: float
    shares_return: float
    bonds_return: float
    dividend_yield: float
    num_persons: int
    belgium_wealth_tax_rate: float


@dataclass
class BaseRevenue:
    inflation_amount: float
    share_dividends: float
    share_capital_gains: float
    share_revenue: float
    bond_revenue: float
    total_revenue: float
    capital_gains: float


def tax_config_payload() -> dict:
    return {
        "country_options": TAX_COUNTRY_OPTIONS,
        "scenarios": TAX_SCENARIOS,
        "defaults": TAX_DEFAULTS,
    }


def _compute_base_revenue(data: TaxInputs, clamp_belgium_2009_capital_gains: bool = False) -> BaseRevenue:
    inflation_amount = data.portfolio_value * data.inflation_rate
    share_dividends = data.shares_value * data.dividend_yield
    share_capital_gains_raw = data.shares_value * (data.shares_return - data.dividend_yield)
    share_capital_gains = max(0.0, share_capital_gains_raw) if clamp_belgium_2009_capital_gains else share_capital_gains_raw
    share_revenue = share_dividends + share_capital_gains
    bond_revenue = data.bonds_value * data.bonds_return
    total_revenue = share_revenue + bond_revenue

    return BaseRevenue(
        inflation_amount=inflation_amount,
        share_dividends=share_dividends,
        share_capital_gains=share_capital_gains,
        share_revenue=share_revenue,
        bond_revenue=bond_revenue,
        total_revenue=total_revenue,
        capital_gains=share_capital_gains,
    )


def _finalize_result(data: TaxInputs, base: BaseRevenue, taxes: dict[str, float]) -> dict:
    total_tax = taxes["capital_gains_tax"] + taxes["dividend_tax"] + taxes["bond_tax"] + taxes["wealth_tax"]
    tax_rate = total_tax / base.total_revenue if base.total_revenue > 0 else 0
    net_income = base.total_revenue - total_tax
    net_income_after_inflation = net_income - base.inflation_amount
    inflation_adjusted_denominator = base.total_revenue - base.inflation_amount
    inflation_adjusted_rate = total_tax / inflation_adjusted_denominator if inflation_adjusted_denominator > 0 else 0
    wealth_growth_rate = net_income_after_inflation / data.portfolio_value if data.portfolio_value > 0 else 0

    return {
        "portfolio_value": data.portfolio_value,
        "shares_value": data.shares_value,
        "bonds_value": data.bonds_value,
        "inflation_rate": data.inflation_rate,
        "inflation_amount": base.inflation_amount,
        "shares_return": data.shares_return,
        "bonds_return": data.bonds_return,
        "dividend_yield": data.dividend_yield,
        "share_dividends": base.share_dividends,
        "share_capital_gains": base.share_capital_gains,
        "share_revenue": base.share_revenue,
        "bond_revenue": base.bond_revenue,
        "capital_gains": base.capital_gains,
        "capital_gains_exemption": taxes["capital_gains_exemption"],
        "taxable_capital_gains": taxes["taxable_capital_gains"],
        "capital_gains_tax": taxes["capital_gains_tax"],
        "dividend_tax": taxes["dividend_tax"],
        "bond_tax": taxes["bond_tax"],
        "wealth_tax": taxes["wealth_tax"],
        "total_tax": total_tax,
        "revenue": base.total_revenue,
        "tax_rate": tax_rate,
        "inflation_adjusted_rate": inflation_adjusted_rate,
        "net_income": net_income,
        "net_income_after_inflation": net_income_after_inflation,
        "wealth_growth_rate": wealth_growth_rate,
    }


def _calculate_belgium(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_exemption = 10000 * data.num_persons
    taxable_capital_gains = max(0.0, base.capital_gains - total_exemption)
    capital_gains_tax = taxable_capital_gains * 0.1
    dividend_tax = base.share_dividends * 0.3
    bond_tax = base.bond_revenue * 0.3
    wealth_tax = data.portfolio_value * data.belgium_wealth_tax_rate
    if data.portfolio_value > 2000000:
        wealth_tax += data.portfolio_value * 0.0015

    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": total_exemption,
            "taxable_capital_gains": taxable_capital_gains,
            "capital_gains_tax": capital_gains_tax,
            "dividend_tax": dividend_tax,
            "bond_tax": bond_tax,
            "wealth_tax": wealth_tax,
        },
    )


def _calculate_belgium_2009(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data, clamp_belgium_2009_capital_gains=True)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": base.share_dividends * 0.15,
            "bond_tax": base.bond_revenue * 0.15,
            "wealth_tax": 0,
        },
    )


def _calculate_usa(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": base.capital_gains,
            "capital_gains_tax": base.capital_gains * 0.15,
            "dividend_tax": base.share_dividends * 0.15,
            "bond_tax": base.bond_revenue * 0.15,
            "wealth_tax": 0,
        },
    )


def _calculate_uk(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_exemption = 2500 * data.num_persons
    taxable_capital_gains = max(0.0, base.capital_gains - total_exemption)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": total_exemption,
            "taxable_capital_gains": taxable_capital_gains,
            "capital_gains_tax": taxable_capital_gains * 0.24,
            "dividend_tax": base.share_dividends * 0.4,
            "bond_tax": base.bond_revenue * 0.4,
            "wealth_tax": 0,
        },
    )


def _calculate_switzerland(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": base.share_dividends * 0.35,
            "bond_tax": base.bond_revenue * 0.35,
            "wealth_tax": data.portfolio_value * 0.0044,
        },
    )


def _calculate_luxembourg(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": base.share_dividends * 0.21,
            "bond_tax": base.bond_revenue * 0.21,
            "wealth_tax": 0,
        },
    )


def _calculate_italy(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": base.capital_gains,
            "capital_gains_tax": base.capital_gains * 0.26,
            "dividend_tax": base.share_dividends * 0.26,
            "bond_tax": base.bond_revenue * 0.26,
            "wealth_tax": 0,
        },
    )


def _calculate_portugal(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": base.capital_gains,
            "capital_gains_tax": base.capital_gains * 0.28,
            "dividend_tax": base.share_dividends * 0.28,
            "bond_tax": base.bond_revenue * 0.28,
            "wealth_tax": 0,
        },
    )


def _calculate_singapore(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": 0,
            "bond_tax": 0,
            "wealth_tax": 0,
        },
    )


def _calculate_hong_kong(data: TaxInputs) -> dict:
    return _calculate_singapore(data)


def _calculate_new_zealand(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": base.share_dividends * 0.28,
            "bond_tax": base.bond_revenue * 0.28,
            "wealth_tax": 0,
        },
    )


def _calculate_uae(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_yield_income = base.share_dividends + base.bond_revenue
    above_threshold = total_yield_income > 88000
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": 0,
            "capital_gains_tax": 0,
            "dividend_tax": base.share_dividends * 0.09 if above_threshold else 0,
            "bond_tax": base.bond_revenue * 0.09 if above_threshold else 0,
            "wealth_tax": 0,
        },
    )


def _calculate_ireland(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_exemption = 1500 * data.num_persons
    taxable_capital_gains = max(0.0, base.capital_gains - total_exemption)
    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": total_exemption,
            "taxable_capital_gains": taxable_capital_gains,
            "capital_gains_tax": taxable_capital_gains * 0.33,
            "dividend_tax": base.share_dividends * 0.54,
            "bond_tax": base.bond_revenue * 0.54,
            "wealth_tax": 0,
        },
    )


def _calculate_netherlands(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_investment_income = base.share_capital_gains + base.share_dividends + base.bond_revenue
    total_allowance = 1800 * data.num_persons
    taxable_income = max(0.0, total_investment_income - total_allowance)
    total_tax = taxable_income * 0.36

    capital_gains_tax = 0.0
    dividend_tax = 0.0
    bond_tax = 0.0
    if total_investment_income > 0:
        tax_ratio = total_tax / total_investment_income
        capital_gains_tax = base.share_capital_gains * tax_ratio
        dividend_tax = base.share_dividends * tax_ratio
        bond_tax = base.bond_revenue * tax_ratio

    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": total_allowance,
            "taxable_capital_gains": taxable_income,
            "capital_gains_tax": capital_gains_tax,
            "dividend_tax": dividend_tax,
            "bond_tax": bond_tax,
            "wealth_tax": 0,
        },
    )


def _calculate_spain_wealth_tax(taxable_wealth: float) -> float:
    brackets = [
        (0, 0, 167129.45, 0.0021),
        (167129.45, 350.97, 167123.43, 0.00315),
        (334252.88, 877.41, 334246.87, 0.00525),
        (668499.75, 2632.21, 668499.76, 0.00945),
        (1336999.51, 8949.54, 1336999.5, 0.01365),
        (2673999.01, 27199.58, 2673999.02, 0.01785),
        (5347998.03, 74930.46, 5347998.03, 0.02205),
        (10695996.06, 192853.82, 9304003.94, 0.0275),
        (20000000.0, 448713.93, float("inf"), 0.0348),
    ]

    wealth_tax = 0.0
    for base, tax_payable, remainder, rate in brackets:
        if taxable_wealth > base:
            amount_in_bracket = min(taxable_wealth - base, remainder)
            wealth_tax = tax_payable + amount_in_bracket * rate
        else:
            break

    return wealth_tax


def _calculate_spain_income_tax(total_investment_income: float, num_persons: int) -> float:
    brackets = [
        (0, 6000, 0.19),
        (6000, 50000, 0.21),
        (50000, 200000, 0.23),
        (200000, 300000, 0.27),
        (300000, float("inf"), 0.27),
    ]

    per_person_income = total_investment_income / num_persons
    remaining = per_person_income
    tax_per_person = 0.0

    for lower, upper, rate in brackets:
        if remaining <= 0:
            break
        bracket_amount = min(remaining, upper - lower)
        tax_per_person += bracket_amount * rate
        remaining -= bracket_amount

    return tax_per_person * num_persons


def _calculate_spain(data: TaxInputs) -> dict:
    base = _compute_base_revenue(data)
    total_investment_income = base.share_capital_gains + base.share_dividends + base.bond_revenue
    total_investment_tax = _calculate_spain_income_tax(total_investment_income, data.num_persons)

    capital_gains_tax = 0.0
    dividend_tax = 0.0
    bond_tax = 0.0
    if total_investment_income > 0:
        tax_ratio = total_investment_tax / total_investment_income
        capital_gains_tax = base.share_capital_gains * tax_ratio
        dividend_tax = base.share_dividends * tax_ratio
        bond_tax = base.bond_revenue * tax_ratio

    wealth_tax = 0.0
    per_person_wealth = data.portfolio_value / data.num_persons
    if per_person_wealth > 500000:
        taxable_wealth = per_person_wealth - 500000
        wealth_tax = _calculate_spain_wealth_tax(taxable_wealth) * data.num_persons

    return _finalize_result(
        data,
        base,
        {
            "capital_gains_exemption": 0,
            "taxable_capital_gains": base.capital_gains,
            "capital_gains_tax": capital_gains_tax,
            "dividend_tax": dividend_tax,
            "bond_tax": bond_tax,
            "wealth_tax": wealth_tax,
        },
    )


def calculate_tax(country: TaxCountry, form: TaxCalculatorInput) -> dict:
    shares_value = form.portfolio_value * (form.shares_allocation_pct / 100)
    bonds_value = form.portfolio_value * ((100 - form.shares_allocation_pct) / 100)

    data = TaxInputs(
        portfolio_value=form.portfolio_value,
        shares_value=shares_value,
        bonds_value=bonds_value,
        inflation_rate=form.inflation_rate_pct / 100,
        shares_return=form.shares_return_pct / 100,
        bonds_return=form.bonds_return_pct / 100,
        dividend_yield=form.dividend_yield_pct / 100,
        num_persons=form.num_persons,
        belgium_wealth_tax_rate=form.belgium_wealth_tax_pct / 100,
    )

    calculators = {
        "Belgium": _calculate_belgium,
        "Belgium 2009": _calculate_belgium_2009,
        "Luxembourg": _calculate_luxembourg,
        "USA": _calculate_usa,
        "Spain": _calculate_spain,
        "UK": _calculate_uk,
        "Switzerland": _calculate_switzerland,
        "Netherlands": _calculate_netherlands,
        "Italy": _calculate_italy,
        "Singapore": _calculate_singapore,
        "New Zealand": _calculate_new_zealand,
        "Ireland": _calculate_ireland,
        "UAE": _calculate_uae,
        "Hong Kong": _calculate_hong_kong,
        "Portugal": _calculate_portugal,
    }

    calculator = calculators.get(country, _calculate_portugal)
    return calculator(data)


def calculate_tax_bundle(form: TaxCalculatorInput) -> dict:
    single_result = calculate_tax(form.country, form)

    country_comparison = []
    for option in TAX_COUNTRY_OPTIONS:
        country = option["value"]
        country_comparison.append(
            {
                "country": country,
                "result": calculate_tax(country, form),
            }
        )

    scenario_comparison = []
    for scenario in TAX_SCENARIOS:
        scenario_form = form.model_copy(
            update={
                "portfolio_value": scenario["portfolio"],
                "shares_allocation_pct": (scenario["shares"] / scenario["portfolio"]) * 100,
                "inflation_rate_pct": scenario["inflation_rate"] * 100,
            }
        )
        scenario_comparison.append(
            {
                "portfolio": scenario["portfolio"],
                "shares": scenario["shares"],
                "bonds": scenario["bonds"],
                "inflation_rate": scenario["inflation_rate"],
                "result": calculate_tax(form.country, scenario_form),
            }
        )

    reference_country = "Belgium"
    if not any(row["country"] == "Belgium" for row in country_comparison):
        reference_country = form.country

    return {
        "single_result": single_result,
        "country_comparison": country_comparison,
        "scenario_comparison": scenario_comparison,
        "reference_country": reference_country,
    }
