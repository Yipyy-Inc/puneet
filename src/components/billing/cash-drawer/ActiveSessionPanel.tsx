"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Plus,
  Trash2,
  Clock,
  User,
} from "lucide-react";
import { ADJUSTMENT_REASON_LABELS } from "@/data/cash-drawer";
import type {
  CapturedCashTxn,
  CashMovement,
  RegisterSession,
} from "@/data/cash-drawer";
import { SOURCE_LABELS } from "@/lib/cash-register";

interface Props {
  session: RegisterSession;
  liveTxns: CapturedCashTxn[];
  liveCashCaptured: number;
  currencySymbol: string;
  onAddMovement: () => void;
  onRemoveMovement: (id: string) => void;
  onCloseOut: () => void;
  onJumpToLedger: () => void;
}

export function ActiveSessionPanel({
  session,
  liveTxns,
  liveCashCaptured,
  currencySymbol,
  onAddMovement,
  onRemoveMovement,
  onCloseOut,
  onJumpToLedger,
}: Props) {
  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;
  const movements = session.movements;
  const recentTxns = liveTxns.slice(0, 5);
  const openedAt = new Date(session.opening.countedAt);

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-emerald-300 bg-emerald-50/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="font-semibold text-emerald-900">
              Register is open
            </p>
            <p className="flex items-center gap-3 text-xs text-emerald-700">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                Opened{" "}
                {openedAt.toLocaleTimeString("en-CA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3" />
                {session.opening.countedBy}
              </span>
            </p>
          </div>
        </div>
        <Button onClick={onCloseOut}>
          <Lock className="mr-2 size-4" />
          Close Out &amp; Lock
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Captured cash */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Cash captured this session
            </CardTitle>
            <Badge variant="outline" className="tabular-nums">
              {fmt(liveCashCaptured)} · {liveTxns.length} txn
              {liveTxns.length === 1 ? "" : "s"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {recentTxns.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No cash payments yet. They&apos;ll appear here the moment a
                cash sale completes.
              </p>
            )}
            {recentTxns.map((t) => (
              <div
                key={t.paymentId}
                className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.capturedAt).toLocaleTimeString("en-CA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {t.staffName} · {SOURCE_LABELS[t.source]}
                  </p>
                </div>
                <span className="ml-3 shrink-0 font-semibold tabular-nums text-emerald-700">
                  +{fmt(t.amount)}
                </span>
              </div>
            ))}
            {liveTxns.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onJumpToLedger}
              >
                View all {liveTxns.length} in Cash Ledger →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Cash movements
            </CardTitle>
            <Button size="sm" variant="outline" onClick={onAddMovement}>
              <Plus className="mr-1 size-3.5" />
              Record
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {movements.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No movements yet. Use this for tip-outs, safe drops, petty cash.
              </p>
            )}
            {movements.map((m: CashMovement) => (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-sm border px-2.5 py-1.5 text-sm"
              >
                {m.direction === "in" ? (
                  <ArrowDownToLine className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpFromLine className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {ADJUSTMENT_REASON_LABELS[m.reason]}
                  </p>
                  {m.note && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {m.note}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-2 shrink-0 text-xs font-semibold tabular-nums ${m.direction === "in" ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {m.direction === "in" ? "+" : "-"}
                  {fmt(m.amount)}
                </span>
                <button
                  onClick={() => onRemoveMovement(m.id)}
                  className="text-muted-foreground transition-colors hover:text-rose-600"
                  aria-label="Remove movement"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
