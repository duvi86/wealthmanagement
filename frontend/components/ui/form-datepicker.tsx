import { type InputHTMLAttributes, forwardRef } from "react";

type FormDatepickerProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helpText?: string;
};

/** Date input with label and error state. Maps to Dash create_form_datepicker. */
export const FormDatepicker = forwardRef<HTMLInputElement, FormDatepickerProps>(
  ({ label, error, helpText, id, className = "", ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="form-field">
        {label ? (
          <label htmlFor={inputId} className="form-label">
            {label}
            {rest.required ? <span className="form-required" aria-hidden="true"> *</span> : null}
          </label>
        ) : null}
        <input
          ref={ref}
          type="date"
          id={inputId}
          className={`form-input form-datepicker${error ? " form-input-error" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...rest}
        />
        {helpText && !error ? (
          <p id={`${inputId}-help`} className="form-help">
            {helpText}
          </p>
        ) : null}
        {error ? (
          <p id={`${inputId}-error`} className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
FormDatepicker.displayName = "FormDatepicker";
