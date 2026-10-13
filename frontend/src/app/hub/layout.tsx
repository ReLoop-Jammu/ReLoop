import type { Metadata } from "next";
import { HubShell } from "@/features/hub/components/HubShell";

export const metadata: Metadata = {
  title: { default: "Hub", template: "%s · ReLoop Hub" },
  robots: { index: false, follow: false },
};

/** Staff tool for the ReLoop hub. Not linked from the public site. */
export default function HubLayout({ children }: LayoutProps<"/hub">) {
  return <HubShell>{children}</HubShell>;
}
