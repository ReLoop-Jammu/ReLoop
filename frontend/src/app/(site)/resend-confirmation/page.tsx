"use client";

import { EmailRequestForm } from "@/features/account/EmailRequestForm";
import { resendConfirmation } from "@/lib/auth-client";

export default function ResendConfirmationPage() {
  return (
    <EmailRequestForm
      eyebrow="CONFIRM YOUR EMAIL"
      title="Resend the confirmation email"
      intro="Didn't get the email to confirm your ReLoop account? Enter your address and we'll send it again."
      button="Resend email"
      sent="If that address has an unconfirmed account, we've sent the confirmation email again."
      send={resendConfirmation}
    />
  );
}
