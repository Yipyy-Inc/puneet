"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wallet,
  Plus,
  Trash2,
  RefreshCw,
  History,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lock,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Info,
  User,
  CalendarRange,
} from "lucide-react";
import {
  CAD_DENOMINATIONS,
  USD_DENOMINATIONS,
  ADJUSTMENT_REASON_LABELS,
  mockDrawerSessions,
} from "@/data/cash-drawer";
import type {
  Currency,
  CashAdjustment,
  AdjustmentReason,
  DrawerSession,
  ReconcileStatus,
} from "@/data/cash-drawer";
import { DenominationInput } from "./DenominationInput";
import { DrawerHistorySheet } from "./DrawerHistorySheet";

interface Props {
  facilityId: number;
  locationId: string;
  currency: Currency;
  locationName: string;
  staffName: string;
  /** Mock: cash sales total from POS for today */
  reportedCashSales: number;
}

type Step = "setup" | "count" | "reconcile" | "done";

export function CashDrawerClient({
  facilityId,
  locationId,
  currency,
  locationName,
  staffName,
  reportedCashSales,
}: Props) {
  const denominations =
    currency === "CAD" ? CAD_DENOMINATIONS : USD_DENOMINATIONS;
  const currencySymbol = currency === "CAD" ? "CA$" : "$";
  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;

  // --- State ---
  const [step, setStep] = useState<Step>("setup");
  const [startBalance, setStartBalance] = useState<number>(300.0);
  const [denomCounts, setDenomCounts] = useState<Record<string, number>>({});
  const [adjustments, setAdjustments] = useState<CashAdjustment[]>([]);
  const [reconcileComment, setReconcileComment] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<DrawerSession[]>(mockDrawerSessions);

  // Date range (for filtering reported total)
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState<string>(todayStr);
  const [dateTo, setDateTo] = useState<string>(todayStr);

  // Reported total with refresh simulation
  const [reportedTotal, setReportedTotal] = useState<number>(reportedCashSales);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit start balance modal
  const [showEditStart, setShowEditStart] = useState(false);
  const [editStartInput, setEditStartInput] = useState<string>("");

  // Add adjustment modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjAmount, setAdjAmount] = useState<string>("");
  const [adjDirection, setAdjDirection] = useState<"in" | "out">("out");
  const [adjReason, setAdjReason] = useState<AdjustmentReason>("tip_payout");
  const [adjNote, setAdjNote] = useState<string>("");

  // --- Calculations ---
  const adjustmentTotal = useMemo(
    () =>
      adjustments.reduce(
        (sum, a) => sum + (a.direction === "in" ? a.amount : -a.amount),
        0,
      ),
    [adjustments],
  );

  const expectedTotal = startBalance + reportedTotal + adjustmentTotal;

  const countedTotal = useMemo(
    () =>
      denominations.reduce(
        (sum, d) => sum + d.value * (denomCounts[d.id] ?? 0),
        0,
      ),
    [denominations, denomCounts],
  );

  const difference = countedTotal - expectedTotal;

  const reconcileStatus: ReconcileStatus =
    Math.abs(difference) < 0.005
      ? "balanced"
      : difference > 0
        ? "over"
        : "short";

  const statusConfig = {
    balanced: {
      label: "Balanced",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      badge: "default" as const,
    },
    over: {
      label: `Over  ${fmt(difference)}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      badge: "default" as const,
    },
    short: {
      label: `Short  ${fmt(difference)}`,
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-red-50 border-red-200",
      badge: "destructive" as const,
    },
  };

  // --- Handlers ---
  const handleRefreshReported = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate a fresh pull — same value in mock
      setReportedTotal(reportedCashSales);
      setIsRefreshing(false);
    }, 800);
  };

  const handleSaveStartBalance = () => {
    const val = parseFloat(editStartInput);
    if (!isNaN(val) && val >= 0) setStartBalance(val);
    setShowEditStart(false);
  };

  const handleAddAdjustment = () => {
    const amt = parseFloat(adjAmount);
    if (isNaN(amt) || amt <= 0) return;
    const newAdj: CashAdjustment = {
      id: `adj-${Date.now()}`,
      direction: adjDirection,
      amount: amt,
      reason: adjReason,
      note: adjNote.trim(),
      createdAt: new Date().toISOString(),
      staffName,
    };
    setAdjustments((prev) => [...prev, newAdj]);
    setAdjAmount("");
    setAdjNote("");
    setAdjDirection("out");
    setAdjReason("tip_payout");
    setShowAdjModal(false);
  };

  const handleRemoveAdjustment = (id: string) => {
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReconcile = () => {
    const session: DrawerSession = {
      id: `ds-${Date.now()}`,
      date: todayStr,
      sessionType: "close",
      locationId,
      facilityId,
      staffName,
      startBalance,
      reportedTotal,
      adjustments,
      denominationCounts: Object.entries(denomCounts).map(
        ([denominationId, count]) => ({ denominationId, count }),
      ),
      countedTotal,
      expectedTotal,
      difference,
      status: reconcileStatus,
      comment: reconcileComment,
      reconciledAt: new Date().toISOString(),
      isReconciled: true,
    };
    setSessions((prev) => [session, ...prev]);
    setStep("done");
    setShowConfirm(false);
  };

  const cfg = statusConfig[reconcileStatus];
  const StatusIcon = cfg.icon;

  // --- Shared header row shown on every step ---
  const PageHeader = ({ title }: { title: string }) => (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {/* Date range + staff row — mirrors competitor layout */}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CalendarRange className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Date range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded border px-2 py-0.5 text-sm tabular-nums"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded border px-2 py-0.5 text-sm tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <User className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Staff:</span>
            <span className="font-medium">{staffName}</span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
        <History className="mr-2 size-4" />
        View History
      </Button>
    </div>
  );

  // --- Step: Setup ---
  if (step === "setup") {
    return (
      <div className="space-y-6">
        <PageHeader title="Cash Drawer Balance" />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Set Starting Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Count the cash in the drawer at the start of the day and enter the
              total below. This becomes the baseline for today&apos;s
              reconciliation.
            </p>
            <div className="flex items-center gap-3">
              <Label htmlFor="start-balance" className="shrink-0">
                Opening Cash ({currency})
              </Label>
              <div className="relative max-w-[180px]">
                <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                  {currencySymbol}
                </span>
                <Input
                  id="start-balance"
                  type="number"
                  min={0}
                  step={0.01}
                  value={startBalance}
                  onChange={(e) =>
                    setStartBalance(parseFloat(e.target.value) || 0)
                  }
                  className="pl-10 tabular-nums"
                  placeholder="300.00"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Last closing balance
                </span>
                <span className="tabular-nums font-medium">
                  {sessions[0] ? fmt(sessions[0].countedTotal) : "—"}
                </span>
              </div>
              {sessions[0] && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last reconciled</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(sessions[0].date).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={() => setStep("count")}
        >
          Continue to Count Cash
        </Button>

        <DrawerHistorySheet
          open={showHistory}
          onOpenChange={setShowHistory}
          sessions={sessions}
          currencySymbol={currencySymbol}
          locationName={locationName}
        />
      </div>
    );
  }

  // --- Step: Count + Adjustments ---
  if (step === "count") {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="space-y-6">
          <PageHeader title="Cash Drawer Balance" />

          {/* Expected total panel */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Expected total */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  Expected Total
                  <span className="text-primary tabular-nums text-base font-bold ml-auto">
                    {fmt(expectedTotal)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {/* Start balance row — editable */}
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">Start balance</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">
                      {fmt(startBalance)}
                    </span>
                    <button
                      onClick={() => {
                        setEditStartInput(startBalance.toFixed(2));
                        setShowEditStart(true);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Edit start balance"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reported total row — with refresh + tooltip */}
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Reported total</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        The total cash amount recorded from completed payments in
                        the POS for the selected date range. Click refresh to
                        pull the latest data.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">
                      {fmt(reportedTotal)}
                    </span>
                    <button
                      onClick={handleRefreshReported}
                      disabled={isRefreshing}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      aria-label="Refresh reported total"
                    >
                      <RefreshCw
                        className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Cash adjustments row — expandable with add button */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Cash adjustment
                      {adjustments.length > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({adjustments.length} record{adjustments.length !== 1 ? "s" : ""})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`tabular-nums font-medium ${
                          adjustmentTotal < 0
                            ? "text-destructive"
                            : adjustmentTotal > 0
                              ? "text-green-600"
                              : ""
                        }`}
                      >
                        {adjustmentTotal >= 0 ? "+" : ""}
                        {fmt(adjustmentTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Adjustment list */}
                  {adjustments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {adjustments.map((adj) => (
                        <div
                          key={adj.id}
                          className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {adj.direction === "in" ? (
                              <ArrowDownCircle className="size-3 shrink-0 text-green-600" />
                            ) : (
                              <ArrowUpCircle className="size-3 shrink-0 text-destructive" />
                            )}
                            <span className="text-muted-foreground truncate">
                              {ADJUSTMENT_REASON_LABELS[adj.reason]}
                              {adj.note && ` — ${adj.note}`}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 pl-2">
                            <span
                              className={`tabular-nums font-medium ${
                                adj.direction === "out"
                                  ? "text-destructive"
                                  : "text-green-600"
                              }`}
                            >
                              {adj.direction === "out" ? "-" : "+"}
                              {fmt(adj.amount)}
                            </span>
                            <button
                              onClick={() => handleRemoveAdjustment(adj.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowAdjModal(true)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="size-3" />
                    Add cash adjustment
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Counted total */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  Counted Total
                  <span className="text-primary tabular-nums text-base font-bold ml-auto">
                    {fmt(countedTotal)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DenominationInput
                  denominations={denominations}
                  counts={denomCounts}
                  onChange={(id, count) =>
                    setDenomCounts((prev) => ({ ...prev, [id]: count }))
                  }
                  currencySymbol={currencySymbol}
                />
              </CardContent>
            </Card>
          </div>

          {/* Difference bar */}
          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${cfg.bg}`}
          >
            <div className="flex items-center gap-2">
              <StatusIcon className={`size-5 ${cfg.color}`} />
              <span className={`font-semibold ${cfg.color}`}>
                Difference
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`tabular-nums text-lg font-bold ${cfg.color}`}>
                {difference === 0
                  ? "±$0.00"
                  : `${difference > 0 ? "+" : "-"}${fmt(difference)}`}
              </span>
              {reconcileStatus !== "balanced" && (
                <Badge variant={cfg.badge} className="text-xs">
                  {reconcileStatus === "short" ? "Short" : "Over"}
                </Badge>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comment (optional)</Label>
            <Textarea
              value={reconcileComment}
              onChange={(e) => setReconcileComment(e.target.value)}
              placeholder="Note any discrepancies or observations..."
              className="min-h-[70px] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("setup")}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowConfirm(true)}
            >
              <Lock className="mr-2 size-4" />
              Reconcile
            </Button>
          </div>

          {/* Edit start balance modal */}
          <Dialog open={showEditStart} onOpenChange={setShowEditStart}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit start balance</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="relative">
                  <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editStartInput}
                    onChange={(e) => setEditStartInput(e.target.value)}
                    className="pl-10 tabular-nums"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Please enter the new start balance amount.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowEditStart(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveStartBalance}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add adjustment modal */}
          <Dialog open={showAdjModal} onOpenChange={setShowAdjModal}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add cash adjustment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">
                      {new Date().toLocaleDateString("en-CA", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Staff</p>
                    <p className="font-medium">{staffName}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-4">
                    {(["in", "out"] as const).map((dir) => (
                      <label
                        key={dir}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="adj-direction"
                          value={dir}
                          checked={adjDirection === dir}
                          onChange={() => setAdjDirection(dir)}
                          className="accent-primary"
                        />
                        {dir === "in" ? (
                          <span className="flex items-center gap-1">
                            <ArrowDownCircle className="size-3.5 text-green-600" />
                            In
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ArrowUpCircle className="size-3.5 text-destructive" />
                            Out
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Reason
                  </Label>
                  <Select
                    value={adjReason}
                    onValueChange={(v) => setAdjReason(v as AdjustmentReason)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADJUSTMENT_REASON_LABELS).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Enter amount"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className="pl-10 tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Comment</Label>
                  <Textarea
                    placeholder="Enter comment"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    className="min-h-[70px] resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAdjModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAdjustment}
                  disabled={!adjAmount || parseFloat(adjAmount) <= 0}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reconcile confirm dialog */}
          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reconcile cash drawer?</AlertDialogTitle>
                <AlertDialogDescription>
                  Once reconciled, you cannot make any modifications, or
                  reconcile again for the rest of the day.
                  {reconcileStatus !== "balanced" && (
                    <span className="mt-2 block font-medium text-amber-700">
                      You are reconciling with a{" "}
                      {reconcileStatus === "over" ? "surplus" : "shortfall"} of{" "}
                      {fmt(difference)}.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReconcile}>
                  Reconcile
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DrawerHistorySheet
            open={showHistory}
            onOpenChange={setShowHistory}
            sessions={sessions}
            currencySymbol={currencySymbol}
            locationName={locationName}
          />
        </div>
      </TooltipProvider>
    );
  }

  // --- Step: Reconcile (kept for back-compat flow) redirects straight to done ---
  if (step === "reconcile") {
    handleReconcile();
    return null;
  }

  // --- Step: Done ---
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
      <CheckCircle className="size-16 text-green-500" />
      <div>
        <h3 className="text-xl font-bold">Drawer Reconciled</h3>
        <p className="text-muted-foreground mt-1">
          Today&apos;s session has been locked and saved to history.
        </p>
      </div>

      <div className={`w-full max-w-sm rounded-lg border-2 p-4 ${cfg.bg}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Final Status</span>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`size-4 ${cfg.color}`} />
            <Badge variant={cfg.badge}>
              {reconcileStatus === "balanced"
                ? "Balanced"
                : reconcileStatus === "over"
                  ? "Over"
                  : "Short"}
            </Badge>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expected</span>
            <span className="tabular-nums font-medium">{fmt(expectedTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Counted</span>
            <span className="tabular-nums font-medium">{fmt(countedTotal)}</span>
          </div>
          <div
            className={`flex justify-between font-semibold ${cfg.color}`}
          >
            <span>Difference</span>
            <span className="tabular-nums">
              {difference === 0
                ? "±0.00"
                : `${difference > 0 ? "+" : ""}${difference.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setShowHistory(true)}>
          <History className="mr-2 size-4" />
          View History
        </Button>
        <Button
          onClick={() => {
            setStep("setup");
            setDenomCounts({});
            setAdjustments([]);
            setReconcileComment("");
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          New Session
        </Button>
      </div>

      <DrawerHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        sessions={sessions}
        currencySymbol={currencySymbol}
        locationName={locationName}
      />
    </div>
  );
}
