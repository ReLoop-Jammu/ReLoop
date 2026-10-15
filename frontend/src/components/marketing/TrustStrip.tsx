import { BadgeCheck, Eraser, ListChecks, ShoppingBag, Wrench, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShoppingBag,
    title: "Bought",
    body: "We buy every item outright, so we know where it came from.",
  },
  { icon: Wrench, title: "Tested", body: "Each device goes through a checklist at the hub." },
  {
    icon: Eraser,
    title: "Wiped",
    body: "Phones, laptops and drives are wiped before they are listed.",
  },
  {
    icon: BadgeCheck,
    title: "Graded",
    body: "An honest A to D grade; parts are marked Tested part.",
  },
  {
    icon: ListChecks,
    title: "Listed",
    body: "Priced to the grade, with its passport and inspection report.",
  },
];

/** The five steps every item goes through before it is on sale. */
export function TrustStrip() {
  return (
    <section aria-labelledby="trust-heading">
      <Container className="pt-12 pb-6">
        <h2
          id="trust-heading"
          className="font-sans text-sm font-semibold tracking-normal text-muted"
        >
          What happens to every item before it is on sale
        </h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="list">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative flex gap-3 rounded-card border border-line bg-surface p-4 shadow-soft lg:flex-col"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mesh text-gold-400">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  <span className="text-muted">{i + 1}. </span>
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
