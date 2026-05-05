"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ScaleIcon,
  Sun,
  Wallet,
  History,
  BarChart3,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { mockRegisterSessions } from "@/data/cash-drawer";
import type {
  CashMovement,
  ClosingCount,
  Currency,
  OpeningCount,
  RegisterSession,
} from "@/data/cash-drawer";
import { payments } from "@/data/payments";
import {
  CAD_DENOMINATIONS,
  USD_DENOMINATIONS,
} from "@/data/cash-drawer";
import {
  classifyVariance,
  computeTrackedTotal,
  getActiveSession,
  liveCashCaptured,
  movementsNet,
} from "@/lib/cash-register";
import { ActiveSessionPanel } from "./ActiveSessionPanel";
import { NoSessionPanel } from "./NoSessionPanel";
import { OpenDayDialog } from "./OpenDayDialog";
import { CashMovementDialog } from "./CashMovementDialog";
import { CloseDayDialog } from "./CloseDayDialog";
import { CashLedgerTable } from "./CashLedgerTable";
import { CashReportsPanel } from "./CashReportsPanel";
import { SessionHistoryList } from "./SessionHistoryList";

interface Props {
  facilityId: number;
  locationId: string;
  locationName: string;
  currency: Currency;
  staffName: string;
  isManager: boolean;
}

