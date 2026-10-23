import { BadgeCheck, Eraser, ListChecks, ShoppingBag, Wrench, type LucideIcon } from "lucide-react";
import { T } from "@/components/i18n/T";
import { Container } from "@/components/ui/Container";

type Step = { icon: LucideIcon; title: string; body: string; hiTitle: string; hiBody: string };

const STEPS: Step[] = [
  {
    icon: ShoppingBag,
    title: "Bought",
    body: "We buy every item outright, so we know where it came from.",
    hiTitle: "ख़रीदा",
    hiBody: "हम हर चीज़ पूरी ख़रीदते हैं, इसलिए पता होता है कि वह कहाँ से आई।",
  },
  {
    icon: Wrench,
    title: "Tested",
    body: "Each device goes through a checklist at the hub.",
    hiTitle: "जाँचा",
    hiBody: "हर डिवाइस हब में पूरी चेकलिस्ट से जाँचा जाता है।",
  },
  {
    icon: Eraser,
    title: "Wiped",
    body: "Phones, laptops and drives are wiped before they are listed.",
    hiTitle: "डेटा मिटाया",
    hiBody: "फ़ोन, लैपटॉप और ड्राइव का डेटा बेचने से पहले मिटाया जाता है।",
  },
  {
    icon: BadgeCheck,
    title: "Graded",
    body: "An honest A to D grade; parts are marked tested and working.",
    hiTitle: "ग्रेड दिया",
    hiBody: "A से D तक सही ग्रेड; पार्ट्स पर लिखा होता है कि जाँचे हुए और चालू हैं।",
  },
  {
    icon: ListChecks,
    title: "Listed",
    body: "Priced to the grade, with its item history and our test report.",
    hiTitle: "बिक्री पर",
    hiBody: "ग्रेड के हिसाब से दाम, साथ में सामान का इतिहास और हमारी जाँच रिपोर्ट।",
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
          <T
            en="What happens to every item before it is on sale"
            hi="बिकने से पहले हर सामान के साथ क्या होता है"
          />
        </h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="list">
          {STEPS.map(({ icon: Icon, title, body, hiTitle, hiBody }, i) => (
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
                  <T en={title} hi={hiTitle} />
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  <T en={body} hi={hiBody} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
