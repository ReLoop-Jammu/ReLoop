"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/money";
import { RequestForm } from "./RequestForm";
import { WhatsAppButton } from "./WhatsAppButton";

type Props = {
  itemId: string;
  title: string;
  pricePaise: number;
  sample?: boolean;
};

/**
 * "Reserve this item" or "Ask a question": saves the request for hub staff,
 * then hands off to ReLoop on WhatsApp or email.
 */
export function ReserveItem({ itemId, title, pricePaise, sample }: Props) {
  const [mode, setMode] = useState<"reserve" | "ask" | null>(null);
  if (sample) {
    return (
      <p className="mt-8 rounded-card border border-line bg-sunken p-5 text-sm leading-relaxed text-ink-soft">
        This is a sample item to show how stock will look. Real items can be reserved once the hub
        opens.
      </p>
    );
  }
  if (!mode) {
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => setMode("reserve")}>
          Reserve this item
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => setMode("ask")}
        >
          Ask a question
        </Button>
        <WhatsAppButton
          className="w-full sm:w-auto"
          message={`Hi ReLoop, I'm interested in ${itemId} ${title}`}
        />
      </div>
    );
  }
  const item = `${itemId}: ${title} (${formatPrice(pricePaise)})`;
  const contact = [
    { name: "name", label: "Your name", required: true, autoComplete: "name" },
    {
      name: "phone",
      label: "Phone / WhatsApp",
      type: "tel" as const,
      required: true,
      autoComplete: "tel",
    },
  ];
  return (
    <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft">
      {mode === "reserve" ? (
        <RequestForm
          kind="reservation"
          itemId={itemId}
          title={`Reserve ${itemId}`}
          submitLabel="Prepare my reservation"
          initial={{ item }}
          fields={[
            { name: "item", label: "Item", required: true, full: true },
            ...contact,
            {
              name: "fulfilment",
              label: "How do you want it?",
              type: "select",
              required: true,
              options: ["Pick up from the hub (free)", "Delivery in Jammu city (₹50)"],
              full: true,
            },
          ]}
        />
      ) : (
        <RequestForm
          kind="enquiry"
          itemId={itemId}
          title={`Question about ${itemId}`}
          submitLabel="Prepare my question"
          initial={{ item }}
          fields={[
            { name: "item", label: "Item", required: true, full: true },
            ...contact,
            {
              name: "question",
              label: "Your question",
              type: "textarea",
              required: true,
              full: true,
            },
          ]}
        />
      )}
    </div>
  );
}
