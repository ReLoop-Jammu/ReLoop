import type { Metadata } from "next";
import Link from "next/link";
import { StandardPage } from "@/components/marketing/StandardPage";
import { BUSINESS_RULES } from "@/config/business-rules";
import { GradeBadge, TestedPartBadge } from "@/features/inventory/components/GradeBadge";
import { GRADE_INFO, type Grade } from "@/features/inventory/model";

export const metadata: Metadata = {
  title: "Grading standard",
  description:
    "What ReLoop's grades A to D mean, how a device is inspected, and how used parts are tested.",
};

export default function GradingPage() {
  return (
    <StandardPage
      title="Grading standard"
      lead="Every device is inspected at the Jammu hub and given one grade, A to D. The grade decides what happens next: resold, repaired, stripped for parts or handed over by weight."
      sections={[
        {
          title: "The four grades",
          body: (
            <ul className="space-y-4">
              {(["A", "B", "C", "D"] as Grade[]).map((g) => (
                <li key={g}>
                  <GradeBadge grade={g} />
                  <p className="mt-1">
                    <strong className="text-ink">{GRADE_INFO[g].outcome}.</strong>{" "}
                    {GRADE_INFO[g].description}
                  </p>
                </li>
              ))}
            </ul>
          ),
        },
        {
          title: "Used parts, tested and working",
          body: (
            <p>
              <TestedPartBadge /> A part from a grade C device, or listed by a partner shop in our
              used parts shop, is tested on its own and sold only if it works. Parts carry no grade.
            </p>
          ),
        },
        {
          title: "The inspection",
          body: (
            <p>
              Staff go through a checklist for the kind of device (power, display, touch, cameras,
              ports, keys, battery and storage health where it applies) and record each check as
              pass, fail or not applicable. Nothing can be listed without an inspection. The item
              page shows it as &ldquo;Our test report&rdquo;.
            </p>
          ),
        },
        {
          title: "Locked devices",
          body: (
            <p>
              A device locked to someone&apos;s account is never resold whole. It is graded C (for
              parts) or D, whatever its condition.
            </p>
          ),
        },
        {
          title: "Warranty follows the grade",
          body: (
            <p>
              Grade A and B devices carry a {BUSINESS_RULES.warrantyDays}-day warranty; used parts
              have a {BUSINESS_RULES.partReturnDays}-day return.{" "}
              <Link href="/warranty" className="font-semibold text-brand-600 underline">
                Warranty and returns
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
