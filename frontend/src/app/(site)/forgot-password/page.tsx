"use client";

import { EmailRequestForm } from "@/features/account/EmailRequestForm";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  return (
    <EmailRequestForm
      eyebrow="FORGOT PASSWORD"
      title="Reset your password"
      intro="Enter the email you registered with. We'll send a link to choose a new password."
      button="Send reset link"
      sent="If an account uses that address, we've sent it a password reset link."
      send={requestPasswordReset}
    />
  );
}
