import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { inr, longDate, methodLabel, type ReceiptLine } from "@/features/payouts/receipt";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

type TokenReceipt = {
  receipt_no: string;
  paid_at: string;
  amount_paise: number;
  method: string;
  shop_name: string;
  line: string;
  lines: ReceiptLine[] | null;
  declaration: string | null;
};

/** The private page behind a receipt link: whoever holds the link sees this receipt and nothing else. */
async function load(token: string): Promise<TokenReceipt | null> {
  if (!/^[0-9a-f]{32}$/.test(token) || !URL_ || !KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/receipt_by_token`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    return ((await r.json()) as TokenReceipt[])[0] ?? null;
  } catch {
    return null;
  }
}

const TITLE: Record<string, string> = {
  scrap: "Scrap weighed at the counter",
  tested_parts: "Tested working parts",
  part_sale: "Your share of a used parts shop sale",
  lot: "Items bought by ReLoop",
  lot_equipment: "Equipment bought from an institution lot",
};

export default async function ReceiptPage({ params }: PageProps<"/receipt/[token]">) {
  const { token } = await params;
  const r = await load(token);
  if (!r) notFound();
  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-7 shadow-soft sm:p-9">
        <Eyebrow>ReLoop payment receipt</Eyebrow>
        <h1 className="mt-3 text-3xl font-bold">{r.receipt_no}</h1>
        <p className="mt-1 text-muted">{TITLE[r.line] ?? "Payment"}</p>
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Paid to</dt>
            <dd className="font-semibold">{r.shop_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Date paid</dt>
            <dd className="font-semibold">{longDate(r.paid_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Paid by</dt>
            <dd className="font-semibold">{methodLabel(r.method)}</dd>
          </div>
        </dl>
        {r.lines && r.lines.length > 0 && (
          <table className="mt-6 w-full text-left text-sm">
            <caption className="sr-only">What this receipt covers</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Line
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {r.lines.map((l) => (
                <tr key={l.label}>
                  <td className="py-2">
                    {l.label}
                    {l.kg !== undefined && l.rate_paise !== undefined && (
                      <span className="block text-xs text-muted">
                        {Number(l.kg).toFixed(1)} kg at {inr(Number(l.rate_paise))} a kg
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">{inr(Number(l.amount_paise))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-6 border-t border-line pt-4 text-lg font-bold">
          Total <span className="float-right tabular-nums">{inr(Number(r.amount_paise))}</span>
        </p>
        {r.declaration && <p className="mt-4 text-sm text-ink-soft">{r.declaration}</p>}
        <p className="mt-4 text-xs text-muted">
          This is a payment receipt, not a tax invoice. Anyone with this link can see it, so share
          it only with people you trust.
        </p>
      </article>
    </Container>
  );
}
