"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Moon, ScaleIcon, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { DenominationInput } from "./DenominationInput";
import {
  classifyVariance,
  computeTrackedTotal,
  movementsNet,
} from "@/lib/cash-register";
import type {
  CapturedCashTxn,
  ClosingCount,
  Currency,
  Denomination,
  DenominationCount,
  RegisterSession,
} from "@/data/cash-drawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: RegisterSession;
  liveTxns: CapturedCashTxn[];
  liveCashCaptured: number;
  denominations: Denomination[];
  currency: Currency;
  staffName: string;
  onSubmit: (closing: ClosingCount, managerNote: string) => void;
}

type Step = "count" | "review";

export function CloseDayDialog({
  open,
  onOpenChange,
  session,
  liveTxns,
  liveCashCaptured,
  denominations,
  currency,
  staffName,
  onSubmit,
}: Props) {
  const symbol = currency === "CAD" ? "CA$" : "$";
  const [step, setStep] = useState<Step>("count");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [closingNote, setClosingNote] = useState("");
  const [managerNote, setManagerNote] = useState("");

  const drawerTotal = useMemo(
    () =>
      denominations.reduce((s, d) => s + d.value * (counts[d.id] ?? 0), 0),
    [denominations, counts],
  );

  const moveNet = movementsNet(session.movements);
  const trackedTotal = computeTrackedTotal(
    session.opening.floatTotal,
    liveCashCaptured,
    session.movements,
  );
  const variance = drawerTotal - trackedTotal;
  const status = classifyVariance(variance);

  const reset = () => {
    setStep("count");
    setCounts({});
    setClosingNote("");
    setManagerNote("");
  };

  const submit = () => {
    const denominationCounts: DenominationCount[] = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([denominationId, count]) => ({ denominationId, count }));
    const closing: ClosingCount = {
      countedAt: new Date().toISOString(),
      countedBy: staffName,
      denominationCounts,
      drawerTotal,
      note: closingNote.trim(),
    };
    onSubmit(closing, managerNote.trim());
    reset();
    onOpenChange(false);
  };

  const fmtAbs = (n: number) => `${symbol}${Math.abs(n).toFixed(2)}`;
  const fmtSigned = (n: number) =>
    n === 0 ? `±${symbol}0.00` : `${n > 0 ? "+" : "-"}${fmtAbs(n)}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="size-5 text-indigo-500" />
            Close Out Today&apos;s Register
          </DialogTitle>
          <DialogDescription>
            {step === "count" ? (
              <>Count every coin and bill in the drawer right now. We&apos;ll
              compare your count to what the system tracked through the day.</>
            ) : (
              <>Review the breakdown. Locking confirms today&apos;s session is
              done — only the manager note can change after.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "count" && (
          <div className="space-y-4">
            <DenominationInput
              denominations={denominations}
              counts={counts}
              onChange={(id, c) => setCounts((p) => ({ ...p, [id]: c }))}
              currencySymbol={symbol}
            />
            <div className="flex items-center justify-between rounded-md border bg-indigo-50/60 px-3 py-2.5">
              <span className="text-sm font-medium flex items-center gap-2">
                <Coins className="size-4 text-indigo-500" />
                Drawer count
              </span>
              <span className="text-lg font-bold tabular-nums text-indigo-700">
                {symbol}
                {drawerTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="close-note" className="text-xs">
                Closing note (optional)
              </Label>
              <Textarea
                id="close-note"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="Anything the next staff should know."
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            {/* Variance bar — top, full width, single row */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border-2 px-4 py-3",
                status === "balanced" && "border-emerald-300 bg-emerald-50",
                status === "over" && "border-amber-300 bg-amber-50",
                status === "short" && "border-rose-300 bg-rose-50",
              )}
            >
              <div className="flex items-center gap-2">
                <ScaleIcon
                  className={cn(
                    "size-5",
                    status === "balanced" && "text-emerald-600",
                    status === "over" && "text-amber-600",
                    status === "short" && "text-rose-600",
                  )}
                />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Variance
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      status === "balanced" && "text-emerald-700",
                      status === "over" && "text-amber-700",
                      status === "short" && "text-rose-700",
                    )}
                  >
                    {fmtSigned(variance)}
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "text-xs uppercase",
                  status === "balanced" && "bg-emerald-600",
                  status === "over" && "bg-amber-500",
                  status === "short" && "bg-rose-600",
                )}
              >
                {status === "balanced"
                  ? "Balanced"
                  : status === "over"
                    ? "Surplus"
                    : "Shortfall"}
              </Badge>
            </div>

            {/* Stacked breakdown row — float + captured + movements − count = variance */}
            <div className="rounded-md border">
              <div className="grid grid-cols-1 divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                <BreakdownCell
                  label="Opening float"
                  value={fmtAbs(session.opening.floatTotal)}
                />
                <BreakdownCell
                  label="Cash captured"
                  value={fmtAbs(liveCashCaptured)}
                  hint={`${liveTxns.length} txn${liveTxns.length === 1 ? "" : "s"}`}
                />
                <BreakdownCell
                  label="Movements net"
                  value={fmtSigned(moveNet)}
                  hint={`${session.movements.length} entr${session.movements.length === 1 ? "y" : "ies"}`}
                />
                <BreakdownCell
                  label="Drawer count"
                  value={fmtAbs(drawerTotal)}
                  highlight
                />
                <BreakdownCell
                  label="Tracked total"
                  value={fmtAbs(trackedTotal)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Drawer count − Tracked total = Variance · {fmtAbs(drawerTotal)} −{" "}
              {fmtAbs(trackedTotal)} = {fmtSigned(variance)}
            </p>

            {status !== "balanced" && (
              <div className="space-y-1.5">
                <Label htmlFor="manager-note" className="text-xs">
                  Manager note (recommended for non-zero variance)
                </Label>
                <Textarea
                  id="manager-note"
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  placeholder="Why is the drawer off? What should be checked?"
                  className="min-h-[70px] resize-none"
                />
              </div>
            )}

            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Locking this session prevents further changes — only the manager
              note can be edited later.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "count" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={drawerTotal <= 0}
              >
                Review variance
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("count")}>
                Back to count
              </Button>
              <Button onClick={submit}>
                <Lock className="mr-2 size-4" />
                Close Out &amp; Lock
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BreakdownCell({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-3 py-2.5",
        highlight && "bg-indigo-50/60",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
      {hint && (
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}
