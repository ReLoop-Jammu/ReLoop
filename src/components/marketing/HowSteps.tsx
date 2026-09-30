const STEPS = [
  {
    title: "Submit inventory details",
    body: "Businesses, collection partners and individuals share item details with ReLoop for review, verification and inventory intake.",
  },
  {
    title: "ReLoop verifies items",
    body: "ReLoop reviews condition, testing status, quantity and location. Verified partners can publish directly; other listings are checked first.",
  },
  {
    title: "Buy through ReLoop",
    body: "Buyers send inquiries through ReLoop, which coordinates availability, payment and delivery.",
  },
] as const;

export function HowSteps() {
  return (
    <ol className="grid gap-4 md:grid-cols-3" role="list">
      {STEPS.map((step, i) => (
        <li key={step.title} className="rounded-card border-line bg-surface border p-6">
          <span className="text-accent-strong text-sm font-black">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-2 text-lg font-extrabold">{step.title}</h3>
          <p className="text-muted mt-2 text-sm leading-relaxed">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
