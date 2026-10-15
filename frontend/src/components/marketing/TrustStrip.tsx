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
    <section aria-labelledby="trust-heading" className="border-b border-line bg-canvas">
      <Container className="py-10">
        <h2
          id="trust-heading"
          className="font-sans text-sm font-semibold tracking-normal text-muted"
        >
          What happens to every item before it is on sale
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" role="list">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
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
