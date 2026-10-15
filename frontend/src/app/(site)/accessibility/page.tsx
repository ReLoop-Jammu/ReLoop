import type { Metadata } from "next";
import Link from "next/link";
import { StandardPage } from "@/components/marketing/StandardPage";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How ReLoop makes its site usable for everyone, and how to tell us when something isn't.",
};

export default function AccessibilityPage() {
  return (
    <StandardPage
      eyebrow="Accessibility"
      title="Accessibility statement"
      lead="We want everyone to be able to use this site: on a small phone, with a keyboard, with a screen reader or with large text."
      sections={[
        {
          title: "What we aim for",
          body: (
            <p>
              The Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. Text meets AA
              contrast, every page works with a keyboard, images and charts have text alternatives,
              and every chart&apos;s numbers are also written out on the page.
            </p>
          ),
        },
        {
          title: "How we check",
          body: (
            <p>
              Every public page is tested automatically for accessibility problems on every change,
              on a desktop and a phone screen, before it can go live.
            </p>
          ),
        },
        {
          title: "Known gaps",
          body: (
            <p>
              The help guide&apos;s Hindi still needs a check by a native speaker, and the map on
              the locations and network pages depends on map tiles; everything on a map is also
              listed in text.
            </p>
          ),
        },
        {
          title: "Tell us",
          body: (
            <p>
              If something doesn&apos;t work for you, please{" "}
              <Link href="/contact" className="font-semibold text-brand-600 underline">
                contact us
              </Link>{" "}
              and say which page. We aim to reply within one working day.
            </p>
          ),
        },
      ]}
    />
  );
}
