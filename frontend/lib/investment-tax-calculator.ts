export type TaxCountry =
  | "Belgium"
  | "Luxembourg"
  | "USA"
  | "Spain"
  | "UK"
  | "Switzerland"
  | "Netherlands"
  | "Italy"
  | "Singapore"
  | "New Zealand"
  | "Ireland"
  | "Belgium 2009"
  | "UAE"
  | "Hong Kong"
  | "Portugal";

export const TAX_COUNTRY_OPTIONS: Array<{ label: string; value: TaxCountry }> = [
  { label: "Belgium", value: "Belgium" },
  { label: "Luxembourg", value: "Luxembourg" },
  { label: "USA", value: "USA" },
  { label: "Spain", value: "Spain" },
  { label: "UK", value: "UK" },
  { label: "Switzerland", value: "Switzerland" },
  { label: "Netherlands", value: "Netherlands" },
  { label: "Italy", value: "Italy" },
  { label: "Singapore", value: "Singapore" },
  { label: "New Zealand", value: "New Zealand" },
  { label: "Ireland", value: "Ireland" },
  { label: "Belgium 2009", value: "Belgium 2009" },
  { label: "UAE", value: "UAE" },
  { label: "Hong Kong", value: "Hong Kong" },
  { label: "Portugal", value: "Portugal" },
];

export const TAX_SCENARIOS = [
  { portfolio: 500000, shares: 350000, bonds: 150000, inflationRate: 0.02 },
  { portfolio: 1000000, shares: 700000, bonds: 300000, inflationRate: 0.02 },
  { portfolio: 1800000, shares: 1260000, bonds: 540000, inflationRate: 0.02 },
  { portfolio: 3000000, shares: 2100000, bonds: 900000, inflationRate: 0.02 },
  { portfolio: 10000000, shares: 7000000, bonds: 3000000, inflationRate: 0.02 },
] as const;

export const TAX_DEFAULTS = {
  country: "Belgium" as TaxCountry,
  portfolio: 1000000,
  inflationRatePct: 2,
  sharesReturnPct: 7,
  bondsReturnPct: 4,
  dividendYieldPct: 4,
  numPersons: 1,
  belgiumWealthTaxPct: 1,
  sharesAllocationPct: 70,
};

export type TaxCalculationResult = {
  portfolio_value: number;
  shares_value: number;
  bonds_value: number;
  inflation_rate: number;
  inflation_amount: number;
  shares_return: number;
  bonds_return: number;
  dividend_yield: number;
  share_dividends: number;
  share_capital_gains: number;
  share_revenue: number;
  bond_revenue: number;
  capital_gains: number;
  capital_gains_exemption: number;
  taxable_capital_gains: number;
  capital_gains_tax: number;
  dividend_tax: number;
  bond_tax: number;
  wealth_tax: number;
  total_tax: number;
  revenue: number;
  tax_rate: number;
  inflation_adjusted_rate: number;
  net_income: number;
  net_income_after_inflation: number;
  wealth_growth_rate: number;
};

type TaxInputs = {
  portfolioValue: number;
  sharesValue: number;
  bondsValue: number;
  inflationRate: number;
  sharesReturn: number;
  bondsReturn: number;
  dividendYield: number;
  numPersons: number;
  belgiumWealthTaxRate: number;
};

type BaseRevenue = {
  inflationAmount: number;
  shareDividends: number;
  shareCapitalGains: number;
  shareRevenue: number;
  bondRevenue: number;
  totalRevenue: number;
  capitalGains: number;
};

function computeBaseRevenue(input: TaxInputs, clampBelgium2009CapitalGains = false): BaseRevenue {
  const inflationAmount = input.portfolioValue * input.inflationRate;
  const shareDividends = input.sharesValue * input.dividendYield;
  const shareCapitalGainsRaw = input.sharesValue * (input.sharesReturn - input.dividendYield);
  const shareCapitalGains = clampBelgium2009CapitalGains ? Math.max(0, shareCapitalGainsRaw) : shareCapitalGainsRaw;
  const shareRevenue = shareDividends + shareCapitalGains;
  const bondRevenue = input.bondsValue * input.bondsReturn;
  const totalRevenue = shareRevenue + bondRevenue;

  return {
    inflationAmount,
    shareDividends,
    shareCapitalGains,
    shareRevenue,
    bondRevenue,
    totalRevenue,
    capitalGains: shareCapitalGains,
  };
}

