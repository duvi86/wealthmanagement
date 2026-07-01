import { buildFireTargetSeries, computeComparableFireTargetEur, computeFireTargetEur } from "./dashboard-aggregations";
import type { WealthFireScenario } from "@/hooks/use-api";

function makeScenario(
  id: string,
  name: string,
  annualExpensesEur: number,
): WealthFireScenario {
  return {
    id,
    name,
    annualIncomeEur: 120000,
    annualExpensesEur,
    useCustomRetirementExpense: false,
    retirementAnnualExpenseEur: annualExpensesEur,
    returnPct: 6,
    taxRatePct: 24,
    inflationPct: 2,
    withdrawalRatePct: 3.8,
    profileScope: "both",
    targetRetirementAge: 52,
    postRetirementWorkIncomeEur: 12000,
    capitalStrategy: "protect",
    startingPortfolioEur: 0,
    onTrajectory: true,
    accountIds: [],
  };
}

describe("buildFireTargetSeries", () => {
  it("sorts FIRE series by target amount descending", () => {
    const series = buildFireTargetSeries(
      [
        {
          ...makeScenario("be", "FIRE Belgium", 70000),
          accountIds: ["eligible-be"],
        },
        {
          ...makeScenario("es", "FIRE Spain", 80000),
          accountIds: ["eligible-es"],
        },
        {
          ...makeScenario("ch", "FIRE Switzerland", 90000),
          accountIds: ["eligible-ch"],
        },
      ],
      9_000_000,
    );

    expect(series.map((item) => item.name)).toEqual([
      "FIRE Switzerland",
      "FIRE Spain",
      "FIRE Belgium",
    ]);
    expect(series[0].targetEur).toBe(
      computeComparableFireTargetEur(makeScenario("ch", "FIRE Switzerland", 90000), 9_000_000),
    );
    expect(series[1].targetEur).toBe(
      computeComparableFireTargetEur(makeScenario("es", "FIRE Spain", 80000), 9_000_000),
    );
    expect(series[2].targetEur).toBe(
      computeComparableFireTargetEur(makeScenario("be", "FIRE Belgium", 70000), 9_000_000),
    );
  });
});