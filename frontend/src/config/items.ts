/**
 * What ReLoop buys and sells, named plainly (faculty feedback, 2026-10-23).
 * Home, the sell pages and the shop read these lists, so the site names the
 * same items everywhere. Hindi is written as a Jammu shopkeeper would say it.
 */
export type Bilingual = { en: string; hi: string };

/** Devices we buy, test and resell. */
export const DEVICES: (Bilingual & { key: "phone" | "laptop" | "desktop" | "monitor" })[] = [
  { key: "phone", en: "Mobile phones", hi: "मोबाइल फ़ोन" },
  { key: "laptop", en: "Laptops", hi: "लैपटॉप" },
  { key: "desktop", en: "Desktop computers", hi: "डेस्कटॉप कंप्यूटर" },
  { key: "monitor", en: "Computer monitors", hi: "कंप्यूटर मॉनिटर" },
];

/** Parts we recover, test and sell. */
export const PARTS: Bilingual[] = [
  { en: "screens", hi: "स्क्रीन" },
  { en: "lithium batteries", hi: "लिथियम बैटरी" },
  { en: "motherboards and phone boards", hi: "मदरबोर्ड और फ़ोन बोर्ड" },
  { en: "cameras", hi: "कैमरे" },
  { en: "charging ports", hi: "चार्जिंग पोर्ट" },
  { en: "keyboards", hi: "कीबोर्ड" },
];

/** Not accepted, even as scrap. */
export const NOT_ACCEPTED: Bilingual[] = [
  { en: "TVs", hi: "टीवी" },
  { en: "printers", hi: "प्रिंटर" },
  { en: "UPS units", hi: "UPS" },
  { en: "small appliances", hi: "छोटे घरेलू उपकरण" },
  { en: "lead-acid batteries", hi: "लेड-एसिड बैटरी" },
];

/** "a, b and c" in English; "a, b और c" in Hindi. */
export function listOf(items: Bilingual[], lang: keyof Bilingual): string {
  const words = items.map((i) => i[lang]);
  if (words.length < 2) return words.join("");
  const and = lang === "hi" ? " और " : " and ";
  return `${words.slice(0, -1).join(", ")}${and}${words.at(-1)}`;
}
