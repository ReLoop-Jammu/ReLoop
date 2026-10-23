import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { HindiPage, T } from "@/components/i18n/T";
import { Steps } from "@/components/marketing/Steps";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/features/sell/components/RequestForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";
import { institutionSteps } from "@/features/sell/steps";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Institutions: sell old computers, laptops and monitors",
  description:
    "Colleges, schools, banks and offices in Jammu: book a lot pickup for old desktop computers, laptops, monitors and phones, with sorting on site and a handover record.",
};

export default async function InstitutionsPage() {
  const site = await getSiteSettings();
  const fee = formatPrice(site.lotFeePaise);
  return (
    <Container className="py-12 sm:py-16">
      <HindiPage />
      <SellPageHeader
        icon={Building2}
        eyebrow={<T en="Colleges, schools, banks & offices" hi="कॉलेज, स्कूल, बैंक और दफ़्तर" />}
        title={
          <T
            en="Sell your old computers, laptops and monitors, properly"
            hi="पुराने कंप्यूटर, लैपटॉप और मॉनिटर सही तरीक़े से बेचिए"
          />
        }
      >
        <p>
          <T
            en={`Desktop computers, laptops, monitors and phones from labs and offices. We sort the lot on your premises on pickup day, buy the working and repairable equipment, and arrange for the dead e-waste to go straight to VRRG Group, our licensed recycler. The fee is ${fee} a lot.`}
            hi={`लैब और दफ़्तरों के डेस्कटॉप कंप्यूटर, लैपटॉप, मॉनिटर और फ़ोन। पिकअप वाले दिन हम आपकी जगह पर ही लॉट छाँटते हैं, चालू और ठीक होने लायक़ सामान ख़रीदते हैं, और ख़राब ई-वेस्ट सीधे VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को भिजवाते हैं। एक लॉट की फ़ीस ${fee} है।`}
          />
        </p>
      </SellPageHeader>
      <section className="mt-12" aria-labelledby="inst-steps-heading">
        <h2 id="inst-steps-heading" className="text-2xl font-bold sm:text-3xl">
          <T en="How it works for institutions" hi="संस्थाओं के लिए तरीक़ा" />
        </h2>
        <Steps steps={institutionSteps(site.lotFeePaise)} columns={3} className="mt-6" />
      </section>
      <section className="mt-14" aria-labelledby="inst-benefits-heading">
        <h2 id="inst-benefits-heading" className="text-2xl font-bold sm:text-3xl">
          <T en="What you get" hi="आपको क्या मिलता है" />
        </h2>
        <div className="mt-6">
          <BenefitList
            items={[
              {
                title: <T en={`${fee} a lot`} hi={`${fee} प्रति लॉट`} />,
                body: (
                  <T
                    en="Covers the pickup, sorting on site and a handover record. The fee and the payment for equipment are separate lines on separate receipts, never netted."
                    hi="इसमें पिकअप, आपकी जगह पर छँटाई और पूरा रिकॉर्ड शामिल है। फ़ीस और सामान का पैसा अलग-अलग रसीद पर होते हैं, कभी आपस में काटे नहीं जाते।"
                  />
                ),
              },
              {
                title: <T en="Booked pickup" hi="बुक किया हुआ पिकअप" />,
                body: (
                  <T
                    en="We schedule a date that suits you. Booking dates open from January 2027."
                    hi="आपकी सुविधा की तारीख़ तय करते हैं। बुकिंग की तारीख़ें जनवरी 2027 से खुलेंगी।"
                  />
                ),
              },
              {
                title: <T en="Working equipment bought" hi="चालू सामान हम ख़रीदते हैं" />,
                body: (
                  <T
                    en="We buy the working and repairable equipment, give each device an item number and pay on its own receipt. You confirm the devices are yours to sell."
                    hi="चालू और ठीक होने लायक़ सामान हम ख़रीदते हैं, हर डिवाइस पर नंबर लगाते हैं और अलग रसीद पर पैसे देते हैं। आप पुष्टि करते हैं कि सामान बेचने का हक़ आपका है।"
                  />
                ),
              },
              {
                title: <T en="A handover record" hi="पूरा रिकॉर्ड" />,
                body: (
                  <T
                    en="What ReLoop bought (by item number) and what went to VRRG Group (kg by category, with their receipt number in your institution's name)."
                    hi="ReLoop ने क्या ख़रीदा (नंबर के साथ) और VRRG Group को क्या गया (किस चीज़ का कितना किलो, उनकी रसीद के नंबर के साथ, आपकी संस्था के नाम से)।"
                  />
                ),
              },
              {
                title: (
                  <T
                    en="Dead e-waste straight to VRRG Group"
                    hi="ख़राब ई-वेस्ट सीधे VRRG Group को"
                  />
                ),
                body: (
                  <T
                    en="ReLoop arranges it but does not carry, store or pay for it. TVs, printers, UPS units, small appliances and lead-acid batteries are not bought: we will point you to VRRG Group directly."
                    hi="ReLoop इसका इंतज़ाम करता है, पर इसे न ले जाता है, न रखता है, न इसका पैसा देता है। टीवी, प्रिंटर, UPS, छोटे घरेलू उपकरण और लेड-एसिड बैटरी हम नहीं ख़रीदते: इनके लिए हम आपको सीधे VRRG Group से जोड़ देंगे।"
                  />
                ),
              },
              {
                title: <T en="Data handled" hi="डेटा का ध्यान" />,
                body: (
                  <T
                    en="Storage is wiped, or the chip destroyed, before anything is taken apart or sold, and logged against the item number."
                    hi="कुछ भी खोलने या बेचने से पहले स्टोरेज का डेटा मिटाया जाता है या चिप तोड़ दी जाती है, और यह उस नंबर के साथ दर्ज होता है।"
                  />
                ),
              },
            ]}
          />
        </div>
      </section>
      <section className="mt-14 max-w-3xl" aria-labelledby="book-heading">
        <h2 id="book-heading" className="text-2xl font-bold sm:text-3xl">
          <T en="Book a pickup" hi="पिकअप बुक करें" />
        </h2>
        <p className="mt-2 text-muted">
          <T
            en="We'll confirm the date and the vehicle with you before we come. The lot fee is shown on your booking confirmation."
            hi="आने से पहले हम आपसे तारीख़ और गाड़ी पक्की करेंगे। लॉट फ़ीस आपकी बुकिंग की पुष्टि में लिखी होगी।"
          />
        </p>
        <p className="mt-2 text-sm text-muted" data-l="hi" lang="hi">
          फ़ॉर्म अभी अंग्रेज़ी में है। भरने में दिक़्क़त हो तो हमें WhatsApp करें।
        </p>
        <div className="mt-6">
          <RequestForm
            kind="institution_pickup"
            title="Institution pickup booking"
            submitLabel="Send my booking"
            fields={[
              {
                name: "institution",
                label: "Institution",
                required: true,
                autoComplete: "organization",
              },
              {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                options: ["College / university", "School", "Bank branch", "Office", "Other"],
              },
              { name: "contact", label: "Contact person", required: true, autoComplete: "name" },
              { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              {
                name: "date",
                label: "Preferred date (from January 2027)",
                min: "2027-01-01",
                type: "date",
              },
              {
                name: "items",
                label: "What is in the lot? (approx.)",
                type: "textarea",
                required: true,
                placeholder: "e.g. 20 desktop computers, 15 monitors, 5 laptops",
              },
            ]}
          />
        </div>
      </section>
    </Container>
  );
}
