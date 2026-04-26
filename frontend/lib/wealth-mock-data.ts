export type Person = {
  id: string;
  name: string;
};

export type AccountType =
  | "Cash"
  | "Savings"
  | "Investment"
  | "Private Equity"
  | "Property"
  | "Loan"
  | "Cryptocurrency";

export type AllocationBucket =
  | "Cash"
  | "Savings"
  | "Stocks"
  | "Bonds"
  | "REIT"
  | "Loan"
  | "Real Estate"
  | "Commodities"
  | "Crypto"
  | "Private Equity";

export type SupportedCurrency = "EUR" | "USD" | "CHF";

export type PortfolioLine = {
  id: string;
  label: string;
  allocationBucket: AllocationBucket;
  currency: SupportedCurrency;
  nativeAmount: number;
  fxToEur: number;
  expectedReturnPct: number;
};

export type MortgageType = "Fixed" | "Variable";

export type MortgageDetails = {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  startDate: string; // "YYYY-MM"
  mortgageType: MortgageType;
};

export type LiabilityExposure = {
  category: "Mortgage" | "Consumption" | "Tax Credit" | "Other";
  amountEur: number;
};

export type Account = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownershipSplit?: Array<{
    ownerId: string;
    ownerName: string;
    sharePct: number;
  }>;
  accountName: string;
  institution: string;
  type: AccountType;
  currency: SupportedCurrency;
  nativeBalance: number;
  fxToEur: number;
  expectedReturnPct: number;
  allocationBucket?: AllocationBucket;
  portfolioLines?: PortfolioLine[];
  mortgage?: MortgageDetails;
  updatedAt: string;
};

export type MonthlyNetWorth = {
  month: string;
  netWorthEur: number;
};

export type TrendGranularity = "monthly" | "quarterly" | "yearly" | "ytd";
export type YearSelection = number | "all";

export const householdName = "Sylvie and Matthieu";

export const wealthProfile = {
  primaryPersonName: "Sylvie",
  members: [
    { id: "p-1", name: "Sylvie", currentAge: 38, expectedLifetime: 92 },
    { id: "p-2", name: "Matthieu", currentAge: 41, expectedLifetime: 90 },
  ],
};

export const people: Person[] = [
  { id: "p-1", name: "Sylvie" },
  { id: "p-2", name: "Matthieu" },
];

export const defaultAccounts: Account[] = [
  {
    id: "a-1",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "Main Checking",
    institution: "BNP Paribas",
    type: "Cash",
    currency: "EUR",
    nativeBalance: 14200,
    fxToEur: 1,
    expectedReturnPct: 1.0,
    allocationBucket: "Cash",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-2",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "Emergency Savings",
    institution: "Boursorama",
    type: "Savings",
    currency: "EUR",
    nativeBalance: 48500,
    fxToEur: 1,
    expectedReturnPct: 2.5,
    allocationBucket: "Savings",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-3",
    ownerId: "p-2",
    ownerName: "Matthieu",
    accountName: "Broker Portfolio",
    institution: "Interactive Brokers",
    type: "Investment",
    currency: "USD",
    nativeBalance: 102000,
    fxToEur: 0.92,
    expectedReturnPct: 7.0,
    allocationBucket: "Stocks",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-4",
    ownerId: "p-2",
    ownerName: "Matthieu",
    accountName: "Swiss ETF Bucket",
    institution: "Swissquote",
    type: "Investment",
    currency: "CHF",
    nativeBalance: 35500,
    fxToEur: 1.03,
    expectedReturnPct: 4.5,
    allocationBucket: "Bonds",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-5",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "Primary Home",
    institution: "Manual valuation",
    type: "Property",
    currency: "EUR",
    nativeBalance: 430000,
    fxToEur: 1,
    expectedReturnPct: 3.0,
    allocationBucket: "Real Estate",
    updatedAt: "2026-04-01",
  },
  {
    id: "a-6",
    ownerId: "p-2",
    ownerName: "Matthieu",
    accountName: "Home Mortgage",
    institution: "Credit Agricole",
    type: "Loan",
    currency: "EUR",
    nativeBalance: -248000,
    fxToEur: 1,
    expectedReturnPct: 0.0,
    mortgage: {
      principal: 280000,
      annualRatePct: 2.15,
      termMonths: 300,
      startDate: "2021-03",
      mortgageType: "Fixed",
    },
    updatedAt: "2026-04-01",
  },
  {
    id: "a-7",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "Crypto Wallet",
    institution: "Ledger",
    type: "Cryptocurrency",
    currency: "USD",
    nativeBalance: 12200,
    fxToEur: 0.92,
    expectedReturnPct: 9.0,
    allocationBucket: "Crypto",
    updatedAt: "2026-04-09",
  },
  {
    id: "a-8",
    ownerId: "p-2",
    ownerName: "Matthieu",
    accountName: "Global Bond Fund",
    institution: "Interactive Brokers",
    type: "Investment",
    currency: "USD",
    nativeBalance: 18400,
    fxToEur: 0.92,
    expectedReturnPct: 4.0,
    allocationBucket: "Bonds",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-9",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "European REIT ETF",
    institution: "Boursorama",
    type: "Investment",
    currency: "EUR",
    nativeBalance: 9600,
    fxToEur: 1,
    expectedReturnPct: 5.0,
    allocationBucket: "REIT",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-10",
    ownerId: "p-2",
    ownerName: "Matthieu",
    accountName: "Gold ETC",
    institution: "Interactive Brokers",
    type: "Investment",
    currency: "USD",
    nativeBalance: 8200,
    fxToEur: 0.92,
    expectedReturnPct: 3.5,
    allocationBucket: "Commodities",
    updatedAt: "2026-04-10",
  },
  {
    id: "a-11",
    ownerId: "p-1",
    ownerName: "Sylvie",
    accountName: "PE Co-Invest",
    institution: "Private Fund",
    type: "Investment",
    currency: "EUR",
    nativeBalance: 15400,
    fxToEur: 1,
    expectedReturnPct: 8.5,
    allocationBucket: "Private Equity",
    updatedAt: "2026-04-10",
  },
];

