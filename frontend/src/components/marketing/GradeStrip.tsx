import { T } from "@/components/i18n/T";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { GRADE_INFO, GRADES } from "@/features/inventory/model";

const BAR: Record<(typeof GRADES)[number], string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
};

const HI: Record<(typeof GRADES)[number], { outcome: string; description: string }> = {
  A: {
    outcome: "जैसा है वैसा बिकता है",
    description: "चालू होता है और हमारी हर जाँच में पास होता है। साफ़ करके फ़ोटो ली जाती है।",
  },
  B: {
    outcome: "ठीक करके बिकता है",
    description:
      "एक ख़राबी थी (स्क्रीन, बैटरी, पोर्ट या कीबोर्ड), जो पार्टनर दुकान ने ठीक की, फिर दोबारा जाँचा गया।",
  },
  C: {
    outcome: "पार्ट्स निकाले जाते हैं",
    description:
      "पूरा ठीक कराना फ़ायदे का नहीं, इसलिए अच्छे पार्ट्स निकालकर अलग बेचे जाते हैं, हर पार्ट जाँचा हुआ और चालू।",
  },
  D: {
    outcome: "तौलकर VRRG Group को",
    description:
      "बिल्कुल ख़राब या ख़तरनाक: दोबारा इस्तेमाल के लिए नहीं बिकता। डेटा मिटाकर या स्टोरेज तोड़कर, तौलकर VRRG Group को दिया जाता है।",
  },
};

/** The four grades and what happens to each. */
export function GradeStrip() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
      {GRADES.map((g) => (
        <li
          key={g}
          className="group relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
        >
          <div className={`absolute inset-x-0 top-0 h-1.5 ${BAR[g]}`} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <span className="font-display text-6xl leading-none font-bold text-ink">{g}</span>
            <GradeBadge grade={g} size="sm" />
          </div>
          <p className="mt-3 font-semibold text-ink">
            <T en={GRADE_INFO[g].outcome} hi={HI[g].outcome} />
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            <T en={GRADE_INFO[g].description} hi={HI[g].description} />
          </p>
        </li>
      ))}
    </ul>
  );
}
