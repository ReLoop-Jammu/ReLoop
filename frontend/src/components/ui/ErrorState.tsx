import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

/** When something couldn't load: what happened, and a way to try again. */
export function ErrorState({
  title = "This couldn't load",
  description,
  actions,
}: {
  title?: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-panel border border-danger/25 bg-danger-bg px-6 py-10 text-center"
    >
      <AlertTriangle className="mx-auto size-7 text-danger" aria-hidden="true" />
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
