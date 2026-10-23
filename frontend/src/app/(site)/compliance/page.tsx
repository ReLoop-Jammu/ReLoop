import type { Metadata } from "next";
import Link from "next/link";
import { StandardPage } from "@/components/marketing/StandardPage";
import { LOCATIONS } from "@/config/locations";

export const metadata: Metadata = {
  title: "Compliance and partners",
  description:
    "The E-Waste (Management) Rules, 2022 in plain words, and VRRG Group, our licensed recycler.",
};

export default function CompliancePage() {
  return (
    <StandardPage
      eyebrow="Compliance and partners"
      title="The rules, and who we work with"
      lead="ReLoop buys, tests and resells used phones, laptops, computers, monitors and parts in Jammu. What cannot be reused is handed to our licensed recycler by weight. ReLoop itself does not dismantle or process e-waste."
      sections={[
        {
          title: "The E-Waste (Management) Rules, 2022, in plain words",
          body: (
            <>
              <p>
                India&apos;s E-Waste Rules say that electronic waste must end up with a dismantler
                or recycler registered with the Central Pollution Control Board, and that producers
                are responsible for collecting back what they sell. Informal burning or acid
                stripping of e-waste is what the rules exist to stop.
              </p>
              <p>
                The official text and the registered-channel lists are on the{" "}
                <a
                  href="https://www.eprewaste.cpcb.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-600 underline"
                >
                  CPCB E-Waste portal
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
            </>
          ),
        },
        {
          title: "Our licensed recycler",
          body: (
            <p>
              Our licensed recycler: VRRG Group, Gangyal, a JKPCC-authorised e-waste dismantler.
              Every kilo of scrap and every battery goes to them on a weight receipt. Our standard
              is 100% of scrap to VRRG Group on a weight receipt; each handover is in the{" "}
              <Link href="/ledger" className="font-semibold text-brand-600 underline">
                list of scrap sent for recycling
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Where it happens",
          body: (
            <p>
              The hub is in Gandhi Nagar, Jammu; VRRG Group is at Gangyal. Both are on the{" "}
              <Link href="/locations" className="font-semibold text-brand-600 underline">
                locations map
              </Link>{" "}
              ({LOCATIONS.recycler.name}).
            </p>
          ),
        },
      ]}
    />
  );
}
