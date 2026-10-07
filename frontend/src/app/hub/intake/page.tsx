import type { Metadata } from "next";
import { IntakeForm } from "@/features/hub/components/IntakeForm";

export const metadata: Metadata = { title: "Intake" };

export default function IntakePage() {
  return <IntakeForm />;
}
