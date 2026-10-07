import { MapPin, Package, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { ContactDetail } from "@/components/legal/LegalPage";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BUSINESS_RULES } from "@/config/business-rules";
import { SITE } from "@/lib/site";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Warranty & delivery",
  description: `${BUSINESS_RULES.warrantyDays}-day warranty on grade A and B devices. Free hub pickup or ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} delivery in Jammu.`,
};

const OPTIONS: { icon: LucideIcon; title: string; price: string; body: string }[] = [
  {
    icon: MapPin,
    title: "Pick up from the hub",
    price: "Free",
    body: "Collect from our hub in Jammu at a time we agree with you.",
  },
  {
    icon: Truck,
    title: "Delivery in Jammu",
    price: formatPrice(BUSINESS_RULES.jammuDeliveryPaise),
    body: "Delivered to your door anywhere in Jammu.",
  },
  {
    icon: Package,
    title: "Shipping across India",
    price: "Paid by buyer",
    body: "Available for laptops and boards only. Shipping is paid by the buyer.",
  },
];

export default function WarrantyPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>Warranty & delivery</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Bought from ReLoop, backed by ReLoop.
        </h1>
      </div>

      <section
        className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        aria-labelledby="warranty-heading"
      >
        <div className="rounded-panel border border-line bg-surface p-7 shadow-soft sm:p-9">
          <ShieldCheck className="size-8 text-grade-a" aria-hidden="true" />
          <h2 id="warranty-heading" className="mt-4 text-2xl font-bold sm:text-3xl">
            {BUSINESS_RULES.warrantyDays}-day warranty on grade A and B devices
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Devices graded A (works, clean) or B (repaired) come with a{" "}
            {BUSINESS_RULES.warrantyDays}-day warranty from the day you collect or receive them. If
            something goes wrong, contact us with the item&apos;s ID (it starts with RL-JMU) and
            we&apos;ll check it at the hub.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Grade C parts are tested before sale but are sold as parts: please check compatibility
            with your device first.
          </p>
          <p className="mt-6 rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink-soft">
            Full warranty terms (what is covered and how claims are handled) will be published here
            before the shop opens.
          </p>
        </div>
        <div className="rounded-panel border border-line bg-sunken p-7 sm:p-9">
          <h2 className="text-xl font-semibold">Making a claim</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Contact us with your item ID and what went wrong.
          </p>
          <p className="mt-4 font-medium text-ink">
            <ContactDetail value={SITE.supportPhone ?? SITE.supportEmail} />
          </p>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="delivery-heading">
        <h2 id="delivery-heading" className="text-3xl font-bold sm:text-4xl">
          Getting your item
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3" role="list">
          {OPTIONS.map(({ icon: Icon, title, price, body }) => (
            <li key={title} className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 font-display text-2xl font-bold text-brand-600">{price}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
