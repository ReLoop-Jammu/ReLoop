import { Clock, MapPin, QrCode, Recycle, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LOCATIONS, visiblePartnerShops } from "@/config/locations";
import { getSiteSettings } from "@/features/settings/server";
import { LocationsMap } from "@/features/locations/LocationsMap";
import { mapPartnerShops } from "@/features/locations/partners";

/** Partner shops come from the database; refresh the page at most every 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Map & locations",
  description:
    "Where ReLoop works in Jammu: the hub in Gandhi Nagar, partner shops on our route, the Tuesday and Friday pickup routes and VRRG Group, our dismantling partner.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const { hub, routes, recycler } = LOCATIONS;
  const site = await getSiteSettings();
  // On the map: verified partner shops that agreed to be on the map.
  const shops = [...visiblePartnerShops(), ...(await mapPartnerShops())];

  return (
    <Container className="py-12 sm:py-20">
      <SectionHeading
        as="h1"
        eyebrow={<Eyebrow>Map & locations</Eyebrow>}
        title="Where ReLoop works in Jammu"
        description={`One hub in Gandhi Nagar, two weekly pickup routes through the repair markets, and one dismantling partner. The hub opens in ${site.hubOpens}; locations are approximate until then.`}
      />

      {/* The map's tiles are the page's largest paint: connect to the tile server early. */}
      <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="anonymous" />
      <LocationsMap partnerShops={shops} />
      <p className="mt-2 text-xs text-muted">
        Shaded areas are approximate. Map data © OpenStreetMap contributors.
      </p>

      <p className="mt-6 max-w-3xl rounded-card border border-line bg-sunken p-4 text-ink-soft">
        We buy from shops, retailers and institutions only, not from homes. Anyone can buy from us.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="hub-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <MapPin className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="hub-heading" className="mt-3 text-xl font-bold">
            Hub (buyer pickups)
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{site.hubAddress ?? hub.description}</p>
          <p className="mt-2 text-sm text-muted">Opening {site.hubOpens}.</p>
        </section>

        <section
          aria-labelledby="shops-heading"
          className="rounded-card border border-line bg-surface p-6"
        >
          <Store className="size-6 text-brand-600" aria-hidden="true" />
          <h2 id="shops-heading" className="mt-3 text-xl font-bold">
            Partner shops on our route
          </h2>
          {shops.length === 0 ? (
            <p className="mt-2 leading-relaxed text-ink-soft">{LOCATIONS.partnerShopsEmptyText}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shops.map((s) => (
                <li key={`${s.name}-${s.market}`}>
                  <strong>{s.name}</strong>, {s.market}
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

        {routes.map((route) => (
          <section
            key={route.day}
            aria-labelledby={`route-${route.day}`}
            className="rounded-card border border-line bg-surface p-6 lg:col-span-2"
          >
            <Truck className="size-6 text-brand-600" aria-hidden="true" />
            <h2 id={`route-${route.day}`} className="mt-3 text-xl font-bold">
              {route.day}: {route.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted">
              {route.markets.join(" and ")} · {route.status}
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-4">
              {route.stops.map((stop, i) => (
                <li key={`${stop.time}-${stop.name}`} className="rounded-xl bg-sunken p-3">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <Clock className="size-4" aria-hidden="true" />
                    <time>{stop.time}</time>
                  </p>
                  <p className="mt-1 font-semibold">
                    {i > 0 && i < route.stops.length - 1 ? `${i}. ` : ""}
                    {stop.name}
                  </p>
                  <p className="text-sm text-muted">{stop.note}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className="text-sm text-muted lg:col-span-2">
          After the pilot we add more Jammu markets, not other cities:{" "}
          {LOCATIONS.nextMarkets.join(", ")}.
        </p>

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
