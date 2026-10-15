"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

/** The "something went wrong" screen shared by the error boundaries. */
export function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by Sentry reporting in Phase 7.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex-1 py-16 sm:py-24">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="Please try again. If it keeps happening, come back in a few minutes."
        actions={
          <>
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
      {error.digest && (
        <p className="mt-6 text-center text-xs text-muted">Reference: {error.digest}</p>
      )}
    </Container>
  );
}
