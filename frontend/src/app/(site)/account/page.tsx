"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { MySubmissions } from "@/features/account/MySubmissions";
import { Button } from "@/components/ui/Button";
import {
  authenticatedFetch,
  CHANGE_PASSWORD_PATH,
  getSession,
  logoutAccount,
  mustChangePassword,
} from "@/lib/auth-client";

type Profile = { full_name: string; role: "buyer" | "shop_owner" | "admin" };

const ROLE_LABEL: Record<Profile["role"], string> = {
  buyer: "Buyer",
  shop_owner: "Shop owner",
  admin: "ReLoop admin",
};
type ShopProfile = {
  shop_name: string;
  gstin: string;
  verification_status: "pending" | "verified" | "rejected";
};
export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = getSession();
        if (!session) {
          window.location.replace("/login?next=%2Faccount");
          return;
        }
        if (await mustChangePassword()) {
          window.location.replace(CHANGE_PASSWORD_PATH);
          return;
        }
        const [p, s] = await Promise.all([
          // Filtered by user: staff and admins may read other people's rows.
          authenticatedFetch(
            `/rest/v1/profiles?select=full_name,role&user_id=eq.${session.user.id}`,
          ),
          authenticatedFetch(
            `/rest/v1/shop_owners?select=shop_name,gstin,verification_status&id=eq.${session.user.id}`,
          ),
        ]);
        if (!p.ok)
          throw new Error(
            "Could not load your profile. Ensure the account migration has been applied in Supabase.",
          );
        const profiles = (await p.json()) as Profile[];
        const shops = s.ok ? ((await s.json()) as ShopProfile[]) : [];
        if (alive) {
          setProfile(profiles[0] ?? null);
          setShop(shops[0] ?? null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load account.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function signOut() {
    await logoutAccount();
    window.location.replace("/");
  }
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-brand-600">MY RELOOP</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your account</h1>
        {loading ? (
          <p className="mt-6 text-muted">Loading account…</p>
        ) : error ? (
          <p role="alert" className="mt-6 rounded-xl bg-danger/5 p-4 text-danger">
            {error}
          </p>
        ) : profile ? (
          <div className="mt-8 rounded-card border border-line bg-surface p-6">
            <h2 className="text-xl font-bold">Welcome, {profile.full_name}</h2>
            <p className="mt-2 text-muted">Account type: {ROLE_LABEL[profile.role] ?? "Buyer"}</p>
            {profile.role === "shop_owner" && (
              <div className="mt-5 rounded-xl bg-sunken p-4">
                <p className="font-semibold">Shop verification</p>
                <p className="mt-1 text-sm text-muted">
                  {shop?.shop_name || "Business details"} · GSTIN: {shop?.gstin || "Not available"}
                </p>
                <p className="mt-2 text-sm">
                  Status: <strong>{shop?.verification_status ?? "Pending"}</strong>
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
                <MySubmissions />
                <Link
                  className="mt-4 inline-block text-sm font-semibold text-brand-600 underline"
                  href="/help"
                >
                  Help for partner shops, in English and Hindi
                </Link>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={signOut}>
                Log out
              </Button>
              <Link
                className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-600 underline"
                href={CHANGE_PASSWORD_PATH}
              >
                Change password
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-600 underline"
                href="/shop"
              >
                Browse marketplace
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-muted">No profile was found. Please contact ReLoop support.</p>
        )}
      </div>
    </Container>
  );
}
