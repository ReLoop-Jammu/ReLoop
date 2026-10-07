"use client";

import { useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { BuyEstimator, type EstimateResult } from "./BuyEstimator";
import { RequestForm } from "./RequestForm";

/** Estimator, then a drop-off request prefilled with the estimate. */
export function HouseholdSell() {
  const [picked, setPicked] = useState<EstimateResult | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <BuyEstimator
        onBook={(r) => {
          setPicked(r);
          requestAnimationFrame(() =>
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }}
      />
      <div ref={formRef} className="mt-12 scroll-mt-28">
        <h2 className="text-2xl font-bold sm:text-3xl">Book a drop-off</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Bring it to our hub{SITE.hubAddress ? ` at ${SITE.hubAddress}` : ""} or to a partner
          repair shop. The hub opens in {SITE.hubOpens}; we&apos;ll confirm a time with you.
        </p>
        <div className="mt-6">
          <RequestForm
            key={picked ? `${picked.category}-${picked.model}` : "blank"}
            kind="household_dropoff"
            title="Household drop-off"
            submitLabel="Prepare my request"
            initial={
              picked
                ? { item: `${picked.category} ${picked.model}`.trim(), estimate: picked.summary }
                : {}
            }
            fields={[
              { name: "name", label: "Your name", required: true, autoComplete: "name" },
              {
                name: "phone",
                label: "Phone / WhatsApp",
                type: "tel",
                required: true,
                autoComplete: "tel",
              },
              {
                name: "item",
                label: "Item(s)",
                required: true,
                placeholder: "e.g. Phone Redmi Note 10, old charger",
              },
              {
                name: "estimate",
                label: "Estimate shown",
                hint: "Filled in from the estimator above, if you used it.",
              },
              { name: "area", label: "Your area in Jammu", placeholder: "e.g. Gandhi Nagar" },
              { name: "notes", label: "Anything else we should know?", type: "textarea" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
