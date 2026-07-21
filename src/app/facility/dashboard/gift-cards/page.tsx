"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Gift,
  Plus,
  Wallet,
  TrendingUp,
  Package,
  BarChart3,
  Download,
  Search,
  Smartphone,
  QrCode,
  ShieldCheck,
  Settings,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  FileDown,
  Upload,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  CalendarX,
  MoreHorizontal,
  Send,
  Ban,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Pencil,
  Archive,
  List,
} from "lucide-react";
import {
  giftCards,
  customerWallets,
  physicalCardBatches,
  giftCardAuditLogs,
  giftCardSettings,
} from "@/data/gift-cards";
import { clients } from "@/data/clients";
import { SellGiftCardModal } from "./_components/SellGiftCardModal";
import { RedeemGiftCardModal } from "./_components/RedeemGiftCardModal";
import { GiftCardDetailSheet } from "./_components/GiftCardDetailSheet";
import { GiftCardSettingsPanel } from "./_components/GiftCardSettingsPanel";
import { GiftCardReportsTab } from "./_components/GiftCardReportsTab";
import { PhysicalCardsTile } from "./_components/PhysicalCardsTile";
import { CheckBalanceModal } from "./_components/CheckBalanceModal";
import { WalletAdjustModal } from "./_components/WalletAdjustModal";
import { BatchCardsModal } from "./_components/BatchCardsModal";
import {
  GenerateBatchModal,
  type GenerateBatchConfig,
} from "./_components/GenerateBatchModal";
import {
  GiftCardDateRangeFilter,
  presetRange,
  isWithinRange,
  type DateRange,
} from "./_components/GiftCardDateRangeFilter";
import type {
  GiftCard,
  GiftCardAuditLog,
  GiftCardTransaction,
  CustomerWallet,
  WalletTransaction,
  PhysicalCardBatch,
  PhysicalCard,
} from "@/types/payments";

const FACILITY_ID = 11;

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  redeemed: "secondary",
  expired: "destructive",
  cancelled: "destructive",
};

// Recent Activity feed filters — `actions: null` means "show everything".
const ACTIVITY_FILTERS: {
  key: "all" | "issued" | "redeemed" | "voided" | "expired";
  label: string;
  actions: string[] | null;
}[] = [
  { key: "all", label: "All", actions: null },
  {
    key: "issued",
    label: "Issued",
    actions: ["issued_digital", "issued_physical", "activated"],
  },
  {
    key: "redeemed",
    label: "Redeemed",
    actions: ["redeemed_to_wallet", "wallet_used"],
  },
  { key: "voided", label: "Voided", actions: ["voided", "refunded"] },
  { key: "expired", label: "Expired", actions: ["expired"] },
];

type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]["key"];

