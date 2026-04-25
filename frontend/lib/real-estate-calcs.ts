/**
 * Real Estate Investment Analyzer — TypeScript port of Python calculations.
 * All calculations are pure functions with no side effects.
 */

// ─── Tax helpers ──────────────────────────────────────────────────────────────

export function calculatePurchaseTax(housePrice: number): number {
  return housePrice * 0.14;
}

export function calculateAnnualPropertyTax(rc: number, year: number, inflationRate: number): number {
  const inflFactor = (1 + inflationRate) ** year;
  return rc * 2.25 * inflFactor * 0.6;
}

export function calculateAdditionalTax(rc: number, year: number, inflationRate: number): number {
  const inflFactor = (1 + inflationRate) ** year;
  return rc * 2.25 * inflFactor * 1.4 * 0.54;
}

export function calculateTotalAnnualTaxes(rc: number, year: number, inflationRate: number): number {
  return calculateAnnualPropertyTax(rc, year, inflationRate) + calculateAdditionalTax(rc, year, inflationRate);
}

// ─── Cash flow helpers ────────────────────────────────────────────────────────

export function calculateMonthlyMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12);
  const monthlyRate = annualRate / 12;
  const n = years * 12;
  return (principal * (monthlyRate * (1 + monthlyRate) ** n)) / ((1 + monthlyRate) ** n - 1);
}

export function calculateAnnualRent(initialRent: number, year: number, rentInflationRate: number): number {
  return initialRent * (1 + rentInflationRate) ** year;
}

export function calculateAnnualMaintenance(
  housePrice: number,
  year: number,
  maintenancePct: number,
  houseInflationRate: number,
): number {
  return housePrice * (1 + houseInflationRate) ** year * maintenancePct;
}

export function calculateAnnualInsurance(
  housePrice: number,
  year: number,
  insurancePct: number,
  houseInflationRate: number,
): number {
  return housePrice * (1 + houseInflationRate) ** year * insurancePct;
}

// ─── Base yearly cash flows ───────────────────────────────────────────────────

export type BaseCashFlowResult = {
  yearlyCF: number[];
  cumulativeCF: number[];
  houseValues: number[];
  yearlyInterestPaid: number[];
};

export function calculateYearlyCashFlows(
  housePrice: number,
  rc: number,
  initialRent: number,
  mortgageRate: number,
  mortgageYears: number,
  downPaymentRatio: number,
  rentInflationRate: number,
  houseInflationRate: number,
  taxInflationRate: number,
  maintenancePct: number,
  years: number,
  tenantTurnoverPct = 0,
  managementPct = 0,
  insurancePct = 0,
  corporate = false,
): BaseCashFlowResult {
  const downPayment = housePrice * downPaymentRatio;
  const purchaseTax = calculatePurchaseTax(housePrice);
  const loanAmount = housePrice - downPayment;
  const monthlyPayment = calculateMonthlyMortgagePayment(loanAmount, mortgageRate, mortgageYears);
  const annualMortgagePayment = monthlyPayment * 12;

  const yearlyCF: number[] = [];
  const cumulativeCF: number[] = [];
  const houseValues: number[] = [];
  const yearlyInterestPaid: number[] = [];

  let cumulativeSum = -(downPayment + purchaseTax);
  let balance = loanAmount;
  let currentDeferredCashflow = 0;

  for (let year = 0; year < years; year++) {
    const annualRent = calculateAnnualRent(initialRent, year, rentInflationRate);
    const annualTaxes = corporate
      ? calculateAnnualPropertyTax(rc, year, taxInflationRate)
      : calculateTotalAnnualTaxes(rc, year, taxInflationRate);
    const annualMaintenance = calculateAnnualMaintenance(housePrice, year, maintenancePct, houseInflationRate);
    const annualInsurance = calculateAnnualInsurance(housePrice, year, insurancePct, houseInflationRate);
    const mortgagePayment = year < mortgageYears ? annualMortgagePayment : 0;

    let interestPaid = 0;
    if (year < mortgageYears) {
      for (let m = 0; m < 12; m++) {
        const monthlyInterest = balance * (mortgageRate / 12);
        interestPaid += monthlyInterest;
        const monthlyPrincipal = monthlyPayment - monthlyInterest;
        balance -= monthlyPrincipal;
      }
    }
    yearlyInterestPaid.push(interestPaid);

    const tenantTurnoverCost = annualRent * tenantTurnoverPct;
    const managementCost = annualRent * managementPct;

    let yearlyCashFlow =
      annualRent -
      annualTaxes -
      annualMaintenance -
      tenantTurnoverCost -
      managementCost -
      annualInsurance -
      mortgagePayment;

    if (corporate) {
      const cashFlowAdj = yearlyCashFlow + mortgagePayment - interestPaid - housePrice * 0.03;
      if (currentDeferredCashflow + cashFlowAdj < 0) {
        currentDeferredCashflow += cashFlowAdj;
      } else {
        const corporateTax = (currentDeferredCashflow + cashFlowAdj) * (1 - 0.75 * 0.7);
        yearlyCashFlow -= corporateTax;
        currentDeferredCashflow = 0;
      }
    }

    yearlyCF.push(yearlyCashFlow);
    cumulativeSum += yearlyCashFlow;
    cumulativeCF.push(cumulativeSum);
    houseValues.push(housePrice * (1 + houseInflationRate) ** (year + 1));
  }

  return { yearlyCF, cumulativeCF, houseValues, yearlyInterestPaid };
}