function finalizeResult(
  input: TaxInputs,
  base: BaseRevenue,
  taxes: {
    capitalGainsExemption: number;
    taxableCapitalGains: number;
    capitalGainsTax: number;
    dividendTax: number;
    bondTax: number;
    wealthTax: number;
  },
): TaxCalculationResult {
  const totalTax = taxes.capitalGainsTax + taxes.dividendTax + taxes.bondTax + taxes.wealthTax;
  const taxRate = base.totalRevenue > 0 ? totalTax / base.totalRevenue : 0;
  const netIncome = base.totalRevenue - totalTax;
  const netIncomeAfterInflation = netIncome - base.inflationAmount;
  const inflationAdjustedDenominator = base.totalRevenue - base.inflationAmount;
  const inflationAdjustedRate = inflationAdjustedDenominator > 0 ? totalTax / inflationAdjustedDenominator : 0;
  const wealthGrowthRate = input.portfolioValue > 0 ? netIncomeAfterInflation / input.portfolioValue : 0;

  return {
    portfolio_value: input.portfolioValue,
    shares_value: input.sharesValue,
    bonds_value: input.bondsValue,
    inflation_rate: input.inflationRate,
    inflation_amount: base.inflationAmount,
    shares_return: input.sharesReturn,
    bonds_return: input.bondsReturn,
    dividend_yield: input.dividendYield,
    share_dividends: base.shareDividends,
    share_capital_gains: base.shareCapitalGains,
    share_revenue: base.shareRevenue,
    bond_revenue: base.bondRevenue,
    capital_gains: base.capitalGains,
    capital_gains_exemption: taxes.capitalGainsExemption,
    taxable_capital_gains: taxes.taxableCapitalGains,
    capital_gains_tax: taxes.capitalGainsTax,
    dividend_tax: taxes.dividendTax,
    bond_tax: taxes.bondTax,
    wealth_tax: taxes.wealthTax,
    total_tax: totalTax,
    revenue: base.totalRevenue,
    tax_rate: taxRate,
    inflation_adjusted_rate: inflationAdjustedRate,
    net_income: netIncome,
    net_income_after_inflation: netIncomeAfterInflation,
    wealth_growth_rate: wealthGrowthRate,
  };
}

function calculateBelgium(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalExemption = 10000 * input.numPersons;
  const taxableCapitalGains = Math.max(0, base.capitalGains - totalExemption);
  const capitalGainsTax = taxableCapitalGains * 0.1;
  const dividendTax = base.shareDividends * 0.3;
  const bondTax = base.bondRevenue * 0.3;
  let wealthTax = input.portfolioValue * input.belgiumWealthTaxRate;
  if (input.portfolioValue > 2000000) {
    wealthTax += input.portfolioValue * 0.0015;
  }

  return finalizeResult(input, base, {
    capitalGainsExemption: totalExemption,
    taxableCapitalGains,
    capitalGainsTax,
    dividendTax,
    bondTax,
    wealthTax,
  });
}

function calculateBelgium2009(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input, true);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: base.shareDividends * 0.15,
    bondTax: base.bondRevenue * 0.15,
    wealthTax: 0,
  });
}

function calculateUsa(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: base.capitalGains,
    capitalGainsTax: base.capitalGains * 0.15,
    dividendTax: base.shareDividends * 0.15,
    bondTax: base.bondRevenue * 0.15,
    wealthTax: 0,
  });
}

function calculateUk(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalExemption = 2500 * input.numPersons;
  const taxableCapitalGains = Math.max(0, base.capitalGains - totalExemption);
  return finalizeResult(input, base, {
    capitalGainsExemption: totalExemption,
    taxableCapitalGains,
    capitalGainsTax: taxableCapitalGains * 0.24,
    dividendTax: base.shareDividends * 0.4,
    bondTax: base.bondRevenue * 0.4,
    wealthTax: 0,
  });
}

