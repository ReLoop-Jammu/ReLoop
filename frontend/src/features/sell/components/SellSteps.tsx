import { T } from "@/components/i18n/T";
import { Steps } from "@/components/marketing/Steps";
import { PAYMENT_TIMES, SHOP_STEPS } from "../steps";

/** The six steps for shops, and when each kind of payment is made. */
export function ShopSellSteps({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const Sub = headingLevel === 2 ? "h3" : "h4";
  return (
    <section aria-labelledby="shop-steps-heading">
      <H id="shop-steps-heading" className="text-2xl font-bold sm:text-3xl">
        <T en="How selling works for shops" hi="दुकानें हमें कैसे बेचती हैं" />
      </H>
      <Steps steps={SHOP_STEPS} columns={3} className="mt-6" />
      <p className="mt-4 text-sm text-muted">
        <T
          en="Only selling scrap? You don't need an account: we weigh it and pay you at your counter on your route day."
          hi="सिर्फ़ कबाड़ बेचना है? खाते की ज़रूरत नहीं: रूट वाले दिन हम आपकी दुकान पर ही तौलकर पैसे दे देते हैं।"
        />
      </p>
      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
        <Sub className="text-lg font-semibold">
          <T en="When you get paid" hi="पैसे कब मिलते हैं" />
        </Sub>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          {PAYMENT_TIMES.map((p, i) => (
            <div key={i} className="border-l-4 border-gold-500 pl-3">
              <dt className="font-semibold text-ink">{p.title}</dt>
              <dd className="mt-0.5 text-sm text-ink-soft">{p.when}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
