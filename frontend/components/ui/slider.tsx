"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  valueSuffix?: string;
  marks?: Array<{ value: number; label: string }>;
  helpText?: string;
};

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      min,
      max,
      step = 1,
      value,
      valueSuffix = "",
      marks,
      helpText,
      id,
      className = "",
      ...rest
    },
    ref,
  ) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const pct = ((value - min) / Math.max(1, max - min)) * 100;

    return (
      <div className="slider-field">
        <div className="slider-header-row">
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
          <span className="slider-value">
            {value}
            {valueSuffix}
          </span>
        </div>
        <input
          ref={ref}
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          className={`slider-input ${className}`}
          style={{ backgroundSize: `${pct}% 100%` }}
          {...rest}
        />
        {marks?.length ? (
          <div className="slider-marks" aria-hidden="true">
            {marks.map((mark) => (
              <span key={mark.value} className="slider-mark">
                {mark.label}
              </span>
            ))}
          </div>
        ) : null}
        {helpText ? <p className="form-help">{helpText}</p> : null}
      </div>
    );
  },
);

Slider.displayName = "Slider";