function calculateSwitzerland(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: base.shareDividends * 0.35,
    bondTax: base.bondRevenue * 0.35,
    wealthTax: input.portfolioValue * 0.0044,
  });
}

function calculateLuxembourg(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: base.shareDividends * 0.21,
    bondTax: base.bondRevenue * 0.21,
    wealthTax: 0,
  });
}

function calculateItaly(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: base.capitalGains,
    capitalGainsTax: base.capitalGains * 0.26,
    dividendTax: base.shareDividends * 0.26,
    bondTax: base.bondRevenue * 0.26,
    wealthTax: 0,
  });
}

function calculatePortugal(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: base.capitalGains,
    capitalGainsTax: base.capitalGains * 0.28,
    dividendTax: base.shareDividends * 0.28,
    bondTax: base.bondRevenue * 0.28,
    wealthTax: 0,
  });
}

function calculateSingapore(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: 0,
    bondTax: 0,
    wealthTax: 0,
  });
}

function calculateHongKong(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: 0,
    bondTax: 0,
    wealthTax: 0,
  });
}

function calculateNewZealand(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: base.shareDividends * 0.28,
    bondTax: base.bondRevenue * 0.28,
    wealthTax: 0,
  });
}

function calculateUae(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalYieldIncome = base.shareDividends + base.bondRevenue;
  const aboveThreshold = totalYieldIncome > 88000;
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: aboveThreshold ? base.shareDividends * 0.09 : 0,
    bondTax: aboveThreshold ? base.bondRevenue * 0.09 : 0,
    wealthTax: 0,
  });
}

function calculateIreland(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalExemption = 1500 * input.numPersons;
  const taxableCapitalGains = Math.max(0, base.capitalGains - totalExemption);
  return finalizeResult(input, base, {
    capitalGainsExemption: totalExemption,
    taxableCapitalGains,
    capitalGainsTax: taxableCapitalGains * 0.33,
    dividendTax: base.shareDividends * 0.54,
    bondTax: base.bondRevenue * 0.54,
    wealthTax: 0,
  });
}

function calculateNetherlands(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalInvestmentIncome = base.shareCapitalGains + base.shareDividends + base.bondRevenue;
  const totalAllowance = 1800 * input.numPersons;
  const taxableIncome = Math.max(0, totalInvestmentIncome - totalAllowance);
  const totalTax = taxableIncome * 0.36;

  let capitalGainsTax = 0;
  let dividendTax = 0;
  let bondTax = 0;
  if (totalInvestmentIncome > 0) {
    const taxRatio = totalTax / totalInvestmentIncome;
    capitalGainsTax = base.shareCapitalGains * taxRatio;
    dividendTax = base.shareDividends * taxRatio;
    bondTax = base.bondRevenue * taxRatio;
  }

  return finalizeResult(input, base, {
    capitalGainsExemption: totalAllowance,
    taxableCapitalGains: taxableIncome,
    capitalGainsTax,
    dividendTax,
    bondTax,
    wealthTax: 0,
  });
}

function calculateSpainWealthTax(taxableWealth: number): number {
  const brackets = [
    [0, 0, 167129.45, 0.0021],
    [167129.45, 350.97, 167123.43, 0.00315],
    [334252.88, 877.41, 334246.87, 0.00525],
    [668499.75, 2632.21, 668499.76, 0.00945],
    [1336999.51, 8949.54, 1336999.5, 0.01365],
    [2673999.01, 27199.58, 2673999.02, 0.01785],
    [5347998.03, 74930.46, 5347998.03, 0.02205],
    [10695996.06, 192853.82, 9304003.94, 0.0275],
    [20000000.0, 448713.93, Number.POSITIVE_INFINITY, 0.0348],
  ] as const;

  let wealthTax = 0;
  for (const [base, taxPayable, remainder, rate] of brackets) {
    if (taxableWealth > base) {
      const amountInBracket = Math.min(taxableWealth - base, remainder);
      wealthTax = taxPayable + amountInBracket * rate;
    } else {
      break;
    }
  }
  return wealthTax;
}

