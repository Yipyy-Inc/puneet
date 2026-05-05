"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Calendar,
  CheckCircle,
  ScaleIcon,
  TrendingDown,
  TrendingUp,
  Pencil,
  Save,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ADJUSTMENT_REASON_LABELS } from "@/data/cash-drawer";
import type { RegisterSession, VarianceStatus } from "@/data/cash-drawer";
import { SOURCE_LABELS } from "@/lib/cash-register";

interface Props {
  sessions: RegisterSession[];
  currencySymbol: string;
  onUpdateManagerNote: (sessionId: string, note: string) => void;
}

const STATUS_VISUAL: Record<
  VarianceStatus,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  balanced: {
    label: "Balanced",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    icon: CheckCircle,
  },
  over: {
    label: "Surplus",
    className: "border-amber-300 bg-amber-50 text-amber-700",
    icon: TrendingUp,
  },
  short: {
    label: "Shortfall",
    className: "border-rose-300 bg-rose-50 text-rose-700",
    icon: TrendingDown,
  },
};

export function SessionHistoryList({
  sessions,
  currencySymbol,
  onUpdateManagerNote,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const closed = sessions
    .filter((s) => s.status === "closed")
    .sort((a, b) => b.businessDate.localeCompare(a.businessDate));

  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;
  const fmtSigned = (n: number) =>
    n === 0 ? `±${currencySymbol}0.00` : `${n > 0 ? "+" : "-"}${fmt(n)}`;

  const selected = openId ? closed.find((s) => s.id === openId) ?? null : null;

  const columns: ColumnDef<RegisterSession>[] = [
    {
      key: "businessDate",
      label: "Date",
      icon: Calendar,
      defaultVisible: true,
      sortable: true,
      sortValue: (s) => s.businessDate,
      render: (s) => (
        <div className="text-sm">
          <p className="font-medium">
            {new Date(s.businessDate + "T00:00:00").toLocaleDateString(
              "en-CA",
              { weekday: "short", month: "short", day: "numeric" },
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Locked{" "}
            {s.lockedAt
              ? new Date(s.lockedAt).toLocaleTimeString("en-CA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "openedBy",
      label: "Opened by",
      defaultVisible: true,
      render: (s) => <span className="text-sm">{s.opening.countedBy}</span>,
    },
    {
      key: "floatTotal",
      label: "Float",
      defaultVisible: true,
      render: (s) => (
        <span className="tabular-nums text-sm">
          {fmt(s.opening.floatTotal)}
        </span>
      ),
    },
    {
      key: "cashCaptured",
      label: "Captured",
      defaultVisible: true,
      sortable: true,
      sortValue: (s) => s.cashCaptured,
      render: (s) => (
        <span className="font-medium tabular-nums text-emerald-700">
          {fmt(s.cashCaptured)}
        </span>
      ),
    },
    {
      key: "drawerTotal",
      label: "Drawer count",
      defaultVisible: true,
      render: (s) => (
        <span className="tabular-nums text-sm">
          {s.closing ? fmt(s.closing.drawerTotal) : "—"}
        </span>
      ),
    },
    {
      key: "variance",
      label: "Variance",
      defaultVisible: true,
      render: (s) => {
        if (s.varianceStatus === null || s.variance === null) return "—";
        const v = STATUS_VISUAL[s.varianceStatus];
        const Icon = v.icon;
        return (
          <Badge variant="outline" className={cn("gap-1", v.className)}>
            <Icon className="size-3" />
            {s.varianceStatus === "balanced"
              ? v.label
              : fmtSigned(s.variance)}
          </Badge>
        );
      },
    },
    {
      key: "managerNote",
      label: "Note",
      defaultVisible: true,
      render: (s) => (
        <span className="line-clamp-1 max-w-[180px] text-xs text-muted-foreground">
          {s.managerNote || (s.varianceStatus !== "balanced" ? "Add note…" : "—")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {closed.length} closed session{closed.length === 1 ? "" : "s"}. Click a
        row for the full breakdown — manager notes can be edited even after
        lock.
      </p>
      <DataTable
        data={closed}
        columns={columns}
        itemsPerPage={20}
        onRowClick={(s) => setOpenId(s.id)}
        rowClassName={() => "cursor-pointer"}
      />

      <Sheet
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) {
            setOpenId(null);
            setEditingId(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {new Date(
                    selected.businessDate + "T00:00:00",
                  ).toLocaleDateString("en-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </SheetTitle>
                <SheetDescription>
                  Session opened by {selected.opening.countedBy} ·{" "}
                  {selected.capturedTxns.length} cash txn
                  {selected.capturedTxns.length === 1 ? "" : "s"}
                </SheetDescription>
              </SheetHeader>

              {/* Variance summary */}
              {selected.varianceStatus && selected.variance !== null && (
                <div
                  className={cn(
                    "mt-4 flex items-center justify-between rounded-md border px-4 py-3",
                    STATUS_VISUAL[selected.varianceStatus].className,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ScaleIcon className="size-5" />
                    <div>
                      <p className="text-xs font-semibold uppercase">
                        {STATUS_VISUAL[selected.varianceStatus].label}
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        {selected.varianceStatus === "balanced"
                          ? `±${currencySymbol}0.00`
                          : fmtSigned(selected.variance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Breakdown grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Cell label="Float" value={fmt(selected.opening.floatTotal)} />
                <Cell
                  label="Captured"
                  value={fmt(selected.cashCaptured)}
                  hint={`${selected.capturedTxns.length} txns`}
                />
                <Cell
                  label="Movements"
                  value={fmtSigned(
                    selected.movements.reduce(
                      (s, m) => s + (m.direction === "in" ? m.amount : -m.amount),
                      0,
                    ),
                  )}
                  hint={`${selected.movements.length} entries`}
                />
                <Cell
                  label="Drawer count"
                  value={selected.closing ? fmt(selected.closing.drawerTotal) : "—"}
                />
              </div>

              {/* Cash transactions */}
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cash transactions
                </h4>
                <div className="rounded-md border">
                  {selected.capturedTxns.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No cash transactions captured this day.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {selected.capturedTxns.map((t) => (
                        <li
                          key={t.paymentId}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {t.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.capturedAt).toLocaleTimeString(
                                "en-CA",
                                { hour: "2-digit", minute: "2-digit" },
                              )}{" "}
                              · {t.staffName} · {SOURCE_LABELS[t.source]}
                              {t.bookingId && (
                                <>
                                  {" · "}
                                  <Link
                                    href={`/facility/dashboard/bookings/${t.bookingId}`}
                                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                  >
                                    Booking #{t.bookingId}
                                    <ExternalLink className="size-2.5" />
                                  </Link>
                                </>
                              )}
                            </p>
                          </div>
                          <span className="ml-3 shrink-0 font-semibold tabular-nums text-emerald-700">
                            +{fmt(t.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Movements */}
              {selected.movements.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cash movements
                  </h4>
                  <ul className="space-y-1">
                    {selected.movements.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {ADJUSTMENT_REASON_LABELS[m.reason]}
                          </p>
                          {m.note && (
                            <p className="text-xs text-muted-foreground">
                              {m.note} · {m.staffName}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "tabular-nums font-medium",
                            m.direction === "in"
                              ? "text-emerald-700"
                              : "text-rose-700",
                          )}
                        >
                          {m.direction === "in" ? "+" : "-"}
                          {fmt(m.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Manager note — editable */}
              <div className="mt-5">
                <h4 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Manager note
                  {editingId !== selected.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setEditingId(selected.id);
                        setDraftNote(selected.managerNote);
                      }}
                    >
                      <Pencil className="mr-1 size-3" />
                      Edit
                    </Button>
                  )}
                </h4>
                {editingId === selected.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          onUpdateManagerNote(selected.id, draftNote.trim());
                          setEditingId(null);
                        }}
                      >
                        <Save className="mr-1 size-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-sm italic text-muted-foreground">
                    {selected.managerNote || "No note recorded."}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Cell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
