"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormContainer } from "@/components/ui/form-container";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { Modal } from "@/components/ui/modal";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { Slider } from "@/components/ui/slider";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { formatMoney, type FireScenario } from "@/lib/wealth-mock-data";
import {
  useWealthFireScenarios,
  useCreateWealthFireScenario,
  useUpdateWealthFireScenario,
  useDeleteWealthFireScenario,
  useWealthAccounts,
  useWealthPersonProfiles,
  type WealthFireScenario,
  type WealthAccount,
  type WealthPersonProfile,
} from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/loading";

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11a2 2 0 0 1-2-2V8h16v10a2 2 0 0 1-2 2H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M3 17.25V21h3.75L18.8 8.95l-3.75-3.75L3 17.25Zm18-11.5a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.04 1.04 3.75 3.75L21 5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ProfileScope = "p-1" | "p-2" | "both";

type ProfileMember = {
  id: string;
  name: string;
  currentAge: number;
  expectedLifetime: number;
};

type WizardState = {
  name: string;
  annualIncomeEur: number;
  annualExpensesEur: number;
  returnPct: number;
  taxRatePct: number;
  inflationPct: number;
  withdrawalRatePct: number;
  profileScope: ProfileScope;
  targetRetirementAge: number;
  postRetirementWorkIncomeEur: number;
  capitalStrategy: "protect" | "deplete";
  startingPortfolioEur: number;
};

type YearlyCashflowRow = {
  year: number;
  age: number;
  phase: "Accumulation" | "Retirement";
  startPortfolioEur: number;
  growthEur: number;
  contributionEur: number;
  withdrawalEur: number;
  netFlowEur: number;
  endPortfolioEur: number;
};

const initialWizard: WizardState = {
  name: "",
  annualIncomeEur: 128000,
  annualExpensesEur: 70000,
  returnPct: 6,
  taxRatePct: 24,
  inflationPct: 2,
  withdrawalRatePct: 3.8,
  profileScope: "both",
  targetRetirementAge: 52,
  postRetirementWorkIncomeEur: 12000,
  capitalStrategy: "protect",
  startingPortfolioEur: 283500,
};

function formatMoneyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}€${new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}€${new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(abs / 1_000)}k`;
  }
  return formatMoney(amount);
}

function formatYearGap(yearGap: number): string {
  if (!Number.isFinite(yearGap)) return "Not reached";
  if (Math.abs(yearGap) < 0.05) return "On target";
  return yearGap > 0 ? `+${yearGap.toFixed(1)}y` : `${yearGap.toFixed(1)}y`;
}

function formatYearsToFire(yearsToFire: number, altYearsToFire?: number, includeFallbackSuffix = true): string {
  if (Number.isFinite(yearsToFire) && yearsToFire >= 0) return yearsToFire.toFixed(1);
  if (Number.isFinite(altYearsToFire) && (altYearsToFire ?? -1) >= 0) {
    return (altYearsToFire as number).toFixed(1);
  }
  return "Not reached";
}

function formatFireYear(fireYear: number, altFireYear?: number, includeFallbackSuffix = true): string {
  if (Number.isFinite(fireYear)) return String(Math.round(fireYear));
  if (Number.isFinite(altFireYear)) {
    return String(Math.round(altFireYear as number));
  }
  return "Not reached";
}

function formatYearGapWithFallback(yearGap: number, altYearGap?: number, includeFallbackSuffix = true): string {
  if (Number.isFinite(yearGap)) return formatYearGap(yearGap);
  if (Number.isFinite(altYearGap)) {
    return formatYearGap(altYearGap as number);
  }
  return "Not reached";
}

function formatMillions(value: number): string {
  const millions = value / 1_000_000;
  return `${millions.toFixed(1)}M`;
}

function getProfileAssumptions(scope: ProfileScope, members: ProfileMember[]) {
  const fallbackMembers: ProfileMember[] = members.length
    ? members
    : [
        { id: "p-1", name: "Person 1", currentAge: 38, expectedLifetime: 92 },
        { id: "p-2", name: "Person 2", currentAge: 41, expectedLifetime: 90 },
      ];

  if (scope === "both") {
    const avgAge =
      fallbackMembers.reduce((sum, member) => sum + member.currentAge, 0) /
      Math.max(1, fallbackMembers.length);
    const avgLifetime =
      fallbackMembers.reduce((sum, member) => sum + member.expectedLifetime, 0) /
      Math.max(1, fallbackMembers.length);
    return {
      label: "Both (average)",
      currentAge: avgAge,
      expectedLifetime: avgLifetime,
    };
  }

  const selected = fallbackMembers.find((member) => member.id === scope) ?? fallbackMembers[0];
  return {
    label: selected.name,
    currentAge: selected.currentAge,
    expectedLifetime: selected.expectedLifetime,
  };
}

function buildRetirementTargetSeries(
  periods: string[],
  annualExpensesEur: number,
  withdrawalRatePct: number,
  inflationPct: number,
  annualWorkIncomeEur = 0,
) {
  const firstYear = Number(periods[0] ?? new Date().getFullYear());
  const safeWithdrawalRate = Math.max(0.1, withdrawalRatePct) / 100;

  return periods.map((period) => {
    const year = Number(period);
    const yearsFromStart = Number.isFinite(year) ? Math.max(0, year - firstYear) : 0;
    const inflationFactor = (1 + inflationPct / 100) ** yearsFromStart;
    const projectedAnnualNeed = Math.max(
      0,
      annualExpensesEur * inflationFactor - annualWorkIncomeEur * inflationFactor,
    );
    return Math.round(projectedAnnualNeed / safeWithdrawalRate);
  });
}

function buildCapitalTrajectory(
  startYear: number,
  retirementYear: number,
  endYear: number,
  startingPortfolioEur: number,
  annualSavingsEur: number,
  afterTaxReturnPct: number,
  annualExpensesEur: number,
  postRetirementWorkIncomeEur: number,
  capitalStrategy: "protect" | "deplete",
  inflationPct: number = 0,
) {
  const data: Array<{ period: string; portfolioEur: number }> = [];
  let portfolio = startingPortfolioEur;

  for (let year = startYear; year <= endYear; year += 1) {
    if (year > startYear) {
      const growth = portfolio * (afterTaxReturnPct / 100);
      let currentExpenseGap = 0;

      // Retirement spending gap is recomputed each year from start-year indexed values.
      if (year > retirementYear) {
        const yearsFromStart = year - startYear;
        const inflationFactor = (1 + inflationPct / 100) ** yearsFromStart;
        const indexedExpenses = annualExpensesEur * inflationFactor;
        const indexedIncome = postRetirementWorkIncomeEur * inflationFactor;
        currentExpenseGap = Math.max(0, indexedExpenses - indexedIncome);
      }
      
      const cashFlow = year <= retirementYear ? annualSavingsEur : -currentExpenseGap;
      portfolio += growth + cashFlow;
    }

    data.push({
      period: String(year),
      portfolioEur: Math.round(Math.max(0, portfolio)),
    });
  }

  return data;
}

function buildYearlyCashflowRows(params: {
  startYear: number;
  retirementYear: number;
  endYear: number;
  currentAge: number;
  startingPortfolioEur: number;
  annualSavingsEur: number;
  afterTaxReturnPct: number;
  annualExpensesEur: number;
  postRetirementWorkIncomeEur: number;
  inflationPct: number;
}): YearlyCashflowRow[] {
  const {
    startYear,
    retirementYear,
    endYear,
    currentAge,
    startingPortfolioEur,
    annualSavingsEur,
    afterTaxReturnPct,
    annualExpensesEur,
    postRetirementWorkIncomeEur,
    inflationPct,
  } = params;

  const rows: YearlyCashflowRow[] = [];
  let portfolio = startingPortfolioEur;

  for (let year = startYear; year <= endYear; year += 1) {
    const startPortfolio = portfolio;
    const age = currentAge + (year - startYear);
    const phase: YearlyCashflowRow["phase"] = year <= retirementYear ? "Accumulation" : "Retirement";

    let growthEur = 0;
    let netFlowEur = 0;
    let contributionEur = 0;
    let withdrawalEur = 0;

    if (year > startYear) {
      growthEur = startPortfolio * (afterTaxReturnPct / 100);

      if (year <= retirementYear) {
        contributionEur = annualSavingsEur;
        netFlowEur = annualSavingsEur;
      } else {
        const yearsFromStart = year - startYear;
        const inflationFactor = (1 + inflationPct / 100) ** yearsFromStart;
        const indexedExpenses = annualExpensesEur * inflationFactor;
        const indexedIncome = postRetirementWorkIncomeEur * inflationFactor;
        const expenseGap = Math.max(0, indexedExpenses - indexedIncome);
        withdrawalEur = expenseGap;
        netFlowEur = -expenseGap;
      }

      portfolio = Math.max(0, startPortfolio + growthEur + netFlowEur);
    }

    rows.push({
      year,
      age,
      phase,
      startPortfolioEur: Math.round(startPortfolio),
      growthEur: Math.round(growthEur),
      contributionEur: Math.round(contributionEur),
      withdrawalEur: Math.round(withdrawalEur),
      netFlowEur: Math.round(netFlowEur),
      endPortfolioEur: Math.round(portfolio),
    });
  }

  return rows;
}

function renderYearlyCashflowTable(rows: YearlyCashflowRow[]) {
  return (
    <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Year</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Age</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Phase</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Start</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Growth</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Contrib+Growth</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Withdraw</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Net Flow (excl growth)</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>End</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <td style={{ padding: "8px 10px" }}>{row.year}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.age.toFixed(1)}</td>
              <td style={{ padding: "8px 10px" }}>{row.phase}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{formatMoney(row.startPortfolioEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.growthEur >= 0 ? `+${formatMoney(row.growthEur)}` : formatMoney(row.growthEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.contributionEur + row.growthEur !== 0 ? `${row.contributionEur + row.growthEur >= 0 ? "+" : ""}${formatMoney(row.contributionEur + row.growthEur)}` : "-"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.withdrawalEur > 0 ? `-${formatMoney(row.withdrawalEur)}` : "-"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.netFlowEur >= 0 ? `+${formatMoney(row.netFlowEur)}` : formatMoney(row.netFlowEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{formatMoney(row.endPortfolioEur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusTone(status: FireScenario["status"]): "success" | "error" | "info" | "warning" {
  if (status === "Reached") return "info";
  if (status === "On Track") return "success";
  if (status === "At Risk") return "warning";
  if (status === "Lagging") return "error";
  return "info";
}

function futureValueWithContributions(startingPortfolioEur: number, annualContributionEur: number, annualReturnPct: number, years: number) {
  const n = Math.max(0, years);
  const r = annualReturnPct / 100;
  if (n === 0) return startingPortfolioEur;
  if (Math.abs(r) < 1e-9) return startingPortfolioEur + annualContributionEur * n;

  const growthFactor = (1 + r) ** n;
  const fvPrincipal = startingPortfolioEur * growthFactor;
  const fvContributions = annualContributionEur * ((growthFactor - 1) / r);
  return fvPrincipal + fvContributions;
}

function findFireMilestoneFromTrajectory(params: {
  trajectory: Array<{ period: string; portfolioEur: number }>;
  startYear: number;
  annualExpensesEur: number;
  postRetirementWorkIncomeEur: number;
  inflationPct: number;
  withdrawalRatePct: number;
}) {
  const {
    trajectory,
    startYear,
    annualExpensesEur,
    postRetirementWorkIncomeEur,
    inflationPct,
    withdrawalRatePct,
  } = params;

  const safeWithdrawalRate = Math.max(0.1, withdrawalRatePct) / 100;
  let previous: { year: number; portfolioEur: number; requiredPortfolio: number; surplus: number } | null = null;

  for (const point of trajectory) {
    const year = Number(point.period);
    if (!Number.isFinite(year)) {
      continue;
    }
    const yearsFromStart = Math.max(0, year - startYear);
    const inflationFactor = (1 + inflationPct / 100) ** yearsFromStart;
    const annualNeed = Math.max(
      0,
      annualExpensesEur * inflationFactor - postRetirementWorkIncomeEur * inflationFactor,
    );
    const requiredPortfolio = annualNeed / safeWithdrawalRate;
    const surplus = point.portfolioEur - requiredPortfolio;

    if (surplus >= 0) {
      if (previous && previous.surplus < 0) {
        const denominator = previous.surplus - surplus;
        const rawFrac = denominator !== 0 ? previous.surplus / denominator : 1;
        const frac = Math.min(1, Math.max(0, rawFrac));
        const yearsToFire = Math.max(0, (previous.year - startYear) + frac * (year - previous.year));
        const portfolioAtFire = Math.round(
          previous.portfolioEur + frac * (point.portfolioEur - previous.portfolioEur),
        );

        return {
          reached: true,
          year,
          yearsToFire,
          portfolioAtFire,
        };
      }

      return {
        reached: true,
        year,
        yearsToFire: Math.max(0, year - startYear),
        portfolioAtFire: Math.round(point.portfolioEur),
      };
    }

    previous = {
      year,
      portfolioEur: point.portfolioEur,
      requiredPortfolio,
      surplus,
    };
  }

  const last = trajectory[trajectory.length - 1];
  const fallbackYear = Number(last?.period ?? startYear);
  return {
    reached: false,
    year: Number.isFinite(fallbackYear) ? fallbackYear : startYear,
    yearsToFire: Number.NaN,
    portfolioAtFire: Math.round(last?.portfolioEur ?? 0),
  };
}

function simulateYearsToFire(
  startingPortfolioEur: number,
  annualSavingsEur: number,
  afterTaxReturnPct: number,
  annualExpensesEur: number,
  withdrawalRatePct: number,
  inflationPct: number,
  postRetirementWorkIncomeEur: number,
  startYear: number,
  maxYears: number,
) {
  let portfolio = startingPortfolioEur;
  const safeWithdrawalRate = Math.max(0.1, withdrawalRatePct) / 100;

  for (let offset = 0; offset <= maxYears; offset += 1) {
    const year = startYear + offset;
    const inflationFactor = (1 + inflationPct / 100) ** offset;
    const annualNeed = Math.max(
      0,
      annualExpensesEur * inflationFactor - postRetirementWorkIncomeEur * inflationFactor,
    );
    const requiredPortfolio = annualNeed / safeWithdrawalRate;
    if (portfolio >= requiredPortfolio) {
      return { year, yearsToFire: offset, portfolioAtFire: Math.round(portfolio) };
    }

    const growth = portfolio * (afterTaxReturnPct / 100);
    portfolio = Math.max(0, portfolio + growth + annualSavingsEur);
  }

  return {
    year: startYear + maxYears,
    yearsToFire: maxYears,
    portfolioAtFire: Math.round(portfolio),
  };
}

function simulateSuccessRate(
  w: WizardState,
  profile: { currentAge: number; expectedLifetime: number },
  targetRetirementYear: number,
) {
  const yearsToTargetAge = Math.max(0, targetRetirementYear - 2026);
  const retirementYearsEstimate = Math.max(1, Math.round(profile.expectedLifetime - w.targetRetirementAge));
  const simulationEndYear = targetRetirementYear + retirementYearsEstimate;
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const scenarioAdjustments = [-3.0, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const safeWithdrawalRate = Math.max(0.1, w.withdrawalRatePct) / 100;

  let successCount = 0;
  for (const adjustment of scenarioAdjustments) {
    const scenarioAfterTaxReturn = Math.max(-0.95, (w.returnPct + adjustment) * (1 - w.taxRatePct / 100));
    const series = buildCapitalTrajectory(
      2026,
      targetRetirementYear,
      simulationEndYear,
      w.startingPortfolioEur,
      annualSavings,
      scenarioAfterTaxReturn,
      w.annualExpensesEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );

    const targetYearIdx = Math.min(series.length - 1, yearsToTargetAge);
    const targetYearPortfolio = series[targetYearIdx]?.portfolioEur ?? 0;
    const targetInflationFactor = (1 + w.inflationPct / 100) ** yearsToTargetAge;
    const targetYearGap = Math.max(
      0,
      w.annualExpensesEur * targetInflationFactor - w.postRetirementWorkIncomeEur * targetInflationFactor,
    );
    const requiredPortfolio = targetYearGap / safeWithdrawalRate;
    const finalValue = series[series.length - 1]?.portfolioEur ?? 0;

    let isSuccess = false;
    if (w.capitalStrategy === "protect") {
      // Protect: portfolio must sustain at safe withdrawal rate throughout retirement
      // Check that portfolio doesn't fall below required portfolio at any retirement year
      let canSustain = true;
      for (let i = targetYearIdx; i < series.length; i++) {
        const year = 2026 + i;
        if (year > targetRetirementYear) {
          const yearsFromStart = year - 2026;
          const inflationFactor = (1 + w.inflationPct / 100) ** yearsFromStart;
          const currentExpenseGap = Math.max(
            0,
            w.annualExpensesEur * inflationFactor - w.postRetirementWorkIncomeEur * inflationFactor,
          );
          const currentRequired = currentExpenseGap / safeWithdrawalRate;
          if ((series[i]?.portfolioEur ?? 0) < currentRequired) {
            canSustain = false;
            break;
          }
        }
      }
      isSuccess = canSustain && finalValue > 0;
    } else {
      // Deplete: just need to cover expenses until death (portfolio survives to end)
      isSuccess = targetYearPortfolio > 0 && finalValue > 0;
    }

    if (isSuccess) {
      successCount += 1;
    }
  }

  return (successCount / scenarioAdjustments.length) * 100;
}

function mockCalc(w: WizardState, profile: { currentAge: number; expectedLifetime: number }) {
  const baseYear = 2026;
  const maxProjectionYears = 80;
  const maxProjectionYear = baseYear + maxProjectionYears;
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const yearsToTargetAgeExact = Math.max(0, w.targetRetirementAge - profile.currentAge);
  const targetRetirementYear = baseYear + Math.round(yearsToTargetAgeExact);
  const yearsToTargetRetirementYear = Math.max(0, targetRetirementYear - baseYear);
  const inflationToTarget = (1 + w.inflationPct / 100) ** yearsToTargetRetirementYear;
  const annualExpenseGapInRetirement = Math.max(
    0,
    w.annualExpensesEur * inflationToTarget - w.postRetirementWorkIncomeEur * inflationToTarget,
  );
  const retirementYearsEstimate = Math.max(10, profile.expectedLifetime - w.targetRetirementAge);
  const adjustedWithdrawalRate = w.withdrawalRatePct;
  const afterTaxReturn = Math.max(-0.95, w.returnPct * (1 - w.taxRatePct / 100));

  const fullTrajectory = buildCapitalTrajectory(
    baseYear,
    targetRetirementYear,
    maxProjectionYear,
    w.startingPortfolioEur,
    annualSavings,
    afterTaxReturn,
    w.annualExpensesEur,
    w.postRetirementWorkIncomeEur,
    w.capitalStrategy,
    w.inflationPct,
  );

  // Source of truth for displayed FIRE metrics: same trajectory used by charts and cashflow.
  const yearsToFireSim = findFireMilestoneFromTrajectory({
    trajectory: fullTrajectory,
    startYear: baseYear,
    annualExpensesEur: w.annualExpensesEur,
    postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
    inflationPct: w.inflationPct,
    withdrawalRatePct: adjustedWithdrawalRate,
  });

  const yearsToFire = yearsToFireSim.yearsToFire;
  const fireYear = yearsToFireSim.reached ? yearsToFireSim.year : Number.NaN;
  const projected = yearsToFireSim.portfolioAtFire;

  const altYearsToFireSim = !yearsToFireSim.reached
    ? findFireMilestoneFromTrajectory({
        trajectory: buildCapitalTrajectory(
          baseYear,
          maxProjectionYear,
          maxProjectionYear,
          w.startingPortfolioEur,
          annualSavings,
          afterTaxReturn,
          w.annualExpensesEur,
          w.postRetirementWorkIncomeEur,
          w.capitalStrategy,
          w.inflationPct,
        ),
        startYear: baseYear,
        annualExpensesEur: w.annualExpensesEur,
        postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
        inflationPct: w.inflationPct,
        withdrawalRatePct: adjustedWithdrawalRate,
      })
    : null;

  const portfolioAtTargetAge =
    fullTrajectory.find((point) => Number(point.period) === targetRetirementYear)?.portfolioEur ??
    fullTrajectory[fullTrajectory.length - 1]?.portfolioEur ??
    0;
  const targetAnnualNeedAtTargetAge = Math.max(
    0,
    w.annualExpensesEur * inflationToTarget - w.postRetirementWorkIncomeEur * inflationToTarget,
  );
  const requiredPortfolioAtTargetAge = Math.round(targetAnnualNeedAtTargetAge / Math.max(0.001, adjustedWithdrawalRate / 100));
  const retirementYearGap = yearsToFireSim.reached ? fireYear - targetRetirementYear : Number.NaN;
  const altRetirementYearGap = altYearsToFireSim?.reached ? altYearsToFireSim.year - targetRetirementYear : Number.NaN;
  const retirementAmountGap = Math.round(portfolioAtTargetAge - requiredPortfolioAtTargetAge);

  const seriesEndYear = Math.min(
    maxProjectionYear,
    Math.max(
      targetRetirementYear + Math.round(retirementYearsEstimate),
      yearsToFireSim.reached ? fireYear + 12 : targetRetirementYear + 12,
    ),
  );
  const yearlyTrajectory = fullTrajectory.filter((point) => Number(point.period) <= seriesEndYear);

  const keyChartYears = new Set<number>([targetRetirementYear, seriesEndYear]);
  if (yearsToFireSim.reached && Number.isFinite(fireYear)) {
    keyChartYears.add(fireYear);
  }

  const series = yearlyTrajectory.filter((point, idx) => {
    const year = Number(point.period);
    return idx % 2 === 0 || idx === yearlyTrajectory.length - 1 || keyChartYears.has(year);
  });

  // Generate all 12 scenarios for Monte Carlo
  const scenarioAdjustments = [-3.0, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const allScenarios = scenarioAdjustments.map((adjustment) => {
    const scenarioAfterTaxReturn = Math.max(-0.95, (w.returnPct + adjustment) * (1 - w.taxRatePct / 100));
    const scenarioTrajectory = buildCapitalTrajectory(
      baseYear,
      targetRetirementYear,
      seriesEndYear,
      w.startingPortfolioEur,
      annualSavings,
      scenarioAfterTaxReturn,
      w.annualExpensesEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );
    const scenarioSeries = scenarioTrajectory.filter((point, idx) => {
      const year = Number(point.period);
      return idx % 2 === 0 || idx === scenarioTrajectory.length - 1 || keyChartYears.has(year);
    });
    
    const label = adjustment === 0 ? "Base Case (0%)" : 
                  adjustment > 0 ? `+${adjustment.toFixed(1)}%` : 
                  `${adjustment.toFixed(1)}%`;
    
    return {
      adjustment,
      label,
      series: scenarioSeries,
    };
  });

  const monteCarloTrajectory = buildCapitalTrajectory(
    baseYear,
    targetRetirementYear,
    seriesEndYear,
    w.startingPortfolioEur,
    annualSavings,
    afterTaxReturn - 2,
    w.annualExpensesEur,
    w.postRetirementWorkIncomeEur,
    w.capitalStrategy,
    w.inflationPct,
  );

  const monteCarloSeries = series.map((point) => {
    const match = monteCarloTrajectory.find((m) => m.period === point.period);
    return {
      period: point.period,
      monteCarloEur: match?.portfolioEur ?? point.portfolioEur,
    };
  });

  const successRate = simulateSuccessRate(w, profile, targetRetirementYear);

  const yearsToFireAtReturn = (returnPct: number) => {
    const scenarioAfterTaxReturn = Math.max(-0.95, returnPct * (1 - w.taxRatePct / 100));
    const scenarioTrajectory = buildCapitalTrajectory(
      baseYear,
      maxProjectionYear,
      maxProjectionYear,
      w.startingPortfolioEur,
      annualSavings,
      scenarioAfterTaxReturn,
      w.annualExpensesEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );
    return findFireMilestoneFromTrajectory({
      trajectory: scenarioTrajectory,
      startYear: baseYear,
      annualExpensesEur: w.annualExpensesEur,
      postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
      inflationPct: w.inflationPct,
      withdrawalRatePct: adjustedWithdrawalRate,
    }).yearsToFire;
  };

  const sensitivity = [
    { bucket: "4%", years: yearsToFireAtReturn(4) },
    { bucket: "5%", years: yearsToFireAtReturn(5) },
    { bucket: "6%", years: yearsToFireAtReturn(6) },
    { bucket: "7%", years: yearsToFireAtReturn(7) },
    { bucket: "8%", years: yearsToFireAtReturn(8) },
  ];

  return {
    yearsToFire,
    successRate,
    fireYear,
    projected,
    portfolioAtTargetAge,
    fireTargetEur: requiredPortfolioAtTargetAge,
    altYearsToFire: altYearsToFireSim?.reached ? altYearsToFireSim.yearsToFire : Number.NaN,
    altFireYear: altYearsToFireSim?.reached ? altYearsToFireSim.year : Number.NaN,
    altRetirementYearGap,
    afterTaxReturn,
    series,
    monteCarloSeries,
    allScenarios,
    sensitivity,
    retirementYearsEstimate,
    annualExpenseGapInRetirement,
    adjustedWithdrawalRate,
    profileCurrentAge: profile.currentAge,
    profileExpectedLifetime: profile.expectedLifetime,
    targetRetirementYear,
    retirementYearGap,
    retirementAmountGap,
  };
}

function mapScenarioToWizard(scenario: FireScenario): WizardState {
  return {
    name: scenario.name,
    annualIncomeEur: scenario.annualIncomeEur,
    annualExpensesEur: scenario.annualExpensesEur,
    returnPct: scenario.returnPct,
    taxRatePct: scenario.taxRatePct,
    inflationPct: scenario.inflationPct,
    withdrawalRatePct: scenario.withdrawalRatePct,
    profileScope: scenario.profileScope,
    targetRetirementAge: scenario.targetRetirementAge,
    postRetirementWorkIncomeEur: scenario.postRetirementWorkIncomeEur,
    capitalStrategy: scenario.capitalStrategy,
    startingPortfolioEur: scenario.startingPortfolioEur,
  };
}

function checkScenarioSuccess(
  w: WizardState,
  profile: { currentAge: number; expectedLifetime: number },
  targetRetirementYear: number,
  adjustment: number,
) {
  const yearsToTargetAge = Math.max(0, targetRetirementYear - 2026);
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const safeWithdrawalRate = Math.max(0.1, w.withdrawalRatePct) / 100;
  const scenarioAfterTaxReturn = Math.max(-0.95, (w.returnPct + adjustment) * (1 - w.taxRatePct / 100));
  const retirementYearsEstimate = Math.max(1, Math.round(profile.expectedLifetime - w.targetRetirementAge));
  const simulationEndYear = targetRetirementYear + retirementYearsEstimate;

  const series = buildCapitalTrajectory(
    2026,
    targetRetirementYear,
    simulationEndYear,
    w.startingPortfolioEur,
    annualSavings,
    scenarioAfterTaxReturn,
    w.annualExpensesEur,
    w.postRetirementWorkIncomeEur,
    w.capitalStrategy,
    w.inflationPct,
  );

  const targetYearIdx = Math.min(series.length - 1, yearsToTargetAge);
  const portfolioAtRetirement = series[targetYearIdx]?.portfolioEur ?? 0;

  // Required FIRE portfolio: inflation-adjusted expense gap / withdrawal rate at retirement date.
  const inflationFactor = (1 + w.inflationPct / 100) ** yearsToTargetAge;
  const expenseGapAtRetirement = Math.max(
    0,
    w.annualExpensesEur * inflationFactor - w.postRetirementWorkIncomeEur * inflationFactor,
  );
  const requiredAtRetirement = expenseGapAtRetirement / safeWithdrawalRate;

  // Success: portfolio at retirement covers the FIRE number.
  return portfolioAtRetirement >= requiredAtRetirement;
}

function backendToFireScenario(s: WealthFireScenario, members: ProfileMember[]): FireScenario {
  const w: WizardState = {
    name: s.name,
    annualIncomeEur: s.annualIncomeEur,
    annualExpensesEur: s.annualExpensesEur,
    returnPct: s.returnPct,
    taxRatePct: s.taxRatePct,
    inflationPct: s.inflationPct,
    withdrawalRatePct: s.withdrawalRatePct,
    profileScope: s.profileScope,
    targetRetirementAge: s.targetRetirementAge,
    postRetirementWorkIncomeEur: s.postRetirementWorkIncomeEur,
    capitalStrategy: s.capitalStrategy,
    startingPortfolioEur: s.startingPortfolioEur,
  };
  const profile = getProfileAssumptions(s.profileScope, members);
  const c = mockCalc(w, profile);
  
  // Determine status based on base case and -1.5% stress scenario
  let status: FireScenario["status"] = "On Track";
  const baseSuccess = checkScenarioSuccess(w, profile, c.targetRetirementYear, 0);
  const stress15Success = checkScenarioSuccess(w, profile, c.targetRetirementYear, -1.5);
  
  if (baseSuccess && stress15Success) {
    status = "On Track";
  } else if (!baseSuccess && !stress15Success) {
    status = "Lagging";
  } else {
    status = "At Risk";
  }
  
  return {
    id: s.id,
    name: s.name,
    status,
    annualIncomeEur: s.annualIncomeEur,
    annualExpensesEur: s.annualExpensesEur,
    returnPct: s.returnPct,
    taxRatePct: s.taxRatePct,
    inflationPct: s.inflationPct,
    withdrawalRatePct: s.withdrawalRatePct,
    profileScope: s.profileScope,
    targetRetirementAge: s.targetRetirementAge,
    postRetirementWorkIncomeEur: s.postRetirementWorkIncomeEur,
    capitalStrategy: s.capitalStrategy,
    startingPortfolioEur: s.startingPortfolioEur,
    retirementYears: c.retirementYearsEstimate,
    yearsToFire: Number.isFinite(c.yearsToFire) ? Number(c.yearsToFire.toFixed(1)) : -1,
    fireYear: c.fireYear,
    successRatePct: Math.round(c.successRate),
    projectedPortfolioEur: c.projected,
    fireNumberEur: c.fireTargetEur,
    retirementYearGap: c.retirementYearGap,
    altYearsToFire: Number.isFinite(c.altYearsToFire) ? Number(c.altYearsToFire.toFixed(1)) : Number.NaN,
    altFireYear: c.altFireYear,
    altRetirementYearGap: c.altRetirementYearGap,
    retirementAmountGap: c.retirementAmountGap,
    chartSeries: c.series,
    accountIds: s.accountIds ?? [],
  };
}

export default function WealthFireScenariosPage() {
  const displayedScenarioAdjustments = [-3.0, -1.5, 1.5, 3.0] as const;
  const { data: rawPersonProfiles = [] } = useWealthPersonProfiles();
  const personProfiles = (rawPersonProfiles as WealthPersonProfile[]).filter((profile) => profile.isActive !== false);
  const profileMembers = useMemo<ProfileMember[]>(() => {
    const sorted = [...personProfiles].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const selected = sorted.slice(0, 2);
    return selected.map((person, idx) => ({
      id: idx === 0 ? "p-1" : "p-2",
      name: person.name,
      currentAge: Number(person.currentAge ?? 40),
      expectedLifetime: Number(person.expectedLifetime ?? 90),
    }));
  }, [personProfiles]);

  const { data: rawScenarios = [], isLoading, isError } = useWealthFireScenarios();
  const scenarios: FireScenario[] = useMemo(
    () => (rawScenarios as WealthFireScenario[]).map((scenario) => backendToFireScenario(scenario, profileMembers)),
    [rawScenarios, profileMembers],
  );
  const { data: rawAccounts = [] } = useWealthAccounts();
  const accounts = rawAccounts as WealthAccount[];
  const createFireScenario = useCreateWealthFireScenario();
  const updateFireScenario = useUpdateWealthFireScenario();
  const deleteFireScenario = useDeleteWealthFireScenario();
  const [selected, setSelected] = useState<FireScenario | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<FireScenario | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>(initialWizard);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [hasTouchedAccountSelection, setHasTouchedAccountSelection] = useState(false);
  const [isReturnManuallyEdited, setIsReturnManuallyEdited] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<number>>(new Set([-1.5, 1.5]));
  const [selectedDetailScenarios, setSelectedDetailScenarios] = useState<Set<number>>(new Set([-1.5, 1.5]));
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; tone: "success" | "error" }>>([]);

  const latestInventoryDate = useMemo(
    () => accounts.reduce<string | null>((latest, account) => (!latest || account.updatedAt > latest ? account.updatedAt : latest), null),
    [accounts],
  );
  const latestInventoryAccounts = useMemo(
    () => accounts.filter((account) => account.updatedAt === latestInventoryDate),
    [accounts, latestInventoryDate],
  );

  const uniqueOwners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of latestInventoryAccounts) seen.set(a.ownerId, a.ownerName);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [latestInventoryAccounts]);

  const selectedEurTotal = useMemo(() => {
    return latestInventoryAccounts
      .filter((a) => selectedAccountIds.has(a.id))
      .reduce((sum, a) => sum + a.nativeBalance * a.fxToEur, 0);
  }, [latestInventoryAccounts, selectedAccountIds]);

  const proposedReturnPct = useMemo(() => {
    const selectedAssetAccounts = latestInventoryAccounts.filter((a) => {
      if (!selectedAccountIds.has(a.id)) return false;
      if (a.type === "Loan") return false;
      const eurValue = a.nativeBalance * a.fxToEur;
      return eurValue > 0;
    });

    const totalEur = selectedAssetAccounts.reduce((sum, account) => sum + account.nativeBalance * account.fxToEur, 0);
    if (totalEur <= 0) return null;

    const weightedReturn = selectedAssetAccounts.reduce((sum, account) => {
      const eurValue = account.nativeBalance * account.fxToEur;
      return sum + eurValue * account.expectedReturnPct;
    }, 0);

    return Number((weightedReturn / totalEur).toFixed(2));
  }, [latestInventoryAccounts, selectedAccountIds]);

  useEffect(() => {
    if (editingScenarioId && !hasTouchedAccountSelection) {
      return;
    }
    setWizard((prev) => ({ ...prev, startingPortfolioEur: Math.round(selectedEurTotal) }));
  }, [editingScenarioId, hasTouchedAccountSelection, selectedEurTotal]);

  useEffect(() => {
    if (isReturnManuallyEdited) return;
    if (proposedReturnPct === null) return;
    setWizard((prev) => ({ ...prev, returnPct: proposedReturnPct }));
  }, [isReturnManuallyEdited, proposedReturnPct]);

  useEffect(() => {
    setSelectedDetailScenarios(new Set([-1.5, 1.5]));
  }, [selected]);

  function addToast(message: string, tone: "success" | "error") {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  function toggleOwner(ownerId: string, checked: boolean) {
    setHasTouchedAccountSelection(true);
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      for (const a of latestInventoryAccounts) {
        if (a.ownerId === ownerId) {
          checked ? next.add(a.id) : next.delete(a.id);
        }
      }
      return next;
    });
  }

  function toggleAccount(accountId: string, checked: boolean) {
    setHasTouchedAccountSelection(true);
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(accountId) : next.delete(accountId);
      return next;
    });
  }

  const profileAssumptions = useMemo(
    () => getProfileAssumptions(wizard.profileScope, profileMembers),
    [wizard.profileScope, profileMembers],
  );
  const computed = useMemo(() => mockCalc(wizard, profileAssumptions), [wizard, profileAssumptions]);
  const step1Errors = useMemo(
    () => ({
      startingPortfolioEur:
        wizard.startingPortfolioEur > 0 ? "" : "Select at least one account so starting portfolio is above 0.",
    }),
    [wizard.startingPortfolioEur],
  );
  const step2Errors = useMemo(
    () => ({
      annualIncomeEur: wizard.annualIncomeEur > 0 ? "" : "Annual income must be greater than 0.",
      annualExpensesEur: wizard.annualExpensesEur >= 0 ? "" : "Annual expenses cannot be negative.",
    }),
    [wizard.annualExpensesEur, wizard.annualIncomeEur],
  );
  const step3Errors = useMemo(
    () => ({
      inflationPct:
        Number.isFinite(wizard.inflationPct) && wizard.inflationPct >= 0 && wizard.inflationPct <= 20
          ? ""
          : "Inflation should be between 0% and 20%.",
    }),
    [wizard.inflationPct],
  );
  const step4Errors = useMemo(
    () => ({
      targetRetirementAge:
        wizard.targetRetirementAge > profileAssumptions.currentAge &&
        wizard.targetRetirementAge <= profileAssumptions.expectedLifetime
          ? ""
          : `Target retirement age must be between ${Math.ceil(profileAssumptions.currentAge + 1)} and ${Math.floor(profileAssumptions.expectedLifetime)}.`,
      postRetirementWorkIncomeEur:
        wizard.postRetirementWorkIncomeEur >= 0 ? "" : "Post-retirement income cannot be negative.",
    }),
    [
      wizard.targetRetirementAge,
      wizard.postRetirementWorkIncomeEur,
      profileAssumptions.currentAge,
      profileAssumptions.expectedLifetime,
    ],
  );
  const canProceedStep1 = !step1Errors.startingPortfolioEur;
  const canProceedStep2 = !step2Errors.annualIncomeEur && !step2Errors.annualExpensesEur;
  const canProceedStep3 = !step3Errors.inflationPct;
  const canProceedStep4 = !step4Errors.targetRetirementAge && !step4Errors.postRetirementWorkIncomeEur;
  const selectedComputed = useMemo(() => {
    if (!selected) return null;
    const selectedWizard = mapScenarioToWizard(selected);
    const selectedProfile = getProfileAssumptions(selectedWizard.profileScope, profileMembers);
    return mockCalc(selectedWizard, selectedProfile);
  }, [profileMembers, selected]);
  const computedCashflowRows = useMemo(() => {
    const annualSavings = Math.max(0, wizard.annualIncomeEur - wizard.annualExpensesEur);
    const endYear = computed.targetRetirementYear + Math.round(computed.retirementYearsEstimate);
    return buildYearlyCashflowRows({
      startYear: 2026,
      retirementYear: computed.targetRetirementYear,
      endYear,
      currentAge: computed.profileCurrentAge,
      startingPortfolioEur: wizard.startingPortfolioEur,
      annualSavingsEur: annualSavings,
      afterTaxReturnPct: computed.afterTaxReturn,
      annualExpensesEur: wizard.annualExpensesEur,
      postRetirementWorkIncomeEur: wizard.postRetirementWorkIncomeEur,
      inflationPct: wizard.inflationPct,
    });
  }, [wizard, computed]);
  const selectedCashflowRows = useMemo(() => {
    if (!selected || !selectedComputed) {
      return [];
    }

    const annualSavings = Math.max(0, selected.annualIncomeEur - selected.annualExpensesEur);
    const endYear = selectedComputed.targetRetirementYear + Math.round(selectedComputed.retirementYearsEstimate);

    return buildYearlyCashflowRows({
      startYear: 2026,
      retirementYear: selectedComputed.targetRetirementYear,
      endYear,
      currentAge: selectedComputed.profileCurrentAge,
      startingPortfolioEur: selected.startingPortfolioEur,
      annualSavingsEur: annualSavings,
      afterTaxReturnPct: selectedComputed.afterTaxReturn,
      annualExpensesEur: selected.annualExpensesEur,
      postRetirementWorkIncomeEur: selected.postRetirementWorkIncomeEur,
      inflationPct: selected.inflationPct,
    });
  }, [selected, selectedComputed]);

  function resetWizard() {
    setWizard(initialWizard);
    setIsReturnManuallyEdited(false);
    setHasTouchedAccountSelection(false);
    setWizardStep(1);
    setEditingScenarioId(null);
    setSelectedAccountIds(new Set());
    setSelectedScenarios(new Set([-1.5, 1.5]));
  }

  function saveScenario() {
    const payload = {
      name: wizard.name || "New Scenario",
      annualIncomeEur: wizard.annualIncomeEur,
      annualExpensesEur: wizard.annualExpensesEur,
      returnPct: wizard.returnPct,
      taxRatePct: wizard.taxRatePct,
      inflationPct: wizard.inflationPct,
      withdrawalRatePct: wizard.withdrawalRatePct,
      profileScope: wizard.profileScope,
      targetRetirementAge: wizard.targetRetirementAge,
      postRetirementWorkIncomeEur: wizard.postRetirementWorkIncomeEur,
      capitalStrategy: wizard.capitalStrategy,
      startingPortfolioEur: wizard.startingPortfolioEur,
      onTrajectory: true,
      accountIds: Array.from(selectedAccountIds),
    };

    const onSuccess = () => {
      addToast(editingScenarioId ? "Scenario updated." : "Scenario created.", "success");
      setOpenWizard(false);
      resetWizard();
    };

    const onError = () => {
      addToast(editingScenarioId ? "Failed to update scenario." : "Failed to create scenario.", "error");
    };

    if (editingScenarioId) {
      updateFireScenario.mutate({ id: editingScenarioId, ...payload }, { onSuccess, onError });
      return;
    }

    const createPayload: WealthFireScenario = {
      id: `fs-${Date.now()}`,
      ...payload,
      accountIds: Array.from(selectedAccountIds),
    };
    createFireScenario.mutate(createPayload, { onSuccess, onError });
  }

  function editScenarioParameters(scenario: FireScenario) {
    setEditingScenarioId(scenario.id);
    setWizard(mapScenarioToWizard(scenario));
    setSelectedAccountIds(new Set(scenario.accountIds ?? []));
    setHasTouchedAccountSelection((scenario.accountIds ?? []).length > 0);
    setIsReturnManuallyEdited(true);
    setWizardStep(1);
    setSelectedScenarios(new Set([-1.5, 1.5]));
    setOpenWizard(true);
    setSelected(null);
  }

  const isSaving = createFireScenario.isPending || updateFireScenario.isPending;

  return (
    <PageFrame>
      <PageHeader
        title="FIRE Scenarios"
      />

      {isLoading ? (
        <SurfaceCard><Skeleton lines={6} /></SurfaceCard>
      ) : isError ? (
        <SurfaceCard>
          <p style={{ color: "var(--color-status-error)" }}>Failed to load FIRE scenarios. Check that the backend is running.</p>
        </SurfaceCard>
      ) : (<>
      <SurfaceCard>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Scenario Registry</h3>
          <Button onClick={() => setOpenWizard(true)}>Create Scenario</Button>
        </div>

        {scenarios.length === 0 ? (
          <EmptyState title="No scenarios yet" description="Create your first FIRE scenario to compare pathways." />
        ) : (
          <DataTable
            rowKey="id"
            data={scenarios as unknown as Record<string, unknown>[]}
            pageSize={6}
            columns={[
              { key: "name", header: "Scenario" },
              {
                key: "status",
                header: "Status",
                render: (value) => <StatusPill tone={statusTone(String(value) as FireScenario["status"])}>{String(value)}</StatusPill>,
              },
              {
                key: "annualIncomeEur",
                header: "In / Out",
                render: (_value, row) => {
                  const r = row as unknown as FireScenario;
                  return (
                    <span style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--color-status-success)" }}>{formatMoneyCompact(r.annualIncomeEur)}</span>
                      {" / "}
                      <span style={{ color: "var(--color-status-error)" }}>{formatMoneyCompact(r.annualExpensesEur)}</span>
                    </span>
                  );
                },
              },
              {
                key: "yearsToFire",
                header: "Yrs",
                render: (value, row) => {
                  const r = row as unknown as FireScenario;
                  const years = Number(value);
                  if (Number.isFinite(years) && years >= 0) return `${years}`;
                  if (Number.isFinite(r.altYearsToFire)) return `${Number(r.altYearsToFire).toFixed(1)}`;
                  return "Not reached";
                },
              },
              {
                key: "fireNumberEur",
                header: "FIRE #",
                render: (value) => formatMoneyCompact(Number(value)),
              },
              {
                key: "retirementYearGap",
                header: "Age gap",
                render: (_value, row) => {
                  const r = row as unknown as FireScenario;
                  const gap = r.retirementYearGap;
                  const color = !Number.isFinite(gap)
                    ? "var(--color-text-subtle)"
                    : gap <= 0
                      ? "var(--color-status-success)"
                      : "var(--color-status-error)";
                  return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{formatYearGapWithFallback(gap, r.altRetirementYearGap)}</span>;
                },
              },
              {
                key: "retirementAmountGap",
                header: "Amt gap",
                render: (_value, row) => {
                  const r = row as unknown as FireScenario;
                  const gap = r.retirementAmountGap;
                  const color = gap >= 0 ? "var(--color-status-success)" : "var(--color-status-error)";
                  return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{gap >= 0 ? `+${formatMoneyCompact(gap)}` : formatMoneyCompact(gap)}</span>;
                },
              },
              {
                key: "capitalStrategy",
                header: "Capital",
                render: (value) => <StatusPill tone={value === "protect" ? "info" : "warning"}>{value === "protect" ? "Protect" : "Deplete"}</StatusPill>,
              },
              {
                key: "postRetirementWorkIncomeEur",
                header: "Pension",
                render: (value) => formatMoneyCompact(Number(value)),
              },
              {
                key: "successRatePct",
                header: "P(success)",
                render: (value) => `${value}%`,
              },
              {
                key: "actions",
                header: "Actions",
                sortable: false,
                render: (_value, row) => {
                  const scenarioRow = row as unknown as FireScenario;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Button
                        type="button"
                        variant="icon"
                        aria-label={`Edit ${scenarioRow.name}`}
                        title={`Edit ${scenarioRow.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          editScenarioParameters(scenarioRow);
                        }}
                      >
                        <EditIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="icon"
                        className="wealth-danger-icon-button"
                        aria-label={`Delete ${scenarioRow.name}`}
                        title={`Delete ${scenarioRow.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCandidate(scenarioRow);
                        }}
                      >
                        <DeleteIcon />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            onRowClick={(row) => setSelected(row as unknown as FireScenario)}
          />
        )}
      </SurfaceCard>

      <Modal
        open={openWizard}
        onClose={() => {
          setOpenWizard(false);
          resetWizard();
        }}
        title={`${editingScenarioId ? "Edit FIRE Scenario" : "New FIRE Scenario"} - Step ${wizardStep}/5`}
        size="wide"
      >
        <div
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor: "var(--color-bg-subtle)",
            marginBottom: 14,
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              height: "100%",
              width: `${(wizardStep / 5) * 100}%`,
              backgroundColor: "var(--color-brand-primary)",
            }}
          />
        </div>
        {wizardStep === 1 ? (
          <FormContainer
            footer={
              <div className="wealth-modal-actions">
                <Button type="button" variant="secondary" onClick={() => { setOpenWizard(false); resetWizard(); }}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => setWizardStep(2)} disabled={!canProceedStep1}>
                  Next
                </Button>
              </div>
            }
          >
            <FormInput label="Scenario name" value={wizard.name} onChange={(e) => setWizard((p) => ({ ...p, name: e.target.value }))} />
            <FormInput
              type="number"
              label="Starting portfolio (EUR)"
              value={wizard.startingPortfolioEur}
              disabled
              helpText="Automatically calculated from selected accounts."
              error={step1Errors.startingPortfolioEur}
            />
            <div
              style={{
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                backgroundColor: "var(--color-bg-subtle)",
              }}
            >
              <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 600 }}>
                Select accounts from latest inventory date: {latestInventoryDate ?? "N/A"}
              </p>

              <div style={{ marginBottom: 10 }}>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: 11, color: "var(--color-text-subtle)" }}>By owner</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {uniqueOwners.map((owner) => {
                      const ownerAccounts = latestInventoryAccounts.filter((a) => a.ownerId === owner.id);
                      const allSelected = ownerAccounts.length > 0 && ownerAccounts.every((a) => selectedAccountIds.has(a.id));
                      return (
                        <label key={owner.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                          <input type="checkbox" checked={allSelected} onChange={(e) => toggleOwner(owner.id, e.target.checked)} />
                          {owner.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  padding: 8,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                }}
              >
                {latestInventoryAccounts.map((a) => (
                  <label
                    key={a.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      cursor: "pointer",
                      backgroundColor: selectedAccountIds.has(a.id) ? "var(--color-bg)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.has(a.id)}
                      onChange={(e) => toggleAccount(a.id, e.target.checked)}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-subtle)", lineHeight: 1.2 }}>{a.ownerName}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.accountName}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
                      {formatMoney(a.nativeBalance * a.fxToEur)}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </FormContainer>
        ) : null}

        {wizardStep === 2 ? (
          <FormContainer
            title="Income and Expenses"
            description="Capture annual flow assumptions."
            footer={
              <div className="wealth-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setWizardStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setWizardStep(3)} disabled={!canProceedStep2}>
                  Next
                </Button>
              </div>
            }
          >
            <FormInput
              type="number"
              label="Annual income (EUR)"
              value={wizard.annualIncomeEur}
              onChange={(e) => setWizard((p) => ({ ...p, annualIncomeEur: Number(e.target.value) }))}
              error={step2Errors.annualIncomeEur}
            />
            <FormInput
              type="number"
              label="Annual expenses (EUR)"
              value={wizard.annualExpensesEur}
              onChange={(e) => setWizard((p) => ({ ...p, annualExpensesEur: Number(e.target.value) }))}
              error={step2Errors.annualExpensesEur}
            />
          </FormContainer>
        ) : null}

        {wizardStep === 3 ? (
          <FormContainer
            title="Returns and Taxes"
            description={
              proposedReturnPct !== null
                ? `Configure return and taxation assumptions. Portfolio proposal from selected assets: ${proposedReturnPct.toFixed(2)}%.`
                : "Configure return and taxation assumptions."
            }
            footer={
              <div className="wealth-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setWizardStep(2)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setWizardStep(4)} disabled={!canProceedStep3}>
                  Next
                </Button>
              </div>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Slider
                label="Nominal return %"
                min={2}
                max={10}
                step={0.1}
                value={wizard.returnPct}
                onChange={(e) => {
                  setIsReturnManuallyEdited(true);
                  setWizard((p) => ({ ...p, returnPct: Number(e.target.value) }));
                }}
                valueSuffix="%"
              />
              <Slider
                label="Effective tax %"
                min={10}
                max={40}
                step={1}
                value={wizard.taxRatePct}
                onChange={(e) => setWizard((p) => ({ ...p, taxRatePct: Number(e.target.value) }))}
                valueSuffix="%"
              />
            </div>
            {proposedReturnPct !== null ? (
              <div style={{ marginTop: -6, marginBottom: 6, fontSize: 12, color: "var(--color-text-subtle)" }}>
                Proposed from selected accounts: {proposedReturnPct.toFixed(2)}%
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  style={{ marginLeft: 6, paddingInline: 8, fontSize: 12, border: "1px solid var(--color-border-subtle)" }}
                  onClick={() => {
                    setIsReturnManuallyEdited(false);
                    setWizard((prev) => ({ ...prev, returnPct: proposedReturnPct }));
                  }}
                >
                  Use Proposal
                </Button>
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormInput
                type="number"
                label="Inflation %"
                value={wizard.inflationPct}
                onChange={(e) => setWizard((p) => ({ ...p, inflationPct: Number(e.target.value) }))}
                error={step3Errors.inflationPct}
              />
              <FormInput
                type="number"
                label="Real return (after tax & inflation) %"
                value={Number(Math.max(-0.95, ((1 + computed.afterTaxReturn / 100) / (1 + wizard.inflationPct / 100) - 1) * 100).toFixed(2))}
                disabled
              />
            </div>
          </FormContainer>
        ) : null}

        {wizardStep === 4 ? (
          <FormContainer
            title="Withdrawal and Retirement Profile"
            footer={
              <div className="wealth-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setWizardStep(3)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setWizardStep(5)} disabled={!canProceedStep4}>
                  Next
                </Button>
              </div>
            }
          >
            <div className="wealth-kpi-grid wealth-kpi-grid--four" style={{ marginBottom: 12 }}>
              <KpiCard label="Years to FIRE" value={formatYearsToFire(computed.yearsToFire, computed.altYearsToFire, false)} />
              <KpiCard label="FIRE Year" value={formatFireYear(computed.fireYear, computed.altFireYear, false)} />
              <KpiCard label="Plan Success Rate" value={`${Math.round(computed.successRate)}%`} />
              <KpiCard 
                label="Gap to withdrawal" 
                value={(() => {
                  const realReturn = Math.max(-0.95, ((1 + computed.afterTaxReturn / 100) / (1 + wizard.inflationPct / 100) - 1) * 100);
                  const gap = realReturn - wizard.withdrawalRatePct;
                  return `${gap.toFixed(2)}%`;
                })()}
                tone={(() => {
                  const realReturn = Math.max(-0.95, ((1 + computed.afterTaxReturn / 100) / (1 + wizard.inflationPct / 100) - 1) * 100);
                  const gap = realReturn - wizard.withdrawalRatePct;
                  return gap < 0 ? "error" : "success";
                })()}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Slider label="Withdrawal rate %" min={2.5} max={5} step={0.1} value={wizard.withdrawalRatePct} onChange={(e) => setWizard((p) => ({ ...p, withdrawalRatePct: Number(e.target.value) }))} valueSuffix="%" />
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Potential withdrawal (EUR/yr)</label>
                <div style={{ padding: "10px 12px", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontWeight: 600 }}>
                  {formatMoney(Math.round(computed.portfolioAtTargetAge * (wizard.withdrawalRatePct / 100)))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormDropdown
                label="Profile scope"
                value={wizard.profileScope}
                onChange={(e) =>
                  setWizard((p) => ({
                    ...p,
                    profileScope: e.target.value as ProfileScope,
                  }))
                }
                options={[
                  { value: "p-1", label: profileMembers[0]?.name ?? "Person 1" },
                  { value: "p-2", label: profileMembers[1]?.name ?? profileMembers[0]?.name ?? "Person 2" },
                  { value: "both", label: "Both (average)" },
                ]}
              />
              <FormDropdown
                label="Capital strategy"
                value={wizard.capitalStrategy}
                onChange={(e) =>
                  setWizard((p) => ({ ...p, capitalStrategy: e.target.value as "protect" | "deplete" }))
                }
                options={[
                  { value: "protect", label: "Capital protection" },
                  { value: "deplete", label: "Capital depletion allowed" },
                ]}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{`Current age (${profileAssumptions.label})`}</label>
                <div style={{ padding: "10px 12px", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontWeight: 600 }}>{Number(profileAssumptions.currentAge.toFixed(1))}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{`Expected lifetime (${profileAssumptions.label})`}</label>
                <div style={{ padding: "10px 12px", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontWeight: 600 }}>{Number(profileAssumptions.expectedLifetime.toFixed(1))}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormInput
                type="number"
                label="Target retirement age"
                value={wizard.targetRetirementAge}
                onChange={(e) => setWizard((p) => ({ ...p, targetRetirementAge: Number(e.target.value) }))}
                error={step4Errors.targetRetirementAge}
              />
              <FormInput
                type="number"
                label="Post-retirement income (EUR/yr)"
                value={wizard.postRetirementWorkIncomeEur}
                onChange={(e) => setWizard((p) => ({ ...p, postRetirementWorkIncomeEur: Number(e.target.value) }))}
                error={step4Errors.postRetirementWorkIncomeEur}
              />
            </div>
          </FormContainer>
        ) : null}

        {wizardStep === 5 ? (
          <div className="stack">
            <div className="wealth-kpi-grid wealth-kpi-grid--five wealth-fire-kpi-grid-compact" style={{ textAlign: "center" }}>
              <KpiCard label="Years to FIRE" value={formatYearsToFire(computed.yearsToFire, computed.altYearsToFire, false)} />
              <KpiCard label="FIRE Year" value={formatFireYear(computed.fireYear, computed.altFireYear, false)} />
                  <KpiCard label="FIRE Target" value={formatMoneyCompact(computed.fireTargetEur)} />
              <KpiCard
                label="Gap vs Target Age"
                value={formatYearGapWithFallback(computed.retirementYearGap, computed.altRetirementYearGap, false)}
                detail={<span className="wealth-fire-kpi-detail">{formatMoneyCompact(computed.retirementAmountGap)}</span>}
              />
              <KpiCard label="Plan Success Rate" value={`${Math.round(computed.successRate)}%`} />
            </div>
            <SurfaceCard>
              <Tabs
                items={[
                  {
                    key: "trajectory",
                    label: "Trajectory",
                    content: (
                      <div className="stack">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                          {computed.allScenarios
                            .filter((scenario) => displayedScenarioAdjustments.includes(scenario.adjustment as (typeof displayedScenarioAdjustments)[number]))
                            .map((scenario) => (
                            <label key={scenario.adjustment} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="checkbox"
                                checked={selectedScenarios.has(scenario.adjustment)}
                                onChange={(e) => {
                                  setSelectedScenarios((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) {
                                      next.add(scenario.adjustment);
                                    } else {
                                      next.delete(scenario.adjustment);
                                    }
                                    return next;
                                  });
                                }}
                              />
                              <span style={{ fontSize: 12 }}>{scenario.label}</span>
                            </label>
                          ))}
                        </div>
                        <LineChart
                          data={computed.series.map((point, idx) => {
                            const dataPoint: any = {
                              ...point,
                              targetPortfolioEur: buildRetirementTargetSeries(
                                computed.series.map((s) => s.period),
                                wizard.annualExpensesEur,
                                computed.adjustedWithdrawalRate,
                                wizard.inflationPct,
                                wizard.postRetirementWorkIncomeEur,
                              )[idx],
                            };
                            // Add selected scenario data
                            computed.allScenarios.forEach((scenario) => {
                              if (selectedScenarios.has(scenario.adjustment)) {
                                dataPoint[`scenario_${scenario.adjustment}`] = scenario.series[idx]?.portfolioEur;
                              }
                            });
                            return dataPoint;
                          })}
                          xKey="period"
                          yLabel="EUR (M)"
                          yTickFormatter={(value) => formatMillions(value)}
                          tooltipLabelFormatter={(label) => {
                            const year = Number(label);
                            if (!Number.isFinite(year)) {
                              return String(label);
                            }
                            const age = profileAssumptions.currentAge + (year - 2026);
                            return `${year} (Age ${age.toFixed(1)})`;
                          }}
                          tooltipValueFormatter={(value) => `€${formatMillions(value)}`}
                          referenceLines={[
                            ...(Number.isFinite(computed.fireYear)
                              ? [{
                                  x: String(computed.fireYear),
                                  label: "FIRE",
                                  color: "var(--color-chart-series-8)",
                                  strokeDasharray: "4 4",
                                }]
                              : []),
                            {
                              x: String(computed.targetRetirementYear),
                              label: "Retirement",
                              color: "var(--color-text-default)",
                              strokeDasharray: "0",
                            },
                            {
                              x: String(2026 + Math.max(0, Math.round(computed.profileExpectedLifetime - computed.profileCurrentAge))),
                              label: "End of life",
                              color: "var(--color-chart-series-6)",
                              strokeDasharray: "0",
                            },
                          ]}
                          series={[
                            { dataKey: "portfolioEur", name: "Portfolio" },
                            { dataKey: "targetPortfolioEur", name: "Retirement Target", color: "var(--color-chart-series-3)" },
                            ...Array.from(selectedScenarios).reduce<Array<{ dataKey: string; name: string; color: string }>>((acc, adjustment, i) => {
                              if (!displayedScenarioAdjustments.includes(adjustment as (typeof displayedScenarioAdjustments)[number])) return acc;
                              const scenario = computed.allScenarios.find((s) => s.adjustment === adjustment);
                              if (!scenario) return acc;

                              const colors = [
                                "var(--color-chart-series-9)",  // -3.0%
                                "var(--color-chart-series-4)",  // -1.5%
                                "var(--color-chart-series-1)",  // +1.5%
                                "var(--color-chart-series-7)",  // +3.0%
                              ];
                              const colorIndex = [-3.0, -1.5, 1.5, 3.0].indexOf(adjustment);
                              const color = colors[colorIndex] || `var(--color-chart-series-${(i % 8) + 1})`;

                              acc.push({
                                dataKey: `scenario_${adjustment}`,
                                name: scenario.label,
                                color,
                              });
                              return acc;
                            }, []),
                          ]}
                          height={260}
                        />
                      </div>
                    ),
                  },
                  {
                    key: "sensitivity",
                    label: "Sensitivity",
                    content: (
                      <BarChart
                        data={computed.sensitivity}
                        xKey="bucket"
                        yLabel="Years"
                        series={[{ dataKey: "years", name: "Years to FIRE" }]}
                        height={260}
                      />
                    ),
                  },
                  {
                    key: "success",
                    label: "Success Gauge",
                    content: (
                      <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-12)" }}>
                        <GaugeChart value={Math.round(computed.successRate)} max={100} label="Success" size={220} />
                      </div>
                    ),
                  },
                  {
                    key: "cashflow",
                    label: "Cashflow",
                    content: renderYearlyCashflowTable(computedCashflowRows),
                  },
                ]}
              />
            </SurfaceCard>
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setWizardStep(4)}>
                Back
              </Button>
              <Button type="button" onClick={saveScenario} loading={isSaving}>
                {editingScenarioId ? "Save Changes" : "Save Scenario"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Scenario"}
        size="wide"
        headerActions={
          selected ? (
            <Button
              type="button"
              variant="icon"
              aria-label="Edit parameters"
              title="Edit parameters"
              onClick={() => editScenarioParameters(selected)}
            >
              <EditIcon />
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="stack" style={{ textAlign: "center" }}>
            {selectedComputed ? (
              <>
                <div className="wealth-kpi-grid wealth-kpi-grid--five wealth-fire-kpi-grid-compact" style={{ textAlign: "center" }}>
                  <KpiCard label="Years to FIRE" value={formatYearsToFire(selectedComputed.yearsToFire, selectedComputed.altYearsToFire, false)} />
                  <KpiCard label="FIRE Year" value={formatFireYear(selectedComputed.fireYear, selectedComputed.altFireYear, false)} />
                  <KpiCard label="FIRE Target" value={formatMoneyCompact(selectedComputed.fireTargetEur)} />
                  <KpiCard
                    label="Gap vs Target Age"
                    value={formatYearGapWithFallback(selectedComputed.retirementYearGap, selectedComputed.altRetirementYearGap, false)}
                    detail={<span className="wealth-fire-kpi-detail">{formatMoneyCompact(selectedComputed.retirementAmountGap)}</span>}
                  />
                  <KpiCard label="Plan Success Rate" value={`${Math.round(selectedComputed.successRate)}%`} />
                </div>
                <SurfaceCard>
                  <Tabs
                    items={[
                      {
                        key: "trajectory",
                        label: "Trajectory",
                        content: (
                          <div className="stack">
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                              {selectedComputed.allScenarios
                                .filter((scenario) => displayedScenarioAdjustments.includes(scenario.adjustment as (typeof displayedScenarioAdjustments)[number]))
                                .map((scenario) => (
                                <label key={scenario.adjustment} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedDetailScenarios.has(scenario.adjustment)}
                                    onChange={(e) => {
                                      setSelectedDetailScenarios((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) {
                                          next.add(scenario.adjustment);
                                        } else {
                                          next.delete(scenario.adjustment);
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                  <span style={{ fontSize: 12 }}>{scenario.label}</span>
                                </label>
                              ))}
                            </div>
                            <LineChart
                              data={selectedComputed.series.map((point, idx) => {
                                const dataPoint: any = {
                                  ...point,
                                  targetPortfolioEur: buildRetirementTargetSeries(
                                    selectedComputed.series.map((s) => s.period),
                                    selected.annualExpensesEur,
                                    selected.withdrawalRatePct,
                                    2.2,
                                    0,
                                  )[idx],
                                };
                                selectedComputed.allScenarios.forEach((scenario) => {
                                  if (selectedDetailScenarios.has(scenario.adjustment)) {
                                    dataPoint[`scenario_${scenario.adjustment}`] = scenario.series[idx]?.portfolioEur;
                                  }
                                });
                                return dataPoint;
                              })}
                              xKey="period"
                              yLabel="EUR (M)"
                              yTickFormatter={(value) => formatMillions(value)}
                              tooltipLabelFormatter={(label) => {
                                const year = Number(label);
                                if (!Number.isFinite(year)) {
                                  return String(label);
                                }
                                const baseAge = selectedComputed.profileCurrentAge;
                                const age = baseAge + (year - 2026);
                                return `${year} (Age ${age.toFixed(1)})`;
                              }}
                              tooltipValueFormatter={(value) => `€${formatMillions(value)}`}
                              referenceLines={[
                                ...(Number.isFinite(selectedComputed.fireYear)
                                  ? [{
                                      x: String(selectedComputed.fireYear),
                                      label: "FIRE",
                                      color: "var(--color-chart-series-8)",
                                      strokeDasharray: "4 4",
                                    }]
                                  : []),
                                {
                                  x: String(selectedComputed.targetRetirementYear),
                                  label: "Retirement",
                                  color: "var(--color-text-default)",
                                  strokeDasharray: "0",
                                },
                                {
                                  x: String(2026 + Math.max(0, Math.round(selectedComputed.profileExpectedLifetime - selectedComputed.profileCurrentAge))),
                                  label: "End of life",
                                  color: "var(--color-chart-series-6)",
                                  strokeDasharray: "0",
                                },
                              ]}
                              series={[
                                { dataKey: "portfolioEur", name: selected.name },
                                { dataKey: "targetPortfolioEur", name: "Retirement Target", color: "var(--color-chart-series-3)" },
                                ...Array.from(selectedDetailScenarios).reduce<Array<{ dataKey: string; name: string; color: string }>>((acc, adjustment, i) => {
                                  if (!displayedScenarioAdjustments.includes(adjustment as (typeof displayedScenarioAdjustments)[number])) return acc;
                                  const scenario = selectedComputed.allScenarios.find((s) => s.adjustment === adjustment);
                                  if (!scenario) return acc;

                                  const colors = [
                                    "var(--color-chart-series-9)",
                                    "var(--color-chart-series-4)",
                                    "var(--color-chart-series-1)",
                                    "var(--color-chart-series-7)",
                                  ];
                                  const colorIndex = [-3.0, -1.5, 1.5, 3.0].indexOf(adjustment);
                                  const color = colors[colorIndex] || `var(--color-chart-series-${(i % 8) + 1})`;

                                  acc.push({
                                    dataKey: `scenario_${adjustment}`,
                                    name: scenario.label,
                                    color,
                                  });
                                  return acc;
                                }, []),
                              ]}
                              height={260}
                            />
                          </div>
                        ),
                      },
                      {
                        key: "sensitivity",
                        label: "Sensitivity",
                        content: (
                          <BarChart
                            data={selectedComputed.sensitivity}
                            xKey="bucket"
                            yLabel="Years"
                            series={[{ dataKey: "years", name: "Years to FIRE" }]}
                            height={260}
                          />
                        ),
                      },
                      {
                        key: "success",
                        label: "Success Gauge",
                        content: (
                          <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-12)" }}>
                            <GaugeChart value={Math.round(selectedComputed.successRate)} max={100} label="Success" size={220} />
                          </div>
                        ),
                      },
                      {
                        key: "cashflow",
                        label: "Cashflow",
                        content: renderYearlyCashflowTable(selectedCashflowRows),
                      },
                    ]}
                  />
                </SurfaceCard>
              </>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        title="Delete scenario"
        variant="confirm"
      >
        {deleteCandidate ? (
          <FormContainer
            description={`Are you sure you want to delete \"${deleteCandidate.name}\"? This cannot be undone.`}
            footer={
              <div className="wealth-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setDeleteCandidate(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={deleteFireScenario.isPending}
                  onClick={() => {
                    const candidate = deleteCandidate;
                    if (!candidate) return;
                    deleteFireScenario.mutate(candidate.id, {
                      onSuccess: () => {
                        addToast("Scenario deleted.", "success");
                        if (selected?.id === candidate.id) {
                          setSelected(null);
                        }
                        setDeleteCandidate(null);
                      },
                      onError: () => {
                        addToast("Failed to delete scenario.", "error");
                      },
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            }
          >
            <p style={{ margin: 0, color: "var(--color-text-subtle)" }}>
              This will permanently remove the scenario from the registry.
            </p>
          </FormContainer>
        ) : null}
      </Modal>

      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            tone={toast.tone}
            autoDismissMs={3500}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </ToastContainer>
      </>)}
    </PageFrame>
  );
}
