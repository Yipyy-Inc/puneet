"use client";

import { AlertCircle } from "lucide-react";

interface ChangeRow {
  field: string;
  from?: string | number;
  to: string | number;
}

interface Props {
  title: string;
  changes: ChangeRow[];
  note?: string;
}

/**
 * Read-only confirmation that lists what will change before the manager
 * commits the action. Spec 10.3 requires that any scheduling/booking-changing
 * action shows a confirmation step.
 */
export function ConfirmBeforeModify({ title, changes, note }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertCircle className="size-4" />
        {title}
      </div>

      <ul className="space-y-2 text-sm">
        {changes.map((row, idx) => (
          <li
            key={`${row.field}-${idx}`}
            className="flex flex-wrap items-baseline gap-2"
          >
            <span className="text-muted-foreground w-24 shrink-0 text-xs uppercase tracking-wide">
              {row.field}
            </span>
            {row.from !== undefined && (
              <>
                <span className="text-muted-foreground line-through">
                  {row.from}
                </span>
                <span className="text-muted-foreground">→</span>
              </>
            )}
            <span className="font-semibold">{row.to}</span>
          </li>
        ))}
      </ul>

      {note && (
        <p className="border-t border-amber-200 pt-2 text-xs text-amber-900">
          {note}
        </p>
      )}
    </div>
  );
}
