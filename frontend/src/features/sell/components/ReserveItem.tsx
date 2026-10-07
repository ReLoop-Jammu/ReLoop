"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/money";
import { RequestForm } from "./RequestForm";

type Props = {
  itemId: string;
  title: string;
  pricePaise: number;
  shipsIndia: boolean;
  sample?: boolean;
};

/** "Reserve this item": collects contact and delivery choice, then hands off to ReLoop. */
export function ReserveItem({ itemId, title, pricePaise, shipsIndia, sample }: Props) {
  const [open, setOpen] = useState(false);
  if (sample) {
    return (
      <p className="mt-8 rounded-card border border-line bg-sunken p-5 text-sm leading-relaxed text-ink-soft">
        This is a sample item to show how stock will look. Real items can be reserved once the hub
        opens.
      </p>
    );
  }
  if (!open) {
    return (
      <Button size="lg" className="mt-8 w-full sm:w-auto" onClick={() => setOpen(true)}>
        Reserve this item
      </Button>
    );
  }
  return (
    <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft">
      <RequestForm
        kind="reservation"
        title={`Reserve ${itemId}`}
        submitLabel="Prepare my reservation"
        initial={{ item: `${itemId}: ${title} (${formatPrice(pricePaise)})` }}
        fields={[
          { name: "item", label: "Item", required: true, full: true },
          { name: "name", label: "Your name", required: true, autoComplete: "name" },
          {
            name: "phone",
            label: "Phone / WhatsApp",
            type: "tel",
            required: true,
            autoComplete: "tel",
          },
          {
            name: "fulfilment",
            label: "How do you want it?",
            type: "select",
            required: true,
            options: [
              "Pick up from the hub (free)",
              "Delivery in Jammu (₹50)",
              ...(shipsIndia ? ["Ship outside Jammu (you pay shipping)"] : []),
            ],
            full: true,
          },
        ]}
      />
    </div>
  );
}
