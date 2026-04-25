"use client";

import { useState } from "react";

type PeriodOption = { value: string; label: string };

const DEFAULT_PERIODS: PeriodOption[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

type TemporalFilterProps = {
  periods?: PeriodOption[];
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  onRangeChange?: (start: string, end: string) => void;
  showDateRange?: boolean;
};

/**
 * Period selector + optional date range picker.
 * Maps to Dash create_temporal_filters / create_filters.
 */
export function TemporalFilter({
  periods = DEFAULT_PERIODS,
  defaultPeriod = "30d",
  onPeriodChange,
  onRangeChange,
  showDateRange = true,
}: TemporalFilterProps) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handlePeriod(value: string) {
    setPeriod(value);
    onPeriodChange?.(value);
  }

  function handleRange(start: string, end: string) {
    if (start) setStartDate(start);
    if (end) setEndDate(end);
    onRangeChange?.(start || startDate, end || endDate);
  }

  return (
    <div className="temporal-filter">
      <div className="period-selector" role="group" aria-label="Time period">
        {periods.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`period-btn${period === p.value ? " active" : ""}`}
            onClick={() => handlePeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showDateRange && period === "custom" && (
        <div className="date-range-row">
          <label className="form-label" htmlFor="range-start">
            From
          </label>
          <input
            id="range-start"
            type="date"
            className="form-input form-datepicker date-range-input"
            value={startDate}
            onChange={(e) => handleRange(e.target.value, "")}
          />
          <span className="date-range-sep" aria-hidden="true">
            →
          </span>
          <label className="form-label" htmlFor="range-end">
            To
          </label>
          <input
            id="range-end"
            type="date"
            className="form-input form-datepicker date-range-input"
            value={endDate}
            min={startDate}
            onChange={(e) => handleRange("", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
