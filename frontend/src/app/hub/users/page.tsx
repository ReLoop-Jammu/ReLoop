import type { Metadata } from "next";
import { UsersPage } from "@/features/hub/components/UsersPage";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return <UsersPage />;
}
