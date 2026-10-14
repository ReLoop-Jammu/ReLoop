import { cn } from "@/lib/utils/cn";

/**
 * One look for every text field, select and textarea on the site and in the
 * hub. "dense" is the hub's compact size; public forms use the default 44 px
 * height (comfortable tap targets).
 */
export function controlClasses({
  dense = false,
  select = false,
  className,
}: { dense?: boolean; select?: boolean; className?: string } = {}) {
  return cn(
    "w-full rounded-lg border border-line-strong bg-surface text-ink transition placeholder:text-muted",
    "hover:border-ink/40 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/25 focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-danger",
    dense ? "min-h-10 px-3 text-sm" : "min-h-11 px-3.5 text-base sm:text-sm",
    select &&
      "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2356667a%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9",
    className,
  );
}
