"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ============================================================================
// One card of the Feeding & medications page, as the client's design frames
// each: a title and a line of help, something on the right (a count, a
// switch), and — while the card differs from its defaults — a strip saying so
// with "Reset to default". The strip is white with a hairline, never a tint
// (§6 rule 2); the glyph and the words carry it.
// ============================================================================

export function SetupCard({
  id,
  title,
  help,
  aside,
  changed,
  changedNote,
  resetLabel,
  onReset,
  children,
}: {
  /** The anchor the page's jump nav scrolls to. */
  id: string;
  title: string;
  help: string;
  aside?: React.ReactNode;
  changed: boolean;
  changedNote: string;
  resetLabel: string;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-36 gap-0 overflow-hidden py-0"
    >
      {changed ? (
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-6">
          <p className="text-meta text-ink-secondary flex min-w-0 items-start gap-2">
            <RotateCcw className="mt-0.5 size-4 shrink-0" aria-hidden />
            {changedNote}
          </p>
          <Button type="button" variant="outline" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-section text-heading">
            {title}
          </h2>
          <p className="text-meta text-ink-tertiary">{help}</p>
        </div>
        {aside}
      </div>
      {children ? <div className="border-line border-t">{children}</div> : null}
    </Card>
  );
}

/** One row of a card: a hairline above, the card's side padding. */
export function SetupRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-line flex min-w-0 flex-wrap items-center gap-3 border-t px-5 py-3.5 first:border-t-0 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}

/** The neutral "10 of 11 on" chip a card's header carries. */
export function CountChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-line text-meta text-ink-secondary shrink-0 rounded-full border px-3 py-1 font-semibold tabular-nums">
      {children}
    </span>
  );
}
