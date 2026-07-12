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
  { portfolio: 500000, shares: 300000, bonds: 200000, inflationRate: 0.02 },
  { portfolio: 1000000, shares: 600000, bonds: 400000, inflationRate: 0.02 },
  { portfolio: 1800000, shares: 1080000, bonds: 720000, inflationRate: 0.02 },
  { portfolio: 3000000, shares: 1800000, bonds: 1200000, inflationRate: 0.02 },
  { portfolio: 10000000, shares: 6000000, bonds: 4000000, inflationRate: 0.02 },
] as const;

export const TAX_DEFAULTS = {
  country: "Belgium" as TaxCountry,
  portfolio: 1000000,
  inflationRatePct: 2,
  sharesReturnPct: 7,
  bondsReturnPct: 4,
  dividendYieldPct: 4,
  salaryEur: 0,
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
  salaryEur: number;
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

  // Account tax: 0.15% on portfolio value per person only when > €1M per person
  const perPersonPortfolio = input.portfolioValue / input.numPersons;
  if (perPersonPortfolio > 1000000) {
    wealthTax += (perPersonPortfolio * 0.0015) * input.numPersons;
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
  
  // Basel-Stadt progressive wealth tax per person
  const perPersonWealth = input.portfolioValue / input.numPersons;
  const wealthTaxPerPerson = calculateBaselStadtWealthTax(perPersonWealth);
  const totalWealthTax = wealthTaxPerPerson * input.numPersons;
  
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: base.shareDividends * 0.35,
    bondTax: base.bondRevenue * 0.35,
    wealthTax: totalWealthTax,
  });
}

function calculateLuxembourg(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const personCount = Math.max(1, input.numPersons);
  const totalYieldIncome = base.shareDividends + base.bondRevenue;

  // €1,500 annual deduction per person applies to dividend and bond income.
  const totalDeduction = 1500 * personCount;
  const taxableYieldIncome = Math.max(0, totalYieldIncome - totalDeduction);

  const perPersonSalary = Math.max(0, input.salaryEur) / personCount;
  const perPersonTaxableYield = taxableYieldIncome / personCount;
  const fullTaxPerPerson = calculateLuxembourgIncomeTax(perPersonSalary + perPersonTaxableYield);
  const salaryOnlyTaxPerPerson = calculateLuxembourgIncomeTax(perPersonSalary);
  const investmentTaxPerPerson = Math.max(0, fullTaxPerPerson - salaryOnlyTaxPerPerson);
  const totalInvestmentTax = investmentTaxPerPerson * personCount;

  // Distribute only the investment-linked marginal tax to dividends and bonds.
  let dividendTax = 0;
  let bondTax = 0;
  if (totalYieldIncome > 0) {
    const taxRatio = totalInvestmentTax / totalYieldIncome;
    dividendTax = base.shareDividends * taxRatio;
    bondTax = base.bondRevenue * taxRatio;
  }

  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax,
    bondTax,
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
  // Personal investment income is exempt from taxation in UAE
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: 0,
    capitalGainsTax: 0,
    dividendTax: 0,
    bondTax: 0,
    wealthTax: 0,
  });
}

