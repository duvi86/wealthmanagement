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
  byCurrency,
  computeTotals,
  formatMoney,
  toEur,
  type MonthlyNetWorth,
  wealthProfile,
  type Account,
} from "@/lib/wealth-mock-data";
import { Skeleton } from "@/components/ui/loading";
import { useWealthAccounts, useWealthFireScenarios, type WealthFireScenario } from "@/hooks/use-api";

type TrendResolution = "monthly" | "quarterly" | "yearly";

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
        targetEur: computeFireTargetEur(scenario),
      })),
    [fireScenarios],
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
  const currencyData = useMemo(() => byCurrency(latestDateAccounts), [latestDateAccounts]);
  const liabilityData = useMemo(() => {
    const byCategory = new Map<string, number>();

    latestDateAccounts.forEach((account) => {
      const amountEur = toEur(account);
      if (amountEur >= 0) {
        return;
      }

      const category = account.mortgage ? "Mortgage" : "Other";
      byCategory.set(category, (byCategory.get(category) ?? 0) + Math.abs(amountEur));
    });

    if (byCategory.size === 0) {
      return [{ category: "Other", amountEur: 0 }];
    }

    return Array.from(byCategory.entries()).map(([category, amountEur]) => ({
      category,
      amountEur: Math.round(amountEur),
    }));
  }, [latestDateAccounts]);

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
              {(() => {
                const total = allocationData.reduce((sum, d) => sum + (d.amountEur as number), 0);
                const sortedData = [...allocationData]
                  .sort((a, b) => (b.amountEur as number) - (a.amountEur as number))
                  .map((d) => ({
                    ...d,
                    pct: total > 0 ? (((d.amountEur as number) / total) * 100).toFixed(1) : "0.0",
                  }));
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <BarChart
                      data={sortedData}
                      xKey="bucket"
                      series={[{ dataKey: "amountEur", name: "" }]}
                      height="100%"
                      yLabel="EUR"
                      formatValue={(v) => formatMoney(v, "EUR")}
                    />
                  </div>
                );
              })()}
            </SurfaceCard>
          </section>

          <section className="wealth-chart-grid" aria-label="Currency and liability exposure">
            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Native Currency Exposure</h3>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <BarChart
                  data={currencyData}
                  xKey="currency"
                  yLabel="Native units"
                  series={[{ dataKey: "amount", name: "" }]}
                  height="100%"
                />
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Liability Exposure</h3>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <BarChart
                  data={liabilityData}
                  xKey="category"
                  yLabel="EUR"
                  series={[{ dataKey: "amountEur", name: "" }]}
                  height="100%"
                />
              </div>
            </SurfaceCard>
          </section>
        </>
      )}
    </PageFrame>
  );
}
