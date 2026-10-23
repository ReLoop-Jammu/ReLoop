import {
  ArrowRight,
  Ban,
  Building2,
  PackageCheck,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { HindiPage, T } from "@/components/i18n/T";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DEVICES, listOf, NOT_ACCEPTED, PARTS } from "@/config/items";
import { SellQuickLinks } from "@/features/sell/components/SellPageHeader";
import { ShopSellSteps } from "@/features/sell/components/SellSteps";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Sell your old phones, laptops, computers and parts",
  description:
    "Repair shops, retailers, exchange stores and institutions in Jammu: sell old mobile phones, laptops, desktop computers, monitors and parts to ReLoop. Scrap paid by the kilo on the spot, devices and working parts after testing.",
};

const PATHS: {
  href: string;
  icon: LucideIcon;
  title: ReactNode;
  who: ReactNode;
  body: ReactNode;
  cta: ReactNode;
}[] = [
  {
    href: "/sell/shops",
    icon: Store,
    title: (
      <T
        en="Repair shops, retailers & exchange stores"
        hi="रिपेयर दुकानें, रिटेलर और एक्सचेंज स्टोर"
      />
    ),
    who: (
      <T
        en="Bahu Plaza, Gole Market, Raghunath Bazaar, Residency Road"
        hi="बहू प्लाज़ा, गोल मार्केट, रघुनाथ बाज़ार, रेज़िडेंसी रोड"
      />
    ),
    body: (
      <T
        en="A fixed weekly pickup day. Scrap is weighed in front of you and paid by UPI on the spot. Dead phones and trade-ins get an offer after testing."
        hi="हर हफ़्ते तय दिन पर पिकअप। कबाड़ आपके सामने तौलकर उसी समय UPI से पैसे। ख़राब फ़ोन और एक्सचेंज में आए सामान का दाम जाँच के बाद।"
      />
    ),
    cta: <T en="Become a partner shop" hi="पार्टनर दुकान बनें" />,
  },
  {
    href: "/sell/institutions",
    icon: Building2,
    title: <T en="Colleges, schools, banks & offices" hi="कॉलेज, स्कूल, बैंक और दफ़्तर" />,
    who: (
      <T
        en="Bulk lots of desktop computers, laptops and monitors"
        hi="डेस्कटॉप कंप्यूटर, लैपटॉप और मॉनिटर के बड़े लॉट"
      />
    ),
    body: (
      <T
        en="We pick up, sort on site, buy the working and repairable equipment and give you a handover record. Dead e-waste goes straight to VRRG Group, our licensed recycler, in your name."
        hi="हम पिकअप करते हैं, आपकी जगह पर छँटाई करते हैं, चालू और ठीक होने लायक़ सामान ख़रीदते हैं और पूरा रिकॉर्ड देते हैं। ख़राब ई-वेस्ट सीधे आपके नाम से VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को जाता है।"
      />
    ),
    cta: <T en="Book a lot pickup" hi="लॉट पिकअप बुक करें" />,
  },
];

const devicesEn = listOf(
  DEVICES.map((d) => ({ ...d, en: d.en.toLowerCase() })),
  "en",
);

