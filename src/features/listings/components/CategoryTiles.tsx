import Link from "next/link";
import { CATEGORIES } from "../model";

export function CategoryTiles() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="list">
      {CATEGORIES.map((c) => (
        <li key={c.value}>
          <Link
            href={`/listings?category=${c.value}`}
            className="rounded-card border-line bg-surface hover:border-primary/50 hover:shadow-card flex h-full flex-col border p-4 transition duration-300 hover:-translate-y-1"
          >
            <span className="text-3xl" aria-hidden="true">
              {c.emoji}
            </span>
            <strong className="text-primary-strong mt-3">{c.label}</strong>
            <small className="text-muted mt-1">{c.blurb}</small>
          </Link>
        </li>
      ))}
    </ul>
  );
}
