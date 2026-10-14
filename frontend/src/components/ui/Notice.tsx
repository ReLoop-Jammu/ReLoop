import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "info" | "warning" | "success" | "danger";
const STYLE: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: { box: "border-info/25 bg-info-bg text-info", icon: Info },
  warning: { box: "border-gold-500/40 bg-warning-bg text-warning", icon: AlertTriangle },
  success: { box: "border-success/25 bg-success-bg text-success", icon: CheckCircle2 },
  danger: { box: "border-danger/25 bg-danger-bg text-danger", icon: XCircle },
};

/** A message box: what happened and, where useful, what to do next. */
export function Notice({
  tone = "info",
  title,
  children,
  role,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  role?: "status" | "alert" | "note";
  className?: string;
}) {
  const { box, icon: Icon } = STYLE[tone];
  return (
    <div
      role={role}
      className={cn("flex gap-3 rounded-card border p-4 text-sm leading-relaxed", box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink-soft")}>{children}</div>}
      </div>
    </div>
  );
}
