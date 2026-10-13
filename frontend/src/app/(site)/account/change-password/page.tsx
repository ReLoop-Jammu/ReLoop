"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { inputClass } from "@/features/sell/components/RequestForm";
import { changePassword, mustChangePassword, safeNext } from "@/lib/auth-client";
import { isSignedIn } from "@/lib/roles";

const noSubscribe = () => () => {};

export default function ChangePasswordPage() {
  const router = useRouter();
  const signedIn = useSyncExternalStore(noSubscribe, isSignedIn, () => false);
  const [forced, setForced] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    mustChangePassword()
      .then((yes) => alive && setForced(yes))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signedIn]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== again) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(password, forced ? undefined : current);
      router.push(safeNext(window.location.search));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your password wasn't changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">YOUR ACCOUNT</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Choose a new password</h1>
        {forced && (
          <p role="status" className="mt-4 rounded-lg bg-gold-100 p-3 text-sm text-gold-700">
            An admin reset your password. Choose your own before you continue.
          </p>
        )}
        {!signedIn ? (
          <p className="mt-6 text-sm">
            <Link
              className="font-semibold text-brand-600 underline"
              href="/login?next=%2Faccount%2Fchange-password"
            >
              Log in first
            </Link>
            , using the temporary password from ReLoop if you were given one.
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-7"
          >
            {!forced && (
              <label className="grid gap-1.5 text-sm font-medium">
                Current password
                <input
                  className={inputClass}
                  required
                  type="password"
                  maxLength={128}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
            )}
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
        )}
      </div>
    </Container>
  );
}
