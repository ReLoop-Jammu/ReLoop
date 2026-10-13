import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HubShell } from "@/features/hub/components/HubShell";
import { checkHubAccess } from "@/lib/server/hub-access";

export const metadata: Metadata = {
  title: { default: "Hub", template: "%s · ReLoop Hub" },
  robots: { index: false, follow: false },
};

const NOTICES = {
  forbidden: {
    title: "This account isn't hub staff",
    body: "You're signed in, but your account isn't on the hub staff list. Ask a ReLoop admin to add you.",
  },
  unavailable: {
    title: "The hub is locked",
    body: "Staff sign-in isn't available right now, so the hub stays closed. If you run this site, connect Supabase and add yourself to the staff table (see backend/README.md).",
  },
} as const;

/** Staff tool for the ReLoop hub. Staff sign-in required. */
export default async function HubLayout({ children }: LayoutProps<"/hub">) {
  const access = await checkHubAccess();

  if (access === "login") redirect("/login?next=/hub");

  if (access !== "ok") {
    const notice = NOTICES[access];
    return (
      <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{notice.title}</h1>
        <p className="mt-3 text-muted">{notice.body}</p>
        <Link className="mt-6 inline-block font-semibold text-brand-600 underline" href="/">
          Back to the public site
        </Link>
      </main>
    );
  }

  return <HubShell>{children}</HubShell>;
}