function calculateIreland(input: TaxInputs): TaxCalculationResult {
  const base = computeBaseRevenue(input);
  const totalInvestmentIncome = base.shareCapitalGains + base.shareDividends + base.bondRevenue;
  // All investment income taxed at 41% flat (ETF exit tax treatment)
  const totalInvestmentTax = totalInvestmentIncome * 0.41;
  
  let capitalGainsTax = 0;
  let dividendTax = 0;
  let bondTax = 0;
  if (totalInvestmentIncome > 0) {
    const taxRatio = 0.41; // Flat 41% on all investment income
    capitalGainsTax = base.shareCapitalGains * taxRatio;
    dividendTax = base.shareDividends * taxRatio;
    bondTax = base.bondRevenue * taxRatio;
  }
  
  return finalizeResult(input, base, {
    capitalGainsExemption: 0,
    taxableCapitalGains: totalInvestmentIncome,
    capitalGainsTax,
    dividendTax,
    bondTax,
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

function calculateLuxembourgIncomeTax(totalIncome: number): number {
  const brackets = [
    [0, 13230, 0.0],
    [13230, 15435, 0.08],
    [15435, 17640, 0.09],
    [17640, 19845, 0.10],
    [19845, 22050, 0.11],
    [22050, 24255, 0.12],
    [24255, 26550, 0.14],
    [26550, 28845, 0.16],
    [28845, 31140, 0.18],
    [31140, 33435, 0.20],
    [33435, 35730, 0.22],
    [35730, 38025, 0.24],
    [38025, 40320, 0.26],
    [40320, 42615, 0.28],
    [42615, 44910, 0.30],
    [44910, 47205, 0.32],
    [47205, 49500, 0.34],
    [49500, 51795, 0.36],
    [51795, 54090, 0.38],
    [54090, 117450, 0.39],
    [117450, 176160, 0.40],
    [176160, 234870, 0.41],
    [234870, Number.POSITIVE_INFINITY, 0.42],
  ] as const;

  let tax = 0;
  let remaining = totalIncome;

  for (const [lower, upper, rate] of brackets) {
    if (remaining <= 0) break;
    const bracketAmount = Math.min(remaining, upper - lower);
    tax += bracketAmount * rate;
    remaining -= bracketAmount;
  }

  // Apply 7% solidarity surcharge on the income tax
  const totalTax = tax * 1.07;
  return totalTax;
}

function calculateBaselStadtWealthTax(wealth: number): number {
  const brackets = [
    [0, 250000, 0.0045],
    [250000, 750000, 0.0065],
    [750000, 2500000, 0.0079],
    [2500000, Number.POSITIVE_INFINITY, 0.0079],
  ] as const;

  for (const [lower, upper, rate] of brackets) {
    if (wealth <= upper) {
      return wealth * rate;
    }
  }
  return wealth * 0.0079;
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
    [300000, Number.POSITIVE_INFINITY, 0.30],
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
  salaryEur: number;
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
    salaryEur: state.salaryEur,
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

export type WealthEvolutionDataPoint = {
  wealth: number;
  countries: {
    [country in TaxCountry]: {
      taxRate: number;
      totalTax: number;
      taxDelta: number;
      rank: number;
    };
  };
};

export function generateWealthEvolutionData(
  formState: TaxCalculatorFormState,
  referenceCountry: TaxCountry = "Belgium",
  numPoints: number = 25,
): WealthEvolutionDataPoint[] {
  // Generate linearly-spaced wealth values from €0 to €5M
  const minWealth = 0;
  const maxWealth = 5000000;
  
  const wealthValues: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    const value = minWealth + (maxWealth - minWealth) * (i / (numPoints - 1));
    wealthValues.push(Math.round(value));
  }

  // Remove duplicates (from rounding)
  const uniqueWealths = Array.from(new Set(wealthValues));

  return uniqueWealths.map((wealth) => {
    // Create form state with this wealth value
    const stateForWealth: TaxCalculatorFormState = {
      ...formState,
      portfolioValue: wealth,
    };

    // Calculate tax for all countries
    const countryResults: Record<string, { taxRate: number; totalTax: number }> = {};
    TAX_COUNTRY_OPTIONS.forEach(({ value: country }) => {
      const result = calculateTax(country, stateForWealth);
      countryResults[country] = {
        taxRate: result.tax_rate,
        totalTax: result.total_tax,
      };
    });

    // Find reference country result for delta calculation
    const referenceResult = countryResults[referenceCountry];
    const referenceTotalTax = referenceResult?.totalTax ?? 0;

    // Calculate rank (1 = lowest tax, 16 = highest tax)
    const countriesWithTax = Object.entries(countryResults).map(([country, data]) => ({
      country,
      totalTax: data.totalTax,
    }));
    const sortedByTax = countriesWithTax.sort((a, b) => a.totalTax - b.totalTax);
    const rankMap: Record<string, number> = {};
    sortedByTax.forEach((item, index) => {
      rankMap[item.country] = index + 1;
    });

    // Build result object
    const countries: WealthEvolutionDataPoint["countries"] = {} as any;
    TAX_COUNTRY_OPTIONS.forEach(({ value: country }) => {
      const data = countryResults[country];
      countries[country] = {
        taxRate: data.taxRate,
        totalTax: data.totalTax,
        taxDelta: data.totalTax - referenceTotalTax,
        rank: rankMap[country],
      };
    });

    return {
      wealth,
      countries,
    };
  });
}
