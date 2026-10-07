import { PackageOpen, Recycle, ScanSearch, ShoppingBag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: PackageOpen,
    title: "Collect",
    body: "From repair shops and retailers on a weekly route, booked institution pickups, and household drop-offs.",
  },
  {
    icon: ScanSearch,
    title: "Grade",
    body: "Every item is tagged, tested and graded A to D at our Jammu hub. Phones, laptops and drives are data-wiped.",
  },
  {
    icon: ShoppingBag,
    title: "Resell",
    body: "Working items are resold, fixable ones are repaired by partner shops, and good parts are stripped and sold.",
  },
  {
    icon: Recycle,
    title: "Recycle",
    body: "Only what is truly dead or hazardous goes to an authorised recycler, weighed, with a receipt.",
  },
];

export function LoopSteps({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-7 right-[12%] left-[12%] hidden border-t-2 border-dashed lg:block",
          dark ? "border-white/15" : "border-line-strong",
        )}
      />
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="relative lg:text-center">
            <div className="flex items-center gap-4 lg:flex-col">
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
              <h3 className={cn("text-xl font-semibold lg:mt-2", dark && "text-white")}>
                {step.title}
              </h3>
            </div>
            <p
              className={cn(
                "mt-3 leading-relaxed lg:mx-auto lg:max-w-60",
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