export const liabilityExposureData: LiabilityExposure[] = [
  { category: "Mortgage", amountEur: 248000 },
  { category: "Consumption", amountEur: 6200 },
  { category: "Tax Credit", amountEur: 3400 },
  { category: "Other", amountEur: 1800 },
];

export const monthlyNetWorthHistory: MonthlyNetWorth[] = [
  { month: "2024-01", netWorthEur: 198000 },
  { month: "2024-02", netWorthEur: 200500 },
  { month: "2024-03", netWorthEur: 203000 },
  { month: "2024-04", netWorthEur: 205200 },
  { month: "2024-05", netWorthEur: 207100 },
  { month: "2024-06", netWorthEur: 209400 },
  { month: "2024-07", netWorthEur: 211300 },
  { month: "2024-08", netWorthEur: 214000 },
  { month: "2024-09", netWorthEur: 216700 },
  { month: "2024-10", netWorthEur: 220100 },
  { month: "2024-11", netWorthEur: 223500 },
  { month: "2024-12", netWorthEur: 227000 },
  { month: "2025-01", netWorthEur: 229500 },
  { month: "2025-02", netWorthEur: 231000 },
  { month: "2025-03", netWorthEur: 232900 },
  { month: "2025-04", netWorthEur: 234600 },
  { month: "2025-05", netWorthEur: 235000 },
  { month: "2025-06", netWorthEur: 238500 },
  { month: "2025-07", netWorthEur: 241200 },
  { month: "2025-08", netWorthEur: 246900 },
  { month: "2025-09", netWorthEur: 250400 },
  { month: "2025-10", netWorthEur: 254000 },
  { month: "2025-11", netWorthEur: 259600 },
  { month: "2025-12", netWorthEur: 263800 },
  { month: "2026-01", netWorthEur: 268500 },
  { month: "2026-02", netWorthEur: 273100 },
  { month: "2026-03", netWorthEur: 277800 },
  { month: "2026-04", netWorthEur: 283500 },
];

export const accountHistoryById: Record<string, Array<{ month: string; balanceEur: number }>> = {
  "a-1": [
    { month: "2025-11", balanceEur: 12000 },
    { month: "2025-12", balanceEur: 12500 },
    { month: "2026-01", balanceEur: 12800 },
    { month: "2026-02", balanceEur: 13200 },
    { month: "2026-03", balanceEur: 13600 },
    { month: "2026-04", balanceEur: 14200 },
  ],
  "a-2": [
    { month: "2025-11", balanceEur: 44000 },
    { month: "2025-12", balanceEur: 45000 },
    { month: "2026-01", balanceEur: 46000 },
    { month: "2026-02", balanceEur: 47000 },
    { month: "2026-03", balanceEur: 47800 },
    { month: "2026-04", balanceEur: 48500 },
  ],
  "a-3": [
    { month: "2025-11", balanceEur: 86000 },
    { month: "2025-12", balanceEur: 87500 },
    { month: "2026-01", balanceEur: 88200 },
    { month: "2026-02", balanceEur: 89600 },
    { month: "2026-03", balanceEur: 91500 },
    { month: "2026-04", balanceEur: 93840 },
  ],
};

