"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { logoutAccount } from "@/lib/auth-client";
import { useAccount } from "@/lib/use-account";

const STATUS_TEXT = {
  pending: "Pending review",
  verified: "Verified",
  rejected: "Not approved",
} as const;

export default function AccountPage() {
  const router = useRouter();
  const { account, loading } = useAccount();

  useEffect(() => {
    if (!loading && !account) router.replace("/login?next=/account");
  }, [loading, account, router]);

  async function signOut() {
    await logoutAccount();
    window.location.replace("/");
  }

  const profile = account?.profile;
  const shop = account?.shop;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-brand-600">MY RELOOP</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your account</h1>

        {loading || !account ? (
          <p className="mt-6 text-muted">Loading account…</p>
        ) : !profile ? (
          <p role="alert" className="mt-6 rounded-xl bg-danger/5 p-4 text-danger">
            We couldn&apos;t load your profile. Please try again, or contact ReLoop if this
            continues.
          </p>
        ) : (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-xl font-bold">Welcome, {profile.full_name}</h2>
            <p className="mt-2 text-muted">
              Account type: {profile.role === "shop_owner" ? "Shop owner" : "Buyer"}
            </p>

            {profile.role === "shop_owner" && (
              <div className="mt-5 rounded-xl bg-sunken p-4">
                <p className="font-semibold">Shop verification</p>
                <p className="mt-1 text-sm text-muted">
                  {shop?.shop_name || "Business details"} · GSTIN: {shop?.gstin || "Not available"}
                </p>
                <p className="mt-2 text-sm">
                  Status:{" "}
                  <strong>{STATUS_TEXT[shop?.verification_status ?? "pending"]}</strong>
                </p>
                {shop?.verification_status === "verified" ? (
                  <Link
                    className="mt-3 inline-block font-semibold text-brand-600 underline"
                    href="/sell/shops"
                  >
                    Submit items to ReLoop
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    Your business must be verified before you can submit stock.
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={signOut}>
                Log out
              </Button>
              <Link
                className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-600 underline"
                href="/shop"
              >
                Browse marketplace
              </Link>
              {account.isStaff && (
                <Link
                  className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-600 underline"
                  href="/hub"
                >
                  Open the hub
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