export default async function SellPage() {
  const site = await getSiteSettings();
  const rates = {
    screens: formatPrice(site.rateScreensPaise),
    batteries: formatPrice(site.rateBatteriesPaise),
    boards: formatPrice(site.rateBoardsPaise),
    other: formatPrice(site.rateOtherPaise),
  };
  return (
    <>
      <HindiPage />
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <Eyebrow>
              <T en="For shops & institutions" hi="दुकानों और संस्थाओं के लिए" />
            </Eyebrow>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
              <T
                en="Sell your old phones, laptops, computers and parts to ReLoop."
                hi="अपने पुराने फ़ोन, लैपटॉप, कंप्यूटर और पार्ट्स ReLoop को बेचिए।"
              />
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              <T
                en={`We buy ${devicesEn}, and parts: ${listOf(PARTS, "en")}. We buy from shops, retailers and institutions only, not from homes.`}
                hi={`हम ${listOf(DEVICES, "hi")} ख़रीदते हैं, और पार्ट्स भी: ${listOf(PARTS, "hi")}। हम सिर्फ़ दुकानों, रिटेलरों और संस्थाओं से ख़रीदते हैं, घरों से नहीं।`}
              />
            </p>
            <p className="mt-3 flex items-start gap-2 text-ink-soft">
              <Ban className="mt-1 size-4 shrink-0 text-danger" aria-hidden="true" />
              <span>
                <T
                  en={
                    <>
                      <strong className="text-ink">We don&apos;t take:</strong>{" "}
                      {listOf(NOT_ACCEPTED, "en")}.
                    </>
                  }
                  hi={
                    <>
                      <strong className="text-ink">हम नहीं लेते:</strong>{" "}
                      {listOf(NOT_ACCEPTED, "hi")}।
                    </>
                  }
                />
              </span>
            </p>
            <SellQuickLinks />
          </div>
          <ul className="mt-12 grid gap-4 lg:grid-cols-2" role="list">
            {PATHS.map(({ href, icon: Icon, title, who, body, cta }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-panel border border-line bg-canvas p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{title}</h2>
                  <p className="mt-1 text-sm font-medium text-gold-700">{who}</p>
                  <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-brand-600">
                    {cta}
                    <ArrowRight
                      className="size-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <ShopSellSteps />

        <section aria-labelledby="pay-heading" className="mt-16">
          <Eyebrow>
            <T en="How we pay" hi="हम कैसे पैसे देते हैं" />
          </Eyebrow>
          <h2 id="pay-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
            <T en="Three ways, all written down" hi="तीन तरीक़े, सब लिखित में" />
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3" role="list">
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <PackageCheck className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">
                <T en="Scrap, by the kilo, on the spot" hi="कबाड़: किलो के हिसाब से, उसी समय" />
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                <T
                  en={`Screens ${rates.screens}, batteries ${rates.batteries}, dead motherboards ${rates.boards} and everything else ${rates.other} a kg. Weighed in front of you, paid by UPI on the spot, with a receipt.`}
                  hi={`स्क्रीन ${rates.screens}, बैटरी ${rates.batteries}, ख़राब मदरबोर्ड ${rates.boards} और बाक़ी सब ${rates.other} प्रति किलो। आपके सामने तौल, उसी समय UPI से पैसे, रसीद के साथ।`}
                />{" "}
                <Link href="/rate-card" className="font-semibold text-brand-600 underline">
                  <T en="All our scrap prices (per kg)" hi="कबाड़ के सभी रेट (प्रति किलो)" />
                </Link>
              </p>
            </li>
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <Wrench className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">
                <T en="Devices, after testing" hi="डिवाइस: जाँच के बाद" />
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                <T
                  en="Dead phones, trade-ins and old computers are tested at the hub and graded A to D. You get an offer for each lot and can say no. Before any device is bought you confirm that you own it or have it signed over."
                  hi="ख़राब फ़ोन, एक्सचेंज में आए सामान और पुराने कंप्यूटर हब में जाँचे जाते हैं और A से D ग्रेड मिलता है। हर लॉट का दाम बताया जाता है, आप मना कर सकते हैं। कोई भी डिवाइस ख़रीदने से पहले आप बताते हैं कि वह आपका है या आपके नाम किया गया है।"
                />
              </p>
            </li>
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <Store className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">
                <T en="Working parts, after testing" hi="चालू पार्ट्स: जाँच के बाद" />
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                <T
                  en="Working parts are priced one by one after testing and paid on our next visit. You can say no, or sell them yourself in our used parts shop: staff test and approve each listing, and your shop is named on it."
                  hi="चालू पार्ट्स का दाम जाँच के बाद एक-एक करके तय होता है, और पैसा हमारे अगले चक्कर पर मिलता है। आप मना कर सकते हैं, या हमारी पुराने पार्ट्स की दुकान पर ख़ुद बेच सकते हैं: हर लिस्टिंग हमारी टीम जाँचकर मंज़ूर करती है, और उस पर आपकी दुकान का नाम होता है।"
                />
              </p>
            </li>
          </ul>
        </section>
      </Container>
    </>
  );
}
