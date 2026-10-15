"use client";

import { ErrorPage } from "@/components/layout/ErrorPage";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPage {...props} />;
}
