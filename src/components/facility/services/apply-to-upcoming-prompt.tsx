"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ApplyToUpcomingChange {
  label: string;
  from?: string | number;
  to?: string | number;
  description?: string;
}

export interface ApplyToUpcomingAffected {
  id: string;
  primary: string;
  secondary?: string;
  date?: string;
}

interface ApplyToUpcomingPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceKind: string;
  changes: ApplyToUpcomingChange[];
  affected: ApplyToUpcomingAffected[];
  onApply: () => void;
  onSkip: () => void;
  footerNote?: string;
}

export function ApplyToUpcomingPrompt({
  open,
  onOpenChange,
  serviceName,
  serviceKind,
  changes,
  affected,
  onApply,
  onSkip,
  footerNote,
}: ApplyToUpcomingPromptProps) {
  const count = affected.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Apply to upcoming appointments?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1 text-sm">
          <p>
            <strong>
              {count} upcoming unconfirmed{" "}
              {count === 1 ? "appointment uses" : "appointments use"}
            </strong>{" "}
            this {serviceKind} (<span className="font-medium">{serviceName}</span>
            ). Do you want to apply the change{changes.length === 1 ? "" : "s"} to{" "}
            {count === 1 ? "this booking" : "all of them"}?
          </p>

          {changes.length > 0 && (
            <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              {changes.map((c, i) => (
                <p key={i}>
                  <span className="font-medium">{c.label}:</span>{" "}
                  {c.from !== undefined && c.to !== undefined ? (
                    <>
                      <span className="text-muted-foreground line-through">
                        {c.from}
                      </span>{" "}
                      →{" "}
                      <span className="font-semibold text-sky-700 dark:text-sky-300">
                        {c.to}
                      </span>
                    </>
                  ) : (
                    <span>{c.description ?? "updated"}</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {count > 0 && (
            <details className="rounded-md border bg-card px-3 py-2 text-xs">
              <summary className="cursor-pointer font-medium">
                Show affected appointments ({count})
              </summary>
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
                {affected.slice(0, 50).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2"
                  >
                    {a.date && (
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {a.date}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{a.primary}</span>
                    {a.secondary && (
                      <span className="shrink-0 text-muted-foreground">
                        {a.secondary}
                      </span>
                    )}
                  </li>
                ))}
                {count > 50 && (
                  <li className="text-[10px] text-muted-foreground italic">
                    + {count - 50} more
                  </li>
                )}
              </ul>
            </details>
          )}

          <p className="text-[11px] text-muted-foreground">
            {footerNote ??
              "Only scheduled appointments dated today or later are affected. Checked-in, completed, cancelled, and no-show bookings are left untouched."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            No, new bookings only
          </Button>
          <Button
            onClick={onApply}
            className="bg-sky-600 text-white hover:bg-sky-700"
          >
            Apply to {count} appointment{count === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
