import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

type Props = { icon?: LucideIcon; title: string; description: ReactNode; actions?: ReactNode };

export function EmptyState({ icon: Icon = SearchX, title, description, actions }: Props) {
  return (
    <div className="rounded-panel border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted">{description}</p>
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
