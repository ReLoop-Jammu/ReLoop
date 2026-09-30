import type { ReactNode } from "react";
import type { Listing } from "../model";
import { ListingCard } from "./ListingCard";

type Props = { listings: Listing[]; empty?: ReactNode };

export function ListingGrid({ listings, empty }: Props) {
  if (listings.length === 0) return <>{empty}</>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5" role="list">
      {listings.map((listing, index) => (
        <li key={listing.id} className="flex">
          <ListingCard listing={listing} index={index} />
        </li>
      ))}
    </ul>
  );
}
