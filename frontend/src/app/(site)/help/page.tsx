import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HelpGuide } from "@/features/help/HelpGuide";
import { WhatsAppButton } from "@/features/sell/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "Help for partner shops",
  description:
    "Step by step, in English and Hindi: sign up, verification, submitting items, offers, pickup, payment and how to reach ReLoop.",
};

export default function HelpPage() {
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Help · मदद</Eyebrow>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
        Help for partner shops
        <span lang="hi" className="mt-2 block text-2xl font-semibold text-ink-soft sm:text-3xl">
          पार्टनर दुकानों के लिए मदद
        </span>
      </h1>
      <HelpGuide />
      <div className="mt-10">
        <WhatsAppButton
          message="Hi ReLoop, I need help with my shop account"
          label="Ask us on WhatsApp"
        />
      </div>
    </Container>
  );
}
