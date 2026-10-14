import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Timeline } from "@/components/ui/Timeline";
import { categoryLabel, PART_TYPES, type Category } from "@/features/inventory/model";
import { getPassport } from "@/features/passport/server";
import { journey, STAGE_LABEL, whereNow } from "@/features/passport/stages";

export async function generateMetadata({
  params,
}: PageProps<"/passport/[itemId]">): Promise<Metadata> {
  const { itemId } = await params;
  return {
    title: `Item passport ${itemId}`,
    description: `Where ReLoop item ${itemId} has been: from the hub to its next life.`,
    // One page per tag: useful from the QR code, not as search results.
    robots: { index: false, follow: true },
  };
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export default async function PassportPage({ params }: PageProps<"/passport/[itemId]">) {
  const { itemId } = await params;
  const rows = await getPassport(itemId);
  if (!rows.length) notFound();
  const steps = journey(rows);
  const first = rows[0];
  const kind =
    first.category === "part"
      ? (PART_TYPES.find((p) => p.value === first.part_type)?.label ?? "Part")
      : categoryLabel(first.category as Category);
  const onSale = ["listed", "price_changed", "reserved"].includes(steps.at(-1)?.stage ?? "");
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Item passport</Eyebrow>
        <h1 className="mt-2 font-mono text-3xl font-bold sm:text-4xl">{itemId}</h1>
        <p className="mt-2 text-lg text-ink-soft">
          {kind} · <strong className="text-ink">{whereNow(rows)}</strong>
        </p>
        <Timeline
          className="mt-10"
          entries={steps.map((s, i) => ({
            key: `${s.stage}-${s.at}`,
            when: day(s.at),
            title: STAGE_LABEL[s.stage]?.title ?? s.stage,
            detail: STAGE_LABEL[s.stage]?.detail,
            current: i === steps.length - 1,
          }))}
        />
        <div className="mt-10 grid gap-3 rounded-card border border-line bg-surface p-5 text-sm text-ink-soft">
          <p>
            Every item ReLoop buys gets a tag like this one at the Jammu hub. Its passport shows
            each step and its date, and nothing about who sold or bought it, or for how much.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {onSale && (
              <Link href={`/shop/${itemId}`} className="font-semibold text-brand-600 underline">
                See it in the shop
              </Link>
            )}
            <Link href="/how-it-works" className="font-semibold text-brand-600 underline">
              How ReLoop works
            </Link>
            <Link href="/where-scrap-goes" className="font-semibold text-brand-600 underline">
              Where scrap goes
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
}
