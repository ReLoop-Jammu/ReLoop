import { CircleCheck } from "lucide-react";
import type { Submission } from "@/features/inventory/model";
import { IS_SIMULATION } from "@/lib/environment";
import { StatusLink } from "./StatusLink";

const HEADINGS: Partial<Record<Submission["kind"], string>> = {
  reservation: "Reservation received",
  enquiry: "Question received",
  institution_pickup: "Booking received",
};

function nextStep(kind: Submission["kind"], phone: string) {
  const on = phone ? ` on ${phone}` : "";
  if (kind === "reservation")
    return `We'll call or WhatsApp you${on} within one working day to confirm the price and the pickup or delivery. A reservation isn't a sale, so there's nothing to pay now.`;
  if (kind === "institution_pickup")
    return `We'll call you${on} within one working day to agree the pickup date.`;
  return `We'll reply${on} within one working day.`;
}

type Props = {
  kind: Submission["kind"];
  ticket: string | null;
  phone: string;
  tracking: { token: string | null; linked: boolean };
};

/** Shown once a request is saved: it is now a ticket on the hub's Requests page. */
export function RequestReceived({ kind, ticket, phone, tracking }: Props) {
  return (
    <div role="status" className="rounded-card border border-grade-a/30 bg-grade-a-bg p-5 sm:p-6">
      <p className="flex items-center gap-2 text-lg font-semibold text-grade-a">
        <CircleCheck className="size-5" aria-hidden="true" />
        {HEADINGS[kind] ?? "Request received"}
      </p>
      {ticket && (
        <p className="mt-2 text-sm text-ink-soft">
          Your ticket:{" "}
          <strong className="font-mono text-base tracking-wide text-ink">{ticket}</strong>. Quote it
          if you call us.
        </p>
      )}
      <p className="mt-2 text-sm text-ink-soft">
        {IS_SIMULATION
          ? "This is the simulation: your request is saved for the demo hub, and nobody will call you."
          : `It's now with the ReLoop team. ${nextStep(kind, phone)}`}
      </p>
      {tracking.token && <StatusLink token={tracking.token} linked={tracking.linked} />}
    </div>
  );
}
