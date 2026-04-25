import { type ReactNode } from "react";

type FormContainerProps = {
  title?: string;
  description?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
};

/** Wrapper that groups form fields with a title, description, and submit area. */
export function FormContainer({
  title,
  description,
  onSubmit,
  children,
  footer,
}: FormContainerProps) {
  return (
    <form className="form-container" onSubmit={onSubmit} noValidate>
      {title || description ? (
        <div className="form-header">
          {title ? <h3 className="form-container-title">{title}</h3> : null}
          {description ? <p className="form-container-desc">{description}</p> : null}
        </div>
      ) : null}
      <div className="form-body">{children}</div>
      {footer ? <div className="form-footer">{footer}</div> : null}
    </form>
  );
}
