"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { Slider } from "@/components/ui/slider";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  useComputeWealthTaxCalculator,
  useWealthTaxCalculatorConfig,
  type WealthTaxCalculationResult,
  type WealthTaxCalculatorInput,
} from "@/hooks/use-api";

type ResultMode = "calculate" | "compare-countries" | "compare-scenarios";
type TaxCalculatorFormState = WealthTaxCalculatorInput;
type TaxCalculationResult = WealthTaxCalculationResult;

type CountryComparisonRow = {
  country: string;
  portfolio: string;
  shares: string;
  bonds: string;
  revenue: string;
  capitalGainsTax: string;
  dividendTax: string;
  bondTax: string;
  wealthTax: string;
  totalTax: string;
  deltaLabel: string;
  deltaRaw: number;
  netIncome: string;
  taxRate: string;
  inflationAdjustedRate: string;
  wealthGrowthRate: string;
};

type ScenarioRow = {
  portfolio: string;
  shares: string;
  bonds: string;
  revenue: string;
  capitalGainsTax: string;
  dividendTax: string;
  bondTax: string;
  wealthTax: string;
  totalTax: string;
  netIncome: string;
  taxRate: string;
  inflationAdjustedRate: string;
  wealthGrowthRate: string;
};

function currency(value: number, decimals = 2, includeSymbol = true): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const prefix = includeSymbol ? "EUR " : "";

  if (abs >= 1_000_000) {
    return `${sign}${prefix}${(abs / 1_000_000).toFixed(Math.min(decimals, 2))}M`;
  }

  if (abs >= 1_000) {
    return `${sign}${prefix}${(abs / 1_000).toFixed(Math.min(decimals, 2))}k`;
  }

  return `${sign}${prefix}${abs.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function percentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function signedCurrency(value: number, decimals = 0, includeSymbol = true): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${currency(Math.abs(value), decimals, includeSymbol)}`;
}

function makeDefaults(): TaxCalculatorFormState {
  return {
    country: "Belgium",
    portfolioValue: 1000000,
    inflationRatePct: 2,
    sharesReturnPct: 7,
    bondsReturnPct: 4,
    dividendYieldPct: 4,
    numPersons: 1,
    belgiumWealthTaxPct: 1,
    sharesAllocationPct: 70,
  };
}

