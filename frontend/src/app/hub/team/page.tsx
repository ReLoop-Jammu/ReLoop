import type { Metadata } from "next";
import { TeamPage } from "@/features/hub/components/TeamPage";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <TeamPage />;
}
