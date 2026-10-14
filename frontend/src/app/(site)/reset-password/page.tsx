"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/sell/components/RequestForm";
import { parseAuthRedirect, setNewPassword, type AuthRedirect } from "@/lib/auth-client";

const noSubscribe = () => () => {};
const NONE: AuthRedirect = { kind: "none" };
let cached: { hash: string; value: AuthRedirect } | null = null;

/** The reset link's #fragment, read once on the client (stable between renders). */
function readLink(): AuthRedirect {
  const hash = window.location.hash;
  if (!cached || cached.hash !== hash) cached = { hash, value: parseAuthRedirect(hash) };
  return cached.value;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const link = useSyncExternalStore(noSubscribe, readLink, () => NONE);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (link.kind !== "recovery") return;
    if (password !== again) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await setNewPassword(link.session, password);
      // Drop the one-time tokens from the address bar before moving on.
      window.history.replaceState(null, "", "/reset-password");
      router.push("/account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't set your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">NEW PASSWORD</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Choose a new password</h1>
        {link.kind === "recovery" ? (
          <form
            onSubmit={submit}
            className="mt-8 space-y-4 rounded-card border border-line bg-surface p-5 sm:p-7"
          >
            <label className="grid gap-1.5 text-sm font-medium">
              New password
              <input
                className={inputClass}
                required
                type="password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Type it again
              <input
                className={inputClass}
                required
                type="password"
                minLength={8}
                maxLength={128}
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-danger/5 p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Saving…" : "Save new password"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 rounded-card border border-line bg-surface p-5 text-sm sm:p-7">
            <p role={link.kind === "error" ? "alert" : undefined}>
              {link.kind === "error"
                ? link.message
                : "Open this page from the reset link in your email. The link works once."}
            </p>
            <Link
              className="mt-4 inline-block font-semibold text-brand-600 underline"
              href="/forgot-password"
            >
              Ask for a new reset link
            </Link>
          </div>
        )}
      </div>
    </Container>
  );
}
