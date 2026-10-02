import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// One white card of the Confirm step (the client's mock, 2026-10-01): an
// uppercase label, something on the right of it, and its rows. Cards are
// white on the warm ground and 24px round (§1); the label is the micro step.
// ============================================================================

export function ConfirmCard({
  label,
  aside,
  id,
  children,
  className,
  flush = false,
}: {
  label?: string;
  /** Right of the label: a count, a chip. */
  aside?: ReactNode;
  id?: string;
  children: ReactNode;
  className?: string;
  /** The label sits above a hairline and the body has its own padding. */
  flush?: boolean;
}) {
  return (
    <section
      aria-labelledby={label && id ? id : undefined}
      className={cn(
        "border-line bg-card overflow-hidden rounded-2xl border",
        className,
      )}
    >
      {label ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-5",
            flush ? "border-line border-b py-4" : "pt-4",
          )}
        >
          <h3 id={id} className="text-micro text-ink-secondary uppercase">
            {label}
          </h3>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}