// ─── Cash flows with capital gains ────────────────────────────────────────────

export type FullCashFlowResult = {
  yearlyCF: number[];
  cumulativeCF: number[];
  houseValues: number[];
  capitalGains: number[];
  remainingBalances: number[];
  yearlyInterestPaid: number[];
};

export function calculateYearlyCashFlowsWithCapitalGains(
  housePrice: number,
  rc: number,
  initialRent: number,
  mortgageRate: number,
  mortgageYears: number,
  downPaymentRatio: number,
  rentInflationRate: number,
  houseInflationRate: number,
  taxInflationRate: number,
  maintenancePct: number,
  years: number,
  tenantTurnoverPct = 0,
  managementPct = 0,
  insurancePct = 0,
  includeCapitalGains = true,
  salePriceMultiplier = 1.0,
  bulletMortgage = false,
  corporate = false,
): FullCashFlowResult {
  const downPayment = housePrice * downPaymentRatio;
  const purchaseTax = calculatePurchaseTax(housePrice);
  const loanAmount = housePrice - downPayment;

  // ── Bullet mortgage path ──
  if (bulletMortgage) {
    const yearlyCF: number[] = [];
    const cumulativeCF: number[] = [];
    const capitalGains: number[] = [];
    const houseValues: number[] = [];
    const yearlyInterestPaid: number[] = [];
    let cumulativeSum = -(downPayment + purchaseTax);
    let currentDeferredCashflow = -purchaseTax;

    for (let year = 0; year < years; year++) {
      const annualRent = calculateAnnualRent(initialRent, year, rentInflationRate);
      const annualTaxes = corporate
        ? calculateAnnualPropertyTax(rc, year, taxInflationRate)
        : calculateTotalAnnualTaxes(rc, year, taxInflationRate);
      const annualMaintenance = calculateAnnualMaintenance(housePrice, year, maintenancePct, houseInflationRate);
      const annualInsurance = calculateAnnualInsurance(housePrice, year, insurancePct, houseInflationRate);
      const annualInterest = year < mortgageYears ? loanAmount * mortgageRate : 0;
      yearlyInterestPaid.push(annualInterest);

      const tenantTurnoverCost = annualRent * tenantTurnoverPct;
      const managementCost = annualRent * managementPct;

      let yearlyCashFlow =
        annualRent - annualTaxes - annualMaintenance - tenantTurnoverCost - managementCost - annualInsurance - annualInterest;

      if (corporate) {
        const cashFlowAdj = yearlyCashFlow - housePrice * 0.03;
        if (currentDeferredCashflow + cashFlowAdj < 0) {
          currentDeferredCashflow += cashFlowAdj;
        } else {
          const corporateTax = (currentDeferredCashflow + cashFlowAdj) * (1 - 0.75 * 0.7);
          yearlyCashFlow -= corporateTax;
          currentDeferredCashflow = 0;
        }
      }

      yearlyCF.push(yearlyCashFlow);
      cumulativeSum += yearlyCashFlow;
      cumulativeCF.push(cumulativeSum);
      const hv = housePrice * (1 + houseInflationRate) ** (year + 1);
      houseValues.push(hv * salePriceMultiplier);
      capitalGains.push(hv - housePrice);
    }

    return {
      yearlyCF,
      cumulativeCF,
      houseValues,
      capitalGains,
      remainingBalances: new Array(years).fill(loanAmount),
      yearlyInterestPaid,
    };
  }

  // ── Standard amortizing mortgage path ──
  const base = calculateYearlyCashFlows(
    housePrice, rc, initialRent, mortgageRate, mortgageYears,
    downPaymentRatio, rentInflationRate, houseInflationRate, taxInflationRate,
    maintenancePct, years, tenantTurnoverPct, managementPct, insurancePct, corporate,
  );

  if (!includeCapitalGains) {
    return {
      yearlyCF: base.yearlyCF,
      cumulativeCF: base.cumulativeCF,
      houseValues: base.houseValues,
      capitalGains: new Array(years).fill(0),
      remainingBalances: new Array(years).fill(0),
      yearlyInterestPaid: base.yearlyInterestPaid,
    };
  }

  // Compute remaining balance at each year end
  const monthlyPayment = calculateMonthlyMortgagePayment(loanAmount, mortgageRate, mortgageYears);
  const yearlyCFWithGains: number[] = [];
  const cumulativeWithGains: number[] = [];
  const capitalGains: number[] = [];
  const remainingBalances: number[] = [];

  let cumulativeSum = -(downPayment + purchaseTax);

  for (let year = 0; year < years; year++) {
    const baseCF = base.yearlyCF[year]!;
    const currentHouseValue = base.houseValues[year]!;
    const capitalGain = currentHouseValue - housePrice;

    const monthsPaid = Math.min((year + 1) * 12, mortgageYears * 12);
    let remainingBalance = 0;
    if (monthsPaid < mortgageYears * 12 && mortgageRate > 0) {
      const monthlyRate = mortgageRate / 12;
      const totalPayments = mortgageYears * 12;
      const remainingPayments = totalPayments - monthsPaid;
      if (monthlyRate > 0) {
        remainingBalance =
          (monthlyPayment * ((1 + monthlyRate) ** remainingPayments - 1)) /
          (monthlyRate * (1 + monthlyRate) ** remainingPayments);
      }
    }
    remainingBalances.push(remainingBalance);
    capitalGains.push(capitalGain);

    yearlyCFWithGains.push(baseCF);
    cumulativeSum += baseCF;
    cumulativeWithGains.push(cumulativeSum);
  }

  return {
    yearlyCF: yearlyCFWithGains,
    cumulativeCF: cumulativeWithGains,
    houseValues: base.houseValues.map((v) => v * salePriceMultiplier),
    capitalGains,
    remainingBalances,
    yearlyInterestPaid: base.yearlyInterestPaid,
  };
}

