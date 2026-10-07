import { Unplug } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <Container className="py-16 sm:py-24">
          <EmptyState
            icon={Unplug}
            title="We couldn’t find that page"
            description="The link may be broken, or the item may have been sold."
            actions={
              <>
                <ButtonLink href="/shop">Go to the shop</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  Go home
                </ButtonLink>
              </>
            }
          />
        </Container>
      </main>
      <Footer />
    </>
  );
}
