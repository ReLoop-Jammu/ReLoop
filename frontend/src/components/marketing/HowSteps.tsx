import { ClipboardCheck, PackageOpen, ScanSearch, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: PackageOpen,
    title: "Submit your items",
    body: "Businesses, collection partners and individuals share item details and photos with ReLoop.",
  },
  {
    icon: ScanSearch,
    title: "ReLoop checks them",
    body: "Condition, testing status, quantity and location are verified. Verified partners publish directly.",
  },
  {
    icon: ClipboardCheck,
    title: "Buyers inquire and buy",
    body: "Buyers send inquiries; ReLoop coordinates availability, payment and delivery across India.",
  },
];

export function HowSteps({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <ol className="relative grid gap-5 md:grid-cols-3 md:gap-8" role="list">
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-7 right-[16%] left-[16%] hidden border-t-2 border-dashed md:block",
          dark ? "border-white/15" : "border-line-strong",
        )}
      />
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="relative md:text-center">
            <div className="flex items-center gap-4 md:flex-col">
              <span
                className={cn(
                  "relative grid size-14 shrink-0 place-items-center rounded-2xl",
                  dark
                    ? "bg-white/10 text-gold-400 ring-1 ring-white/15"
                    : "bg-surface text-brand-600 shadow-soft ring-1 ring-line",
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-gold-500 text-xs font-bold text-brand-950">
                  {i + 1}
                </span>
              </span>
              <h3 className={cn("text-xl font-semibold md:mt-2", dark && "text-white")}>
                {step.title}
              </h3>
            </div>
            <p
              className={cn(
                "mt-3 leading-relaxed md:mx-auto md:max-w-xs",
                dark ? "text-white/70" : "text-muted",
              )}
            >
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
