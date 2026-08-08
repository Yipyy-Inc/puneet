"use client";

import { useState } from "react";
import { Smartphone, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { terminalName, type TerminalOption } from "@/lib/api/terminals";

// ============================================================================
// Which box is going to light up.
//
// Terminals at a facility are interchangeable — several exist so a queue can be
// served in parallel, not because they do different things. So this is not a
// configuration screen: it names the device this station reaches for, and gets
// out of the way.
//
// ── ONE LINE UNTIL IT IS WRONG ────────────────────────────────────────────
//
// The ordinary case is one terminal, or the same one as last time. That is a
// sentence, not a dropdown. The list only appears when somebody says the
// sentence is wrong — which during a rush is exactly when another lane is
// already busy.
//
// ── PRESENTATIONAL ────────────────────────────────────────────────────────
//
// It owns nothing. The choice comes from useResolvedTerminal() in the parent,
// because an earlier cut had this component report its resolved terminal upward
// through a callback — which meant calling the parent's setter during render,
// the thing React warns about. Passing the answer down is simply correct.
// ============================================================================

export function TerminalPicker({
  terminals,
  chosen,
  onChoose,
  isPending,
  problem,
}: {
  terminals: TerminalOption[];
  chosen: TerminalOption | null;
  onChoose: (serial: string) => void;
  isPending: boolean;
  /** The last attempt's failure — "that terminal is busy", typically. */
  problem?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (isPending) {
    return (
      <p className="text-muted-foreground text-xs">Finding your terminals…</p>
    );
  }

  if (terminals.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>
          No card terminal is connected to this facility, so this payment cannot
          be taken on one.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
        <span className="flex items-center gap-2 text-sm">
          <Smartphone className="text-muted-foreground size-4" />
          {chosen ? terminalName(chosen) : "No terminal"}
        </span>
        {terminals.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            className="text-primary text-xs font-medium hover:underline"
          >
            {open ? "Keep this one" : "Use a different terminal"}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-1">
          {terminals.map((terminal) => (
            <button
              key={terminal.serial}
              type="button"
              onClick={() => {
                onChoose(terminal.serial);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all",
                terminal.serial === chosen?.serial
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40",
              )}
            >
              <span>{terminalName(terminal)}</span>
              <span className="text-muted-foreground text-[10px]">
                {terminal.isDefault ? "default" : terminal.model}
              </span>
            </button>
          ))}
          <p className="text-muted-foreground text-[11px]/relaxed">
            This till will keep using whichever you pick.
          </p>
        </div>
      )}

      {problem && (
        <p className="text-destructive text-xs" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