function calculateSpainIncomeTax(totalInvestmentIncome: number, numPersons: number): number {
  const brackets = [
    [0, 6000, 0.19],
    [6000, 50000, 0.21],
    [50000, 200000, 0.23],
    [200000, 300000, 0.27],
    [300000, Number.POSITIVE_INFINITY, 0.27],
  ] as const;

  const perPersonIncome = totalInvestmentIncome / numPersons;
  let remaining = perPersonIncome;
  let taxPerPerson = 0;

  for (const [lower, upper, rate] of brackets) {
    if (remaining <= 0) break;
    const bracketAmount = Math.min(remaining, upper - lower);
    taxPerPerson += bracketAmount * rate;
    remaining -= bracketAmount;
  }

  return taxPerPerson * numPersons;
}

function calculateSpain(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalInvestmentIncome = base.shareCapitalGains + base.shareDividends + base.bondRevenue;
  const totalInvestmentTax = calculateSpainIncomeTax(totalInvestmentIncome, input.numPersons);

  let capitalGainsTax = 0;
  let dividendTax = 0;
  let bondTax = 0;
  if (totalInvestmentIncome > 0) {
    const taxRatio = totalInvestmentTax / totalInvestmentIncome;
    capitalGainsTax = base.shareCapitalGains * taxRatio;
    dividendTax = base.shareDividends * taxRatio;
    bondTax = base.bondRevenue * taxRatio;
  }

  let wealthTax = 0;
  const perPersonWealth = input.portfolioValue / input.numPersons;
  if (perPersonWealth > 500000) {
    const taxableWealth = perPersonWealth - 500000;
    wealthTax = calculateSpainWealthTax(taxableWealth) * input.numPersons;
  }

  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: base.capitalGains,
    capitalGainsTax,
    dividendTax,
    bondTax,
    wealthTax,
  });
}

export type TaxCalculatorFormState = {
  country: TaxCountry;
  portfolioValue: number;
  inflationRatePct: number;
  sharesReturnPct: number;
  bondsReturnPct: number;
  dividendYieldPct: number;
  numPersons: number;
  belgiumWealthTaxPct: number;
  sharesAllocationPct: number;
};

export function calculateTax(country: TaxCountry, state: TaxCalculatorFormState): TaxCalculationResult {
  const sharesValue = state.portfolioValue * (state.sharesAllocationPct / 100);
  const bondsValue = state.portfolioValue * ((100 - state.sharesAllocationPct) / 100);

  const input: TaxInputs = {
    portfolioValue: state.portfolioValue,
    sharesValue,
    bondsValue,
    inflationRate: state.inflationRatePct / 100,
    sharesReturn: state.sharesReturnPct / 100,
    bondsReturn: state.bondsReturnPct / 100,
    dividendYield: state.dividendYieldPct / 100,
    numPersons: state.numPersons,
    belgiumWealthTaxRate: state.belgiumWealthTaxPct / 100,
  };

  switch (country) {
    case "Belgium":
      return calculateBelgium(input);
    case "Belgium 2009":
      return calculateBelgium2009(input);
    case "Luxembourg":
      return calculateLuxembourg(input);
    case "USA":
      return calculateUsa(input);
    case "Spain":
      return calculateSpain(input);
    case "UK":
      return calculateUk(input);
    case "Switzerland":
      return calculateSwitzerland(input);
    case "Netherlands":
      return calculateNetherlands(input);
    case "Italy":
      return calculateItaly(input);
    case "Singapore":
      return calculateSingapore(input);
    case "New Zealand":
      return calculateNewZealand(input);
    case "Ireland":
      return calculateIreland(input);
    case "UAE":
      return calculateUae(input);
    case "Hong Kong":
      return calculateHongKong(input);
    case "Portugal":
    default:
      return calculatePortugal(input);
  }
}
