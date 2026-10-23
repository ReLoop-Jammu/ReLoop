import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  HandCoins,
  PackageSearch,
  Recycle,
  Search,
  ShieldCheck,
  Truck,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import type { Step } from "@/components/marketing/Steps";
import { BUSINESS_RULES } from "@/config/business-rules";
import { formatPrice } from "@/lib/utils/money";

/** Selling as a repair shop, retailer or exchange store: the same six steps on every sell page. */
export const SHOP_STEPS: Step[] = [
  {
    icon: UserPlus,
    title: <T en="Sign up" hi="साइन अप करें" />,
    body: (
      <T
        en="Make a free account for your shop on this site."
        hi="इस वेबसाइट पर अपनी दुकान का खाता बनाइए। कोई फ़ीस नहीं है।"
      />
    ),
  },
  {
    icon: BadgeCheck,
    title: <T en="We verify your shop" hi="हम आपकी दुकान की जाँच करते हैं" />,
    body: (
      <T
        en="Our team checks your shop's details, and your account shows “verified”."
        hi="हमारी टीम आपकी दुकान की जानकारी जाँचती है, फिर आपके खाते में “verified” दिखता है।"
      />
    ),
  },
  {
    icon: ClipboardList,
    title: <T en="Submit your items" hi="अपना सामान बताइए" />,
    body: (
      <T
        en="List the phones, laptops, computers, monitors and parts you want to sell."
        hi="जो फ़ोन, लैपटॉप, कंप्यूटर, मॉनिटर और पार्ट्स बेचने हैं, उनकी लिस्ट डालिए।"
      />
    ),
  },
  {
    icon: HandCoins,
    title: <T en="Get an offer (you can say no)" hi="दाम बताएँगे (मना कर सकते हैं)" />,
    body: (
      <T
        en="We tell you what we will pay. Accept it or say no: there is no charge either way."
        hi="हम बताएँगे कितना देंगे। मंज़ूर करें या मना करें, कोई पैसा नहीं लगता।"
      />
    ),
  },
  {
    icon: Truck,
    title: <T en="Pickup on your route day" hi="आपके रूट वाले दिन पिकअप" />,
    body: (
      <T
        en="We come on your market's fixed weekly day: Tuesday for Gandhi Nagar, Friday for the old city."
        hi="हम हर हफ़्ते तय दिन पर आते हैं: गांधी नगर में मंगलवार, पुराने शहर में शुक्रवार।"
      />
    ),
  },
  {
    icon: Banknote,
    title: <T en="Get paid" hi="पैसे पाइए" />,
    body: (
      <T
        en="Every payment comes with a numbered receipt. When each one is paid is shown below."
        hi="हर पेमेंट की नंबर वाली रसीद मिलती है। कब कितना मिलेगा, नीचे लिखा है।"
      />
    ),
  },
];

/** When each kind of payment is made. Shown under the shop steps. */
export const PAYMENT_TIMES: { title: ReactNode; when: ReactNode }[] = [
  {
    title: <T en="Scrap, by the kilo" hi="कबाड़, किलो के हिसाब से" />,
    when: (
      <T
        en="On the spot, by UPI, weighed in front of you."
        hi="उसी समय, UPI से। तौल आपके सामने होगा।"
      />
    ),
  },
  {
    title: <T en="Devices" hi="फ़ोन, लैपटॉप, कंप्यूटर" />,
    when: (
      <T
        en="After testing, at the offer you accepted."
        hi="जाँच के बाद, जो दाम आपने मंज़ूर किया।"
      />
    ),
  },
  {
    title: <T en="Working parts" hi="चालू पार्ट्स" />,
    when: <T en="After testing, on our next visit." hi="जाँच के बाद, हमारे अगले चक्कर पर।" />,
  },
];

