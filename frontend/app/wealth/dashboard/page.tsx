"use client";

import { Fragment, useMemo, useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { TemporalFilter } from "@/components/ui/temporal-filter";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  byAllocationBucket,
  computeTotals,
  formatMoney,
  toEur,
  type MonthlyNetWorth,
  type Account,
} from "@/lib/wealth-mock-data";
import { Skeleton } from "@/components/ui/loading";
import {
  aggregateTrendByResolution,
  buildFireTargetSeries,
  filterTrendByPeriod,
  JOINT_MARKET_ORDER,
  normalizeMarketType,
  resolveAllocationBucketForJoint,
  type MarketGroup,
  type TrendResolution,
} from "@/lib/dashboard-aggregations";
import { useWealthAccounts, useWealthFireScenarios } from "@/hooks/use-api";

export default function WealthDashboardPage() {
  const { data: rawAccounts = [], isLoading: accountsLoading, isError: accountsError } = useWealthAccounts();
  const { data: fireScenarios = [] } = useWealthFireScenarios();
  const isLoading = accountsLoading;
  const isError = accountsError;

  const accounts = useMemo<Account[]>(
    () =>
      rawAccounts.map((account) => ({
        ...account,
        allocationBucket: account.allocationBucket as Account["allocationBucket"],
        portfolioLines: account.portfolioLines.map((line) => ({
          ...line,
          allocationBucket: line.allocationBucket as NonNullable<Account["portfolioLines"]>[number]["allocationBucket"],
          currency: line.currency as NonNullable<Account["portfolioLines"]>[number]["currency"],
        })),
        coOwnerId: account.coOwnerId ?? undefined,
        coOwnerName: account.coOwnerName ?? undefined,
        mortgage: account.mortgage ?? undefined,
        ownershipSplit: account.ownershipSplit?.map((split) => ({
          ...split,
          ownerName: split.ownerName ?? account.ownerName,
        })),
      })),
    [rawAccounts],
  );

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
  const [includePropertyInJointExposure, setIncludePropertyInJointExposure] = useState(true);

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
    () => buildFireTargetSeries(fireScenarios, totals.netWorth),
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

      if (!includePropertyInJointExposure && account.type === "Property") {
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

    // Determine which currencies to include: EUR & USD always, CHF only if data exists
    const hasCHFData = Array.from(dynamicColumns).some((col) => col.includes("CHF"));
    const currenciesToInclude = hasCHFData ? ["EUR", "USD", "CHF"] : ["EUR", "USD"];

    const orderedBaseColumns = JOINT_MARKET_ORDER.flatMap((market) =>
      currenciesToInclude.map((currency) => `${market}-${currency}`),
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

    // Normalized weighted absolute deviation from target cell shares.
    // D = (1/100) * sum_i |p_i - t_i|, score = 100 * (1 - D), clamped to [0, 100].
    const allAbsDeviations = rows.flatMap((row) => row.cells.map((cell) => cell.absDeviationPct));
    const normalizedDeviation = allAbsDeviations.reduce((sum, value) => sum + value, 0) / 100;
    const score = Math.max(0, Math.min(100, Math.round(100 * (1 - normalizedDeviation))));

    // Calculate dynamic severity thresholds by dividing range into 3 equal zones
    const minDeviation = Math.min(...allAbsDeviations, 0);
    const maxDeviation = Math.max(...allAbsDeviations, 1);
    const range = maxDeviation - minDeviation;
    const thresholdSuccess = minDeviation + range / 3;
    const thresholdWarning = minDeviation + (2 * range) / 3;

    return {
      columns,
      rows,
      totalEur,
      expectedCellPct,
      maxCellPct,
      score,
      topImbalances,
      thresholdSuccess,
      thresholdWarning,
    };
  }, [includePropertyInJointExposure, latestDateAccounts]);
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
    const ownerLabels = new Map<string, string>();
    const typeSet = new Set<string>();

    latestDateAccounts.forEach((account) => {
      const amountEur = toEur(account);
      const accountType = String(account.type);
      typeSet.add(accountType);

      const splits =
        account.ownershipSplit?.filter((entry) => Number(entry.sharePct) > 0) ?? [];
      const primaryOwner = (account.ownerName || "Unknown").trim() || "Unknown";
      const primaryOwnerId = (account.ownerId || "").trim();
      const coOwner = (account.coOwnerName || "").trim();
      const coOwnerId = (account.coOwnerId || "").trim();

      const normalizedSplits = (() => {
        if (splits.length === 0) {
          return [] as Array<{ ownerId?: string; ownerName: string; sharePct: number }>;
        }

        const hasCoOwnerInSplit = splits.some((entry) => {
          const entryOwnerId = String(entry.ownerId || "").trim();
          const entryOwnerName = (entry.ownerName || "").trim();
          if (coOwnerId && entryOwnerId === coOwnerId) {
            return true;
          }
          return Boolean(coOwner) && entryOwnerName === coOwner;
        });

        // Legacy compatibility: some co-owned accounts only persisted the primary owner in ownershipSplit.
        // In that case, fallback to 50/50 so owner exposure matches the displayed account ownership semantics.
        if (coOwner && coOwner !== primaryOwner && !hasCoOwnerInSplit) {
          return [
            { ownerId: primaryOwnerId || undefined, ownerName: primaryOwner, sharePct: 50 },
            { ownerId: coOwnerId || undefined, ownerName: coOwner, sharePct: 50 },
          ];
        }

        const totalSplit = splits.reduce((sum, entry) => sum + Number(entry.sharePct), 0);
        return splits.map((entry) => ({
          ownerId: entry.ownerId,
          ownerName: (entry.ownerName || primaryOwner).trim() || "Unknown",
          sharePct: totalSplit > 0 ? (Number(entry.sharePct) / totalSplit) * 100 : 0,
        }));
      })();

      const ownership =
        normalizedSplits.length > 0
          ? normalizedSplits
          : coOwner && coOwner !== primaryOwner
            ? [
                { ownerId: primaryOwnerId || undefined, ownerName: primaryOwner, sharePct: 50 },
                { ownerId: coOwnerId || undefined, ownerName: coOwner, sharePct: 50 },
              ]
            : [{ ownerId: primaryOwnerId || undefined, ownerName: primaryOwner, sharePct: 100 }];

      ownership.forEach((entry) => {
        const ownerLabel = (entry.ownerName || "Unknown").trim() || "Unknown";
        const ownerKey = (entry.ownerId || "").trim() || ownerLabel;
        const ownerAmount = amountEur * (entry.sharePct / 100);

        const byType = ownerTypeMap.get(ownerKey) ?? new Map<string, number>();
        byType.set(accountType, (byType.get(accountType) ?? 0) + ownerAmount);
        ownerTypeMap.set(ownerKey, byType);

        ownerTotals.set(ownerKey, (ownerTotals.get(ownerKey) ?? 0) + ownerAmount);
        if (!ownerLabels.has(ownerKey) || ownerLabels.get(ownerKey) === "Unknown") {
          ownerLabels.set(ownerKey, ownerLabel);
        }
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
      .map(([ownerKey, byType]) => {
        const total = ownerTotals.get(ownerKey) ?? 0;
        const totalAbs = Math.abs(total);
        const row: Record<string, string | number> = {
          owner: ownerLabels.get(ownerKey) ?? ownerKey,
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Property</span>
                  <ToggleSwitch
                    checked={includePropertyInJointExposure}
                    onChange={setIncludePropertyInJointExposure}
                    label="Include property in joint exposure"
                    onText="On"
                    offText="Off"
                    title={includePropertyInJointExposure ? "Exclude Property from matrix" : "Include Property in matrix"}
                  />
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 10,
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
                    borderRadius: 7,
                    padding: 6,
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6, marginTop: 2, fontSize: 9 }}>
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--color-surface-success-primary)",
                            color: "var(--color-text-success-on-primary)",
                            border: "1px solid var(--color-stroke-success)",
                          }}
                        >
                          ≤ {jointExposure.thresholdSuccess.toFixed(1)}%
                        </span>
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--color-surface-warning-primary)",
                            color: "var(--color-text-warning-on-primary)",
                            border: "1px solid var(--color-stroke-warning)",
                          }}
                        >
                          {jointExposure.thresholdSuccess.toFixed(1)}%-{jointExposure.thresholdWarning.toFixed(1)}%
                        </span>
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--color-surface-error-primary)",
                            color: "var(--color-text-error-on-primary)",
                            border: "1px solid var(--color-stroke-error)",
                          }}
                        >
                          &gt; {jointExposure.thresholdWarning.toFixed(1)}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `minmax(104px, 1.15fr) repeat(${jointExposure.columns.length}, minmax(0, 1fr))`,
                          gap: 3,
                          alignItems: "stretch",
                        }}
                      >
                        <div
                          style={{
                            padding: "4px 6px",
                            borderRadius: 6,
                            background: "var(--color-surface-secondary)",
                            fontSize: 9,
                            fontFamily: "var(--font-semibold)",
                          }}
                        >
                          Asset Class
                        </div>
                        {jointExposure.columns.map((column) => (
                          <div
                            key={column}
                            style={{
                              padding: "4px 2px",
                              borderRadius: 6,
                              background: "var(--color-surface-secondary)",
                              fontSize: 8,
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {column}
                          </div>
                        ))}

                        {jointExposure.rows.map((row) => (
                          <Fragment key={row.assetClass}>
                            <div
                              style={{
                                padding: "4px 5px",
                                borderRadius: 6,
                                border: "1px solid var(--color-stroke-primary)",
                                fontSize: 10,
                                background: "var(--color-surface-primary)",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                gap: 1,
                              }}
                              title={`${formatMoney(row.rowTotalEur, "EUR")} (${row.rowPct.toFixed(1)}% of tracked exposure)`}
                            >
                              <span style={{ fontFamily: "var(--font-semibold)" }}>{row.assetClass}</span>
                              <span style={{ color: "var(--color-text-subtle)", fontSize: 8 }}>{row.rowPct.toFixed(1)}%</span>
                            </div>

                            {row.cells.map((cell) => {
                              const absDeviation = cell.absDeviationPct;
                              const severity =
                                absDeviation <= jointExposure.thresholdSuccess
                                  ? {
                                      bg: "var(--color-surface-success-primary)",
                                      text: "var(--color-text-success-on-primary)",
                                      border: "var(--color-stroke-success)",
                                    }
                                  : absDeviation <= jointExposure.thresholdWarning
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
                                    borderRadius: 6,
                                    border: `1px solid ${severity.border}`,
                                    background: severity.bg,
                                    color: severity.text,
                                    fontSize: 9,
                                    textAlign: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 28,
                                    padding: "2px 1px",
                                    lineHeight: 1.1,
                                  }}
                                  title={`${row.assetClass} / ${cell.column}\nAmount: ${formatMoney(cell.amountEur, "EUR")}\nActual: ${cell.pct.toFixed(1)}%\nExpected: ${cell.expectedPct.toFixed(1)}%\nDeviation: ${cell.deviationPct >= 0 ? "+" : ""}${cell.deviationPct.toFixed(1)}%`}
                                >
                                  <span>{cell.pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </Fragment>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-subtle)",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={
                    jointExposure.topImbalances.length > 0
                      ? jointExposure.topImbalances
                          .map((item) => `${item.assetClass} / ${item.column} (${item.deviationPct >= 0 ? "+" : ""}${item.deviationPct.toFixed(1)}%)`)
                          .join("; ")
                      : "No significant imbalance detected."
                  }
                >
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
