import { type InputHTMLAttributes, forwardRef } from "react";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helpText?: string;
};

/** Text input with label, error, and help text. Maps to Dash create_form_input. */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
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
          id={inputId}
          className={`form-input${error ? " form-input-error" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? `${inputId}-error` : null, helpText ? `${inputId}-help` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
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
FormInput.displayName = "FormInput";