/** Colleges, schools, banks and offices. */
export function institutionSteps(lotFeePaise: number): Step[] {
  const fee = formatPrice(lotFeePaise);
  return [
    {
      icon: CalendarCheck,
      title: <T en="Book a pickup" hi="पिकअप बुक करें" />,
      body: (
        <T
          en="Tell us what is in the lot and a date that suits you."
          hi="बताइए क्या-क्या सामान है और कौन सी तारीख़ ठीक रहेगी।"
        />
      ),
    },
    {
      icon: Building2,
      title: <T en="We confirm the date" hi="हम तारीख़ पक्की करते हैं" />,
      body: (
        <T
          en={`We confirm the date and the vehicle with you. The lot fee is ${fee}.`}
          hi={`हम आपसे तारीख़ और गाड़ी पक्की करते हैं। एक लॉट की फ़ीस ${fee} है।`}
        />
      ),
    },
    {
      icon: PackageSearch,
      title: <T en="We sort it on your premises" hi="छँटाई आपकी जगह पर" />,
      body: (
        <T
          en="Working and repairable equipment is set apart from dead e-waste."
          hi="चालू और ठीक होने लायक़ सामान, ख़राब ई-वेस्ट से अलग किया जाता है।"
        />
      ),
    },
    {
      icon: HandCoins,
      title: <T en="Get an offer for working equipment" hi="चालू सामान का दाम" />,
      body: (
        <T
          en="We make an offer for the working equipment. Each device is tagged and paid on its own receipt."
          hi="चालू सामान के लिए हम दाम बताते हैं। हर डिवाइस का नंबर लगता है और अलग रसीद मिलती है।"
        />
      ),
    },
    {
      icon: Recycle,
      title: <T en="Dead e-waste goes for recycling" hi="ख़राब ई-वेस्ट रीसाइक्लिंग के लिए" />,
      body: (
        <T
          en="It goes straight to VRRG Group, our licensed recycler, in your institution's name."
          hi="यह सीधे VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को जाता है, आपकी संस्था के नाम से।"
        />
      ),
    },
    {
      icon: FileCheck2,
      title: <T en="Get paid and get your record" hi="पैसे और पूरा रिकॉर्ड" />,
      body: (
        <T
          en="Payment for equipment and the lot fee are separate receipts. You get a handover record of the whole lot."
          hi="सामान का पैसा और लॉट फ़ीस अलग-अलग रसीद पर होते हैं। पूरे लॉट का रिकॉर्ड आपको मिलता है।"
        />
      ),
    },
  ];
}

/** Buying from the shop. */
export const BUY_STEPS: Step[] = [
  {
    icon: Search,
    title: <T en="Find a phone, laptop or part" hi="फ़ोन, लैपटॉप या पार्ट चुनिए" />,
    body: (
      <T
        en="Every item has an item number, a grade and our test report."
        hi="हर सामान पर एक नंबर, ग्रेड और हमारी जाँच रिपोर्ट होती है।"
      />
    ),
  },
  {
    icon: ClipboardList,
    title: <T en="Reserve it" hi="रिज़र्व कीजिए" />,
    body: (
      <T
        en="Send a reservation from the item page. Nothing is paid online."
        hi="सामान वाले पेज से रिज़र्व भेजिए। ऑनलाइन कोई पैसा नहीं देना।"
      />
    ),
  },
  {
    icon: BadgeCheck,
    title: <T en="We confirm it" hi="हम पक्का करते हैं" />,
    body: (
      <T
        en="We confirm the item is still available before you pay."
        hi="पैसे देने से पहले हम बताते हैं कि सामान अभी उपलब्ध है।"
      />
    ),
  },
  {
    icon: Truck,
    title: <T en="Collect it or get it delivered" hi="ख़ुद ले जाइए या घर मँगाइए" />,
    body: (
      <T
        en={`Free from our hub, or ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} delivery in Jammu city.`}
        hi={`हमारे हब से मुफ़्त, या जम्मू शहर में ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} में डिलीवरी।`}
      />
    ),
  },
  {
    icon: ShieldCheck,
    title: <T en="Warranty and returns" hi="वारंटी और वापसी" />,
    body: (
      <T
        en={`${BUSINESS_RULES.warrantyDays}-day warranty on grade A and B devices; ${BUSINESS_RULES.partReturnDays}-day return on parts.`}
        hi={`ग्रेड A और B डिवाइस पर ${BUSINESS_RULES.warrantyDays} दिन की वारंटी; पार्ट्स ${BUSINESS_RULES.partReturnDays} दिन में वापस।`}
      />
    ),
  },
];
