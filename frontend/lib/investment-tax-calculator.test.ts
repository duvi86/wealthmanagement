import { describe, expect, it } from "vitest";

import { calculateTax, type TaxCalculatorFormState } from "./investment-tax-calculator";

function makeLuxembourgState(overrides: Partial<TaxCalculatorFormState> = {}): TaxCalculatorFormState {
  return {
    country: "Luxembourg",
    portfolioValue: 1_000_000,
    inflationRatePct: 2,
    sharesReturnPct: 7,
    bondsReturnPct: 4,
    dividendYieldPct: 4,
    salaryEur: 0,
    numPersons: 1,
    belgiumWealthTaxPct: 1,
    sharesAllocationPct: 70,
    ...overrides,
  };
}

describe("Luxembourg salary-aware dividend and bond taxation", () => {
  it("increases dividend and bond tax when salary increases", () => {
    const lowSalary = calculateTax("Luxembourg", makeLuxembourgState({ salaryEur: 0 }));
    const highSalary = calculateTax("Luxembourg", makeLuxembourgState({ salaryEur: 250_000 }));

    expect(highSalary.capital_gains_tax).toBe(0);
    expect(highSalary.dividend_tax).toBeGreaterThan(lowSalary.dividend_tax);
    expect(highSalary.bond_tax).toBeGreaterThan(lowSalary.bond_tax);
  });

  it("reduces Luxembourg dividend and bond tax when salary is split across two persons", () => {
    const onePerson = calculateTax(
      "Luxembourg",
      makeLuxembourgState({ salaryEur: 250_000, numPersons: 1 }),
    );
    const twoPersons = calculateTax(
      "Luxembourg",
      makeLuxembourgState({ salaryEur: 250_000, numPersons: 2 }),
    );

    expect(twoPersons.dividend_tax).toBeLessThan(onePerson.dividend_tax);
    expect(twoPersons.bond_tax).toBeLessThan(onePerson.bond_tax);
  });
});
