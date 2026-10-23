import {
  ArrowRight,
  Ban,
  Building2,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HindiPage, T } from "@/components/i18n/T";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { GradeStrip } from "@/components/marketing/GradeStrip";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { LoopSteps } from "@/components/marketing/LoopSteps";
import { BUSINESS_RULES } from "@/config/business-rules";
import { DEVICES, listOf, NOT_ACCEPTED, PARTS } from "@/config/items";
import { CategoryCards } from "@/features/shop/components/CategoryCards";
import { ImpactCounter } from "@/features/impact/ImpactCounter";
import { getImpactTotals } from "@/features/impact/queries";
import { ActivityFeed } from "@/features/transparency/ActivityFeed";
import { NetworkPreview } from "@/features/network/NetworkPreview";
import { ItemGrid } from "@/features/shop/components/ItemGrid";
import { getSiteSettings } from "@/features/settings/server";
import { getLatestShopItems, isSampleStock } from "@/features/shop/queries";
import { env } from "@/lib/env";
import { SITE } from "@/lib/site";
import { formatPrice } from "@/lib/utils/money";

const PROMISES: { icon: LucideIcon; title: ReactNode; body: ReactNode }[] = [
  {
    icon: ShieldCheck,
    title: <T en="Tested and graded" hi="जाँचा हुआ, ग्रेड के साथ" />,
    body: (
      <T
        en="Every device has an item number and a grade; every part is tested and working."
        hi="हर डिवाइस पर एक नंबर और ग्रेड होता है; हर पार्ट जाँचा हुआ और चालू होता है।"
      />
    ),
  },
  {
    icon: Wrench,
    title: (
      <T
        en={`${BUSINESS_RULES.warrantyDays}-day warranty`}
        hi={`${BUSINESS_RULES.warrantyDays} दिन की वारंटी`}
      />
    ),
    body: <T en="On grade A and B devices." hi="ग्रेड A और B डिवाइस पर।" />,
  },
  {
    icon: Truck,
    title: <T en="Pickup or delivery" hi="ख़ुद ले जाइए या डिलीवरी" />,
    body: (
      <T
        en={`Free from the hub, or ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} in Jammu city.`}
        hi={`हब से मुफ़्त, या जम्मू शहर में ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)}।`}
      />
    ),
  },
  {
    icon: Recycle,
    title: <T en="Nothing dumped" hi="कुछ भी फेंका नहीं जाता" />,
    body: (
      <T
        en="What can't be reused goes to VRRG Group, our licensed recycler, by weight."
        hi="जो दोबारा काम का नहीं, वह तौलकर VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को जाता है।"
      />
    ),
  },
];

const SELL_PATHS: { href: string; icon: LucideIcon; title: ReactNode; body: ReactNode }[] = [
  {
    href: "/sell/shops",
    icon: Store,
    title: (
      <T
        en="Repair shops, retailers & exchange stores"
        hi="रिपेयर दुकानें, रिटेलर और एक्सचेंज स्टोर"
      />
    ),
    body: (
      <T
        en="Scrap weighed and paid by UPI on the spot, on a fixed weekly pickup day."
        hi="हर हफ़्ते तय दिन पर पिकअप। कबाड़ आपके सामने तौलकर उसी समय UPI से पैसे।"
      />
    ),
  },
  {
    href: "/sell/institutions",
    icon: Building2,
    title: <T en="Colleges, schools, banks & offices" hi="कॉलेज, स्कूल, बैंक और दफ़्तर" />,
    body: (
      <T
        en="Booked lot pickups, sorted on site, with a handover record."
        hi="बुक किया हुआ पिकअप, छँटाई आपकी जगह पर, और पूरा रिकॉर्ड।"
      />
    ),
  },
];

const DEVICE_LIST = {
  en: listOf(
    DEVICES.map((d) => ({ ...d, en: d.en.toLowerCase() })),
    "en",
  ),
  hi: listOf(DEVICES, "hi"),
};

