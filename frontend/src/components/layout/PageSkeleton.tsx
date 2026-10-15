import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/** The shape of a typical page while it loads: a heading, a line of text and a grid of cards. */
export function PageSkeleton() {
  return (
    <Container className="flex-1 py-12 sm:py-16">
      <p className="sr-only">Loading the page…</p>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-card" />
        ))}
      </div>
    </Container>
  );
}