export default function TaxCalculatorPage() {
  const [form, setForm] = useState<TaxCalculatorFormState>(makeDefaults());
  const [mode, setMode] = useState<ResultMode>("compare-scenarios");
  const [isConfigApplied, setIsConfigApplied] = useState(false);
  const { data: taxConfig } = useWealthTaxCalculatorConfig();
  const computeTax = useComputeWealthTaxCalculator();

  useEffect(() => {
    if (!taxConfig || isConfigApplied) return;
    setForm({
      country: taxConfig.defaults.country,
      portfolioValue: taxConfig.defaults.portfolio,
      inflationRatePct: taxConfig.defaults.inflationRatePct,
      sharesReturnPct: taxConfig.defaults.sharesReturnPct,
      bondsReturnPct: taxConfig.defaults.bondsReturnPct,
      dividendYieldPct: taxConfig.defaults.dividendYieldPct,
      numPersons: taxConfig.defaults.numPersons,
      belgiumWealthTaxPct: taxConfig.defaults.belgiumWealthTaxPct,
      sharesAllocationPct: taxConfig.defaults.sharesAllocationPct,
    });
    setIsConfigApplied(true);
  }, [isConfigApplied, taxConfig]);

  const sharesValue = useMemo(
    () => form.portfolioValue * (form.sharesAllocationPct / 100),
    [form.portfolioValue, form.sharesAllocationPct],
  );
  const bondsValue = useMemo(
    () => form.portfolioValue * ((100 - form.sharesAllocationPct) / 100),
    [form.portfolioValue, form.sharesAllocationPct],
  );

  const validationError = useMemo(() => {
    if (!form.portfolioValue || !form.inflationRatePct) {
      return "Please enter all values";
    }
    return null;
  }, [form.portfolioValue, form.inflationRatePct]);

  useEffect(() => {
    if (validationError) return;
    computeTax.mutate(form);
  }, [form, validationError, computeTax]);

  const singleResult = useMemo<TaxCalculationResult | null>(() => {
    if (validationError) return null;
    return computeTax.data?.singleResult ?? null;
  }, [computeTax.data, validationError]);

  const countryComparison = useMemo(() => {
    if (mode !== "compare-countries" || validationError) return [] as CountryComparisonRow[];

    const raw = computeTax.data?.countryComparison ?? [];
    const referenceCountry = computeTax.data?.referenceCountry ?? form.country;
    const referenceRow = raw.find((entry) => entry.country === referenceCountry);
    const referenceTax = referenceRow?.result.totalTax ?? 0;

    return raw
      .map(({ country, result }) => {
        const deltaRaw = result.totalTax - referenceTax;
        return {
          country,
          portfolio: currency(result.portfolioValue, 2, false),
          shares: currency(result.sharesValue, 2, false),
          bonds: currency(result.bondsValue, 2, false),
          revenue: currency(result.revenue, 2, false),
          capitalGainsTax: currency(result.capitalGainsTax, 2, false),
          dividendTax: currency(result.dividendTax, 2, false),
          bondTax: currency(result.bondTax, 2, false),
          wealthTax: currency(result.wealthTax, 2, false),
          totalTax: currency(result.totalTax, 2, false),
          deltaLabel: signedCurrency(deltaRaw, 2, false),
          deltaRaw,
          netIncome: currency(result.netIncome, 2, false),
          taxRate: percentage(result.taxRate),
          inflationAdjustedRate: percentage(result.inflationAdjustedRate),
          wealthGrowthRate: percentage(result.wealthGrowthRate),
        };
      })
      .sort((a, b) => a.deltaRaw - b.deltaRaw)
      .map((row) => ({ ...row, referenceCountry } as CountryComparisonRow & { referenceCountry: string })) as Array<
      CountryComparisonRow & { referenceCountry: string }
    >;
  }, [computeTax.data, form.country, mode, validationError]);

  const scenarioComparison = useMemo(() => {
    if (mode !== "compare-scenarios" || validationError) return [] as ScenarioRow[];

    return (computeTax.data?.scenarioComparison ?? []).map((scenario) => {
      const result = scenario.result;
      return {
        portfolio: currency(result.portfolioValue, 2, false),
        shares: currency(result.sharesValue, 2, false),
        bonds: currency(result.bondsValue, 2, false),
        revenue: currency(result.revenue, 2, false),
        capitalGainsTax: currency(result.capitalGainsTax, 2, false),
        dividendTax: currency(result.dividendTax, 2, false),
        bondTax: currency(result.bondTax, 2, false),
        wealthTax: currency(result.wealthTax, 2, false),
        totalTax: currency(result.totalTax, 2, false),
        netIncome: currency(result.netIncome, 2, false),
        taxRate: percentage(result.taxRate),
        inflationAdjustedRate: percentage(result.inflationAdjustedRate),
        wealthGrowthRate: percentage(result.wealthGrowthRate),
      };
    });
  }, [computeTax.data, mode, validationError]);

  const referenceCountryLabel =
    (countryComparison[0] as (CountryComparisonRow & { referenceCountry?: string }) | undefined)?.referenceCountry ??
    computeTax.data?.referenceCountry ??
    "Belgium";

  const countryOptions = taxConfig?.countryOptions ?? [{ label: form.country, value: form.country }];

  return (
    <PageFrame>
      <PageHeader title="Investment Tax Calculator" />

      <div className="wealth-tax-layout section-spacing">
        <SurfaceCard className="wealth-tax-sidebar-card wealth-tax-sidebar-card-compact">
          <div className="form-section">
            <p className="form-section-label">Country</p>
            <FormDropdown
              label="Country"
              value={form.country}
              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              options={countryOptions}
            />
          </div>

          <div className="form-section">
            <p className="form-section-label">Portfolio Inputs</p>
            <div className="wealth-tax-input-grid">
              <FormInput
                type="number"
                label="Portfolio Value"
                value={form.portfolioValue}
                onChange={(e) => setForm((prev) => ({ ...prev, portfolioValue: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="0.1"
                min={0}
                max={100}
                label="Inflation Rate (%)"
                value={form.inflationRatePct}
                onChange={(e) => setForm((prev) => ({ ...prev, inflationRatePct: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="0.1"
                min={0}
                max={50}
                label="Shares Annual Return (%)"
                value={form.sharesReturnPct}
                onChange={(e) => setForm((prev) => ({ ...prev, sharesReturnPct: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="0.1"
                min={0}
                max={50}
                label="Bonds Annual Return (%)"
                value={form.bondsReturnPct}
                onChange={(e) => setForm((prev) => ({ ...prev, bondsReturnPct: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="0.1"
                min={0}
                max={20}
                label="Dividend Yield (%)"
                value={form.dividendYieldPct}
                onChange={(e) => setForm((prev) => ({ ...prev, dividendYieldPct: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="1"
                min={1}
                max={10}
                label="Number of Persons"
                value={form.numPersons}
                onChange={(e) => setForm((prev) => ({ ...prev, numPersons: Number(e.target.value) }))}
              />
              <FormInput
                type="number"
                step="0.01"
                min={0}
                max={10}
                label="Belgium Wealth Tax (%)"
                value={form.belgiumWealthTaxPct}
                onChange={(e) => setForm((prev) => ({ ...prev, belgiumWealthTaxPct: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="form-section">
            <p className="form-section-label">Asset Allocation</p>
            <Slider
              label="Shares vs Bonds"
              min={0}
              max={100}
              step={1}
              value={form.sharesAllocationPct}
              onChange={(e) => setForm((prev) => ({ ...prev, sharesAllocationPct: Number(e.target.value) }))}
              valueSuffix="%"
            />
            <div className="wealth-tax-badge-row">
              <span className="wealth-tax-badge wealth-tax-badge-primary">Shares: {form.sharesAllocationPct}%</span>
              <span className="wealth-tax-badge wealth-tax-badge-success">Bonds: {100 - form.sharesAllocationPct}%</span>
            </div>
            <p className="wealth-muted">Shares value: <strong>{currency(sharesValue, 0)}</strong></p>
            <p className="wealth-muted">Bonds value: <strong>{currency(bondsValue, 0)}</strong></p>
          </div>

          <Button onClick={() => setMode("calculate")}>Calculate</Button>
        </SurfaceCard>

        <div className="wealth-tax-main-content stack">
          <div className="wealth-actions-row">
            <Button variant="secondary" onClick={() => setMode("compare-countries")}>Compare All Countries for Current Portfolio</Button>
            <Button variant="tertiary" onClick={() => setMode("compare-scenarios")}>Compare Scenarios for Selected Country</Button>
          </div>

          {validationError ? (
            <SurfaceCard>
              <p style={{ color: "var(--color-status-warning)", margin: 0 }}>{validationError}</p>
            </SurfaceCard>
          ) : null}

          {!validationError && mode === "calculate" && singleResult ? (
            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>{`Tax Calculation Results - ${form.country}`}</h3>
              </div>

              <div className="wealth-detail-grid">
                <div>
                  <h4 style={{ marginTop: 0 }}>Portfolio Composition</h4>
                  <p><strong>Portfolio Value:</strong> {currency(singleResult.portfolioValue)}</p>
                  <p><strong>Shares:</strong> {`${currency(singleResult.sharesValue)} (${form.sharesAllocationPct}%)`}</p>
                  <p><strong>Bonds:</strong> {`${currency(singleResult.bondsValue)} (${100 - form.sharesAllocationPct}%)`}</p>
                  <p><strong>Inflation Amount:</strong> {currency(singleResult.inflationAmount)}</p>
                </div>
                <div>
                  <h4 style={{ marginTop: 0 }}>Tax Breakdown</h4>
                  {singleResult.capitalGainsTax > 0 ? (
                    <>
                      <p><strong>Capital Gains Tax:</strong> {currency(singleResult.capitalGainsTax)}</p>
                      {singleResult.capitalGainsExemption > 0 ? (
                        <p className="wealth-muted">
                          <strong>Capital Gains Exemption:</strong> {currency(singleResult.capitalGainsExemption)}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  <p><strong>Dividend Tax:</strong> {currency(singleResult.dividendTax)}</p>
                  <p><strong>Bond Tax:</strong> {currency(singleResult.bondTax)}</p>
                  {singleResult.wealthTax > 0 ? (
                    <p><strong>Wealth Tax:</strong> {currency(singleResult.wealthTax)}</p>
                  ) : null}
                  <p style={{ color: "var(--color-status-error)", fontWeight: 700 }}>
                    <strong>Total Tax:</strong> {currency(singleResult.totalTax)}
                  </p>
                </div>
              </div>

              <hr style={{ borderColor: "var(--color-stroke-primary)" }} />
              <p><strong>Total Revenue:</strong> {currency(singleResult.revenue)}</p>
              <p><strong>Net Income:</strong> {currency(singleResult.netIncome)}</p>
              <p><strong>Tax Rate:</strong> {percentage(singleResult.taxRate)}</p>
              <p><strong>Inflation Adjusted Rate:</strong> {percentage(singleResult.inflationAdjustedRate)}</p>
            </SurfaceCard>
          ) : null}

          {!validationError && mode === "compare-countries" ? (
            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>{`Country Comparison - Portfolio: ${currency(form.portfolioValue, 0)}`}</h3>
              </div>
              <p className="wealth-muted" style={{ marginTop: 0 }}>
                {`Shares Return: ${form.sharesReturnPct}% | Bonds Return: ${form.bondsReturnPct}% | Persons: ${form.numPersons}`}
              </p>

              <div className="data-table-root">
                <div className="data-table-scroll">
                  <table className="data-table wealth-tax-table-compact">
                    <thead>
                      <tr>
                        <th className="data-table-th">Country</th>
                        <th className="data-table-th">Portfolio</th>
                        <th className="data-table-th">Shares</th>
                        <th className="data-table-th">Bonds</th>
                        <th className="data-table-th">Revenue</th>
                        <th className="data-table-th">Capital Gains Tax</th>
                        <th className="data-table-th">Dividend Tax</th>
                        <th className="data-table-th">Bond Tax</th>
                        <th className="data-table-th">Wealth Tax</th>
                        <th className="data-table-th">Total Tax</th>
                        <th className="data-table-th">{`vs_${referenceCountryLabel}`}</th>
                        <th className="data-table-th">Net Income</th>
                        <th className="data-table-th">Tax Rate</th>
                        <th className="data-table-th">Inflation Adj. Rate</th>
                        <th className="data-table-th">Wealth Growth Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryComparison.map((row) => (
                        <tr key={row.country}>
                          <td className="data-table-td" style={{ fontWeight: 700 }}>{row.country}</td>
                          <td className="data-table-td">{row.portfolio}</td>
                          <td className="data-table-td">{row.shares}</td>
                          <td className="data-table-td">{row.bonds}</td>
                          <td className="data-table-td">{row.revenue}</td>
                          <td className="data-table-td">{row.capitalGainsTax}</td>
                          <td className="data-table-td">{row.dividendTax}</td>
                          <td className="data-table-td">{row.bondTax}</td>
                          <td className="data-table-td">{row.wealthTax}</td>
                          <td className="data-table-td">{row.totalTax}</td>
                          <td className="data-table-td">
                            <span
                              className={
                                row.deltaRaw < 0
                                  ? "wealth-tax-delta wealth-tax-delta-positive"
                                  : row.deltaRaw > 0
                                    ? "wealth-tax-delta wealth-tax-delta-negative"
                                    : "wealth-tax-delta wealth-tax-delta-neutral"
                              }
                            >
                              {row.deltaLabel}
                            </span>
                          </td>
                          <td className="data-table-td">{row.netIncome}</td>
                          <td className="data-table-td">{row.taxRate}</td>
                          <td className="data-table-td">{row.inflationAdjustedRate}</td>
                          <td className="data-table-td">{row.wealthGrowthRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SurfaceCard>
          ) : null}

          {!validationError && mode === "compare-scenarios" ? (
            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>{`Scenario Comparison - ${form.country}`}</h3>
              </div>
              <div className="data-table-root">
                <div className="data-table-scroll">
                  <table className="data-table wealth-tax-table-compact">
                    <thead>
                      <tr>
                        <th className="data-table-th">Portfolio</th>
                        <th className="data-table-th">Shares</th>
                        <th className="data-table-th">Bonds</th>
                        <th className="data-table-th">Revenue</th>
                        <th className="data-table-th">Capital Gains Tax</th>
                        <th className="data-table-th">Dividend Tax</th>
                        <th className="data-table-th">Bond Tax</th>
                        <th className="data-table-th">Wealth Tax</th>
                        <th className="data-table-th">Total Tax</th>
                        <th className="data-table-th">Net Income</th>
                        <th className="data-table-th">Tax Rate</th>
                        <th className="data-table-th">Inflation Adj. Rate</th>
                        <th className="data-table-th">Wealth Growth Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioComparison.map((row) => (
                        <tr key={`${row.portfolio}-${row.totalTax}`}>
                          <td className="data-table-td">{row.portfolio}</td>
                          <td className="data-table-td">{row.shares}</td>
                          <td className="data-table-td">{row.bonds}</td>
                          <td className="data-table-td">{row.revenue}</td>
                          <td className="data-table-td">{row.capitalGainsTax}</td>
                          <td className="data-table-td">{row.dividendTax}</td>
                          <td className="data-table-td">{row.bondTax}</td>
                          <td className="data-table-td">{row.wealthTax}</td>
                          <td className="data-table-td">{row.totalTax}</td>
                          <td className="data-table-td">{row.netIncome}</td>
                          <td className="data-table-td">{row.taxRate}</td>
                          <td className="data-table-td">{row.inflationAdjustedRate}</td>
                          <td className="data-table-td">{row.wealthGrowthRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </PageFrame>
  );
}
