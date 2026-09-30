import type { ReactNode } from "react";

type Props = { title: string; description: string; action: ReactNode };

export function CtaBanner({ title, description, action }: Props) {
  return (
    <div className="rounded-panel from-primary to-primary-strong flex flex-col items-start justify-between gap-6 bg-gradient-to-br p-7 text-white sm:flex-row sm:items-center sm:p-10">
      <div>
        <h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-xl text-white/80">{description}</p>
      </div>
      {action}
    </div>
  );
}
