"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/sell/components/RequestForm";
import { CHANGE_PASSWORD_PATH, loginAccount, loginDestination, myAccess } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAccount(email, password);
      const access = await myAccess().catch(() => null);
      // After an admin reset, a new password comes before anything else; the
      // hub is closed until then, so staff land on their account afterwards.
      if (access?.must_change_password) {
        const after = loginDestination(window.location.search, null);
        router.push(`${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent(after)}`);
      } else {
        router.push(loginDestination(window.location.search, access));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">WELCOME BACK</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Log in to ReLoop</h1>
        <p className="mt-3 text-muted">Use the email and password associated with your account.</p>
        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-card border border-line bg-surface p-5 sm:p-7"
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
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link className="font-semibold text-brand-600 underline" href="/forgot-password">
              Forgot your password?
            </Link>
          </p>
          <p className="text-sm text-muted">
            New to ReLoop?{" "}
            <Link className="font-semibold text-brand-600 underline" href="/register">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </Container>
  );
}
