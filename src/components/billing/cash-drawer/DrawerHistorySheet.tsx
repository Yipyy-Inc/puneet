"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import type { DrawerSession } from "@/data/cash-drawer";
import { ADJUSTMENT_REASON_LABELS } from "@/data/cash-drawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: DrawerSession[];
  currencySymbol: string;
  locationName: string;
}

const STATUS_CONFIG = {
  balanced: {
    label: "Balanced",
    icon: CheckCircle,
    className: "text-green-600",
    badgeVariant: "default" as const,
  },
  over: {
    label: "Over",
    icon: TrendingUp,
    className: "text-amber-600",
    badgeVariant: "secondary" as const,
  },
  short: {
    label: "Short",
    icon: TrendingDown,
    className: "text-destructive",
    badgeVariant: "destructive" as const,
  },
};

const PAGE_SIZE = 10;

export function DrawerHistorySheet({
  open,
  onOpenChange,
  sessions,
  currencySymbol,
  locationName,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [page, setPage] = useState(0);

  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Flat list of all adjustments across sessions, sorted newest first
  const allAdjustments = sorted.flatMap((s) =>
    s.adjustments.map((adj) => ({ ...adj, sessionDate: s.date, staffName: s.staffName })),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setPage(0);
      }}
    >
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Cash drawer history of {locationName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="reconcile">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="reconcile" className="flex-1">
              Reconcile history
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="flex-1">
              Cash adjustment
            </TabsTrigger>
          </TabsList>

          {/* ── Reconcile history tab ── */}
          <TabsContent value="reconcile" className="space-y-4">
            {sorted.length === 0 && (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No reconciled sessions yet.
              </p>
            )}

            {paginated.map((session) => {
              const cfg = STATUS_CONFIG[session.status];
              const Icon = cfg.icon;
              const isEditing = editingId === session.id;
              const adjTotal = session.adjustments.reduce(
                (sum, a) => sum + (a.direction === "in" ? a.amount : -a.amount),
                0,
              );

              return (
                <div key={session.id} className="rounded-lg border p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{formatDate(session.date)}</p>
                      <p className="text-muted-foreground text-xs">
                        {session.staffName} · reconciled{" "}
                        {session.reconciledAt
                          ? formatDateTime(session.reconciledAt)
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className={`size-4 ${cfg.className}`} />
                      <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Start Balance</p>
                      <p className="font-medium tabular-nums">
                        {fmt(session.startBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Reported Cash</p>
                      <p className="font-medium tabular-nums">
                        {fmt(session.reportedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Adjustments</p>
                      <p
                        className={`font-medium tabular-nums ${adjTotal < 0 ? "text-destructive" : "text-green-600"}`}
                      >
                        {adjTotal >= 0 ? "+" : "-"}
                        {fmt(adjTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Expected</p>
                      <p className="font-medium tabular-nums">
                        {fmt(session.expectedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Counted</p>
                      <p className="font-medium tabular-nums">
                        {fmt(session.countedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Difference</p>
                      <p
                        className={`font-semibold tabular-nums ${
                          session.difference === 0
                            ? "text-green-600"
                            : session.difference > 0
                              ? "text-amber-600"
                              : "text-destructive"
                        }`}
                      >
                        {session.difference === 0
                          ? "±"
                          : session.difference > 0
                            ? "+"
                            : "-"}
                        {fmt(session.difference)}
                      </p>
                    </div>
                  </div>

                  {/* Adjustments detail */}
                  {session.adjustments.length > 0 && (
                    <div className="rounded-md bg-muted/40 p-3 space-y-1">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                        Adjustments
                      </p>
                      {session.adjustments.map((adj) => (
                        <div
                          key={adj.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {ADJUSTMENT_REASON_LABELS[adj.reason]}
                            {adj.note && ` — ${adj.note}`}
                          </span>
                          <span
                            className={`tabular-nums font-medium ${adj.direction === "out" ? "text-destructive" : "text-green-600"}`}
                          >
                            {adj.direction === "out" ? "-" : "+"}
                            {fmt(adj.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="min-h-[60px] resize-none text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            <Save className="mr-1.5 size-3.5" />
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
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-muted-foreground text-sm italic">
                          {session.comment || "No comment."}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 shrink-0 px-2"
                          onClick={() => {
                            setEditingId(session.id);
                            setEditComment(session.comment);
                          }}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Cash adjustment tab ── */}
          <TabsContent value="adjustments" className="space-y-3">
            {allAdjustments.length === 0 && (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No cash adjustments recorded yet.
              </p>
            )}

            {allAdjustments.map((adj) => (
              <div
                key={adj.id}
                className="flex items-start justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {adj.direction === "in" ? (
                    <ArrowDownCircle className="mt-0.5 size-4 shrink-0 text-green-600" />
                  ) : (
                    <ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {ADJUSTMENT_REASON_LABELS[adj.reason]}
                    </p>
                    {adj.note && (
                      <p className="text-muted-foreground text-xs truncate">
                        {adj.note}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {formatDate(adj.sessionDate)} · {adj.staffName}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 pl-4 tabular-nums font-semibold ${
                    adj.direction === "out" ? "text-destructive" : "text-green-600"
                  }`}
                >
                  {adj.direction === "out" ? "-" : "+"}
                  {fmt(adj.amount)}
                </span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
