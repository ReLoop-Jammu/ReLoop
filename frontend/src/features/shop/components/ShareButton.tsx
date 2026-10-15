import { Share2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { IS_SIMULATION } from "@/lib/environment";
import { formatPrice } from "@/lib/utils/money";

/** The wa.me share link for an item: the person picks who to send it to (never ReLoop's number). */
export const whatsappShareUrl = (title: string, pricePaise: number, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}, ${formatPrice(pricePaise)} at ReLoop Jammu: ${url}`)}`;

/** Shares the item's page on WhatsApp with someone the person chooses (not in the simulation, whose stock isn't real). */
export function ShareButton({
  title,
  pricePaise,
  url,
}: {
  title: string;
  pricePaise: number;
  url: string;
}) {
  if (IS_SIMULATION) return null;
  return (
    <a
      href={whatsappShareUrl(title, pricePaise, url)}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ size: "sm", variant: "ghost" })}
    >
      <Share2 className="size-4" aria-hidden="true" />
      Share on WhatsApp
      <span className="sr-only"> (opens WhatsApp in a new tab)</span>
    </a>
  );
}
