import type { ReactNode } from "react";

/**
 * One numbered part of the add-on editor — the same heading the boarding and
 * daycare service editors use, so the three read as one product.
 */
export function AddOnSection({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold text-(--ink-heading)">
          {index} · {title}
        </h3>
        {hint ? (
          <p className="text-muted-foreground text-[13.5px]">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A switch or choice laid out as a card: its label, a hint, and the control. */
export function AddOnChoiceCard({
  title,
  hint,
  control,
}: {
  title: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="bg-card flex items-center justify-between gap-4 rounded-2xl border border-(--line) px-4 py-3">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{title}</p>
        {hint ? (
          <p className="text-muted-foreground text-[13.5px]">{hint}</p>
        ) : null}
      </div>
      {control}
    </div>
  );
}