export default async function HomePage() {
  const [latest, sample, impact, site] = await Promise.all([
    getLatestShopItems(8),
    isSampleStock(),
    getImpactTotals(),
    getSiteSettings(),
  ]);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.legalName ?? SITE.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    logo: `${env.NEXT_PUBLIC_SITE_URL}/icon.svg`,
    description: SITE.description,
    areaServed: "Jammu, India",
    ...(site.supportEmail && { email: site.supportEmail }),
    ...(site.supportPhone && { telephone: site.supportPhone }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero */}
      <section className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-mesh text-white sm:rounded-[2.5rem]">
          <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-gold-400/20 blur-3xl"
          />
          <Container className="relative grid items-center gap-12 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pt-24 lg:pb-28">
            <div className="min-w-0 animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur ring-inset">
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-brand-950">
                  <T en="New" hi="नया" />
                </span>
                <T
                  en="Jammu pilot · weekly pickups from partner shops"
                  hi="जम्मू पायलट · हर हफ़्ते पिकअप"
                />
              </span>
              <h1 className="mt-7 text-[2rem] leading-[1.08] font-bold text-white sm:text-5xl lg:text-[3.25rem]">
                <T
                  en={
                    <>
                      ReLoop buys used {DEVICE_LIST.en} in Jammu,{" "}
                      <span className="text-gold-400">tests them and resells what works.</span>
                    </>
                  }
                  hi={
                    <>
                      ReLoop जम्मू में पुराने {DEVICE_LIST.hi} ख़रीदता है,{" "}
                      <span className="text-gold-400">जाँचता है और जो चालू है उसे बेचता है।</span>
                    </>
                  }
                />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
                <T
                  en={`We also sell used parts, tested and working: ${listOf(PARTS, "en")}.`}
                  hi={`हम पुराने पार्ट्स भी बेचते हैं, जाँचे हुए और चालू: ${listOf(PARTS, "hi")}।`}
                />
              </p>
              <div className="mt-8 grid max-w-xl gap-3">
                <ButtonLink
                  href="/shop"
                  size="lg"
                  variant="gold"
                  className="justify-between py-3 text-left whitespace-normal"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="size-5" aria-hidden="true" />
                    <T en="Buy a tested phone or laptop" hi="जाँचा हुआ फ़ोन या लैपटॉप ख़रीदें" />
                  </span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href="/sell"
                  size="lg"
                  className="justify-between bg-white/10 bg-none py-3 text-left whitespace-normal text-white shadow-none ring-white/25 hover:bg-white/15"
                >
                  <span className="flex items-center gap-2">
                    <Store className="size-5" aria-hidden="true" />
                    <T
                      en="Sell your shop's old devices and parts"
                      hi="अपनी दुकान के पुराने डिवाइस और पार्ट्स बेचें"
                    />
                  </span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {(
                  [
                    ["A–D", "grade", "honest grade on every device", "हर डिवाइस पर सही ग्रेड"],
                    [
                      `${BUSINESS_RULES.warrantyDays} days`,
                      "warranty",
                      "warranty on A and B",
                      "A और B पर वारंटी",
                    ],
                    [
                      "100%",
                      "scrap",
                      "of scrap to VRRG Group, by weight",
                      "कबाड़ तौलकर VRRG Group को",
                    ],
                  ] as const
                ).map(([value, key, en, hi]) => (
                  <div key={key}>
                    <dt className="sr-only">
                      <T en={en} hi={hi} />
                    </dt>
                    <dd className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {value}
                    </dd>
                    <dd
                      className="mt-1 text-xs leading-snug text-white/70 sm:text-sm"
                      aria-hidden="true"
                    >
                      <T en={en} hi={hi} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroShowcase items={latest.slice(0, 3)} />
          </Container>
        </div>
      </section>

      <HindiPage />

      {/* What we buy and sell */}
      <section className="pt-12 sm:pt-16" aria-labelledby="items-heading">
        <Container>
          <h2 id="items-heading" className="text-2xl font-bold sm:text-3xl">
            <T en="What we buy and sell" hi="हम क्या ख़रीदते और बेचते हैं" />
          </h2>
          <div className="mt-6">
            <CategoryCards />
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-ink-soft">
            <Ban className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
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
                    <strong className="text-ink">हम नहीं लेते:</strong> {listOf(NOT_ACCEPTED, "hi")}
                    ।
                  </>
                }
              />{" "}
              <Link href="/what-we-accept" className="font-semibold text-brand-600 underline">
                <T en="What we accept" hi="हम क्या लेते हैं" />
              </Link>
            </span>
          </p>
        </Container>
      </section>

      <TrustStrip />

      {/* Promises */}
      <section aria-labelledby="promises-heading" className="py-6">
        <h2 id="promises-heading" className="sr-only">
          <T en="Why buy from ReLoop" hi="ReLoop से क्यों ख़रीदें" />
        </h2>
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {PROMISES.map(({ icon: Icon, title, body }, i) => (
              <li
                key={i}
                className="group rounded-card border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100 transition ring-inset group-hover:scale-105">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-5 text-base font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <ImpactCounter totals={impact} />

      <ActivityFeed />

      <section className="py-16 sm:py-20" aria-labelledby="network-heading">
        <Container>
          <div className="grid items-center gap-10 overflow-hidden rounded-panel border border-line bg-surface p-6 shadow-soft sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <Eyebrow>
                <T en="The Jammu loop" hi="जम्मू का चक्र" />
              </Eyebrow>
              <h2
                id="network-heading"
                className="mt-4 text-3xl leading-[1.05] font-bold sm:text-5xl"
              >
                <T
                  en="From the market to the hub, and to VRRG Group"
                  hi="बाज़ार से हब तक, और फिर VRRG Group तक"
                />
              </h2>
              <p className="mt-4 leading-relaxed text-ink-soft">
                <T
                  en="Partner shops on our Tuesday and Friday routes sell their scrap by weight. The hub tests what can be reused; whatever is dead goes to VRRG Group on a weight receipt."
                  hi="मंगलवार और शुक्रवार के रूट वाली पार्टनर दुकानें अपना कबाड़ तौलकर बेचती हैं। हब में जो दोबारा काम आ सके उसकी जाँच होती है; जो बिल्कुल ख़राब है वह तौल की रसीद के साथ VRRG Group को जाता है।"
                />
              </p>
              <ButtonLink href="/network" variant="secondary" className="mt-6">
                <T en="See the network" hi="नेटवर्क देखें" />
              </ButtonLink>
            </div>
            <NetworkPreview />
          </div>
        </Container>
      </section>

      {/* Grades */}
      <section className="py-16 sm:py-20" aria-labelledby="grades-heading">
        <Container>
          <SectionHeading
            id="grades-heading"
            eyebrow={
              <Eyebrow>
                <T en="Four grades" hi="चार ग्रेड" />
              </Eyebrow>
            }
            title={
              <T en="Every device gets an honest grade" hi="हर डिवाइस को सही ग्रेड मिलता है" />
            }
            description={
              <T
                en="We test everything at our hub before it goes anywhere. The grade decides what happens to a device next."
                hi="हम हर चीज़ को आगे भेजने से पहले अपने हब में जाँचते हैं। ग्रेड से तय होता है कि डिवाइस के साथ आगे क्या होगा।"
              />
            }
          />
          <GradeStrip />
        </Container>
      </section>

      {/* Stock */}
      <section className="pb-16 sm:pb-20" aria-labelledby="stock-heading">
        <Container>
          <SectionHeading
            id="stock-heading"
            eyebrow={
              <Eyebrow>
                {sample ? (
                  <T en="Preview" hi="झलक" />
                ) : (
                  <T en="Fresh from the hub" hi="हब से अभी आया" />
                )}
              </Eyebrow>
            }
            title={
              sample ? (
                <T en="How our stock will look" hi="हमारा सामान ऐसा दिखेगा" />
              ) : (
                <T
                  en="Latest tested phones, laptops and parts"
                  hi="नए जाँचे हुए फ़ोन, लैपटॉप और पार्ट्स"
                />
              )
            }
            description={
              sample ? (
                <T
                  en="Sample items for now. Real stock appears here as the hub tests it."
                  hi="अभी ये सिर्फ़ नमूने हैं। हब में जाँच के बाद असली सामान यहाँ दिखेगा।"
                />
              ) : (
                <T
                  en="Each has an item number, a grade and our test report. Pick up or get delivery in Jammu."
                  hi="हर एक पर नंबर, ग्रेड और हमारी जाँच रिपोर्ट है। हब से लीजिए या जम्मू में डिलीवरी।"
                />
              )
            }
            actions={
              <ButtonLink href="/shop" variant="secondary">
                <T en="Open the shop" hi="दुकान खोलें" />
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ItemGrid items={latest} />
        </Container>
      </section>

      {/* The loop */}
      <section className="px-3 sm:px-4" aria-labelledby="loop-heading">
        <div className="relative overflow-hidden rounded-[2rem] bg-mesh py-20 sm:rounded-[2.5rem] sm:py-28">
          <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
          <Container className="relative">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <Eyebrow tone="dark">
                <T en="The loop" hi="पूरा चक्र" />
              </Eyebrow>
              <h2
                id="loop-heading"
                className="mt-4 text-3xl leading-[1.05] font-bold text-white sm:text-5xl"
              >
                <T en="From the bazaar to its next owner" hi="बाज़ार से उसके नए मालिक तक" />
              </h2>
            </div>
            <LoopSteps tone="dark" />
            <div className="mt-12 text-center">
              <ButtonLink href="/how-it-works" variant="gold">
                <T en="See how the hub works" hi="हब कैसे काम करता है" />
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </Container>
        </div>
      </section>

      {/* Sell paths */}
      <section className="py-16 sm:py-20" aria-labelledby="sell-heading">
        <Container>
          <SectionHeading
            id="sell-heading"
            eyebrow={
              <Eyebrow>
                <T en="For shops & institutions" hi="दुकानों और संस्थाओं के लिए" />
              </Eyebrow>
            }
            title={
              <T
                en="Run a repair shop, store or office?"
                hi="रिपेयर की दुकान, स्टोर या दफ़्तर है?"
              />
            }
            description={
              <T
                en="Scrap is paid by the kilo, on the spot. Working devices get an offer after testing. Working parts are paid after testing, on our next visit."
                hi="कबाड़ का पैसा किलो के हिसाब से, उसी समय। चालू डिवाइस का दाम जाँच के बाद बताते हैं। चालू पार्ट्स का पैसा जाँच के बाद, अगले चक्कर पर।"
              />
            }
            actions={
              <ButtonLink href="/rate-card" variant="secondary">
                <T en="Our scrap prices (per kg)" hi="कबाड़ के हमारे रेट (प्रति किलो)" />
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 md:grid-cols-2" role="list">
            {SELL_PATHS.map(({ href, icon: Icon, title, body }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-5 rounded-card border border-line bg-surface p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-mesh text-gold-400 shadow-glow">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-lg font-semibold text-ink">
                      {title}
                      <ArrowRight
                        className="size-4 opacity-0 transition group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Scrap CTA */}
      <section className="pb-20">
        <Container>
          <CtaBanner
            eyebrow={<T en="Where scrap goes" hi="कबाड़ कहाँ जाता है" />}
            title={
              <T en="Nothing dead goes in the bin." hi="कोई ख़राब सामान कूड़े में नहीं जाता।" />
            }
            description={
              <T
                en="Dead scrap and every battery go to VRRG Group, Gangyal, our licensed recycler, by weight, with a weight receipt for each handover."
                hi="ख़राब कबाड़ और हर बैटरी तौलकर VRRG Group, गंग्याल (हमारे लाइसेंस वाले रीसाइक्लर) को जाती है, हर बार तौल की रसीद के साथ।"
              />
            }
            actions={
              <ButtonLink href="/where-scrap-goes" size="lg" variant="dark">
                <T en="Where scrap goes" hi="कबाड़ कहाँ जाता है" />
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
        </Container>
      </section>
    </>
  );
}