export function toEur(account: Account): number {
  if (account.portfolioLines?.length) {
    return account.portfolioLines.reduce((sum, line) => sum + line.nativeAmount * line.fxToEur, 0);
  }
  return account.nativeBalance * account.fxToEur;
}

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function computeTotals(accounts: Account[]) {
  const assets = accounts
    .filter((a) => a.nativeBalance >= 0)
    .reduce((sum, account) => sum + toEur(account), 0);
  const liabilities = Math.abs(
    accounts
      .filter((a) => a.nativeBalance < 0)
      .reduce((sum, account) => sum + toEur(account), 0),
  );
  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}

export function byType(accounts: Account[]) {
  const map = new Map<string, number>();
  accounts.forEach((account) => {
    const key = account.type;
    const current = map.get(key) ?? 0;
    map.set(key, current + toEur(account));
  });
  return Array.from(map.entries()).map(([type, amountEur]) => ({
    type,
    amountEur: Math.round(amountEur),
  }));
}

export function byAllocationBucket(accounts: Account[]) {
  const map = new Map<string, number>();
  accounts.forEach((account) => {
    if (account.portfolioLines?.length) {
      account.portfolioLines.forEach((line) => {
        const current = map.get(line.allocationBucket) ?? 0;
        map.set(line.allocationBucket, current + line.nativeAmount * line.fxToEur);
      });
      return;
    }

    if (account.nativeBalance <= 0) return;
    const key =
      account.allocationBucket ??
      (account.type === "Investment"
        ? "Stocks"
        : account.type === "Private Equity"
          ? "Private Equity"
          : account.type === "Property"
            ? "Real Estate"
            : account.type === "Cryptocurrency"
              ? "Crypto"
              : account.type === "Savings"
                ? "Savings"
                : "Cash");
    const current = map.get(key) ?? 0;
    map.set(key, current + toEur(account));
  });
  return Array.from(map.entries()).map(([bucket, amountEur]) => ({
    bucket,
    amountEur: Math.round(amountEur),
  }));
}

function parseYear(month: string): number {
  return Number(month.slice(0, 4));
}

function parseMonthIndex(month: string): number {
  return Number(month.slice(5, 7)) - 1;
}

function monthShort(month: string): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[parseMonthIndex(month)] ?? month;
}

export function availableYears(history: MonthlyNetWorth[] = monthlyNetWorthHistory): number[] {
  const years = Array.from(new Set(history.map((point) => parseYear(point.month))));
  years.sort((a, b) => a - b);
  return years;
}

export function buildNetWorthTrendData(
  granularity: TrendGranularity,
  yearSelection: YearSelection,
  history: MonthlyNetWorth[] = monthlyNetWorthHistory,
): Array<{ period: string; netWorthEur: number }> {
  const normalized = [...history].sort((a, b) => a.month.localeCompare(b.month));
  if (granularity === "ytd") {
    const currentYear = parseYear(normalized[normalized.length - 1]?.month ?? "2026-01");
    return normalized
      .filter((point) => parseYear(point.month) === currentYear)
      .map((point) => ({
        period: monthShort(point.month),
        netWorthEur: point.netWorthEur,
      }));
  }

  const filtered =
    yearSelection === "all"
      ? normalized
      : normalized.filter((point) => parseYear(point.month) === yearSelection);

  if (granularity === "monthly") {
    return filtered.map((point) => ({
      period: yearSelection === "all" ? point.month : monthShort(point.month),
      netWorthEur: point.netWorthEur,
    }));
  }

  if (granularity === "quarterly") {
    const quarterMap = new Map<string, MonthlyNetWorth>();
    filtered.forEach((point) => {
      const year = parseYear(point.month);
      const quarter = Math.floor(parseMonthIndex(point.month) / 3) + 1;
      const key = `${year}-Q${quarter}`;
      const existing = quarterMap.get(key);
      if (!existing || point.month > existing.month) {
        quarterMap.set(key, point);
      }
    });
    return Array.from(quarterMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, point]) => ({
        period: yearSelection === "all" ? key : key.slice(5),
        netWorthEur: point.netWorthEur,
      }));
  }

  const yearMap = new Map<number, MonthlyNetWorth>();
  filtered.forEach((point) => {
    const year = parseYear(point.month);
    const existing = yearMap.get(year);
    if (!existing || point.month > existing.month) {
      yearMap.set(year, point);
    }
  });

  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, point]) => ({
      period: String(year),
      netWorthEur: point.netWorthEur,
    }));
}

