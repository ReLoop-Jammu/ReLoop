import Form from "next/form";

export function HeaderSearch({ className }: { className?: string }) {
  return (
    <Form
      action="/listings"
      role="search"
      aria-label="Search the marketplace"
      className={className}
    >
      <div className="border-line bg-sunken flex items-center gap-2 rounded-xl border py-1 pr-1 pl-3">
        <span aria-hidden="true" className="text-muted">
          ⌕
        </span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search listings</span>
          <input
            type="search"
            name="q"
            placeholder="Search laptops, circuit boards, components…"
            maxLength={100}
            className="text-ink placeholder:text-muted w-full bg-transparent py-2 text-base focus:outline-none sm:text-sm"
          />
        </label>
        <button
          type="submit"
          className="bg-primary hover:bg-primary-hover rounded-lg px-3.5 py-2 text-sm font-bold text-white"
        >
          Search
        </button>
      </div>
    </Form>
  );
}
