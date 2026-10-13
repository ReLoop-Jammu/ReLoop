"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/sell/components/RequestForm";

/** One email field that asks Supabase to send an account email, with a neutral reply. */
export function EmailRequestForm({
  eyebrow,
  title,
  intro,
  button,
  sent,
  send,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  button: string;
  sent: string;
  send: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await send(email);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-3 text-muted">{intro}</p>
        {done ? (
          <p
            role="status"
            className="mt-8 rounded-2xl border border-line bg-grade-a-bg p-5 text-sm"
          >
            {sent} Emails can take a few minutes; check your spam folder too.
          </p>
        ) : (
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
            {error && (
              <p role="alert" className="rounded-lg bg-danger/5 p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Sending…" : button}
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm text-muted">
          <Link className="font-semibold text-brand-600 underline" href="/login">
            Back to log in
          </Link>
        </p>
      </div>
    </Container>
  );
}