export function withFireTargets(
  trend: Array<{ period: string; netWorthEur: number }>,
): Array<{ period: string; netWorthEur: number; fireTargetBaseEur: number; fireTargetStretchEur: number }> {
  if (trend.length === 0) return [];

  const firstValue = trend[0].netWorthEur;
  return trend.map((point, idx) => ({
    ...point,
    // Base and stretch trajectories for FIRE planning overlays in Slice A UX.
    fireTargetBaseEur: Math.round(firstValue + idx * 3200),
    fireTargetStretchEur: Math.round(firstValue + idx * 4700),
  }));
}

export function byCurrency(accounts: Account[]) {
  const map = new Map<string, number>();
  accounts.forEach((account) => {
    const current = map.get(account.currency) ?? 0;
    map.set(account.currency, current + account.nativeBalance);
  });
  return Array.from(map.entries()).map(([currency, amount]) => ({
    currency,
    amount: Math.round(amount),
  }));
}

export type NetWorthSnapshot = {
  id: string;
  date: string;
  netWorthEur: number;
  assetsEur: number;
  liabilitiesEur: number;
  note: string;
};

export type FireScenario = {
  id: string;
  name: string;
  status: "On Track" | "Lagging" | "Reached" | "At Risk";
  annualIncomeEur: number;
  annualExpensesEur: number;
  returnPct: number;
  taxRatePct: number;
  inflationPct: number;
  withdrawalRatePct: number;
  profileScope: "p-1" | "p-2" | "both";
  targetRetirementAge: number;
  postRetirementWorkIncomeEur: number;
  capitalStrategy: "protect" | "deplete";
  startingPortfolioEur: number;
  retirementYears: number;
  yearsToFire: number;
  fireYear: number;
  successRatePct: number;
  projectedPortfolioEur: number;
  fireNumberEur: number;
  retirementYearGap: number;
  altYearsToFire?: number;
  altFireYear?: number;
  altRetirementYearGap?: number;
  retirementAmountGap: number;
  chartSeries: Array<{ period: string; portfolioEur: number }>;
  accountIds: string[];
};

export type FinancialDecision = {
  id: string;
  date: string;
  author: string;
  type: "Strategy" | "Purchase" | "Rebalance" | "Investment" | "Other";
  title: string;
  description: string;
  relatedScenario?: string;
};

export const netWorthSnapshots: NetWorthSnapshot[] = [
  {
    id: "s-2026-04",
    date: "2026-04-30",
    netWorthEur: 283500,
    assetsEur: 531500,
    liabilitiesEur: 248000,
    note: "Quarter close with bonus allocation into savings and ETF buckets.",
  },
  {
    id: "s-2026-03",
    date: "2026-03-31",
    netWorthEur: 277800,
    assetsEur: 525800,
    liabilitiesEur: 248000,
    note: "No major changes, market drift positive.",
  },
  {
    id: "s-2026-02",
    date: "2026-02-28",
    netWorthEur: 273100,
    assetsEur: 521100,
    liabilitiesEur: 248000,
    note: "Mortgage principal decreased and CHF account appreciated.",
  },
  {
    id: "s-2026-01",
    date: "2026-01-31",
    netWorthEur: 268500,
    assetsEur: 516500,
    liabilitiesEur: 248000,
    note: "Year reset baseline.",
  },
  {
    id: "s-2025-12",
    date: "2025-12-31",
    netWorthEur: 263800,
    assetsEur: 511800,
    liabilitiesEur: 248000,
    note: "Year-end valuation.",
  },
  {
    id: "s-2025-11",
    date: "2025-11-30",
    netWorthEur: 259600,
    assetsEur: 507600,
    liabilitiesEur: 248000,
    note: "Investment gains in USD accounts.",
  },
];

