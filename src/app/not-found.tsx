import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon="🔌"
        title="We couldn’t find that page"
        description="The link may be broken, or the listing may have been sold or removed."
        actions={
          <>
            <ButtonLink href="/listings">Browse the marketplace</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
    </Container>
  );
}
