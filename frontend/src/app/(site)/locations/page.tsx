import { Clock, MapPin, QrCode, Recycle, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LOCATIONS, visiblePartnerShops, type PartnerShop } from "@/config/locations";
import { getSiteSettings } from "@/features/settings/server";
import { LocationsMap } from "@/features/locations/LocationsMap";
import { mapPartnerShops } from "@/features/locations/partners";

/** Partner shops come from the database; refresh the page at most every 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Map & locations",
  description:
    "Where ReLoop works in Jammu: the hub area in the old-city market belt, partner drop-off shops, the Tuesday and Friday pickup route, and the authorised recycler.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const { hub, route, recycler } = LOCATIONS;
  const site = await getSiteSettings();
  // On the map: drop-off shops the admins list in the settings (those with a
  // position), plus verified partner shops that agreed to be on the map.
  const dropoff: PartnerShop[] = site.dropoffShops
    .filter((d) => typeof d.lat === "number" && typeof d.lng === "number")
    .map((d) => ({
      name: d.name,
      market: d.market,
      lat: d.lat as number,
      lng: d.lng as number,
      description: d.description ?? "",
      approximate: true,
      agreedToBeShown: true,
    }));
  const shops = [...visiblePartnerShops(), ...dropoff, ...(await mapPartnerShops())];
  // The list under the map also names drop-off shops saved without a position.
  const listed: { name: string; market: string; description?: string }[] = [
    ...shops,
    ...site.dropoffShops.filter((d) => typeof d.lat !== "number" || typeof d.lng !== "number"),
  ];
  const stops = route.stops;

  return (
    <Container className="py-12 sm:py-20">
      <SectionHeading
        as="h1"
        eyebrow={<Eyebrow>Map & locations</Eyebrow>}
        title="Where ReLoop works in Jammu"
        description="One hub in the old city, a twice-weekly pickup route through the repair markets, and one authorised recycler. Locations are approximate until the hub opens."
      />

      {/* The map's tiles are the page's largest paint: connect to the tile server early. */}
      <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="anonymous" />
      <LocationsMap partnerShops={shops} />
      <p className="mt-2 text-xs text-muted">
        Shaded areas are approximate. Map data © OpenStreetMap contributors.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="hub-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <MapPin className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="hub-heading" className="mt-3 text-xl font-bold">
            The hub
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{hub.description}</p>
        </section>

        <section
          aria-labelledby="shops-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <Store className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="shops-heading" className="mt-3 text-xl font-bold">
            Partner drop-off shops
          </h2>
          {listed.length === 0 ? (
            <p className="mt-2 leading-relaxed text-ink-soft">{LOCATIONS.partnerShopsEmptyText}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {listed.map((s) => (
                <li key={`${s.name}-${s.market}`}>
                  <strong>{s.name}</strong>, {s.market}
                  {s.description && <>. {s.description}</>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/sell/shops" className="font-semibold text-brand-600 underline">
              Run a shop? Become a partner
            </Link>
            {" · "}
            <Link href="/what-we-accept" className="font-semibold text-brand-600 underline">
              What we accept
            </Link>
          </p>
        </section>

        <section
          aria-labelledby="route-heading"
          className="rounded-card border border-line bg-surface p-6 lg:col-span-2"
        >
          <Truck className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="route-heading" className="mt-3 text-xl font-bold">
            Pickup route: every {route.days.join(" and ")}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted">{route.status}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-5">
            {stops.map((stop, i) => (
              <li key={`${stop.time}-${stop.name}`} className="rounded-xl bg-sunken p-3">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <Clock className="size-4" aria-hidden="true" />
                  <time>{stop.time}</time>
                </p>
                <p className="mt-1 font-semibold">
                  {i > 0 && i < stops.length - 1 ? `${i}. ` : ""}
                  {stop.name}
                </p>
                <p className="text-sm text-muted">{stop.note}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="recycler-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <Recycle className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="recycler-heading" className="mt-3 text-xl font-bold">
            {recycler.name}
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{recycler.description}</p>
          <p className="mt-3 text-sm">
            <Link href="/where-scrap-goes" className="font-semibold text-brand-600 underline">
              Where scrap goes
            </Link>
          </p>
        </section>

        <section
          aria-labelledby="qr-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <QrCode className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="qr-heading" className="mt-3 text-xl font-bold">
            Awareness drive
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Saw our poster? Scanning its QR code brings you to this page.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/locations/qr" className="font-semibold text-brand-600 underline">
              Print the QR code
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}
