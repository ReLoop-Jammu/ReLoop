import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">WELCOME BACK</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Log in to ReLoop</h1>
        <p className="mt-3 text-muted">Use the email and password associated with your account.</p>
        <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </Container>
  );
}
