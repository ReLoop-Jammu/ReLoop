import type { Metadata } from "next";
import { StandardPage } from "@/components/marketing/StandardPage";
import { publicView } from "@/lib/server/public-view";

export const metadata: Metadata = {
  title: "Data-wipe standard",
  description:
    "How ReLoop wipes phones, laptops, desktops, drives and boards, or destroys their storage, before they move on.",
};

export const revalidate = 300;

type Stats = {
  wiped_total: number | string;
  reset_overwrite: number | string;
  drive_wipe: number | string;
  storage_destroyed: number | string;
  boards_wiped: number | string;
  last_wiped_on: string | null;
};

export default async function DataWipePage() {
  const s = ((await publicView<Stats>("public_wipe_stats", "select=*")) ?? [])[0];
  const total = s ? Number(s.wiped_total) : 0;
  return (
    <StandardPage
      title="Data-wipe standard"
      lead="Anything that can hold personal data is wiped, or its storage destroyed, and logged against its tag before it is sold, stripped or handed over."
      sections={[
        {
          title: "What is wiped",
          body: (
            <p>
              Phones, laptops, desktops and loose drives, and boards taken from phones, laptops and
              desktops. A monitor or an accessory holds no personal data and is not wiped.
            </p>
          ),
        },
        {
          title: "How",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Phones and tablets: a factory reset, then the storage is overwritten.</li>
              <li>Laptops, desktops and drives: the whole drive is wiped with a wiping tool.</li>
              <li>
                Storage that cannot be wiped, or a dead device: the storage is physically destroyed
                (drilled). A destroyed drive is never sold.
              </li>
            </ul>
          ),
        },
        {
          title: "Logged against the tag",
          body: (
            <p>
              The method and the date are recorded on the item&apos;s RL-JMU tag, and shown on its
              shop page. The hub&apos;s software will not list a device that needs a wipe until the
              wipe is recorded, and a device is wiped before it is stripped for parts.
            </p>
          ),
        },
      ]}
    >
      <p className="mt-6 rounded-card border border-line bg-surface p-5 shadow-soft" role="status">
        {total > 0 ? (
          <>
            <strong className="text-2xl text-ink tabular-nums">{total}</strong> items wiped or
            destroyed so far, including {Number(s!.boards_wiped)} boards
            {s!.last_wiped_on ? ` (latest ${s!.last_wiped_on})` : ""}.
          </>
        ) : (
          <>The count of wiped items appears here once the hub records its first wipe.</>
        )}
      </p>
    </StandardPage>
  );
}
