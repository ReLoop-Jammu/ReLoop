"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/sell/components/RequestForm";
import { fetchAccount, loginAccount } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (or the session can be renewed): skip the form.
  useEffect(() => {
    let alive = true;
    fetchAccount().then((account) => {
      if (alive && account) router.replace(next);
    });
    return () => {
      alive = false;
    };
  }, [next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAccount(email, password);
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-7"
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Email address
        <input
          className={inputClass}
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input
          className={inputClass}
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-sm text-muted">
        New to ReLoop?{" "}
        <Link className="font-semibold text-brand-600 underline" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
