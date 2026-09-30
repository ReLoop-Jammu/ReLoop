import type { ReactNode } from "react";

type Props = { icon?: string; title: string; description: ReactNode; actions?: ReactNode };

export function EmptyState({ icon = "🔍", title, description, actions }: Props) {
  return (
    <div className="rounded-card border-line bg-surface border border-dashed px-6 py-12 text-center">
      <div className="text-5xl" aria-hidden="true">
        {icon}
      </div>
      <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
      <p className="text-muted mx-auto mt-2 max-w-md leading-relaxed">{description}</p>
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
