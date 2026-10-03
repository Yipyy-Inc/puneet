import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// The booking details mocks' card, once: white, a cool hairline, 24px corners
// and a breath of shadow; a header of small capitals over a soft rule, with
// an action or a count at its end; rows of label and value under soft rules.
// Every card on the page is this, so they cannot drift apart.
// ============================================================================

export function DetailsCard({
  className,
  children,
  ...rest
}: {
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<"section">, "className" | "children">) {
  return (
    <section
      className={cn(
        "bg-card border-line overflow-hidden rounded-[24px] border shadow-(--bd-sh-card)",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/** The card's title row: small capitals, an optional dot, and its action. */
export function DetailsCardHeader({
  title,
  dot,
  children,
  className,
  titleId,
}: {
  title: ReactNode;
  /** The mock's 8px dot before Feeding plan and Medications. */
  dot?: "feeding" | "meds";
  children?: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <div
      className={cn(
        "border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4",
        className,
      )}
    >
      <h2 id={titleId} className="flex min-w-0 items-center gap-2">
        {dot ? (
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              dot === "feeding" ? "bg-(--bd-feed-dot)" : "bg-(--bd-meds-dot)",
            )}
          />
        ) : null}
        <span className="text-ink-secondary text-[13px] font-semibold tracking-[0.08em] uppercase">
          {title}
        </span>
      </h2>
      {children}
    </div>
  );
}

/** The quiet count or note at a card header's end ("4 items · 0 returned"). */
export function DetailsCardNote({ children }: { children: ReactNode }) {
  return <span className="text-ink-tertiary text-[13px]">{children}</span>;
}

/** One label and its value, under a soft rule (the Stay card's rows). */
export function DetailsRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-line-soft flex justify-between gap-4 border-b py-[9px] text-[14px]">
      <dt className="text-ink-tertiary">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}
