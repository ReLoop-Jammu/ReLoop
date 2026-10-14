/** A request's stage, as request_status() and my_requests() return it (never the details in it). */
export type RequestStage = {
  kind: "reservation" | "enquiry" | "institution_pickup" | string;
  status: "new" | "contacted" | "scheduled" | "collected" | "sold" | "done" | "cancelled" | string;
  item_id: string | null;
  item_title: string | null;
  created_at: string;
  handled_at: string | null;
  scheduled_for: string | null;
  cancelled_by: "buyer" | "staff" | null;
  cancel_reason: string | null;
};

export const KIND_LABEL: Record<string, string> = {
  reservation: "Reservation",
  enquiry: "Question",
  institution_pickup: "Institution pickup",
};

export const isOpen = (status: string) => ["new", "contacted", "scheduled"].includes(status);

/** One line for a request's current stage. */
export function stageLabel(r: Pick<RequestStage, "kind" | "status" | "cancelled_by">): string {
  switch (r.status) {
    case "new":
      return "Sent: ReLoop will look at it soon";
    case "contacted":
      return r.kind === "enquiry" ? "Answered" : "Seen by ReLoop: we'll be in touch";
    case "scheduled":
      return "Pickup booked";
    case "collected":
      return "Collected";
    case "sold":
      return "Complete";
    case "done":
      return "Done";
    case "cancelled":
      return r.cancelled_by === "buyer" ? "Cancelled by you" : "Cancelled by ReLoop";
    default:
      return r.status;
  }
}

export type Step = { key: string; title: string; when?: string; detail?: string; reached: boolean };

const ORDER: Record<string, string[]> = {
  reservation: ["new", "contacted", "sold"],
  enquiry: ["new", "contacted", "done"],
  institution_pickup: ["new", "contacted", "scheduled", "collected", "done"],
};
const STEP_TITLE: Record<string, string> = {
  new: "Sent",
  contacted: "Seen by ReLoop",
  scheduled: "Pickup booked",
  collected: "Collected",
  sold: "Complete",
  done: "Done",
};

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : undefined;

/**
 * The steps of a request, in order, with the ones reached so far. Only the
 * sending date and the latest change are known, so earlier steps show no date.
 * A cancelled request ends with the cancellation (and ReLoop's reason).
 */
export function requestSteps(r: RequestStage): Step[] {
  const order = ORDER[r.kind] ?? ["new", "contacted", "done"];
  if (r.status === "cancelled") {
    return [
      { key: "new", title: "Sent", when: day(r.created_at), reached: true },
      {
        key: "cancelled",
        title: r.cancelled_by === "buyer" ? "Cancelled by you" : "Cancelled by ReLoop",
        when: day(r.handled_at),
        ...(r.cancel_reason ? { detail: r.cancel_reason } : {}),
        reached: true,
      },
    ];
  }
  const at = Math.max(0, order.indexOf(r.status));
  return order.map((s, i) => ({
    key: s,
    title: s === "contacted" && r.kind === "enquiry" ? "Answered" : STEP_TITLE[s],
    when:
      i === 0
        ? day(r.created_at)
        : i === at
          ? s === "scheduled"
            ? day(r.scheduled_for)
            : day(r.handled_at)
          : undefined,
    ...(s === "scheduled" && r.scheduled_for
      ? { detail: `Pickup on ${day(r.scheduled_for)}` }
      : {}),
    reached: i <= at,
  }));
}