export default function FacilityGiftCardsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [sellMode, setSellMode] = useState<"digital" | "physical" | null>(null);
  // Pre-fill amount when launching Sell Digital as a void replacement.
  const [replacementAmount, setReplacementAmount] = useState<number | null>(
    null,
  );
  const [showRedeem, setShowRedeem] = useState(false);
  const [showCheckBalance, setShowCheckBalance] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [cardFilterValues, setCardFilterValues] = useState<
    Record<string, string>
  >({ status: "all", type: "all" });
  const [walletSearch, setWalletSearch] = useState("");
  const [walletSort, setWalletSort] = useState<
    "balance_desc" | "balance_asc" | "recent" | "alpha"
  >("balance_desc");
  const [expandedWalletIds, setExpandedWalletIds] = useState<Set<string>>(
    new Set(),
  );
  const [adjustWallet, setAdjustWallet] = useState<CustomerWallet | null>(null);
  // Session balance overrides + synthetic adjustment history (Adjust Balance modal).
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>(
    {},
  );
  const [walletAdjustments, setWalletAdjustments] = useState<
    Record<string, WalletTransaction[]>
  >({});
  // Session balance overrides + synthetic transactions from wallet redemptions.
  const [cardBalances, setCardBalances] = useState<Record<string, number>>({});
  const [cardExtraTx, setCardExtraTx] = useState<
    Record<string, GiftCardTransaction[]>
  >({});
  // Wallets created on the fly when redeeming to a customer who had none.
  const [sessionWallets, setSessionWallets] = useState<CustomerWallet[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string | number>>(
    new Set(),
  );
  // Cards pending a void confirmation — used by both the row menu and the bulk bar.
  const [voidTargets, setVoidTargets] = useState<GiftCard[] | null>(null);
  // Batch session state: renamed names, archived ids, and modal targets.
  const [batchNames, setBatchNames] = useState<Record<string, string>>({});
  const [archivedBatchIds, setArchivedBatchIds] = useState<Set<string>>(
    new Set(),
  );
  const [renameBatchTarget, setRenameBatchTarget] =
    useState<PhysicalCardBatch | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [archiveBatchTarget, setArchiveBatchTarget] =
    useState<PhysicalCardBatch | null>(null);
  const [viewCardsBatch, setViewCardsBatch] =
    useState<PhysicalCardBatch | null>(null);
  // Generate New Batch wizard.
  const [sessionBatches, setSessionBatches] = useState<PhysicalCardBatch[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [highlightedWalletId, setHighlightedWalletId] = useState<string | null>(
    null,
  );
  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(
    null,
  );
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  // Date range for the KPI row — defaults to the current month.
  const [range, setRange] = useState<DateRange>(() => presetRange("month"));

  const facilityCards = useMemo(
    () =>
      giftCards
        .filter((gc) => gc.facilityId === FACILITY_ID)
        .map((gc) => {
          const balanceOverride = cardBalances[gc.id];
          const extra = cardExtraTx[gc.id];
          if (balanceOverride == null && !extra) return gc;
          return {
            ...gc,
            currentBalance: balanceOverride ?? gc.currentBalance,
            transactionHistory: extra
              ? [...gc.transactionHistory, ...extra]
              : gc.transactionHistory,
          };
        }),
    [cardBalances, cardExtraTx],
  );

  const facilityWallets = useMemo(
    () => [
      ...customerWallets.filter((w) => w.facilityId === FACILITY_ID),
      ...sessionWallets,
    ],
    [sessionWallets],
  );

  const facilityBatches = useMemo(
    () => physicalCardBatches.filter((b) => b.facilityId === FACILITY_ID),
    [],
  );

  const facilityAuditLogs = useMemo(
    () => giftCardAuditLogs.filter((l) => l.facilityId === FACILITY_ID),
    [],
  );

  // All activity, newest first — used by the Activity tab and the overview feed.
  const activityLog = useMemo(
    () =>
      [...facilityAuditLogs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [facilityAuditLogs],
  );

  // Overview feed, narrowed to the selected filter chip.
  const filteredActivity = useMemo(() => {
    const cfg = ACTIVITY_FILTERS.find((f) => f.key === activityFilter);
    if (!cfg?.actions) return activityLog;
    return activityLog.filter((l) => cfg.actions!.includes(l.action));
  }, [activityLog, activityFilter]);

  // Cards sold within the selected date range — drives the period-scoped KPIs.
  const periodCards = useMemo(
    () => facilityCards.filter((gc) => isWithinRange(gc.purchaseDate, range)),
    [facilityCards, range],
  );

  // KPIs — Liability & Revenue Sold are period-scoped (cards sold in range);
  // Wallet Balance & Physical Inventory are point-in-time snapshots.
  const totalLiability = useMemo(
    () =>
      periodCards
        .filter((gc) => gc.status === "active")
        .reduce((sum, gc) => sum + gc.currentBalance, 0),
    [periodCards],
  );

  const totalWalletBalance = useMemo(
    () => facilityWallets.reduce((sum, w) => sum + w.balance, 0),
    [facilityWallets],
  );

  const totalSold = useMemo(
    () => periodCards.reduce((sum, gc) => sum + gc.initialAmount, 0),
    [periodCards],
  );

  const activeCards = periodCards.filter((gc) => gc.status === "active").length;

  // Seed + session-generated batches; archived ones drop out of the active view.
  const allBatches = useMemo(
    () => [...facilityBatches, ...sessionBatches],
    [facilityBatches, sessionBatches],
  );
  const displayedBatches = useMemo(
    () => allBatches.filter((b) => !archivedBatchIds.has(b.id)),
    [allBatches, archivedBatchIds],
  );

  const physicalInventory = useMemo(() => {
    const allCards = displayedBatches.flatMap((b) => b.cards);
    const inactive = allCards.filter((c) => c.status === "inactive").length;
    const active = allCards.filter(
      (c) => c.status === "active" || c.status === "sold",
    ).length;
    return { total: allCards.length, inactive, active };
  }, [displayedBatches]);

  const batchName = (b: PhysicalCardBatch) => batchNames[b.id] ?? b.name;

  // Low-stock threshold for the Physical Cards tile (configurable in Settings).
  const lowStockThreshold =
    giftCardSettings.find((s) => s.facilityId === FACILITY_ID)
      ?.lowStockThreshold ?? 50;

  type AuditTarget =
    | { kind: "card"; id: string; label: string }
    | { kind: "wallet"; id: string; label: string }
    | { kind: "batch"; id: string; label: string }
    | { kind: "client"; id: number; label: string }
    | null;

  const resolveAuditTarget = (log: GiftCardAuditLog): AuditTarget => {
    if (log.giftCardId) {
      const card = facilityCards.find((c) => c.id === log.giftCardId);
      return {
        kind: "card",
        id: log.giftCardId,
        label: card ? `Gift Card ****${card.code.slice(-4)}` : "Gift Card",
      };
    }
    if (log.walletId) {
      const wallet = facilityWallets.find((w) => w.id === log.walletId);
      const client = wallet
        ? clients.find((c) => c.id === wallet.clientId)
        : null;
      return {
        kind: "wallet",
        id: log.walletId,
        label: client ? `${client.name}'s Wallet` : "Wallet",
      };
    }
    if (log.batchId) {
      const batch = facilityBatches.find((b) => b.id === log.batchId);
      return {
        kind: "batch",
        id: log.batchId,
        label: batch ? batch.name : "Batch",
      };
    }
    if (log.clientId != null) {
      return {
        kind: "client",
        id: log.clientId,
        label: log.clientName ?? "Client",
      };
    }
    return null;
  };

  const traceAuditLog = (log: GiftCardAuditLog) => {
    const target = resolveAuditTarget(log);
    if (!target) return;
    if (target.kind === "card") {
      const card = facilityCards.find((c) => c.id === target.id);
      if (card) setSelectedCard(card);
      return;
    }
    if (target.kind === "wallet") {
      setActiveTab("wallets");
      setHighlightedWalletId(target.id);
      return;
    }
    if (target.kind === "batch") {
      setActiveTab("inventory");
      setHighlightedBatchId(target.id);
      return;
    }
    if (target.kind === "client") {
      router.push(`/facility/dashboard/clients/${target.id}`);
    }
  };

  // Scroll the highlighted entity into view, then clear the highlight after a moment.
  useEffect(() => {
    if (!highlightedWalletId) return;
    const el = document.getElementById(`wallet-${highlightedWalletId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightedWalletId(null), 2400);
    return () => clearTimeout(t);
  }, [highlightedWalletId]);

  useEffect(() => {
    if (!highlightedBatchId) return;
    const el = document.getElementById(`batch-${highlightedBatchId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightedBatchId(null), 2400);
    return () => clearTimeout(t);
  }, [highlightedBatchId]);

  // Filtered cards — page owns search + status + type so the export reflects
  // exactly what's on screen.
  const cardFiltersActive =
    cardSearchQuery.trim() !== "" ||
    Object.values(cardFilterValues).some((v) => v !== "all");

  const filteredCards = useMemo(() => {
    const q = cardSearchQuery.trim().toLowerCase();
    return facilityCards.filter((gc) => {
      if (
        q &&
        !(
          gc.code.toLowerCase().includes(q) ||
          gc.purchasedBy?.toLowerCase().includes(q) ||
          gc.recipientName?.toLowerCase().includes(q) ||
          gc.recipientEmail?.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (
        cardFilterValues.status !== "all" &&
        gc.status !== cardFilterValues.status
      ) {
        return false;
      }
      if (
        cardFilterValues.type !== "all" &&
        gc.type !== cardFilterValues.type
      ) {
        return false;
      }
      return true;
    });
  }, [facilityCards, cardSearchQuery, cardFilterValues]);

  const selectedCards = useMemo(
    () => facilityCards.filter((gc) => selectedCardIds.has(gc.id)),
    [facilityCards, selectedCardIds],
  );

  // Wallets tab: resolve client + effective balance, filter by name/email, then sort.
  const displayedWallets = useMemo(() => {
    const q = walletSearch.trim().toLowerCase();
    const withClient = facilityWallets.map((wallet) => ({
      wallet,
      client: clients.find((c) => c.id === wallet.clientId),
      balance: walletBalances[wallet.id] ?? wallet.balance,
    }));
    const filtered = q
      ? withClient.filter(
          ({ client }) =>
            client?.name.toLowerCase().includes(q) ||
            client?.email?.toLowerCase().includes(q),
        )
      : withClient;
    return [...filtered].sort((a, b) => {
      switch (walletSort) {
        case "balance_desc":
          return b.balance - a.balance;
        case "balance_asc":
          return a.balance - b.balance;
        case "recent":
          return (
            new Date(b.wallet.updatedAt).getTime() -
            new Date(a.wallet.updatedAt).getTime()
          );
        case "alpha":
          return (a.client?.name ?? "").localeCompare(b.client?.name ?? "");
      }
    });
  }, [facilityWallets, walletSearch, walletSort, walletBalances]);

  const toggleWalletHistory = (id: string) =>
    setExpandedWalletIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Table columns
  const cardColumns: ColumnDef<GiftCard>[] = [
    {
      key: "code",
      label: "Card #",
      defaultVisible: true,
      render: (gc) => (
        <div className="flex items-center gap-2">
          {gc.type === "online" ? (
            <Smartphone className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <QrCode className="text-muted-foreground size-4 shrink-0" />
          )}
          <div className="leading-tight">
            <span className="font-mono text-xs font-medium">
              ****{gc.code.slice(-4)}
            </span>
            <p className="text-muted-foreground text-[11px] capitalize">
              {gc.type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "currentBalance",
      label: "Balance",
      defaultVisible: true,
      render: (gc) => (
        <span
          className={`price-value font-semibold ${
            gc.currentBalance === 0 ? "text-muted-foreground" : "text-green-600"
          }`}
        >
          ${gc.currentBalance.toFixed(2)}
        </span>
      ),
    },
    {
      key: "initialAmount",
      label: "Initial",
      defaultVisible: true,
      render: (gc) => (
        <span className="price-value text-sm">
          ${gc.initialAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "purchasedBy",
      label: "Purchaser",
      defaultVisible: true,
      render: (gc) =>
        gc.purchasedBy ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "recipientName",
      label: "Recipient",
      defaultVisible: true,
      render: (gc) =>
        gc.recipientName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (gc) => (
        <Badge
          variant={statusVariant[gc.status] ?? "secondary"}
          className="text-xs capitalize"
        >
          {gc.status}
        </Badge>
      ),
    },
    {
      key: "purchaseDate",
      label: "Issued",
      defaultVisible: true,
      render: (gc) => (
        <span className="text-sm">{formatDate(gc.purchaseDate)}</span>
      ),
    },
    {
      key: "lastUsedAt",
      label: "Last Used",
      defaultVisible: true,
      render: (gc) =>
        gc.lastUsedAt ? (
          <span className="text-sm">{formatDate(gc.lastUsedAt)}</span>
        ) : (
          <span className="text-muted-foreground text-sm italic">Never</span>
        ),
    },
  ];

  const cardFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "redeemed", label: "Redeemed" },
        { value: "expired", label: "Expired" },
        { value: "cancelled", label: "Voided" },
      ],
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "online", label: "Digital" },
        { value: "physical", label: "Physical" },
      ],
    },
  ];

  const auditColumns: ColumnDef<GiftCardAuditLog>[] = [
    {
      key: "timestamp",
      label: "Date",
      defaultVisible: true,
      render: (l) => (
        <span className="text-sm">{formatDateTime(l.timestamp)}</span>
      ),
    },
    {
      key: "action",
      label: "Action",
      defaultVisible: true,
      render: (l) => {
        const actionMap: Record<
          string,
          { icon: typeof Gift; color: string; label: string }
        > = {
          issued_digital: {
            icon: Gift,
            color: "text-green-600",
            label: "Issued (Digital)",
          },
          issued_physical: {
            icon: QrCode,
            color: "text-blue-600",
            label: "Issued (Physical)",
          },
          redeemed_to_wallet: {
            icon: Wallet,
            color: "text-violet-600",
            label: "Redeemed → Wallet",
          },
          wallet_used: {
            icon: ArrowDownRight,
            color: "text-amber-600",
            label: "Wallet Used",
          },
          voided: {
            icon: AlertTriangle,
            color: "text-red-600",
            label: "Voided",
          },
          expired: {
            icon: CalendarX,
            color: "text-rose-500",
            label: "Expired",
          },
          refunded: {
            icon: RotateCcw,
            color: "text-orange-600",
            label: "Refunded",
          },
          balance_adjusted: {
            icon: TrendingUp,
            color: "text-primary",
            label: "Balance Adjusted",
          },
          batch_generated: {
            icon: Package,
            color: "text-teal-600",
            label: "Batch Generated",
          },
          batch_imported: {
            icon: Upload,
            color: "text-teal-600",
            label: "Batch Imported",
          },
          activated: {
            icon: ShieldCheck,
            color: "text-green-600",
            label: "Activated",
          },
          expiry_changed: {
            icon: Settings,
            color: "text-gray-600",
            label: "Expiry Changed",
          },
        };
        const cfg = actionMap[l.action] ?? {
          icon: Gift,
          color: "text-muted-foreground",
          label: l.action,
        };
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`size-3.5 ${cfg.color}`} />
            <span className="text-sm">{cfg.label}</span>
          </div>
        );
      },
    },
    {
      key: "clientName",
      label: "Client",
      defaultVisible: true,
      render: (l) =>
        l.clientName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "amount",
      label: "Amount",
      defaultVisible: true,
      render: (l) =>
        l.amount != null ? (
          <span className="price-value text-sm">${l.amount.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "performedBy",
      label: "By",
      defaultVisible: true,
    },
    {
      key: "linkedTo",
      label: "Linked To",
      defaultVisible: true,
      render: (l) => {
        const target = resolveAuditTarget(l);
        if (!target) return <span className="text-muted-foreground">—</span>;
        const kindLabel: Record<NonNullable<AuditTarget>["kind"], string> = {
          card: "Gift Card",
          wallet: "Wallet",
          batch: "Batch",
          client: "Client",
        };
        return (
          <span className="text-primary inline-flex items-center gap-1 text-sm hover:underline">
            <span className="text-muted-foreground text-xs">
              {kindLabel[target.kind]}:
            </span>
            <span className="font-medium">{target.label}</span>
            <ExternalLink className="size-3" />
          </span>
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
      defaultVisible: false,
      render: (l) =>
        l.notes ? (
          <span className="text-muted-foreground text-xs italic">
            {l.notes}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const handleGenerateBatch = async (config: GenerateBatchConfig) => {
    await new Promise((r) => setTimeout(r, 1200));
    const seq = sessionBatches.length + 1;
    const batchId = `batch-session-${seq}`;
    // System-generated batches get their numbers (and "imported" status) now;
    // imported batches are created empty and await the printer's CSV upload.
    const cards: PhysicalCard[] =
      config.source === "system"
        ? Array.from({ length: config.quantity }, (_, i) => {
            const num = String(9000 + seq * 1000 + i);
            return {
              id: `pc-${batchId}-${num}`,
              batchId,
              facilityId: FACILITY_ID,
              cardNumber: `PHYS-${num}-${num.slice(-4)}-N`,
              barcode: `BC${FACILITY_ID}${num}`,
              status: "inactive" as const,
            };
          })
        : [];
    const newBatch: PhysicalCardBatch = {
      id: batchId,
      facilityId: FACILITY_ID,
      name: config.name,
      generatedAt: new Date().toISOString(),
      generatedBy: "Sarah Johnson",
      totalCards: config.quantity,
      importedAt:
        config.source === "system" ? new Date().toISOString() : undefined,
      denomination: config.denomination,
      cards,
    };
    setSessionBatches((prev) => [...prev, newBatch]);
    return newBatch;
  };

  const exportBatchNumbers = (batch: PhysicalCardBatch) => {
    const headers = ["Card Number", "Barcode", "Status"];
    const rows = batch.cards.map((c) => [c.cardNumber, c.barcode, c.status]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batchName(batch).replace(/\s+/g, "-").toLowerCase()}-cards.csv`;
    a.click();
  };

  const openRenameBatch = (batch: PhysicalCardBatch) => {
    setRenameValue(batchName(batch));
    setRenameBatchTarget(batch);
  };

  const handleRenameSave = () => {
    if (!renameBatchTarget || !renameValue.trim()) return;
    setBatchNames((prev) => ({
      ...prev,
      [renameBatchTarget.id]: renameValue.trim(),
    }));
    setRenameBatchTarget(null);
  };

  const handleArchiveConfirm = () => {
    if (!archiveBatchTarget) return;
    const name = batchName(archiveBatchTarget);
    setArchivedBatchIds((prev) => new Set(prev).add(archiveBatchTarget.id));
    setArchiveBatchTarget(null);
    alert(`Batch "${name}" archived.`);
  };

  const exportCards = (cards: GiftCard[]) => {
    const headers = [
      "Card #",
      "Type",
      "Status",
      "Balance",
      "Initial",
      "Purchaser",
      "Recipient",
      "Issued",
      "Expiry",
    ];
    const rows = cards.map((gc) => [
      gc.code,
      gc.type,
      gc.status,
      gc.currentBalance.toFixed(2),
      gc.initialAmount.toFixed(2),
      gc.purchasedBy ?? "",
      gc.recipientName ?? "",
      gc.purchaseDate,
      gc.expiryDate ?? "Never",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gift-cards-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportCardsCSV = () => exportCards(filteredCards);

  const handleResendEmail = (gc: GiftCard) => {
    alert(
      `Gift card ${gc.code} email resent to ${gc.recipientEmail ?? gc.recipientName ?? "the recipient"}.`,
    );
  };

  const handleVoidConfirm = () => {
    if (!voidTargets) return;
    const count = voidTargets.length;
    const ids = new Set(voidTargets.map((c) => c.id));
    // Drop any voided cards from the bulk selection.
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setVoidTargets(null);
    alert(`${count} gift card${count === 1 ? "" : "s"} have been voided.`);
  };

  return (
    <div className="flex-1 space-y-5 p-4 pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gift Cards</h2>
          <p className="text-muted-foreground text-sm">
            Sell, redeem, and manage your gift card program
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCheckBalance(true)}
            className="gap-1.5"
          >
            <Search className="size-4" />
            Check Balance
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRedeem(true)}
            className="gap-1.5"
          >
            <Wallet className="size-4" />
            Redeem to Wallet
          </Button>
          <Button
            onClick={() => setSellMode("physical")}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <QrCode className="size-4" />
            Activate Physical
          </Button>
          <Button onClick={() => setSellMode("digital")} className="gap-1.5">
            <Plus className="size-4" />
            Sell Digital
          </Button>
        </div>
      </div>

      {/* Date range filter — scopes the sales KPIs below */}
      <GiftCardDateRangeFilter value={range} onChange={setRange} />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Outstanding Liability",
            value: `$${totalLiability.toFixed(2)}`,
            sub: `${activeCards} active card${activeCards === 1 ? "" : "s"}`,
            icon: TrendingUp,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-950/20",
            live: false,
          },
          {
            label: "Total Wallet Balance",
            value: `$${totalWalletBalance.toFixed(2)}`,
            sub: `${facilityWallets.length} wallets`,
            icon: Wallet,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/20",
            live: true,
          },
          {
            label: "Total Revenue Sold",
            value: `$${totalSold.toFixed(2)}`,
            sub: `${periodCards.length} card${periodCards.length === 1 ? "" : "s"} sold`,
            icon: BarChart3,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/20",
            live: false,
          },
        ].map(({ label, value, sub, icon: Icon, color, bg, live }) => (
          <Card key={label} className="relative border-none shadow-sm">
            {live && (
              <span
                className="text-muted-foreground/80 absolute top-2 right-2 z-10 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase dark:bg-black/30"
                title="Point-in-time total — not affected by the date range"
              >
                Current
              </span>
            )}
            <CardContent
              className={`flex items-center gap-3 rounded-xl p-4 ${bg}`}
            >
              <div
                className={`flex size-10 items-center justify-center rounded-xl bg-white/70 dark:bg-black/20 ${color}`}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  {label}
                </p>
                <p className={`price-value text-xl font-bold ${color}`}>
                  {value}
                </p>
                <p className="text-muted-foreground text-xs">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Physical card stock — operational gauge with low-stock threshold */}
        <PhysicalCardsTile
          available={physicalInventory.inactive}
          total={physicalInventory.total}
          threshold={lowStockThreshold}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Scroll horizontally on phones (7 tabs crammed into a grid-cols-7
            mashed the labels together); fill the width as a grid from lg up. */}
        <TabsList className="lg:grid lg:w-full lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">All Cards</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent activity */}
            <Card>
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filter chips */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {ACTIVITY_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setActivityFilter(f.key)}
                      data-active={activityFilter === f.key}
                      className="text-muted-foreground hover:bg-muted data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="divide-y">
                  {filteredActivity.slice(0, 12).map((log) => {
                    const isPositive = [
                      "issued_digital",
                      "issued_physical",
                      "batch_generated",
                      "batch_imported",
                      "activated",
                    ].includes(log.action);
                    const isNegative = [
                      "voided",
                      "refunded",
                      "expired",
                    ].includes(log.action);
                    const target = resolveAuditTarget(log);
                    return (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => traceAuditLog(log)}
                        disabled={!target}
                        className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                        title={target ? `Open ${target.label}` : undefined}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                            isPositive
                              ? "bg-green-100 dark:bg-green-900/30"
                              : isNegative
                                ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-blue-100 dark:bg-blue-900/30"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="size-3.5 text-green-600" />
                          ) : isNegative ? (
                            <AlertTriangle className="size-3.5 text-red-600" />
                          ) : (
                            <ArrowDownRight className="size-3.5 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {log.clientName ?? "System"}
                          </p>
                          <p className="text-muted-foreground truncate text-xs capitalize">
                            {log.action.replaceAll("_", " ")}
                            {target ? ` · ${target.label}` : ""}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {log.performedBy === "Online Purchase"
                              ? "Online Purchase"
                              : `by ${log.performedBy}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-right">
                          <div>
                            {log.amount != null && (
                              <p className="price-value text-sm font-medium">
                                ${log.amount.toFixed(2)}
                              </p>
                            )}
                            <p className="text-muted-foreground text-xs">
                              {formatDate(log.timestamp)}
                            </p>
                          </div>
                          {target && (
                            <ChevronRight className="text-muted-foreground size-3.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filteredActivity.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No {activityFilter === "all" ? "recent" : activityFilter}{" "}
                    activity to show.
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  onClick={() => setActiveTab("activity")}
                >
                  View All Activity
                </Button>
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card>
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                  Card Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    {
                      status: "active",
                      label: "Active",
                      color: "bg-green-500",
                      hint: "liability",
                    },
                    {
                      status: "redeemed",
                      label: "Fully Redeemed",
                      color: "bg-blue-500",
                      hint: "",
                    },
                    {
                      status: "expired",
                      label: "Expired",
                      color: "bg-red-400",
                      hint: "breakage",
                    },
                    {
                      status: "cancelled",
                      label: "Voided",
                      color: "bg-gray-400",
                      hint: "",
                    },
                  ] as const
                ).map(({ status, label, color, hint }) => {
                  const cardsInStatus = facilityCards.filter(
                    (gc) => gc.status === status,
                  );
                  const count = cardsInStatus.length;
                  const balance = cardsInStatus.reduce(
                    (sum, gc) => sum + gc.currentBalance,
                    0,
                  );
                  const pct =
                    facilityCards.length > 0
                      ? (count / facilityCards.length) * 100
                      : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="flex items-baseline gap-1.5">
                          {label}
                          {hint && (
                            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                              {hint}
                            </span>
                          )}
                        </span>
                        <span className="flex items-baseline gap-3 tabular-nums">
                          <span className="font-medium">
                            {count} card{count === 1 ? "" : "s"}
                          </span>
                          <span className="text-muted-foreground w-20 text-right font-normal">
                            ${balance.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 border-t pt-3 text-sm">
                  <span className="font-medium">Total issued:</span>{" "}
                  <span className="tabular-nums">
                    {facilityCards.length} cards
                  </span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="tabular-nums">
                    $
                    {facilityCards
                      .reduce((sum, gc) => sum + gc.initialAmount, 0)
                      .toFixed(2)}
                  </span>
                  <span className="text-muted-foreground"> face value</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: Gift,
                label: "Sell Digital",
                desc: "Send branded email",
                action: () => setSellMode("digital"),
                color: "text-violet-600",
              },
              {
                icon: QrCode,
                label: "Activate Physical",
                desc: "Load balance on card",
                action: () => setSellMode("physical"),
                color: "text-blue-600",
              },
              {
                icon: Wallet,
                label: "Redeem to Wallet",
                desc: "Customer brings card in",
                action: () => setShowRedeem(true),
                color: "text-green-600",
              },
              {
                icon: Download,
                label: "Export CSV",
                desc: "Download card list",
                action: exportCardsCSV,
                color: "text-amber-600",
              },
            ].map(({ icon: Icon, label, desc, action, color }) => (
              <button
                key={label}
                onClick={action}
                className="hover:border-primary/50 hover:bg-muted/50 flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all"
              >
                <Icon className={`size-6 ${color}`} />
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* ── All Cards ── */}
        <TabsContent value="cards" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm min-w-[180px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search by code, purchaser, recipient…"
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
              />
            </div>
            {cardFilters.map((f) => (
              <Select
                key={f.key}
                value={cardFilterValues[f.key]}
                onValueChange={(v) =>
                  setCardFilterValues((prev) => ({ ...prev, [f.key]: v }))
                }
              >
                <SelectTrigger className="w-[140px]" aria-label={f.label}>
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCardsCSV}
              className="ml-auto gap-1.5"
            >
              <FileDown className="size-4" />
              {cardFiltersActive
                ? `Export Filtered (${filteredCards.length})`
                : "Export All"}
            </Button>
          </div>

          {/* Bulk selection action bar */}
          {selectedCardIds.size > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 duration-200 dark:border-blue-900 dark:bg-blue-950/40">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {selectedCardIds.size} card
                {selectedCardIds.size === 1 ? "" : "s"} selected
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => exportCards(selectedCards)}
                >
                  <FileDown className="size-4" />
                  Export Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => setVoidTargets(selectedCards)}
                >
                  <AlertTriangle className="size-4" />
                  Void Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCardIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <DataTable
            data={filteredCards}
            columns={cardColumns}
            itemsPerPage={12}
            selectable
            getItemId={(gc) => gc.id}
            selectedIds={selectedCardIds}
            onSelectionChange={setSelectedCardIds}
            onRowClick={setSelectedCard}
            actions={(gc) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                    title="Actions"
                  >
                    <span className="sr-only">Open actions menu</span>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setSelectedCard(gc)}>
                    <Eye className="size-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={gc.type !== "online"}
                    onClick={() => handleResendEmail(gc)}
                  >
                    <Send className="size-4" />
                    Resend Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setVoidTargets([gc])}
                  >
                    <Ban className="size-4" />
                    Void Card
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        {/* ── Wallets ── */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="bg-muted/40 flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
            <Wallet className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Customer wallets hold redeemed gift card balances. Customers can
              spend their wallet balance on any service or product at this
              facility.
            </p>
          </div>
          {facilityWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet className="text-muted-foreground mb-3 size-10 opacity-40" />
              <p className="font-medium">No wallets yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Wallets are created when customers redeem gift cards
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative max-w-sm min-w-[180px] flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer by name or email…"
                    value={walletSearch}
                    onChange={(e) => setWalletSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={walletSort}
                  onValueChange={(v) => setWalletSort(v as typeof walletSort)}
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance_desc">
                      Highest Balance
                    </SelectItem>
                    <SelectItem value="balance_asc">Lowest Balance</SelectItem>
                    <SelectItem value="recent">Most Recently Used</SelectItem>
                    <SelectItem value="alpha">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 dark:border-green-900 dark:bg-green-950/20">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="size-4 text-green-600" />
                  Total wallet funds on account
                </span>
                <span className="text-sm">
                  <span className="price-value text-base font-bold text-green-600">
                    $
                    {displayedWallets
                      .reduce((sum, { balance }) => sum + balance, 0)
                      .toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    across {displayedWallets.length} customer
                    {displayedWallets.length === 1 ? "" : "s"}
                  </span>
                </span>
              </div>

              {displayedWallets.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">
                  No customers match “{walletSearch}”.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedWallets.map(({ wallet, client, balance }) => {
                    const isHighlighted = highlightedWalletId === wallet.id;
                    const isExpanded = expandedWalletIds.has(wallet.id);
                    const allTx = [
                      ...(walletAdjustments[wallet.id] ?? []),
                      ...wallet.transactions,
                    ];
                    const sortedTx = [...allTx].sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    );
                    const shownTx = isExpanded
                      ? sortedTx
                      : sortedTx.slice(0, 3);
                    return (
                      <Card
                        key={wallet.id}
                        id={`wallet-${wallet.id}`}
                        className={cn(
                          "transition-shadow",
                          isHighlighted && "ring-primary ring-2 ring-offset-2",
                        )}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                                <Wallet className="text-primary size-5" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {client?.name ?? "Unknown Client"}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {allTx.length} transaction
                                  {allTx.length !== 1 ? "s" : ""} · Last updated{" "}
                                  {formatDate(wallet.updatedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="price-value text-xl font-bold text-green-600">
                                ${balance.toFixed(2)}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                wallet balance
                              </p>
                            </div>
                          </div>

                          {/* Transactions */}
                          <div className="mt-3 space-y-1.5 border-t pt-3">
                            {shownTx.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground truncate text-xs">
                                  {tx.description}
                                </span>
                                <span
                                  className={`price-value shrink-0 text-xs font-medium ${
                                    tx.amount > 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {tx.amount > 0 ? "+" : ""}$
                                  {tx.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {!isExpanded && allTx.length > 3 && (
                              <p className="text-muted-foreground text-xs">
                                +{allTx.length - 3} more transactions
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => toggleWalletHistory(wallet.id)}
                              disabled={allTx.length <= 3}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="size-4" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="size-4" />
                                  View Full History
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setAdjustWallet(wallet)}
                            >
                              <SlidersHorizontal className="size-4" />
                              Adjust Balance
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Inventory ── */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Physical Card Inventory</p>
              <p className="text-muted-foreground text-sm">
                {physicalInventory.inactive} cards available ·{" "}
                {physicalInventory.total} total across {displayedBatches.length}{" "}
                batches
              </p>
            </div>
            <Button onClick={() => setGenerateOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              Generate New Batch
            </Button>
          </div>

          <div className="space-y-3">
            {displayedBatches.map((batch) => {
              const sold = batch.cards.filter(
                (c) => c.status === "sold" || c.status === "active",
              ).length;
              const inactive = batch.cards.filter(
                (c) => c.status === "inactive",
              ).length;
              const soldPct =
                batch.totalCards > 0 ? (sold / batch.totalCards) * 100 : 0;

              const isBatchHighlighted = highlightedBatchId === batch.id;
              return (
                <Card
                  key={batch.id}
                  id={`batch-${batch.id}`}
                  className={cn(
                    "transition-shadow",
                    isBatchHighlighted && "ring-primary ring-2 ring-offset-2",
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{batchName(batch)}</p>
                          {!batch.importedAt && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              Action Required: Import Numbers
                            </Badge>
                          )}
                          {batch.importedAt && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600"
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Generated {formatDate(batch.generatedAt)} by{" "}
                          {batch.generatedBy}
                          {batch.importedAt
                            ? ` · Imported ${formatDate(batch.importedAt)}`
                            : " · Not yet imported"}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Denomination:{" "}
                          <span className="text-foreground font-medium">
                            {batch.denomination != null
                              ? `Fixed $${batch.denomination.toFixed(2)}`
                              : "Open (any value)"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!batch.importedAt ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-amber-300 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                                onClick={() =>
                                  alert(
                                    `Import "${batchName(batch)}": upload the CSV of card numbers provided by your card printer to activate these cards.`,
                                  )
                                }
                              >
                                <Upload className="size-3.5" />
                                Import Batch
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Upload the CSV of card numbers provided by your
                              card printer.
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              title="Batch actions"
                            >
                              <span className="sr-only">Batch actions</span>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => exportBatchNumbers(batch)}
                            >
                              <FileDown className="size-4" />
                              Export Numbers
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setViewCardsBatch(batch)}
                            >
                              <List className="size-4" />
                              View All Cards in Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openRenameBatch(batch)}
                            >
                              <Pencil className="size-4" />
                              Rename Batch
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setArchiveBatchTarget(batch)}
                            >
                              <Archive className="size-4" />
                              Archive Batch
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {sold} sold · {inactive} available
                        </span>
                        <span className="font-medium">
                          {soldPct.toFixed(0)}% activated
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${soldPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-semibold">Full Activity Log</h3>
              <p className="text-muted-foreground text-sm">
                Every gift card, wallet, and batch event — newest first
              </p>
            </div>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Click any row to jump to its linked card, wallet, batch, or client
            </p>
          </div>
          <DataTable
            data={activityLog}
            columns={auditColumns}
            searchKey="clientName"
            searchPlaceholder="Search activity…"
            itemsPerPage={15}
            onRowClick={traceAuditLog}
          />
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports">
          <GiftCardReportsTab cards={facilityCards} />
        </TabsContent>

        {/* ── Settings ── */}
        <TabsContent value="settings">
          <GiftCardSettingsPanel facilityId={FACILITY_ID} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SellGiftCardModal
        key={`sell-${replacementAmount ?? "new"}`}
        open={sellMode !== null}
        onOpenChange={(v) => {
          if (!v) {
            setSellMode(null);
            setReplacementAmount(null);
          }
        }}
        facilityId={FACILITY_ID}
        mode={sellMode ?? "digital"}
        prefillAmount={replacementAmount ?? undefined}
        physicalBatches={allBatches}
        onSuccess={(card) => {
          console.log("Gift card issued:", card);
        }}
      />

      <RedeemGiftCardModal
        open={showRedeem}
        onOpenChange={setShowRedeem}
        facilityId={FACILITY_ID}
        cards={facilityCards}
        onSuccess={(r) => {
          // Resolve the destination wallet; create one for customers who have
          // none so the redeemed funds always land somewhere (never lost).
          const walletId =
            r.walletId ??
            facilityWallets.find((w) => w.clientId === r.clientId)?.id ??
            `wallet-c${r.clientId}`;
          if (!facilityWallets.some((w) => w.id === walletId)) {
            const now = new Date().toISOString();
            setSessionWallets((prev) =>
              prev.some((w) => w.id === walletId)
                ? prev
                : [
                    ...prev,
                    {
                      id: walletId,
                      facilityId: FACILITY_ID,
                      clientId: r.clientId,
                      balance: 0,
                      currency: "USD",
                      createdAt: now,
                      updatedAt: now,
                      transactions: [],
                    },
                  ],
            );
          }
          // Customer wallet: bump balance + append a redemption transaction.
          const wallet = facilityWallets.find((w) => w.id === walletId);
          const current = walletBalances[walletId] ?? wallet?.balance ?? 0;
          const newBalance = current + r.amount;
          setWalletBalances((prev) => ({ ...prev, [walletId]: newBalance }));
          setWalletAdjustments((prev) => {
            const existing = prev[walletId] ?? [];
            const tx: WalletTransaction = {
              id: `wt-redeem-${walletId}-${existing.length + 1}`,
              walletId,
              facilityId: FACILITY_ID,
              clientId: r.clientId,
              type: "gift_card_redeem",
              amount: r.amount,
              balanceAfter: newBalance,
              description: `Redeemed gift card ${r.cardCode} ($${r.amount.toFixed(2)})`,
              referenceId: r.cardId,
              referenceType: "gift_card",
              performedBy: "Sarah Johnson",
              createdAt: new Date().toISOString(),
            };
            return { ...prev, [walletId]: [...existing, tx] };
          });
          // Gift card: draw down balance + append a redemption transaction.
          const card = facilityCards.find((c) => c.id === r.cardId);
          const cardNewBalance = Math.max(
            0,
            (card?.currentBalance ?? 0) - r.amount,
          );
          setCardBalances((prev) => ({ ...prev, [r.cardId]: cardNewBalance }));
          setCardExtraTx((prev) => {
            const existing = prev[r.cardId] ?? [];
            const tx: GiftCardTransaction = {
              id: `gct-redeem-${r.cardId}-${existing.length + 1}`,
              giftCardId: r.cardId,
              type: "redemption",
              amount: r.amount,
              balanceAfter: cardNewBalance,
              timestamp: new Date().toISOString(),
              notes: "Redeemed to customer wallet",
            };
            return { ...prev, [r.cardId]: [...existing, tx] };
          });
        }}
      />

      <CheckBalanceModal
        open={showCheckBalance}
        onOpenChange={setShowCheckBalance}
        facilityId={FACILITY_ID}
      />

      <WalletAdjustModal
        wallet={adjustWallet}
        open={adjustWallet !== null}
        currentBalance={
          adjustWallet
            ? (walletBalances[adjustWallet.id] ?? adjustWallet.balance)
            : undefined
        }
        onOpenChange={(v) => !v && setAdjustWallet(null)}
        onApply={({ walletId, newBalance, delta, reason, notes, staff }) => {
          setWalletBalances((prev) => ({ ...prev, [walletId]: newBalance }));
          setWalletAdjustments((prev) => {
            const existing = prev[walletId] ?? [];
            const wallet = facilityWallets.find((w) => w.id === walletId);
            const tx: WalletTransaction = {
              id: `wt-adj-${walletId}-${existing.length + 1}`,
              walletId,
              facilityId: FACILITY_ID,
              clientId: wallet?.clientId ?? 0,
              type: "adjustment",
              amount: delta,
              balanceAfter: newBalance,
              description: notes ? `${reason} — ${notes}` : reason,
              referenceType: "adjustment",
              performedBy: staff,
              createdAt: new Date().toISOString(),
            };
            return { ...prev, [walletId]: [...existing, tx] };
          });
        }}
      />

      <BatchCardsModal
        batch={viewCardsBatch}
        name={viewCardsBatch ? batchName(viewCardsBatch) : undefined}
        open={viewCardsBatch !== null}
        onOpenChange={(v) => !v && setViewCardsBatch(null)}
      />

      <Dialog
        open={renameBatchTarget !== null}
        onOpenChange={(v) => !v && setRenameBatchTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Batch</DialogTitle>
            <DialogDescription>
              Give this batch a clearer name for your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="batch-name">Batch name</Label>
            <Input
              id="batch-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameBatchTarget(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSave} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={archiveBatchTarget !== null}
        onOpenChange={(v) => !v && setArchiveBatchTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;
              {archiveBatchTarget ? batchName(archiveBatchTarget) : ""}&rdquo;
              will be removed from the active inventory list and its cards will
              no longer count toward available stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Archive Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GenerateBatchModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={handleGenerateBatch}
        onExport={exportBatchNumbers}
      />

      <GiftCardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(v) => !v && setSelectedCard(null)}
        onVoid={(card, options) => {
          setSelectedCard(null);
          if (options.issueReplacement) {
            setReplacementAmount(options.replacementValue);
            setSellMode("digital");
          }
          alert(
            `Gift card ${card.code} voided (${options.reason}).` +
              (options.issueReplacement
                ? ` Issuing a $${options.replacementValue.toFixed(2)} replacement…`
                : ""),
          );
        }}
      />

      <AlertDialog
        open={voidTargets !== null}
        onOpenChange={(v) => !v && setVoidTargets(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Void {voidTargets?.length ?? 0} gift card
              {voidTargets?.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deactivates the selected card
              {voidTargets?.length === 1 ? "" : "s"} and any remaining balance
              {voidTargets?.length === 1 ? "" : "s"} totaling{" "}
              <span className="text-foreground font-semibold">
                $
                {(voidTargets ?? [])
                  .reduce((sum, gc) => sum + gc.currentBalance, 0)
                  .toFixed(2)}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Void {voidTargets?.length ?? 0} Card
              {voidTargets?.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
