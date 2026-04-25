import { type SelectHTMLAttributes, forwardRef } from "react";

type SelectOption = { value: string; label: string };

type FormDropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helpText?: string;
};

/** Select dropdown with label, placeholder, and error state. Maps to Dash create_form_dropdown. */
export const FormDropdown = forwardRef<HTMLSelectElement, FormDropdownProps>(
  ({ label, options, placeholder, error, helpText, id, className = "", ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="form-field">
        {label ? (
          <label htmlFor={selectId} className="form-label">
            {label}
            {rest.required ? <span className="form-required" aria-hidden="true"> *</span> : null}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={`form-select${error ? " form-input-error" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {helpText && !error ? (
          <p id={`${selectId}-help`} className="form-help">
            {helpText}
          </p>
        ) : null}
        {error ? (
          <p id={`${selectId}-error`} className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
FormDropdown.displayName = "FormDropdown";
