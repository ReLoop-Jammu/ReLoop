import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Notice } from "@/components/ui/Notice";
import { Timeline } from "@/components/ui/Timeline";
import { getRequestStatus } from "@/features/requests/server";
import {
  KIND_LABEL,
  requestSteps,
  stageLabel,
  type RequestStage,
} from "@/features/requests/stages";

// A private link: never indexed, never cached, and the address isn't sent on
// to other sites.
export const metadata: Metadata = {
  title: "Request status",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RequestStatusPage({ params }: PageProps<"/status/[token]">) {
  const r = await getRequestStatus((await params).token);
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Request status</Eyebrow>
        {!r ? (
          <>
            <h1 className="mt-2 text-3xl font-bold">We couldn&apos;t find this request</h1>
            <Notice tone="info" className="mt-6">
              Check that the whole link was copied. Requests are removed 12 months after they close.
              If you have an account, your requests are also under{" "}
              <Link href="/account/requests" className="font-semibold underline">
                My requests
              </Link>
              .
            </Notice>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-bold">
              {KIND_LABEL[r.kind] ?? "Request"}
              {r.item_id ? ` for ${r.item_id}` : ""}
            </h1>
            {r.item_title && <p className="mt-1 text-muted">{r.item_title}</p>}
            <p className="mt-4 text-lg font-semibold text-brand-600">{stageLabel(r)}</p>
            <Timeline className="mt-8" entries={timeline(r)} />
            <p className="mt-8 text-sm text-muted">
              This page shows only the stage of your request, never the details you sent. To change
              or cancel it, message ReLoop
              {r.status !== "cancelled" ? " or use My requests if you sent it while logged in" : ""}
              .
            </p>
            {r.item_id && (
              <p className="mt-3 text-sm">
                <Link
                  href={`/shop/${r.item_id}`}
                  className="font-semibold text-brand-600 underline"
                >
                  See {r.item_id} in the shop
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </Container>
  );
}

/** The steps for the timeline; the last one reached is the current stage. */
function timeline(r: RequestStage) {
  const steps = requestSteps(r);
  const last = steps.findLastIndex((s) => s.reached);
  return steps.map((s, i) => ({
    key: s.key,
    when: s.when ?? (s.reached ? "" : "Not yet"),
    title: s.reached ? s.title : <span className="text-muted">{s.title}</span>,
    detail: s.detail,
    current: i === last,
  }));
}
