"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { TemporalFilter } from "@/components/ui/temporal-filter";
import {
  byAllocationBucket,
  computeTotals,
  formatMoney,
  toEur,
  type MonthlyNetWorth,
  type SupportedCurrency,
  wealthProfile,
  type Account,
} from "@/lib/wealth-mock-data";
import { Skeleton } from "@/components/ui/loading";
import { useWealthAccounts, useWealthFireScenarios, type WealthFireScenario } from "@/hooks/use-api";

type TrendResolution = "monthly" | "quarterly" | "yearly";
type MarketGroup = "Developed" | "Emerging";

const JOINT_MARKET_ORDER: MarketGroup[] = ["Developed", "Emerging"];
const JOINT_CURRENCY_ORDER: SupportedCurrency[] = ["EUR", "USD", "CHF"];

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

function computeFireTargetEur(scenario: WealthFireScenario): number {
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

function computeComparableFireTargetEur(scenario: WealthFireScenario, fullCurrentNetWorthEur: number): number {
  const baseTarget = computeFireTargetEur(scenario);
  // Dashboard trend uses full household net worth; add back scenario-excluded wealth for apples-to-apples comparison.
  const excludedCurrentWealth = Math.max(0, fullCurrentNetWorthEur - scenario.startingPortfolioEur);
  return Math.round(baseTarget + excludedCurrentWealth);
}

function shiftDateByYears(value: string, years: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year - years}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function filterTrendByPeriod(
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

function aggregateTrendByResolution(
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

function normalizeMarketType(value: string | undefined): MarketGroup {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Developed";

  if (
    normalized === "developed market" ||
    normalized === "developed" ||
    normalized === "dm" ||
    normalized.includes("develop")
  ) {
    return "Developed";
  }

  if (
    normalized === "emerging market" ||
    normalized === "emerging" ||
    normalized === "em" ||
    normalized.includes("emerg")
  ) {
    return "Emerging";
  }

  return "Developed";
}

function resolveAllocationBucketForJoint(account: Account, line?: NonNullable<Account["portfolioLines"]>[number]): string {
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

export default function WealthDashboardPage() {
  const { data: rawAccounts = [], isLoading: accountsLoading, isError: accountsError } = useWealthAccounts();
  const { data: rawFireScenarios = [] } = useWealthFireScenarios();
  const accounts = rawAccounts as Account[];
  const fireScenarios = rawFireScenarios as WealthFireScenario[];
  const isLoading = accountsLoading;
  const isError = accountsError;

  const toDateKey = (date: string): string => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  };

  // Build net worth history from full account inventory dates.
  const monthlyNetWorthHistory = useMemo<MonthlyNetWorth[]>(
    () => {
      const byDate = new Map<string, Account[]>();
      accounts.forEach((account) => {
        const date = toDateKey(account.updatedAt);
        if (!date) {
          return;
        }
        byDate.set(date, [...(byDate.get(date) ?? []), account]);
      });

      return Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, datedAccounts]) => ({
          month: date,
          netWorthEur: computeTotals(datedAccounts).netWorth,
        }));
    },
    [accounts],
  );

  const [trendPeriod, setTrendPeriod] = useState("ytd");
  const [trendResolution, setTrendResolution] = useState<TrendResolution>("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const latestInventoryDate = useMemo(() => {
    const latest = accounts.reduce<{ key: string; ts: number } | null>((currentLatest, account) => {
      const dateKey = toDateKey(account.updatedAt);
      if (!dateKey) {
        return currentLatest;
      }
      const ts = new Date(dateKey).getTime();
      if (!currentLatest || ts > currentLatest.ts) {
        return { key: dateKey, ts };
      }
      return currentLatest;
    }, null);

    return latest?.key ?? null;
  }, [accounts]);
  const latestDateAccounts = useMemo(
    () => accounts.filter((account) => toDateKey(account.updatedAt) === latestInventoryDate),
    [accounts, latestInventoryDate],
  );
  const totals = computeTotals(latestDateAccounts);
  const ytdWindow = useMemo(() => {
    const latestYear = latestInventoryDate?.slice(0, 4);
    const yearPoints = latestYear
      ? monthlyNetWorthHistory.filter((point) => point.month.startsWith(`${latestYear}-`))
      : [];
    if (yearPoints.length === 0) {
      return null;
    }
    return {
      start: yearPoints[0],
      end: yearPoints[yearPoints.length - 1],
    };
  }, [latestInventoryDate, monthlyNetWorthHistory]);
  const ytdDelta = useMemo(() => {
    if (!ytdWindow) {
      return 0;
    }
    return ytdWindow.end.netWorthEur - ytdWindow.start.netWorthEur;
  }, [ytdWindow]);
  const periodFilteredTrend = useMemo(
    () => filterTrendByPeriod(trendPeriod, monthlyNetWorthHistory, customStartDate, customEndDate),
    [customEndDate, customStartDate, trendPeriod, monthlyNetWorthHistory],
  );
  const trendData = useMemo(
    () => aggregateTrendByResolution(periodFilteredTrend, trendResolution),
    [periodFilteredTrend, trendResolution],
  );
  const fireTargetSeries = useMemo(
    () =>
      fireScenarios.map((scenario, index) => ({
        dataKey: `fireScenarioTarget_${scenario.id}`,
        name: scenario.name,
        color: FIRE_TARGET_COLORS[index % FIRE_TARGET_COLORS.length],
        targetEur: computeComparableFireTargetEur(scenario, totals.netWorth),
      })),
    [fireScenarios, totals.netWorth],
  );
  const trendWithTargets = useMemo(
    () =>
      trendData.map((point) => {
        const row: Record<string, string | number> = {
          ...point,
        };
        fireTargetSeries.forEach((series) => {
          row[series.dataKey] = series.targetEur;
        });
        return row;
      }),
    [fireTargetSeries, trendData],
  );
  const allocationData = useMemo(() => byAllocationBucket(latestDateAccounts), [latestDateAccounts]);
  const jointExposure = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();
    const dynamicColumns = new Set<string>();

    const addValue = (assetClass: string, market: MarketGroup, currency: string, amountEur: number) => {
      if (amountEur <= 0) return;
      const normalizedCurrency = (currency || "Unknown").toUpperCase();
      const column = `${market}-${normalizedCurrency}`;
      dynamicColumns.add(column);

      const row = matrix.get(assetClass) ?? new Map<string, number>();
      row.set(column, (row.get(column) ?? 0) + amountEur);
      matrix.set(assetClass, row);
    };

    latestDateAccounts.forEach((account) => {
      if (account.type === "Loan") {
        return;
      }

      if (account.portfolioLines?.length) {
        account.portfolioLines.forEach((line) => {
          const amountEur = Number(line.nativeAmount) * Number(line.fxToEur);
          const bucket = resolveAllocationBucketForJoint(account, line);
          const marketType = (line as { marketType?: string; market_type?: string }).marketType
            ?? (line as { marketType?: string; market_type?: string }).market_type;
          addValue(bucket, normalizeMarketType(marketType), String(line.currency ?? account.currency), amountEur);
        });
        return;
      }

      const amountEur = toEur(account);
      if (amountEur <= 0) {
        return;
      }
      const bucket = resolveAllocationBucketForJoint(account);
      addValue(bucket, "Developed", String(account.currency), amountEur);
    });

    const orderedBaseColumns = JOINT_MARKET_ORDER.flatMap((market) =>
      JOINT_CURRENCY_ORDER.map((currency) => `${market}-${currency}`),
    );
    const extraColumns = Array.from(dynamicColumns)
      .filter((column) => !orderedBaseColumns.includes(column))
      .sort((a, b) => a.localeCompare(b));
    const columns = [...orderedBaseColumns, ...extraColumns];

    const rowTotals = new Map<string, number>();
    matrix.forEach((row, assetClass) => {
      const total = Array.from(row.values()).reduce((sum, value) => sum + value, 0);
      rowTotals.set(assetClass, total);
    });

    const totalEur = Array.from(rowTotals.values()).reduce((sum, value) => sum + value, 0);
    const activeRows = Array.from(matrix.keys());
    const expectedCellPct = activeRows.length > 0 && columns.length > 0 ? 100 / (activeRows.length * columns.length) : 0;

    const rows = activeRows
      .map((assetClass) => {
        const row = matrix.get(assetClass) ?? new Map<string, number>();
        const rowTotalEur = rowTotals.get(assetClass) ?? 0;
        const cells = columns.map((column) => {
          const amountEur = row.get(column) ?? 0;
          const pct = totalEur > 0 ? (amountEur / totalEur) * 100 : 0;
          const deviationPct = pct - expectedCellPct;
          return {
            column,
            amountEur,
            pct,
            expectedPct: expectedCellPct,
            deviationPct,
            absDeviationPct: Math.abs(deviationPct),
          };
        });

        return {
          assetClass,
          rowTotalEur,
          rowPct: totalEur > 0 ? (rowTotalEur / totalEur) * 100 : 0,
          cells,
        };
      })
      .sort((a, b) => b.rowTotalEur - a.rowTotalEur);

    const maxCellPct = rows.flatMap((row) => row.cells.map((cell) => cell.pct)).reduce((max, value) => Math.max(max, value), 0);

    const topImbalances = rows
      .flatMap((row) =>
        row.cells.map((cell) => ({
          assetClass: row.assetClass,
          column: cell.column,
          deviationPct: cell.deviationPct,
          absDeviationPct: cell.absDeviationPct,
        })),
      )
      .filter((item) => item.absDeviationPct > 0.1)
      .sort((a, b) => b.absDeviationPct - a.absDeviationPct)
      .slice(0, 3);

    const scorePenalty = rows
      .flatMap((row) => row.cells.map((cell) => cell.absDeviationPct))
      .reduce((sum, value) => sum + value, 0);
    const score = Math.max(0, Math.min(100, Math.round(100 - scorePenalty)));

    return {
      columns,
      rows,
      totalEur,
      expectedCellPct,
      maxCellPct,
      score,
      topImbalances,
    };
  }, [latestDateAccounts]);
  const liabilityData = useMemo(() => {
    const byCategory = new Map<string, number>();

    latestDateAccounts.forEach((account) => {
      const amountEur = toEur(account);
      if (amountEur >= 0) {
        return;
      }

      const category = account.mortgage ? "Mortgages" : "Other";
      byCategory.set(category, (byCategory.get(category) ?? 0) - Math.abs(amountEur));
    });

    if (byCategory.size === 0) {
      return [{ category: "Other", amountEur: 0 }];
    }

    return Array.from(byCategory.entries()).map(([category, amountEur]) => ({
      category,
      amountEur: Math.round(amountEur),
    }));
  }, [latestDateAccounts]);
  const allocationExposureData = useMemo(() => {
    const exposureByBucket = new Map<string, number>();

    allocationData.forEach((item) => {
      const bucket = String(item.bucket);
      exposureByBucket.set(bucket, (exposureByBucket.get(bucket) ?? 0) + Number(item.amountEur));
    });

    liabilityData.forEach((item) => {
      const bucket = String(item.category);
      exposureByBucket.set(bucket, (exposureByBucket.get(bucket) ?? 0) + Number(item.amountEur));
    });

    const totalPortfolioEur = allocationData.reduce((sum, item) => sum + Math.max(0, Number(item.amountEur)), 0);

    const rows = Array.from(exposureByBucket.entries()).map(([bucket, amountEur]) => ({
      bucket,
      amountEur,
      barColor: amountEur < 0 ? "var(--color-stroke-error)" : "var(--color-chart-series-1)",
      pct: totalPortfolioEur > 0 ? ((Math.abs(amountEur) / totalPortfolioEur) * 100).toFixed(1) : "0.0",
      absExposure: Math.abs(amountEur),
    }));

    rows.sort((a, b) => b.absExposure - a.absExposure);
    return rows;
  }, [allocationData, liabilityData]);
  const ownerWealthByType = useMemo(() => {
    const ownerTypeMap = new Map<string, Map<string, number>>();
    const ownerTotals = new Map<string, number>();
    const typeSet = new Set<string>();

    latestDateAccounts.forEach((account) => {
      const amountEur = toEur(account);
      const accountType = String(account.type);
      typeSet.add(accountType);

      const splits =
        account.ownershipSplit?.filter((entry) => Number(entry.sharePct) > 0) ?? [];
      const primaryOwner = (account.ownerName || "Unknown").trim() || "Unknown";
      const coOwner = (account.coOwnerName || "").trim();

      const ownership =
        splits.length > 0
          ? (() => {
              const totalSplit = splits.reduce((sum, entry) => sum + Number(entry.sharePct), 0);
              return splits.map((entry) => ({
                ownerName: (entry.ownerName || primaryOwner).trim() || "Unknown",
                // Normalize split shares so legacy/non-100 data still allocates 100% of the account value.
                sharePct: totalSplit > 0 ? (Number(entry.sharePct) / totalSplit) * 100 : 0,
              }));
            })()
          : coOwner && coOwner !== primaryOwner
            ? [
                { ownerName: primaryOwner, sharePct: 50 },
                { ownerName: coOwner, sharePct: 50 },
              ]
            : [{ ownerName: primaryOwner, sharePct: 100 }];

      ownership.forEach((entry) => {
        const owner = (entry.ownerName || "Unknown").trim() || "Unknown";
        const ownerAmount = amountEur * (entry.sharePct / 100);

        const byType = ownerTypeMap.get(owner) ?? new Map<string, number>();
        byType.set(accountType, (byType.get(accountType) ?? 0) + ownerAmount);
        ownerTypeMap.set(owner, byType);

        ownerTotals.set(owner, (ownerTotals.get(owner) ?? 0) + ownerAmount);
      });
    });

    const preferredOrder = [
      "Cash",
      "Savings",
      "Investment",
      "Private Equity",
      "Property",
      "Cryptocurrency",
      "Loan",
    ];
    const types = Array.from(typeSet).sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    const totalWealthEur = Number(totals.netWorth);

    const data = Array.from(ownerTypeMap.entries())
      .map(([owner, byType]) => {
        const total = ownerTotals.get(owner) ?? 0;
        const totalAbs = Math.abs(total);
        const row: Record<string, string | number> = {
          owner,
          ownerTotalEur: Math.round(total),
          ownerTotalAbsEur: totalAbs,
          absTotal: totalAbs,
          pct:
            Math.abs(totalWealthEur) > 0
              ? ((total / totalWealthEur) * 100).toFixed(1)
              : "0.0",
        };
        types.forEach((type) => {
          row[type] = Math.round(byType.get(type) ?? 0);
        });
        return row;
      })
      .sort((a, b) => Number(b.absTotal) - Number(a.absTotal));

    return {
      data,
      series: types.map((type) => ({
        dataKey: type,
        name: type,
        ...(type === "Loan" ? { color: "var(--color-stroke-error)" } : {}),
      })),
    };
  }, [latestDateAccounts, totals.netWorth]);

  return (
    <PageFrame>
      <PageHeader
        title="Dashboard"
        rightContent={
          <div className="wealth-actions-row">
            <StatusPill tone="default">Last refresh in DB: 2026-04-18 09:45 UTC</StatusPill>
            <StatusPill tone="default">Date of wealth inventory: {latestInventoryDate ?? "N/A"}</StatusPill>
          </div>
        }
      />

      {isLoading ? (
        <SurfaceCard><Skeleton lines={6} /></SurfaceCard>
      ) : isError ? (
        <SurfaceCard>
          <p style={{ color: "var(--color-status-error)" }}>Failed to load dashboard data. Check that the backend is running.</p>
        </SurfaceCard>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Create your first account to start tracking household net worth and FIRE progress."
        />
      ) : (
        <>
          <section className="wealth-kpi-grid" aria-label="Net worth key indicators">
            <KpiCard label="Net Worth (EUR)" value={formatMoney(totals.netWorth)} detail={<p className="wealth-kpi-subtle">Assets minus liabilities</p>} />
            <KpiCard label="Total Assets" value={formatMoney(totals.assets)} detail={<p className="wealth-kpi-subtle">All positive balances converted to EUR</p>} />
            <KpiCard label="Total Liabilities" value={formatMoney(totals.liabilities)} detail={<p className="wealth-kpi-subtle">Loans and mortgage balances</p>} />
            <KpiCard
              label="YTD Delta"
              value={`${ytdDelta >= 0 ? "+" : ""}${formatMoney(ytdDelta)}`}
              detail={
                <p className="wealth-kpi-subtle">
                  {ytdWindow
                    ? `Change from ${ytdWindow.start.month} to ${ytdWindow.end.month}`
                    : "No inventory entries for current year"}
                </p>
              }
            />
          </section>

          <section className="wealth-chart-grid" aria-label="Net worth and allocation charts">
            <SurfaceCard>
              <div className="card-header">
                <h3 className="wealth-trend-title">Net Worth Trend</h3>
                <div className="wealth-trend-controls">
                  <div className="wealth-trend-control-group">
                    <TemporalFilter
                      defaultPeriod="ytd"
                      compact
                      onPeriodChange={setTrendPeriod}
                      onRangeChange={(start, end) => {
                        setCustomStartDate(start);
                        setCustomEndDate(end);
                      }}
                      periods={[
                        { value: "ytd", label: "YTD" },
                        { value: "1y", label: "1Y" },
                        { value: "5y", label: "5Y" },
                        { value: "all", label: "ALL" },
                      ]}
                    />
                  </div>
                  <div className="wealth-trend-control-group">
                    <TemporalFilter
                      defaultPeriod="monthly"
                      compact
                      showDateRange={false}
                      onPeriodChange={(value) => setTrendResolution(value as TrendResolution)}
                      periods={[
                        { value: "monthly", label: "M" },
                        { value: "quarterly", label: "Q" },
                        { value: "yearly", label: "Y" },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <LineChart
                  data={trendWithTargets}
                  xKey="period"
                  yLabel="EUR"
                  series={[
                    { dataKey: "netWorthEur", name: "Net Worth" },
                    ...fireTargetSeries.map((series) => ({
                      dataKey: series.dataKey,
                      name: series.name,
                      color: series.color,
                    })),
                  ]}
                  height="100%"
                />
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Allocation by Asset Class</h3>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <BarChart
                  data={allocationExposureData}
                  xKey="bucket"
                  series={[{ dataKey: "amountEur", name: "", colorKey: "barColor" }]}
                  height="100%"
                  yLabel="EUR"
                  formatValue={(v) => formatMoney(v, "EUR")}
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="wealth-chart-grid" aria-label="Currency and owner wealth exposure">
            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Joint Exposure: Asset x Market x Currency</h3>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--color-text-subtle)",
                  }}
                >
                  <span>
                    Balance score: <strong style={{ color: "var(--color-text-default)" }}>{jointExposure.score}/100</strong>
                  </span>
                  <span>
                    Expected cell share: <strong style={{ color: "var(--color-text-default)" }}>{jointExposure.expectedCellPct.toFixed(1)}%</strong>
                  </span>
                  <span>
                    Tracked exposure: <strong style={{ color: "var(--color-text-default)" }}>{formatMoney(jointExposure.totalEur, "EUR")}</strong>
                  </span>
                </div>

                <div
                  style={{
                    border: "1px solid var(--color-stroke-primary)",
                    borderRadius: 10,
                    padding: 10,
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--color-surface-secondary) 45%, transparent), var(--color-surface-primary))",
                  }}
                >
                  {jointExposure.columns.length === 0 || jointExposure.rows.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-subtle)" }}>
                      No joint exposure data available.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, fontSize: 11 }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "var(--color-surface-success-primary)",
                            color: "var(--color-text-success-on-primary)",
                            border: "1px solid var(--color-stroke-success)",
                          }}
                        >
                          &lt; 10%
                        </span>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "var(--color-surface-warning-primary)",
                            color: "var(--color-text-warning-on-primary)",
                            border: "1px solid var(--color-stroke-warning)",
                          }}
                        >
                          10-15%
                        </span>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "var(--color-surface-error-primary)",
                            color: "var(--color-text-error-on-primary)",
                            border: "1px solid var(--color-stroke-error)",
                          }}
                        >
                          &gt; 15%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `minmax(130px, 1.35fr) repeat(${jointExposure.columns.length}, minmax(0, 1fr))`,
                          gap: 6,
                          alignItems: "stretch",
                        }}
                      >
                        <div
                          style={{
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: "var(--color-surface-secondary)",
                            fontSize: 11,
                            fontFamily: "var(--font-semibold)",
                          }}
                        >
                          Asset Class
                        </div>
                        {jointExposure.columns.map((column) => (
                          <div
                            key={column}
                            style={{
                              padding: "6px 4px",
                              borderRadius: 8,
                              background: "var(--color-surface-secondary)",
                              fontSize: 10,
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {column}
                          </div>
                        ))}

                        {jointExposure.rows.map((row) => (
                          <>
                            <div
                              key={`${row.assetClass}-label`}
                              style={{
                                padding: "8px",
                                borderRadius: 8,
                                border: "1px solid var(--color-stroke-primary)",
                                fontSize: 12,
                                background: "var(--color-surface-primary)",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                gap: 2,
                              }}
                              title={`${formatMoney(row.rowTotalEur, "EUR")} (${row.rowPct.toFixed(1)}% of tracked exposure)`}
                            >
                              <span style={{ fontFamily: "var(--font-semibold)" }}>{row.assetClass}</span>
                              <span style={{ color: "var(--color-text-subtle)", fontSize: 10 }}>{row.rowPct.toFixed(1)}%</span>
                            </div>

                            {row.cells.map((cell) => {
                              const absDeviation = cell.absDeviationPct;
                              const severity =
                                absDeviation <= 10
                                  ? {
                                      bg: "var(--color-surface-success-primary)",
                                      text: "var(--color-text-success-on-primary)",
                                      border: "var(--color-stroke-success)",
                                    }
                                  : absDeviation <= 15
                                    ? {
                                        bg: "var(--color-surface-warning-primary)",
                                        text: "var(--color-text-warning-on-primary)",
                                        border: "var(--color-stroke-warning)",
                                      }
                                    : {
                                        bg: "var(--color-surface-error-primary)",
                                        text: "var(--color-text-error-on-primary)",
                                        border: "var(--color-stroke-error)",
                                      };

                              return (
                                <div
                                  key={`${row.assetClass}-${cell.column}`}
                                  style={{
                                    borderRadius: 8,
                                    border: `1px solid ${severity.border}`,
                                    background: severity.bg,
                                    color: severity.text,
                                    fontSize: 11,
                                    textAlign: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 44,
                                    padding: "4px 2px",
                                    lineHeight: 1.1,
                                  }}
                                  title={`${row.assetClass} / ${cell.column}\nAmount: ${formatMoney(cell.amountEur, "EUR")}\nActual: ${cell.pct.toFixed(1)}%\nExpected: ${cell.expectedPct.toFixed(1)}%\nDeviation: ${cell.deviationPct >= 0 ? "+" : ""}${cell.deviationPct.toFixed(1)}%`}
                                >
                                  <span>{cell.pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>
                  <strong style={{ color: "var(--color-text-default)" }}>Top imbalances:</strong>{" "}
                  {jointExposure.topImbalances.length > 0
                    ? jointExposure.topImbalances
                        .map((item) => `${item.assetClass} / ${item.column} (${item.deviationPct >= 0 ? "+" : ""}${item.deviationPct.toFixed(1)}%)`)
                        .join("; ")
                    : "No significant imbalance detected."}
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Portfolio per Owner</h3>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <BarChart
                  data={ownerWealthByType.data}
                  xKey="owner"
                  yLabel="EUR"
                  series={ownerWealthByType.series}
                  stacked
                  height="100%"
                  formatValue={(v) => formatMoney(v, "EUR")}
                  tooltipTotalKey="ownerTotalEur"
                  tooltipTotalLabel="Owner Total"
                  tooltipTotalFormatter={(v) => formatMoney(v, "EUR")}
                  tooltipPercentTotalKey="ownerTotalAbsEur"
                  tooltipPercentLabel="Class share"
                  tooltipPctLabel="Wealth share"
                  tooltipTitleKey="owner"
                  tooltipShowAmount={false}
                  tooltipShowAllSeriesPercents
                  tooltipAllSeriesLabel="Class shares"
                />
              </div>
            </SurfaceCard>
          </section>
        </>
      )}
    </PageFrame>
  );
}
