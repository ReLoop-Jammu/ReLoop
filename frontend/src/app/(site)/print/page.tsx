import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Printable outreach",
  description:
    "A4 counter card for partner shops, a buyer and campus flyer and an A5 partner window badge, ready to print.",
  robots: { index: false, follow: false },
};

const SHEETS = [
  {
    title: "Shopkeeper counter card",
    body: "The scrap prices per kg with its date, the weekly pickup days, what we don't take, and a QR code to our scrap prices today. For the shop counter.",
    pdf: "/print/counter-card.pdf",
    page: "/print/counter-card",
  },
  {
    title: "Buyer and campus flyer",
    body: "Tested phones, laptops and parts for buyers, technicians, colleges and offices, with national e-waste figures and their sources, and the QR code. For campus drives.",
    pdf: "/print/awareness-flyer.pdf",
    page: "/print/awareness-flyer",
  },
  {
    title: "ReLoop Partner window badge (A5)",
    body: 'For a partner shop\'s window: "Used parts, tested and working, from ReLoop", with a QR code to the hub and the routes.',
    pdf: "/print/partner-badge.pdf",
    page: "/print/partner-badge",
  },
];

export default function PrintIndexPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <Eyebrow>Printable outreach</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold">Posters and flyers</h1>
        <p className="mt-4 text-lg text-muted">
          One page each, in colour (the badge is A5). Print the PDF at 100% (no &ldquo;fit to
          page&rdquo;) so the QR code stays sharp. The QR code opens our locations page.
        </p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-2" role="list">
        {SHEETS.map((s) => (
          <li key={s.pdf} className="rounded-card border border-line bg-surface p-6 shadow-soft">
            <FileText className="size-6 text-brand-600" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-semibold">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <a
                className="inline-flex items-center gap-1.5 text-brand-600 underline"
                href={s.pdf}
                download
              >
                <Download className="size-4" aria-hidden="true" />
                {s.title} (PDF)
              </a>
              <Link className="text-brand-600 underline" href={s.page}>
                Open the page
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
