import type { FireScenario } from "@/lib/wealth-mock-data";
import type { WealthFireScenario } from "@/hooks/use-api";

export type ProfileScope = "p-1" | "p-2" | "both";

export type ProfileMember = {
  id: string;
  name: string;
  currentAge: number;
  expectedLifetime: number;
};

export type WizardState = {
  name: string;
  annualIncomeEur: number;
  annualExpensesEur: number;
  useCustomRetirementExpense: boolean;
  retirementAnnualExpenseEur: number;
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

export type YearlyCashflowRow = {
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

export const initialWizard: WizardState = {
  name: "",
  annualIncomeEur: 128000,
  annualExpensesEur: 70000,
  useCustomRetirementExpense: false,
  retirementAnnualExpenseEur: 70000,
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

export function formatYearGap(yearGap: number): string {
  if (!Number.isFinite(yearGap)) return "Not reached";
  if (Math.abs(yearGap) < 0.05) return "On target";
  return yearGap > 0 ? `+${yearGap.toFixed(1)}y` : `${yearGap.toFixed(1)}y`;
}

export function formatYearsToFire(yearsToFire: number, altYearsToFire?: number): string {
  if (Number.isFinite(yearsToFire) && yearsToFire >= 0) return yearsToFire.toFixed(1);
  if (Number.isFinite(altYearsToFire) && (altYearsToFire ?? -1) >= 0) {
    return (altYearsToFire as number).toFixed(1);
  }
  return "Not reached";
}

export function formatFireYear(fireYear: number, altFireYear?: number): string {
  if (Number.isFinite(fireYear)) return String(Math.round(fireYear));
  if (Number.isFinite(altFireYear)) {
    return String(Math.round(altFireYear as number));
  }
  return "Not reached";
}

export function formatYearGapWithFallback(yearGap: number, altYearGap?: number): string {
  if (Number.isFinite(yearGap)) return formatYearGap(yearGap);
  if (Number.isFinite(altYearGap)) {
    return formatYearGap(altYearGap as number);
  }
  return "Not reached";
}

export function getProfileAssumptions(scope: ProfileScope, members: ProfileMember[]) {
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

export function getRetirementAnnualExpenseEur(params: {
  annualExpensesEur: number;
  useCustomRetirementExpense: boolean;
  retirementAnnualExpenseEur: number;
}) {
  const fallback = Math.max(0, params.annualExpensesEur);
  if (!params.useCustomRetirementExpense) {
    return fallback;
  }
  return Math.max(0, params.retirementAnnualExpenseEur);
}

export function buildRetirementTargetSeries(
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

export function buildCapitalTrajectory(
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

export function buildYearlyCashflowRows(params: {
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

export function findFireMilestoneFromTrajectory(params: {
  trajectory: Array<{ period: string; portfolioEur: number }>;
  startYear: number;
  annualExpensesEur: number;
  postRetirementWorkIncomeEur: number;
  inflationPct: number;
  withdrawalRatePct: number;
  capitalStrategy: "protect" | "deplete";
  afterTaxReturnPct: number;
  currentAge: number;
  expectedLifetime: number;
}) {
  const {
    trajectory,
    startYear,
    annualExpensesEur,
    postRetirementWorkIncomeEur,
    inflationPct,
    withdrawalRatePct,
    capitalStrategy,
    afterTaxReturnPct,
    currentAge,
    expectedLifetime,
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
    let requiredPortfolio = annualNeed / safeWithdrawalRate;

    if (capitalStrategy === "deplete") {
      const yearsRemaining = Math.max(1, expectedLifetime - (currentAge + yearsFromStart));
      const r = afterTaxReturnPct / 100;

      if (Math.abs(r) < 1e-9) {
        requiredPortfolio = annualNeed * yearsRemaining;
      } else {
        requiredPortfolio = annualNeed * ((1 - (1 + r) ** -yearsRemaining) / r);
      }
    }

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

export function simulateSuccessRate(
  w: WizardState,
  profile: { currentAge: number; expectedLifetime: number },
  targetRetirementYear: number,
) {
  const yearsToTargetAge = Math.max(0, targetRetirementYear - 2026);
  const retirementYearsEstimate = Math.max(1, Math.round(profile.expectedLifetime - w.targetRetirementAge));
  const simulationEndYear = targetRetirementYear + retirementYearsEstimate;
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const retirementAnnualExpenseEur = getRetirementAnnualExpenseEur(w);
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
      retirementAnnualExpenseEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );

    const targetYearIdx = Math.min(series.length - 1, yearsToTargetAge);
    const targetYearPortfolio = series[targetYearIdx]?.portfolioEur ?? 0;
    const targetInflationFactor = (1 + w.inflationPct / 100) ** yearsToTargetAge;
    const targetYearGap = Math.max(
      0,
      retirementAnnualExpenseEur * targetInflationFactor - w.postRetirementWorkIncomeEur * targetInflationFactor,
    );
    const requiredPortfolio = targetYearGap / safeWithdrawalRate;
    const finalValue = series[series.length - 1]?.portfolioEur ?? 0;

    let isSuccess = false;
    if (w.capitalStrategy === "protect") {
      let canSustain = true;
      for (let i = targetYearIdx; i < series.length; i++) {
        const year = 2026 + i;
        if (year > targetRetirementYear) {
          const yearsFromStart = year - 2026;
          const inflationFactor = (1 + w.inflationPct / 100) ** yearsFromStart;
          const currentExpenseGap = Math.max(
            0,
            retirementAnnualExpenseEur * inflationFactor - w.postRetirementWorkIncomeEur * inflationFactor,
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
      isSuccess = targetYearPortfolio > 0 && finalValue > 0;
    }

    if (isSuccess) {
      successCount += 1;
    }
  }

  return (successCount / scenarioAdjustments.length) * 100;
}

export function mockCalc(w: WizardState, profile: { currentAge: number; expectedLifetime: number }) {
  const baseYear = 2026;
  const maxProjectionYears = 80;
  const maxProjectionYear = baseYear + maxProjectionYears;
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const retirementAnnualExpenseEur = getRetirementAnnualExpenseEur(w);
  const yearsToTargetAgeExact = Math.max(0, w.targetRetirementAge - profile.currentAge);
  const targetRetirementYear = baseYear + Math.round(yearsToTargetAgeExact);
  const yearsToTargetRetirementYear = Math.max(0, targetRetirementYear - baseYear);
  const inflationToTarget = (1 + w.inflationPct / 100) ** yearsToTargetRetirementYear;
  const annualExpenseGapInRetirement = Math.max(
    0,
    retirementAnnualExpenseEur * inflationToTarget - w.postRetirementWorkIncomeEur * inflationToTarget,
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
    retirementAnnualExpenseEur,
    w.postRetirementWorkIncomeEur,
    w.capitalStrategy,
    w.inflationPct,
  );

  const yearsToFireSim = findFireMilestoneFromTrajectory({
    trajectory: fullTrajectory,
    startYear: baseYear,
    annualExpensesEur: retirementAnnualExpenseEur,
    postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
    inflationPct: w.inflationPct,
    withdrawalRatePct: adjustedWithdrawalRate,
    capitalStrategy: w.capitalStrategy,
    afterTaxReturnPct: afterTaxReturn,
    currentAge: profile.currentAge,
    expectedLifetime: profile.expectedLifetime,
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
          retirementAnnualExpenseEur,
          w.postRetirementWorkIncomeEur,
          w.capitalStrategy,
          w.inflationPct,
        ),
        startYear: baseYear,
        annualExpensesEur: retirementAnnualExpenseEur,
        postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
        inflationPct: w.inflationPct,
        withdrawalRatePct: adjustedWithdrawalRate,
        capitalStrategy: w.capitalStrategy,
        afterTaxReturnPct: afterTaxReturn,
        currentAge: profile.currentAge,
        expectedLifetime: profile.expectedLifetime,
      })
    : null;

  const portfolioAtTargetAge =
    fullTrajectory.find((point) => Number(point.period) === targetRetirementYear)?.portfolioEur ??
    fullTrajectory[fullTrajectory.length - 1]?.portfolioEur ??
    0;
  const targetAnnualNeedAtTargetAge = Math.max(
    0,
    retirementAnnualExpenseEur * inflationToTarget - w.postRetirementWorkIncomeEur * inflationToTarget,
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
      retirementAnnualExpenseEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );
    const scenarioSeries = scenarioTrajectory.filter((point, idx) => {
      const year = Number(point.period);
      return idx % 2 === 0 || idx === scenarioTrajectory.length - 1 || keyChartYears.has(year);
    });

    const label = adjustment === 0 ? "Base Case (0%)"
      : adjustment > 0 ? `+${adjustment.toFixed(1)}%`
        : `${adjustment.toFixed(1)}%`;

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
    retirementAnnualExpenseEur,
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
      retirementAnnualExpenseEur,
      w.postRetirementWorkIncomeEur,
      w.capitalStrategy,
      w.inflationPct,
    );
    return findFireMilestoneFromTrajectory({
      trajectory: scenarioTrajectory,
      startYear: baseYear,
      annualExpensesEur: retirementAnnualExpenseEur,
      postRetirementWorkIncomeEur: w.postRetirementWorkIncomeEur,
      inflationPct: w.inflationPct,
      withdrawalRatePct: adjustedWithdrawalRate,
      capitalStrategy: w.capitalStrategy,
      afterTaxReturnPct: scenarioAfterTaxReturn,
      currentAge: profile.currentAge,
      expectedLifetime: profile.expectedLifetime,
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

export function mapScenarioToWizard(scenario: FireScenario): WizardState {
  return {
    name: scenario.name,
    annualIncomeEur: scenario.annualIncomeEur,
    annualExpensesEur: scenario.annualExpensesEur,
    useCustomRetirementExpense: scenario.useCustomRetirementExpense ?? false,
    retirementAnnualExpenseEur: scenario.retirementAnnualExpenseEur ?? scenario.annualExpensesEur,
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

export function checkScenarioSuccess(
  w: WizardState,
  profile: { currentAge: number; expectedLifetime: number },
  targetRetirementYear: number,
  adjustment: number,
) {
  const yearsToTargetAge = Math.max(0, targetRetirementYear - 2026);
  const annualSavings = Math.max(0, w.annualIncomeEur - w.annualExpensesEur);
  const retirementAnnualExpenseEur = getRetirementAnnualExpenseEur(w);
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
    retirementAnnualExpenseEur,
    w.postRetirementWorkIncomeEur,
    w.capitalStrategy,
    w.inflationPct,
  );

  const targetYearIdx = Math.min(series.length - 1, yearsToTargetAge);
  const portfolioAtRetirement = series[targetYearIdx]?.portfolioEur ?? 0;

  const inflationFactor = (1 + w.inflationPct / 100) ** yearsToTargetAge;
  const expenseGapAtRetirement = Math.max(
    0,
    retirementAnnualExpenseEur * inflationFactor - w.postRetirementWorkIncomeEur * inflationFactor,
  );
  const requiredAtRetirement = expenseGapAtRetirement / safeWithdrawalRate;

  return portfolioAtRetirement >= requiredAtRetirement;
}

export function backendToFireScenario(s: WealthFireScenario, members: ProfileMember[]): FireScenario {
  const w: WizardState = {
    name: s.name,
    annualIncomeEur: s.annualIncomeEur,
    annualExpensesEur: s.annualExpensesEur,
    useCustomRetirementExpense: s.useCustomRetirementExpense ?? false,
    retirementAnnualExpenseEur: s.retirementAnnualExpenseEur ?? s.annualExpensesEur,
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
    useCustomRetirementExpense: s.useCustomRetirementExpense ?? false,
    retirementAnnualExpenseEur: s.retirementAnnualExpenseEur ?? s.annualExpensesEur,
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