export const fireScenarios: FireScenario[] = [
  {
    id: "f-1",
    name: "Conservative",
    status: "On Track",
    annualIncomeEur: 128000,
    annualExpensesEur: 68000,
    returnPct: 5.2,
    taxRatePct: 24,
    inflationPct: 2,
    withdrawalRatePct: 3.5,
    profileScope: "both",
    targetRetirementAge: 52,
    postRetirementWorkIncomeEur: 12000,
    capitalStrategy: "protect",
    startingPortfolioEur: 283500,
    retirementYears: 35,
    yearsToFire: 14.8,
    fireYear: 2041,
    successRatePct: 91,
    projectedPortfolioEur: 1610000,
    fireNumberEur: 1943000,
    retirementYearGap: 0,
    retirementAmountGap: -333000,
    chartSeries: [
      { period: "2026", portfolioEur: 283500 },
      { period: "2028", portfolioEur: 420000 },
      { period: "2030", portfolioEur: 560000 },
      { period: "2032", portfolioEur: 735000 },
      { period: "2034", portfolioEur: 930000 },
      { period: "2036", portfolioEur: 1130000 },
      { period: "2038", portfolioEur: 1335000 },
      { period: "2040", portfolioEur: 1520000 },
      { period: "2041", portfolioEur: 1610000 },
    ],
  },
  {
    id: "f-2",
    name: "Balanced",
    status: "On Track",
    annualIncomeEur: 135000,
    annualExpensesEur: 70000,
    returnPct: 6.3,
    taxRatePct: 24,
    inflationPct: 2,
    withdrawalRatePct: 3.8,
    profileScope: "both",
    targetRetirementAge: 50,
    postRetirementWorkIncomeEur: 12000,
    capitalStrategy: "protect",
    startingPortfolioEur: 283500,
    retirementYears: 32,
    yearsToFire: 12.9,
    fireYear: 2039,
    successRatePct: 88,
    projectedPortfolioEur: 1480000,
    fireNumberEur: 1842000,
    retirementYearGap: 0,
    retirementAmountGap: -362000,
    chartSeries: [
      { period: "2026", portfolioEur: 283500 },
      { period: "2028", portfolioEur: 448000 },
      { period: "2030", portfolioEur: 620000 },
      { period: "2032", portfolioEur: 822000 },
      { period: "2034", portfolioEur: 1030000 },
      { period: "2036", portfolioEur: 1240000 },
      { period: "2038", portfolioEur: 1410000 },
      { period: "2039", portfolioEur: 1480000 },
    ],
  },
  {
    id: "f-3",
    name: "Growth",
    status: "Lagging",
    annualIncomeEur: 138000,
    annualExpensesEur: 70000,
    returnPct: 7.1,
    taxRatePct: 26,
    inflationPct: 2.2,
    withdrawalRatePct: 4,
    profileScope: "both",
    targetRetirementAge: 48,
    postRetirementWorkIncomeEur: 10000,
    capitalStrategy: "deplete",
    startingPortfolioEur: 283500,
    retirementYears: 30,
    yearsToFire: 11.4,
    fireYear: 2037,
    successRatePct: 80,
    projectedPortfolioEur: 1380000,
    fireNumberEur: 1750000,
    retirementYearGap: 1,
    retirementAmountGap: -370000,
    chartSeries: [
      { period: "2026", portfolioEur: 283500 },
      { period: "2028", portfolioEur: 470000 },
      { period: "2030", portfolioEur: 675000 },
      { period: "2032", portfolioEur: 905000 },
      { period: "2034", portfolioEur: 1145000 },
      { period: "2036", portfolioEur: 1310000 },
      { period: "2037", portfolioEur: 1380000 },
    ],
  },
];

export const decisionsMock: FinancialDecision[] = [
  {
    id: "d-1",
    date: "2026-04-12",
    author: "Sylvie",
    type: "Strategy",
    title: "Increase monthly ETF contribution",
    description: "Move 800 EUR/month from checking to ETF basket starting May.",
    relatedScenario: "Balanced",
  },
  {
    id: "d-2",
    date: "2026-03-20",
    author: "Matthieu",
    type: "Rebalance",
    title: "Reduce crypto exposure",
    description: "Cap crypto at 4% of total assets and redirect excess to bonds.",
    relatedScenario: "Conservative",
  },
  {
    id: "d-3",
    date: "2026-02-15",
    author: "Sylvie",
    type: "Purchase",
    title: "Home insulation work",
    description: "Approved efficiency renovation with 9k EUR expected payback in 6 years.",
  },
  {
    id: "d-4",
    date: "2026-01-08",
    author: "Matthieu",
    type: "Investment",
    title: "Add REIT allocation",
    description: "Initiated 200 EUR/month DCA into REIT ETF for diversification.",
    relatedScenario: "Balanced",
  },
];
