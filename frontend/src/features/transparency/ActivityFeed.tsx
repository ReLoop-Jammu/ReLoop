import { Container } from "@/components/ui/Container";
import { activitySentence } from "./model";
import { getActivityFeed } from "./queries";

/** What has happened lately, at least a day old and date only. Hidden until there are 5 events in 30 days. */
export async function ActivityFeed() {
  const rows = (await getActivityFeed()) ?? [];
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="activity-heading" className="pb-16 sm:pb-20">
      <Container>
        <h2 id="activity-heading" className="text-2xl font-bold">
          Lately in the loop
        </h2>
        <p className="mt-1 text-sm text-muted">At least a day old, by date only.</p>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2" role="list">
          {rows.slice(0, 10).map((a, i) => (
            <li
              key={`${a.day}-${i}`}
              className="flex gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
            >
              <time dateTime={a.day} className="shrink-0 text-muted tabular-nums">
                {new Date(`${a.day}T12:00:00+05:30`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })}
              </time>
              <span>{activitySentence(a)}</span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
