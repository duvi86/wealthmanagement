import { type ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
};

export function FormField({ id, label, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      {children}
    </div>
  );
}
