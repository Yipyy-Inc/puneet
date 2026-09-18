"use client";

import { useState } from "react";
import { Smartphone, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { terminalName, type TerminalOption } from "@/lib/api/terminals";
import { useStaffText } from "@/lib/staff/use-staff-text";

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
  const { t } = useStaffText("terminalPicker");

  if (isPending) {
    return <p className="text-ink-secondary text-sm">{t("finding")}</p>;
  }

  if (terminals.length === 0) {
    return (
      <div className="border-warning text-body-ink flex items-start gap-2 rounded-2xl border p-3 text-sm">
        <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
        <span>{t("none")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border-line flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2">
        <span className="flex items-center gap-2 text-sm">
          <Smartphone className="text-ink-tertiary size-4" />
          {chosen ? terminalName(chosen) : t("noTerminal")}
        </span>
        {terminals.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            className="text-primary min-h-10 text-sm font-semibold hover:underline"
          >
            {open ? t("keepThis") : t("useAnother")}
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
                // Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
                "border-line flex min-h-10 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm",
                terminal.serial === chosen?.serial &&
                  "border-primary shadow-[inset_0_0_0_2px_var(--primary)]",
              )}
              aria-pressed={terminal.serial === chosen?.serial}
            >
              <span>{terminalName(terminal)}</span>
              <span className="text-ink-tertiary text-xs">
                {terminal.isDefault ? t("default") : terminal.model}
              </span>
            </button>
          ))}
          <p className="text-ink-tertiary text-xs/relaxed">{t("sticky")}</p>
        </div>
      )}

      {problem && (
        <p className="text-destructive text-sm" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