export function DailyRegisterClient({
  facilityId,
  locationId,
  currency,
  staffName,
  isManager,
}: Props) {
  const denominations = currency === "CAD" ? CAD_DENOMINATIONS : USD_DENOMINATIONS;
  const symbol = currency === "CAD" ? "CA$" : "$";
  const fmt = (n: number) => `${symbol}${Math.abs(n).toFixed(2)}`;

  const [sessions, setSessions] = useState<RegisterSession[]>(mockRegisterSessions);
  const [tab, setTab] = useState<"today" | "ledger" | "reports" | "history">("today");
  const [showOpen, setShowOpen] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const active = useMemo(
    () => getActiveSession(sessions, facilityId, locationId),
    [sessions, facilityId, locationId],
  );

  const live = useMemo(() => {
    if (!active) return { txns: [], total: 0 };
    return liveCashCaptured(active, payments);
  }, [active]);

  const moveNet = active ? movementsNet(active.movements) : 0;
  const trackedTotal = active
    ? computeTrackedTotal(active.opening.floatTotal, live.total, active.movements)
    : 0;

  // Yesterday's closing total (for the empty state hint and the open dialog)
  const priorClosing = useMemo(() => {
    const closedSorted = sessions
      .filter((s) => s.status === "closed")
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
    return closedSorted[0]?.closing?.drawerTotal;
  }, [sessions]);

  // ---- handlers ----
  const handleOpen = (opening: OpeningCount) => {
    const todayDate = new Date().toISOString().split("T")[0];
    const newSession: RegisterSession = {
      id: `rs-${todayDate}-${Date.now()}`,
      facilityId,
      locationId,
      businessDate: todayDate,
      status: "open",
      opening,
      closing: null,
      movements: [],
      capturedTxns: [],
      cashCaptured: 0,
      trackedTotal: 0,
      variance: null,
      varianceStatus: null,
      managerNote: "",
      lockedAt: null,
    };
    setSessions((prev) => [newSession, ...prev]);
  };

  const handleAddMovement = (m: CashMovement) => {
    if (!active) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id ? { ...s, movements: [...s.movements, m] } : s,
      ),
    );
  };

  const handleRemoveMovement = (id: string) => {
    if (!active) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? { ...s, movements: s.movements.filter((m) => m.id !== id) }
          : s,
      ),
    );
  };

  const handleCloseOut = (closing: ClosingCount, managerNote: string) => {
    if (!active) return;
    const tracked = computeTrackedTotal(
      active.opening.floatTotal,
      live.total,
      active.movements,
    );
    const variance = closing.drawerTotal - tracked;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              status: "closed",
              closing,
              capturedTxns: live.txns,
              cashCaptured: live.total,
              trackedTotal: tracked,
              variance,
              varianceStatus: classifyVariance(variance),
              managerNote,
              lockedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  };

  const handleUpdateManagerNote = (sessionId: string, note: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, managerNote: note } : s)),
    );
  };

  // ---- KPI strip ----
  const kpis = active
    ? [
        {
          label: "Status",
          value: "Open",
          hint: `Since ${new Date(active.opening.countedAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`,
          tone: "emerald" as const,
          icon: Activity,
        },
        {
          label: "Opening float",
          value: fmt(active.opening.floatTotal),
          hint: `By ${active.opening.countedBy}`,
          tone: "amber" as const,
          icon: Sun,
        },
        {
          label: "Cash captured",
          value: fmt(live.total),
          hint: `${live.txns.length} txn${live.txns.length === 1 ? "" : "s"}`,
          tone: "emerald" as const,
          icon: Wallet,
        },
        {
          label: "Movements",
          value: moveNet === 0 ? `±${symbol}0.00` : `${moveNet > 0 ? "+" : "-"}${fmt(moveNet)}`,
          hint: `${active.movements.length} entr${active.movements.length === 1 ? "y" : "ies"}`,
          tone: moveNet < 0 ? ("rose" as const) : ("violet" as const),
          icon: moveNet < 0 ? ArrowUpFromLine : ArrowDownToLine,
        },
        {
          label: "Tracked total",
          value: fmt(trackedTotal),
          hint: "Float + captured + movements",
          tone: "indigo" as const,
          icon: ScaleIcon,
        },
      ]
    : [
        {
          label: "Status",
          value: "Not opened",
          hint: "Start the day to begin",
          tone: "slate" as const,
          icon: Activity,
        },
        {
          label: "Opening float",
          value: "—",
          hint: "Set on open",
          tone: "amber" as const,
          icon: Sun,
        },
        {
          label: "Cash captured",
          value: fmt(0),
          hint: "Awaiting first sale",
          tone: "emerald" as const,
          icon: Wallet,
        },
        {
          label: "Movements",
          value: `±${symbol}0.00`,
          hint: "—",
          tone: "violet" as const,
          icon: ArrowDownToLine,
        },
        {
          label: "Tracked total",
          value: "—",
          hint: "Calculated live",
          tone: "indigo" as const,
          icon: ScaleIcon,
        },
      ];

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <KpiTile
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            tone={k.tone}
            icon={k.icon}
          />
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today" className="gap-2">
            <Activity className="size-4" />
            <span className="hidden sm:inline">Today</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2">
            <ListChecks className="size-4" />
            <span className="hidden sm:inline">Cash Ledger</span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="gap-2"
            disabled={!isManager}
            title={!isManager ? "Manager access required" : undefined}
          >
            {isManager ? (
              <BarChart3 className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            <span className="hidden sm:inline">
              Reports{!isManager && " (manager)"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" />
            <span className="hidden sm:inline">Past Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          {active ? (
            <ActiveSessionPanel
              session={active}
              liveTxns={live.txns}
              liveCashCaptured={live.total}
              currencySymbol={symbol}
              onAddMovement={() => setShowMovement(true)}
              onRemoveMovement={handleRemoveMovement}
              onCloseOut={() => setShowClose(true)}
              onJumpToLedger={() => setTab("ledger")}
            />
          ) : (
            <NoSessionPanel
              onOpen={() => setShowOpen(true)}
              priorClosingTotal={priorClosing}
              currencySymbol={symbol}
            />
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          {active ? (
            <CashLedgerTable txns={live.txns} currencySymbol={symbol} />
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active session. The ledger will start filling once today&apos;s
              register opens.
            </p>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {isManager ? (
            <CashReportsPanel sessions={sessions} currencySymbol={symbol} />
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Reports are restricted to managers.
            </p>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SessionHistoryList
            sessions={sessions}
            currencySymbol={symbol}
            onUpdateManagerNote={handleUpdateManagerNote}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpenDayDialog
        open={showOpen}
        onOpenChange={setShowOpen}
        denominations={denominations}
        currency={currency}
        staffName={staffName}
        priorClosingTotal={priorClosing}
        onSubmit={handleOpen}
      />
      <CashMovementDialog
        open={showMovement}
        onOpenChange={setShowMovement}
        staffName={staffName}
        currency={currency}
        onSubmit={handleAddMovement}
      />
      {active && (
        <CloseDayDialog
          open={showClose}
          onOpenChange={setShowClose}
          session={active}
          liveTxns={live.txns}
          liveCashCaptured={live.total}
          denominations={denominations}
          currency={currency}
          staffName={staffName}
          onSubmit={handleCloseOut}
        />
      )}
    </div>
  );
}
