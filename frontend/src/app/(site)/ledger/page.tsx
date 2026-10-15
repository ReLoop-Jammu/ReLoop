import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Table, Td, Th } from "@/components/ui/Table";
import { formatKg } from "@/features/impact/totals";
import { num } from "@/features/transparency/model";
import { getLedger } from "@/features/transparency/queries";

export const metadata: Metadata = {
  title: "Handover ledger",
  description:
    "Every handover to VRRG Group, our dismantling partner: date, categories and kilograms, with the receipt number for ReLoop's own handovers.",
};

export const revalidate = 300;

export default async function LedgerPage() {
  const rows = (await getLedger()) ?? [];
  const total = rows.reduce((s, r) => s + num(r.total_kg), 0);
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Transparency</Eyebrow>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Handover ledger</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Every time scrap leaves the hub for VRRG Group, our dismantling partner, it is weighed on
        their receipt. ReLoop&apos;s own handovers show that receipt&apos;s number. Lots collected
        from institutions are shown as &ldquo;Institution lot&rdquo;, named only if the institution
        agreed.
      </p>
      {rows.length === 0 ? (
        <p
          role="status"
          className="mt-10 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft"
        >
          <strong className="text-ink">No handover yet.</strong> The first one appears here as soon
          as a bin goes to VRRG Group.
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm">
            <strong>{formatKg(total)} kg</strong> handed over in {rows.length}{" "}
            {rows.length === 1 ? "handover" : "handovers"}.{" "}
            <Link href="/data/ledger.csv" className="font-semibold text-brand-600 underline">
              Download the ledger (CSV)
            </Link>
          </p>
          <Table caption="Handovers to VRRG Group" className="mt-4">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>From</Th>
                <Th className="text-right">Screens</Th>
                <Th className="text-right">Boards</Th>
                <Th className="text-right">Other</Th>
                <Th className="text-right">D devices</Th>
                <Th className="text-right">Batteries</Th>
                <Th className="text-right">Total kg</Th>
                <Th>Receipt</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.date}-${i}`}>
                  <Td>{r.date}</Td>
                  <Td>{r.institution ? `${r.source}: ${r.institution}` : r.source}</Td>
                  <Td className="text-right tabular-nums">{formatKg(num(r.screens_kg))}</Td>
                  <Td className="text-right tabular-nums">{formatKg(num(r.boards_kg))}</Td>
                  <Td className="text-right tabular-nums">
                    {formatKg(num(r.other_kg) + num(r.before_bins_kg))}
                  </Td>
                  <Td className="text-right tabular-nums">{formatKg(num(r.d_devices_kg))}</Td>
                  <Td className="text-right tabular-nums">{formatKg(num(r.batteries_kg))}</Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatKg(num(r.total_kg))}
                  </Td>
                  <Td>{r.receipt_ref ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Container>
  );
}
