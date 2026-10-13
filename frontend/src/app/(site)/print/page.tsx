import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Printable outreach",
  description: "A4 poster for partner shops and a flyer for awareness drives, ready to print.",
  robots: { index: false, follow: false },
};

const SHEETS = [
  {
    title: "Partner-shop poster",
    body: "“ReLoop partner: drop old electronics here”, with the QR code and our WhatsApp number. For the counter or the shop window.",
    pdf: "/print/partner-poster.pdf",
    page: "/print/partner-poster",
  },
  {
    title: "Awareness-drive flyer",
    body: "Why e-waste matters (national figures with sources), how ReLoop works in three steps, and the QR code. For college and colony drives.",
    pdf: "/print/awareness-flyer.pdf",
    page: "/print/awareness-flyer",
  },
];

export default function PrintIndexPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <Eyebrow>Printable outreach</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold">Posters and flyers</h1>
        <p className="mt-4 text-lg text-muted">
          A4, one page each, in colour. Print the PDF at 100% (no &ldquo;fit to page&rdquo;) so the
          QR code stays sharp. The QR code opens our locations page.
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
