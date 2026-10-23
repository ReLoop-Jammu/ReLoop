import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HindiPage, T } from "@/components/i18n/T";
import { Container } from "@/components/ui/Container";
import { ShopSubmissionForm } from "@/features/sell/components/ShopSubmissionForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";
import { ShopSellSteps } from "@/features/sell/components/SellSteps";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Partner shops: sell old phones, laptops and parts",
  description:
    "Repair shops, retailers and exchange stores in Jammu: a fixed weekly pickup, scrap paid by the kilo by UPI on the spot, offers for dead phones, laptops and computers after testing, and working parts paid on our next visit.",
};

export default async function ShopsPage() {
  const site = await getSiteSettings();
  const r = {
    screens: formatPrice(site.rateScreensPaise),
    batteries: formatPrice(site.rateBatteriesPaise),
    boards: formatPrice(site.rateBoardsPaise),
    other: formatPrice(site.rateOtherPaise),
  };
  return (
    <Container className="py-12 sm:py-16">
      <HindiPage />
      <SellPageHeader
        icon={Store}
        eyebrow={
          <T
            en="Repair shops, retailers & exchange stores"
            hi="रिपेयर दुकानें, रिटेलर और एक्सचेंज स्टोर"
          />
        }
        title={
          <T
            en="Sell your shop's old phones, laptops and parts, every week"
            hi="अपनी दुकान के पुराने फ़ोन, लैपटॉप और पार्ट्स हर हफ़्ते बेचिए"
          />
        }
      >
        <p>
          <T
            en="Broken screens, dead lithium batteries and boards, swapped parts and leftover junk are weighed and paid by the kilo on a fixed weekly pickup day. Dead phones, laptops and trade-ins you won't resell get an offer after testing."
            hi="टूटी स्क्रीन, ख़राब लिथियम बैटरी और बोर्ड, बदले हुए पार्ट्स और बचा हुआ कबाड़, हर हफ़्ते तय दिन पर तौलकर किलो के हिसाब से ख़रीदा जाता है। जो ख़राब फ़ोन, लैपटॉप या एक्सचेंज का सामान आप नहीं बेचेंगे, उसका दाम जाँच के बाद बताते हैं।"
          />
        </p>
      </SellPageHeader>

      <div className="mt-12">
        <ShopSellSteps />
      </div>

      <section className="mt-14" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="text-2xl font-bold sm:text-3xl">
          <T en="What you get" hi="आपको क्या मिलता है" />
        </h2>
        <div className="mt-6">
          <BenefitList
            items={[
              {
                title: <T en="Paid by UPI on the spot" hi="उसी समय UPI से पैसे" />,
                body: (
                  <T
                    en={`Weighed in front of you, at our scrap prices (screens ${r.screens} a kg, batteries ${r.batteries}, dead motherboards ${r.boards}, everything else ${r.other}). A receipt every time.`}
                    hi={`आपके सामने तौल, हमारे कबाड़ रेट पर (स्क्रीन ${r.screens} प्रति किलो, बैटरी ${r.batteries}, ख़राब मदरबोर्ड ${r.boards}, बाक़ी सब ${r.other})। हर बार रसीद।`}
                  />
                ),
              },
              {
                title: <T en="A fixed weekly pickup day" hi="हर हफ़्ते तय दिन पर पिकअप" />,
                body: (
                  <T
                    en="Tuesday for the Gandhi Nagar cluster (Bahu Plaza, Gole Market). Friday for the old city (Raghunath Bazaar, Residency Road). The routes and their start dates are on the locations page. Retailers: monthly, or when a bag fills."
                    hi="गांधी नगर (बहू प्लाज़ा, गोल मार्केट) के लिए मंगलवार। पुराने शहर (रघुनाथ बाज़ार, रेज़िडेंसी रोड) के लिए शुक्रवार। रूट और वे कब से शुरू होंगे, लोकेशन पेज पर हैं। रिटेलर: महीने में एक बार, या जब बोरी भर जाए।"
                  />
                ),
              },
              {
                title: (
                  <T en="Working parts paid as parts" hi="चालू पार्ट्स का पैसा पार्ट के हिसाब से" />
                ),
                body: (
                  <T
                    en="Parts that may still work go in a to-test bag under your name. Within 24 hours each one is tested; working parts are paid at their part price on our next visit, on their own receipt line."
                    hi="जो पार्ट्स शायद चालू हैं, वे आपके नाम की अलग थैली में जाते हैं। 24 घंटे में हर एक की जाँच होती है; चालू पार्ट्स का पैसा पार्ट के दाम पर, हमारे अगले चक्कर पर, रसीद में अलग लाइन में मिलता है।"
                  />
                ),
              },
              {
                title: (
                  <T
                    en="Sell parts in our used parts shop"
                    hi="हमारी पुराने पार्ट्स की दुकान पर बेचिए"
                  />
                ),
                body: (
                  <T
                    en={`Verified partner shops can list parts they take out. Staff test and approve each listing, and your shop is named on it. ReLoop keeps a ${site.commissionPct}% commission when it sells, handles the 7-day return and pays your share after day 7.`}
                    hi={`वेरिफ़ाइड पार्टनर दुकानें अपने निकाले हुए पार्ट्स लिस्ट कर सकती हैं। हर लिस्टिंग हमारी टीम जाँचकर मंज़ूर करती है, और उस पर आपकी दुकान का नाम होता है। बिकने पर ReLoop ${site.commissionPct}% कमीशन रखता है, 7 दिन की वापसी संभालता है और 7वें दिन के बाद आपका हिस्सा देता है।`}
                  />
                ),
              },
              {
                title: <T en="Paid repair work" hi="रिपेयर का काम, पैसे के साथ" />,
                body: (
                  <T
                    en="Partner shops can repair our grade-B devices for a fixed fee per job."
                    hi="पार्टनर दुकानें हमारे ग्रेड-B डिवाइस ठीक करके हर काम की तय फ़ीस पा सकती हैं।"
                  />
                ),
              },
              {
                title: <T en="Dead stock sent for recycling" hi="ख़राब सामान रीसाइक्लिंग के लिए" />,
                body: (
                  <T
                    en="What can't be reused is handed to VRRG Group, our licensed recycler, on a weight receipt."
                    hi="जो दोबारा काम का नहीं, वह तौल की रसीद के साथ VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को दिया जाता है।"
                  />
                ),
              },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-muted">
          <T
            en="By handing over scrap you confirm it is yours to sell, and that you may sell the parts you leave to be tested."
            hi="कबाड़ देकर आप पुष्टि करते हैं कि वह आपका है और जाँच के लिए छोड़े गए पार्ट्स आप बेच सकते हैं।"
          />
        </p>
        <p className="mt-2 text-sm">
          <Link href="/rate-card" className="font-semibold text-brand-600 underline">
            <T en="Our scrap prices (per kg)" hi="कबाड़ के हमारे रेट (प्रति किलो)" />
          </Link>
          {" · "}
          <Link href="/locations" className="font-semibold text-brand-600 underline">
            <T en="The pickup routes and stops on the map" hi="पिकअप रूट और स्टॉप नक़्शे पर" />
          </Link>
        </p>
      </section>

      <section className="mt-14 max-w-3xl" aria-labelledby="signup-heading">
        <h2 id="signup-heading" className="text-2xl font-bold sm:text-3xl">
          <T en="Offer a lot of devices" hi="डिवाइस का लॉट बेचने के लिए भेजिए" />
        </h2>
        <p className="mt-2 text-muted">
          <T
            en="Tell us about your shop and add the devices in one submission. Everything goes privately to our team for review, and you get an offer you can say no to."
            hi="अपनी दुकान के बारे में बताइए और सारे डिवाइस एक साथ जोड़िए। सब कुछ सिर्फ़ हमारी टीम देखती है, और आपको दाम बताया जाता है जिसे आप मना कर सकते हैं।"
          />{" "}
          <Link href="/help" className="font-semibold text-brand-600 underline">
            <T
              en="Step-by-step help, in English and Hindi"
              hi="पूरी मदद, अंग्रेज़ी और हिन्दी में"
            />
          </Link>
          .
        </p>
        <p className="mt-2 text-sm text-muted" data-l="hi" lang="hi">
          फ़ॉर्म अभी अंग्रेज़ी में है। भरने में दिक़्क़त हो तो हमें WhatsApp करें।
        </p>
        <div className="mt-6">
          <ShopSubmissionForm />
        </div>
      </section>
    </Container>
  );
}
