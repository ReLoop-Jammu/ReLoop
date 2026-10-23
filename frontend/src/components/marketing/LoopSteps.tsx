import { PackageOpen, Recycle, ScanSearch, ShoppingBag } from "lucide-react";
import { T } from "@/components/i18n/T";
import { Steps, type Step } from "./Steps";

const STEPS: Step[] = [
  {
    icon: PackageOpen,
    title: <T en="Collect" hi="इकट्ठा" />,
    body: (
      <T
        en="From repair shops, retailers and exchange stores on a weekly route, and booked institution lots. Scrap is weighed in front of the shop."
        hi="हर हफ़्ते के रूट पर रिपेयर दुकानों, रिटेलरों और एक्सचेंज स्टोर से, और संस्थाओं के बुक किए लॉट से। कबाड़ दुकान के सामने तौला जाता है।"
      />
    ),
  },
  {
    icon: ScanSearch,
    title: <T en="Test and grade" hi="जाँच और ग्रेड" />,
    body: (
      <T
        en="Every phone, laptop, computer and monitor gets an item number, is tested and graded A to D at our Jammu hub, and has its data wiped."
        hi="हर फ़ोन, लैपटॉप, कंप्यूटर और मॉनिटर पर नंबर लगता है, जम्मू हब में जाँच होती है, A से D ग्रेड मिलता है और डेटा मिटाया जाता है।"
      />
    ),
  },
  {
    icon: ShoppingBag,
    title: <T en="Resell" hi="दोबारा बिक्री" />,
    body: (
      <T
        en="Working devices are resold, fixable ones repaired by partner shops, and good parts removed, tested and sold."
        hi="चालू डिवाइस फिर से बिकते हैं, ठीक होने लायक़ पार्टनर दुकानें ठीक करती हैं, और अच्छे पार्ट्स निकालकर, जाँचकर बेचे जाते हैं।"
      />
    ),
  },
  {
    icon: Recycle,
    title: <T en="Send for recycling" hi="रीसाइक्लिंग के लिए" />,
    body: (
      <T
        en="Dead scrap is sorted into bins and handed to VRRG Group, our licensed recycler, by weight, on a receipt."
        hi="ख़राब कबाड़ अलग-अलग डिब्बों में छाँटकर, तौलकर, रसीद के साथ VRRG Group (हमारे लाइसेंस वाले रीसाइक्लर) को दिया जाता है।"
      />
    ),
  },
];

/** The loop from collection to recycling, on the shared numbered steps. */
export function LoopSteps({ tone = "light" }: { tone?: "light" | "dark" }) {
  return <Steps steps={STEPS} tone={tone} columns={4} />;
}
