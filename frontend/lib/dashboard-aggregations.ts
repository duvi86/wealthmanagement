import {
  type Account,
  type MonthlyNetWorth,
  type SupportedCurrency,
  wealthProfile,
} from "@/lib/wealth-mock-data";
import type { WealthFireScenario } from "@/hooks/use-api";

export type TrendResolution = "monthly" | "quarterly" | "yearly";
export type MarketGroup = "Developed" | "Emerging";

const FIRE_TARGET_COLORS = [
  "var(--color-chart-series-6)",
  "var(--color-chart-series-4)",
  "var(--color-chart-series-7)",
  "var(--color-chart-series-8)",
  "var(--color-chart-series-9)",
  "var(--color-chart-series-10)",
];

function getProfileAssumptions(scope: WealthFireScenario["profileScope"]) {
  if (scope === "both") {
    const avgAge =
      wealthProfile.members.reduce((sum, member) => sum + member.currentAge, 0) /
      Math.max(1, wealthProfile.members.length);
    return { currentAge: avgAge };
  }

  const selected = wealthProfile.members.find((member) => member.id === scope) ?? wealthProfile.members[0];
  return { currentAge: selected.currentAge };
}

export function computeFireTargetEur(scenario: WealthFireScenario): number {
  const profile = getProfileAssumptions(scenario.profileScope);
  const baseYear = 2026;
  const yearsToTargetAgeExact = Math.max(0, scenario.targetRetirementAge - profile.currentAge);
  const targetRetirementYear = baseYear + Math.round(yearsToTargetAgeExact);
  const yearsToTargetRetirementYear = Math.max(0, targetRetirementYear - baseYear);
  const inflationToTarget = (1 + scenario.inflationPct / 100) ** yearsToTargetRetirementYear;
  const expenseGapAtRetirement = Math.max(
    0,
    scenario.annualExpensesEur * inflationToTarget - scenario.postRetirementWorkIncomeEur * inflationToTarget,
  );
  const safeWithdrawalRate = Math.max(0.1, scenario.withdrawalRatePct) / 100;
  return Math.round(expenseGapAtRetirement / safeWithdrawalRate);
}

export function computeComparableFireTargetEur(
  scenario: WealthFireScenario,
  fullCurrentNetWorthEur: number,
): number {
  const baseTarget = computeFireTargetEur(scenario);
  const excludedCurrentWealth = Math.max(0, fullCurrentNetWorthEur - scenario.startingPortfolioEur);
  return Math.round(baseTarget + excludedCurrentWealth);
}

export function buildFireTargetSeries(
  fireScenarios: WealthFireScenario[],
  currentNetWorthEur: number,
): Array<{ dataKey: string; name: string; color: string; targetEur: number }> {
  return fireScenarios.map((scenario, index) => ({
    dataKey: `fireScenarioTarget_${scenario.id}`,
    name: scenario.name,
    color: FIRE_TARGET_COLORS[index % FIRE_TARGET_COLORS.length],
    targetEur: computeComparableFireTargetEur(scenario, currentNetWorthEur),
  }));
}

function shiftDateByYears(value: string, years: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year - years}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function filterTrendByPeriod(
  period: string,
  history: MonthlyNetWorth[],
  customStart: string,
  customEnd: string,
): Array<{ period: string; netWorthEur: number }> {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const latestDate = sorted[sorted.length - 1]?.month;

  if (!latestDate) {
    return [];
  }

  const toTrend = (items: MonthlyNetWorth[]) =>
    items.map((point) => ({ period: point.month, netWorthEur: point.netWorthEur }));

  if (period === "ytd") {
    const startOfYear = `${latestDate.slice(0, 4)}-01-01`;
    return toTrend(sorted.filter((point) => point.month >= startOfYear && point.month <= latestDate));
  }

  if (period === "1y") {
    const startDate = shiftDateByYears(latestDate, 1);
    return toTrend(sorted.filter((point) => point.month >= startDate && point.month <= latestDate));
  }

  if (period === "5y") {
    const startDate = shiftDateByYears(latestDate, 5);
    return toTrend(sorted.filter((point) => point.month >= startDate && point.month <= latestDate));
  }

  if (period === "custom") {
    return toTrend(
      sorted.filter((point) => {
        if (customStart && point.month < customStart) return false;
        if (customEnd && point.month > customEnd) return false;
        return true;
      }),
    );
  }

  return toTrend(sorted);
}

export function aggregateTrendByResolution(
  trend: Array<{ period: string; netWorthEur: number }>,
  resolution: TrendResolution,
): Array<{ period: string; netWorthEur: number }> {
  if (resolution === "monthly") {
    return trend;
  }

  const grouped = new Map<string, { period: string; netWorthEur: number }>();
  trend.forEach((point) => {
    const period = point.period;
    const year = period.slice(0, 4);
    const month = Number(period.slice(5, 7));

    if (resolution === "quarterly") {
      const quarter = Math.floor((month - 1) / 3) + 1;
      const key = `${year}-Q${quarter}`;
      const existing = grouped.get(key);
      if (!existing || period > existing.period) {
        grouped.set(key, { period: key, netWorthEur: point.netWorthEur });
      }
      return;
    }

    const key = year;
    const existing = grouped.get(key);
    if (!existing || period > existing.period) {
      grouped.set(key, { period: key, netWorthEur: point.netWorthEur });
    }
  });

  return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export function normalizeMarketType(value: string | undefined): MarketGroup {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Developed";

  if (
    normalized === "developed market"
    || normalized === "developed"
    || normalized === "dm"
    || normalized.includes("develop")
  ) {
    return "Developed";
  }

  if (
    normalized === "emerging market"
    || normalized === "emerging"
    || normalized === "em"
    || normalized.includes("emerg")
  ) {
    return "Emerging";
  }

  return "Developed";
}

export function resolveAllocationBucketForJoint(
  account: Account,
  line?: NonNullable<Account["portfolioLines"]>[number],
): string {
  const rawBucket = line?.allocationBucket ?? account.allocationBucket;
  const rawLabel = line?.label ?? account.accountName;
  const isReitLabel = /\breit\b/i.test(rawLabel ?? "");
  const isCommodityLabel =
    /\b(commodity|commodities|gold|silver|platinum|palladium|oil|brent|wti|gas|natural gas|copper)\b/i.test(
      rawLabel ?? "",
    );

  if (rawBucket === "REIT") return "REIT";
  if (rawBucket === "Commodities") return "Commodities";
  if (rawBucket === "Stocks" && isReitLabel) return "REIT";
  if (rawBucket === "Stocks" && isCommodityLabel) return "Commodities";
  if (account.type === "Property") return "Real Estate";
  if (rawBucket) return rawBucket;

  return account.type === "Investment"
    ? "Stocks"
    : account.type === "Private Equity"
      ? "Private Equity"
      : account.type === "Cryptocurrency"
        ? "Crypto"
        : account.type === "Savings"
          ? "Savings"
          : "Cash";
}

export const JOINT_MARKET_ORDER: MarketGroup[] = ["Developed", "Emerging"];
export const JOINT_CURRENCY_ORDER: SupportedCurrency[] = ["EUR", "USD", "CHF"];