// ─── IRR ─────────────────────────────────────────────────────────────────────

function npv(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((sum, cf, i) => sum + cf / (1 + rate) ** i, 0);
}

function calculateIRRBisection(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  const allNonNeg = cashFlows.every((cf) => cf >= 0);
  const allNonPos = cashFlows.every((cf) => cf <= 0);
  if (allNonNeg || allNonPos) return null;

  let lo = -0.99;
  let hi = 5.0;
  let npvLo = npv(lo, cashFlows);
  let npvHi = npv(hi, cashFlows);

  if (npvLo * npvHi > 0) {
    hi = 10.0;
    npvHi = npv(hi, cashFlows);
    if (npvLo * npvHi > 0) return null;
  }

  for (let i = 0; i < 1000; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npv(mid, cashFlows);
    if (Math.abs(npvMid) < 0.0001) return mid;
    if (npvMid * npvLo < 0) {
      hi = mid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }
  return (lo + hi) / 2;
}

export function calculateIRROverYears(
  yearlyCF: number[],
  cumulativeCF: number[],
  houseValues: number[],
  capitalGains: number[],
  remainingBalances: number[],
): { years: number[]; irrValues: number[] } {
  const resultYears: number[] = [];
  const irrValues: number[] = [];
  const nYears = Math.min(yearlyCF.length, houseValues.length, capitalGains.length);
  const initialInvestment = cumulativeCF.length > 0 ? cumulativeCF[0]! - yearlyCF[0]! : 0;

  for (let year = 1; year <= nYears; year++) {
    try {
      const initialInv = -Math.abs(initialInvestment);
      const cashFlows = yearlyCF.slice(0, year).slice();
      if (cashFlows.length > 0) {
        cashFlows[cashFlows.length - 1]! +=
          houseValues[year - 1]! - (remainingBalances[year - 1] ?? 0);
      }
      cashFlows.unshift(initialInv);
      const irr = calculateIRRBisection(cashFlows);
      if (irr !== null && isFinite(irr)) {
        resultYears.push(year);
        irrValues.push(irr * 100);
      }
    } catch {
      // skip
    }
  }
  return { years: resultYears, irrValues };
}

// ─── Decomposition row ────────────────────────────────────────────────────────

export type DecompositionRow = {
  year: number;
  rent: number;
  tax: number;
  maintenance: number;
  turnover: number;
  management: number;
  insurance: number;
  interest: number;
  principal: number;
  netCF: number;
  netCFAllCash: number;
  leverage: number | null;
};

export function buildDecompositionRows(params: RealEstateParams): DecompositionRow[] {
  const {
    housePrice, rc, monthlyRent, mortgageRate, mortgageTerm, downPaymentPct,
    rentInflation, houseAppreciation, taxInflation, maintenancePct,
    tenantTurnoverPct, managementPct, insurancePct, maxYears, bulletMortgage,
  } = params;

  const initialRent = monthlyRent * 12;
  const mortgageRateDec = mortgageRate / 100;
  const downPaymentRatio = downPaymentPct / 100;
  const rentInflDec = rentInflation / 100;
  const houseInflDec = houseAppreciation / 100;
  const taxInflDec = taxInflation / 100;
  const maintDec = maintenancePct / 100;
  const turnDec = tenantTurnoverPct / 100;
  const mgmtDec = managementPct / 100;
  const insDec = insurancePct / 100;

  const downPayment = housePrice * downPaymentRatio;
  const purchaseTax = calculatePurchaseTax(housePrice);
  const loanAmount = housePrice - downPayment;
  const monthlyPayment = calculateMonthlyMortgagePayment(loanAmount, mortgageRateDec, mortgageTerm);

  const rows: DecompositionRow[] = [];
  // Year 0 — upfront
  rows.push({
    year: 0,
    rent: 0, tax: 0, maintenance: 0, turnover: 0, management: 0, insurance: 0,
    interest: 0, principal: 0,
    netCF: -(downPayment + purchaseTax),
    netCFAllCash: -(housePrice + purchaseTax),
    leverage: null,
  });

  let remainingBalance = loanAmount;

  for (let y = 0; y < maxYears; y++) {
    const rent = calculateAnnualRent(initialRent, y, rentInflDec);
    const tax = calculateTotalAnnualTaxes(rc, y, taxInflDec);
    const maintenance = calculateAnnualMaintenance(housePrice, y, maintDec, houseInflDec);
    const turnover = rent * turnDec;
    const management = rent * mgmtDec;
    const insurance = calculateAnnualInsurance(housePrice, y, insDec, houseInflDec);

    let annualInterest = 0;
    let annualPrincipal = 0;

    if (bulletMortgage) {
      if (y < mortgageTerm) {
        annualInterest = remainingBalance * mortgageRateDec;
        if (y === mortgageTerm - 1) {
          annualPrincipal = remainingBalance;
          remainingBalance = 0;
        }
      }
    } else if (y < mortgageTerm && remainingBalance > 0) {
      let monthBalance = remainingBalance;
      for (let m = 0; m < 12; m++) {
        if (monthBalance > 0) {
          const mi = monthBalance * (mortgageRateDec / 12);
          const mp = monthlyPayment - mi;
          monthBalance -= mp;
          annualInterest += mi;
          annualPrincipal += mp;
        }
      }
      remainingBalance = Math.max(0, monthBalance);
    }

    const netCF = rent - tax - maintenance - turnover - management - insurance - annualInterest - annualPrincipal;
    const netCFAllCash = rent - tax - maintenance - turnover - management - insurance;

    rows.push({
      year: y + 1,
      rent, tax, maintenance, turnover, management, insurance,
      interest: annualInterest,
      principal: annualPrincipal,
      netCF,
      netCFAllCash,
      leverage: loanAmount > 0 ? (netCFAllCash / loanAmount) * 100 : null,
    });
  }

  return rows;
}

// ─── Top-level analysis ───────────────────────────────────────────────────────

export type RealEstateParams = {
  housePrice: number;
  rc: number;
  monthlyRent: number;
  mortgageRate: number;
  mortgageTerm: number;
  downPaymentPct: number;
  allCash: boolean;
  bulletMortgage: boolean;
  corporate: boolean;
  sellPerLot: boolean;
  rentInflation: number;
  houseAppreciation: number;
  taxInflation: number;
  maintenancePct: number;
  tenantTurnoverPct: number;
  managementPct: number;
  insurancePct: number;
  maxYears: number;
};

export type RealEstateAnalysisResult = {
  // KPIs
  initialInvestment: number;
  bestIRR: number;
  paybackYear: number | null;
  totalReturn: number;
  capitalGain: number;
  // Chart series
  irrYears: number[];
  irrValues: number[];
  irrYearsCash: number[];
  irrValuesCash: number[];
  propertyValues: number[];
  propertyValuesCash: number[];
  yearlyCF: number[];
  yearlyCFCash: number[];
  cumulativeCF: number[];
  cumulativeCFCash: number[];
  capitalGainsByYear: number[];
  years: number[];
  // Table
  decomposition: DecompositionRow[];
  // Summary
  housePrice: number;
};

export function runRealEstateAnalysis(params: RealEstateParams): RealEstateAnalysisResult {
  const {
    housePrice, rc, monthlyRent, mortgageRate, mortgageTerm, downPaymentPct,
    allCash, bulletMortgage, corporate, sellPerLot,
    rentInflation, houseAppreciation, taxInflation,
    maintenancePct, tenantTurnoverPct, managementPct, insurancePct, maxYears,
  } = params;

  const initialRent = monthlyRent * 12;
  const mortgageRateDec = mortgageRate / 100;
  const downPaymentRatio = downPaymentPct / 100;
  const rentInflDec = rentInflation / 100;
  const houseInflDec = houseAppreciation / 100;
  const taxInflDec = taxInflation / 100;
  const maintDec = maintenancePct / 100;
  const turnDec = tenantTurnoverPct / 100;
  const mgmtDec = managementPct / 100;
  const insDec = insurancePct / 100;
  const saleMult = sellPerLot ? 1.08 : 1.0;

  // Main (financed) scenario
  const main = calculateYearlyCashFlowsWithCapitalGains(
    housePrice, rc, initialRent, mortgageRateDec, mortgageTerm, downPaymentRatio,
    rentInflDec, houseInflDec, taxInflDec, maintDec, maxYears,
    turnDec, mgmtDec, insDec, true, saleMult, bulletMortgage, corporate,
  );

  const { years: irrYears, irrValues } = calculateIRROverYears(
    main.yearlyCF, main.cumulativeCF, main.houseValues, main.capitalGains, main.remainingBalances,
  );

  const years = Array.from({ length: maxYears }, (_, i) => i + 1);
  const initialInvestment = main.cumulativeCF[0]! - main.yearlyCF[0]!;
  const bestIRR = irrValues.length > 0 ? Math.max(...irrValues) : 0;
  const paybackYear = irrYears.find((_, i) => irrValues[i]! > 0) ?? null;
  const totalReturn = main.cumulativeCF[main.cumulativeCF.length - 1] ?? 0;
  const capitalGain = main.capitalGains[main.capitalGains.length - 1] ?? 0;

  // All-cash scenario (optional)
  let irrYearsCash: number[] = [];
  let irrValuesCash: number[] = [];
  let yearlyCFCash: number[] = [];
  let cumulativeCFCash: number[] = [];
  let propertyValuesCash: number[] = [];

  if (allCash) {
    const cash = calculateYearlyCashFlowsWithCapitalGains(
      housePrice, rc, initialRent, 0, 1, 1.0,
      rentInflDec, houseInflDec, taxInflDec, maintDec, maxYears,
      turnDec, mgmtDec, insDec, true, saleMult, false, corporate,
    );
    const cashIRR = calculateIRROverYears(
      cash.yearlyCF, cash.cumulativeCF, cash.houseValues, cash.capitalGains, cash.remainingBalances,
    );
    irrYearsCash = cashIRR.years;
    irrValuesCash = cashIRR.irrValues;
    yearlyCFCash = cash.yearlyCF;
    cumulativeCFCash = cash.cumulativeCF;
    propertyValuesCash = cash.houseValues;
  }

  return {
    initialInvestment,
    bestIRR,
    paybackYear,
    totalReturn: housePrice + initialInvestment + totalReturn + capitalGain,
    capitalGain,
    irrYears,
    irrValues,
    irrYearsCash,
    irrValuesCash,
    propertyValues: main.houseValues,
    propertyValuesCash,
    yearlyCF: main.yearlyCF,
    yearlyCFCash,
    cumulativeCF: main.cumulativeCF,
    cumulativeCFCash,
    capitalGainsByYear: main.capitalGains,
    years,
    decomposition: buildDecompositionRows(params),
    housePrice,
  };
}
