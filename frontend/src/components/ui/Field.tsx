import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { controlClasses } from "./controls";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
};

/**
 * Label, control, hint and error. The control sits inside the <label>, so it
 * is always associated even without an id.
 */
export function Field({ label, hint, error, required, children, className, htmlFor }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </span>
        {children}
      </label>
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

type Dense = { dense?: boolean };

export function Input({ dense, className, ...props }: ComponentProps<"input"> & Dense) {
  return <input {...props} className={controlClasses({ dense, className })} />;
}

export function Select({ dense, className, ...props }: ComponentProps<"select"> & Dense) {
  return <select {...props} className={controlClasses({ dense, select: true, className })} />;
}

export function Textarea({ dense, className, ...props }: ComponentProps<"textarea"> & Dense) {
  return (
    <textarea
      {...props}
      className={controlClasses({ dense, className: cn("py-2.5", className) })}
    />
  );
}
