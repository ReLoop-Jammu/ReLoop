import { Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { IS_SIMULATION } from "@/lib/environment";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Forgot your password?",
  description: "How to get back into your ReLoop account.",
};

const wa = (n: string) =>
  `https://wa.me/${n}?text=${encodeURIComponent("Hi ReLoop, I forgot my account password.")}`;
const pretty = (n: string) => `+${n.slice(0, 2)} ${n.slice(2, 7)} ${n.slice(7)}`;

/**
 * ReLoop doesn't send emails yet, so passwords are reset by an admin after
 * they confirm who is asking. (Self-service reset is kept in the code for
 * when email sending is set up.)
 */
export default function ForgotPasswordPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold text-brand-600">FORGOT PASSWORD</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Forgot your password?</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Message us on WhatsApp or email; after we confirm it&apos;s you, an admin resets your
          password.
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Message us with the email address you registered with.</li>
          <li>We call the phone number on your account to check it&apos;s really you.</li>
          <li>
            We give you a temporary password. Log in with it and choose your own straight away.
          </li>
        </ol>
        {IS_SIMULATION && (
          <p className="mt-6 rounded-xl bg-sunken p-4 text-sm">
            This is the simulation: use the demo logins on{" "}
            <Link className="font-semibold text-brand-600 underline" href="/demo">
              the demo page
            </Link>{" "}
            instead.
          </p>
        )}
        <div className="mt-8 grid gap-3">
          {SITE.whatsapp && !IS_SIMULATION && (
            <a
              href={wa(SITE.whatsapp)}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold hover:border-line-strong"
            >
              <MessageCircle className="size-5 text-brand-600" aria-hidden="true" />
              WhatsApp {pretty(SITE.whatsapp)}
            </a>
          )}
          {SITE.supportEmail && !IS_SIMULATION && (
            <a
              href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent("Forgot my ReLoop password")}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold hover:border-line-strong"
            >
              <Mail className="size-5 text-brand-600" aria-hidden="true" />
              {SITE.supportEmail}
            </a>
          )}
        </div>
        <p className="mt-6 text-sm text-muted">
          We never ask for your password, and we only reset it after checking with you by phone.{" "}
          <Link className="font-semibold text-brand-600 underline" href="/login">
            Back to log in
          </Link>
        </p>
      </div>
    </Container>
  );
}
