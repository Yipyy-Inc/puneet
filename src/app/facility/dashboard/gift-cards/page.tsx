"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  FileDown,
  Upload,
  AlertTriangle,
} from "lucide-react";
import {
  giftCards,
  customerWallets,
  physicalCardBatches,
  giftCardAuditLogs,
} from "@/data/gift-cards";
import { clients } from "@/data/clients";
import { SellGiftCardModal } from "./_components/SellGiftCardModal";
import { RedeemGiftCardModal } from "./_components/RedeemGiftCardModal";
import { GiftCardDetailSheet } from "./_components/GiftCardDetailSheet";
import { GiftCardSettingsPanel } from "./_components/GiftCardSettingsPanel";
import type { GiftCard, GiftCardAuditLog } from "@/types/payments";

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

export default function FacilityGiftCardsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sellMode, setSellMode] = useState<"digital" | "physical" | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const facilityCards = useMemo(
    () => giftCards.filter((gc) => gc.facilityId === FACILITY_ID),
    [],
  );

  const facilityWallets = useMemo(
    () => customerWallets.filter((w) => w.facilityId === FACILITY_ID),
    [],
  );

  const facilityBatches = useMemo(
    () => physicalCardBatches.filter((b) => b.facilityId === FACILITY_ID),
    [],
  );

  const facilityAuditLogs = useMemo(
    () => giftCardAuditLogs.filter((l) => l.facilityId === FACILITY_ID),
    [],
  );

  // KPIs
  const totalLiability = useMemo(
    () =>
      facilityCards
        .filter((gc) => gc.status === "active")
        .reduce((sum, gc) => sum + gc.currentBalance, 0),
    [facilityCards],
  );

  const totalWalletBalance = useMemo(
    () => facilityWallets.reduce((sum, w) => sum + w.balance, 0),
    [facilityWallets],
  );

  const totalSold = useMemo(
    () => facilityCards.reduce((sum, gc) => sum + gc.initialAmount, 0),
    [facilityCards],
  );

  const activeCards = facilityCards.filter((gc) => gc.status === "active").length;
  const redeemedCards = facilityCards.filter((gc) => gc.status === "redeemed").length;

  const physicalInventory = useMemo(() => {
    const allCards = facilityBatches.flatMap((b) => b.cards);
    const inactive = allCards.filter((c) => c.status === "inactive").length;
    const active = allCards.filter((c) => c.status === "active" || c.status === "sold").length;
    return { total: allCards.length, inactive, active };
  }, [facilityBatches]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    if (!cardSearchQuery.trim()) return facilityCards;
    const q = cardSearchQuery.toLowerCase();
    return facilityCards.filter(
      (gc) =>
        gc.code.toLowerCase().includes(q) ||
        gc.purchasedBy?.toLowerCase().includes(q) ||
        gc.recipientName?.toLowerCase().includes(q) ||
        gc.recipientEmail?.toLowerCase().includes(q),
    );
  }, [facilityCards, cardSearchQuery]);

  // Table columns
  const cardColumns: ColumnDef<GiftCard>[] = [
    {
      key: "code",
      label: "Card #",
      defaultVisible: true,
      render: (gc) => (
        <span className="font-mono text-xs">
          ****{gc.code.slice(-4)}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      defaultVisible: true,
      render: (gc) => (
        <div className="flex items-center gap-1.5">
          {gc.type === "online" ? (
            <Smartphone className="text-muted-foreground size-3.5" />
          ) : (
            <QrCode className="text-muted-foreground size-3.5" />
          )}
          <span className="capitalize text-sm">{gc.type}</span>
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
        <span className="price-value text-sm">${gc.initialAmount.toFixed(2)}</span>
      ),
    },
    {
      key: "purchasedBy",
      label: "Purchaser",
      defaultVisible: true,
      render: (gc) => gc.purchasedBy ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "recipientName",
      label: "Recipient",
      defaultVisible: true,
      render: (gc) => gc.recipientName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (gc) => (
        <Badge variant={statusVariant[gc.status] ?? "secondary"} className="capitalize text-xs">
          {gc.status}
        </Badge>
      ),
    },
    {
      key: "purchaseDate",
      label: "Issued",
      defaultVisible: true,
      render: (gc) => <span className="text-sm">{formatDate(gc.purchaseDate)}</span>,
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
      render: (l) => <span className="text-sm">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: "action",
      label: "Action",
      defaultVisible: true,
      render: (l) => {
        const actionMap: Record<string, { icon: typeof Gift; color: string; label: string }> = {
          issued_digital: { icon: Gift, color: "text-green-600", label: "Issued (Digital)" },
          issued_physical: { icon: QrCode, color: "text-blue-600", label: "Issued (Physical)" },
          redeemed_to_wallet: { icon: Wallet, color: "text-violet-600", label: "Redeemed → Wallet" },
          wallet_used: { icon: ArrowDownRight, color: "text-amber-600", label: "Wallet Used" },
          voided: { icon: AlertTriangle, color: "text-red-600", label: "Voided" },
          refunded: { icon: RotateCcw, color: "text-orange-600", label: "Refunded" },
          balance_adjusted: { icon: TrendingUp, color: "text-primary", label: "Balance Adjusted" },
          batch_generated: { icon: Package, color: "text-teal-600", label: "Batch Generated" },
          batch_imported: { icon: Upload, color: "text-teal-600", label: "Batch Imported" },
          activated: { icon: ShieldCheck, color: "text-green-600", label: "Activated" },
          expiry_changed: { icon: Settings, color: "text-gray-600", label: "Expiry Changed" },
        };
        const cfg = actionMap[l.action] ?? { icon: Gift, color: "text-muted-foreground", label: l.action };
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
      render: (l) => l.clientName ?? <span className="text-muted-foreground">—</span>,
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
      key: "notes",
      label: "Notes",
      defaultVisible: false,
      render: (l) =>
        l.notes ? (
          <span className="text-muted-foreground text-xs italic">{l.notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    await new Promise((r) => setTimeout(r, 1500));
    setGeneratingBatch(false);
    alert("Batch of 100 card numbers generated and ready to export for your print vendor.");
  };

  const exportCardsCSV = () => {
    const headers = ["Card #", "Type", "Status", "Balance", "Initial", "Purchaser", "Recipient", "Issued", "Expiry"];
    const rows = filteredCards.map((gc) => [
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
            onClick={() => setShowRedeem(true)}
            className="gap-1.5"
          >
            <Wallet className="size-4" />
            Redeem to Wallet
          </Button>
          <Button
            variant="outline"
            onClick={() => setSellMode("physical")}
            className="gap-1.5"
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

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Outstanding Liability",
            value: `$${totalLiability.toFixed(2)}`,
            sub: `${activeCards} active cards`,
            icon: TrendingUp,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-950/20",
          },
          {
            label: "Total Wallet Balance",
            value: `$${totalWalletBalance.toFixed(2)}`,
            sub: `${facilityWallets.length} wallets`,
            icon: Wallet,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/20",
          },
          {
            label: "Total Revenue Sold",
            value: `$${totalSold.toFixed(2)}`,
            sub: `${facilityCards.length} cards issued`,
            icon: BarChart3,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/20",
          },
          {
            label: "Physical Inventory",
            value: physicalInventory.inactive.toString(),
            sub: `${physicalInventory.total} total cards`,
            icon: Package,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/20",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="border-none shadow-sm">
            <CardContent className={`flex items-center gap-3 rounded-xl p-4 ${bg}`}>
              <div className={`flex size-10 items-center justify-center rounded-xl bg-white/70 dark:bg-black/20 ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">{label}</p>
                <p className={`price-value text-xl font-bold ${color}`}>{value}</p>
                <p className="text-muted-foreground text-xs">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">All Cards</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
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
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {facilityAuditLogs.slice(0, 6).map((log) => {
                    const isPositive = ["issued_digital", "issued_physical", "batch_generated", "batch_imported", "activated"].includes(log.action);
                    const isNegative = ["voided", "refunded"].includes(log.action);
                    return (
                      <div key={log.id} className="flex items-center gap-3 py-2.5">
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
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {log.amount != null && (
                            <p className="price-value text-sm font-medium">
                              ${log.amount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs">
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  onClick={() => setActiveTab("cards")}
                >
                  View all transactions
                </Button>
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Card Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    { status: "active", label: "Active", color: "bg-green-500" },
                    { status: "redeemed", label: "Fully Redeemed", color: "bg-blue-500" },
                    { status: "expired", label: "Expired", color: "bg-red-400" },
                    { status: "cancelled", label: "Voided", color: "bg-gray-400" },
                  ] as const
                ).map(({ status, label, color }) => {
                  const count = facilityCards.filter((gc) => gc.status === status).length;
                  const pct = facilityCards.length > 0 ? (count / facilityCards.length) * 100 : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{count}</span>
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
                <div className="mt-3 border-t pt-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Issued</span>
                    <span>{facilityCards.length}</span>
                  </div>
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
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search by code, purchaser, recipient…"
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCardsCSV} className="gap-1.5">
              <FileDown className="size-4" />
              Export
            </Button>
          </div>

          <DataTable
            data={filteredCards}
            columns={cardColumns}
            filters={cardFilters}
            searchKey="code"
            searchPlaceholder="Search gift cards…"
            itemsPerPage={12}
            onRowClick={setSelectedCard}
            actions={(gc) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCard(gc)}
                title="View details"
              >
                <Eye className="size-4" />
              </Button>
            )}
          />
        </TabsContent>

        {/* ── Wallets ── */}
        <TabsContent value="wallets" className="space-y-4">
          {facilityWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet className="text-muted-foreground mb-3 size-10 opacity-40" />
              <p className="font-medium">No wallets yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Wallets are created when customers redeem gift cards
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {facilityWallets.map((wallet) => {
                const client = clients.find((c) => c.id === wallet.clientId);
                return (
                  <Card key={wallet.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                            <Wallet className="text-primary size-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{client?.name ?? "Unknown Client"}</p>
                            <p className="text-muted-foreground text-xs">
                              {wallet.transactions.length} transaction
                              {wallet.transactions.length !== 1 ? "s" : ""} ·{" "}
                              Last updated{" "}
                              {formatDate(wallet.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="price-value text-xl font-bold text-green-600">
                            ${wallet.balance.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground text-xs">wallet balance</p>
                        </div>
                      </div>

                      {/* Recent transactions */}
                      <div className="mt-3 space-y-1.5 border-t pt-3">
                        {wallet.transactions.slice(0, 3).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground truncate text-xs">
                              {tx.description}
                            </span>
                            <span
                              className={`price-value shrink-0 text-xs font-medium ${
                                tx.amount > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {tx.amount > 0 ? "+" : ""}${tx.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {wallet.transactions.length > 3 && (
                          <p className="text-muted-foreground text-xs">
                            +{wallet.transactions.length - 3} more transactions
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Inventory ── */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Physical Card Inventory</p>
              <p className="text-muted-foreground text-sm">
                {physicalInventory.inactive} cards available ·{" "}
                {physicalInventory.total} total across {facilityBatches.length} batches
              </p>
            </div>
            <Button onClick={handleGenerateBatch} disabled={generatingBatch} className="gap-1.5">
              {generatingBatch ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Generate New Batch
            </Button>
          </div>

          <div className="space-y-3">
            {facilityBatches.map((batch) => {
              const sold = batch.cards.filter(
                (c) => c.status === "sold" || c.status === "active",
              ).length;
              const inactive = batch.cards.filter((c) => c.status === "inactive").length;
              const soldPct = batch.totalCards > 0 ? (sold / batch.totalCards) * 100 : 0;

              return (
                <Card key={batch.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{batch.name}</p>
                          {!batch.importedAt && (
                            <Badge variant="outline" className="text-xs text-amber-600">
                              Not Imported
                            </Badge>
                          )}
                          {batch.importedAt && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Generated {formatDate(batch.generatedAt)} by {batch.generatedBy}
                          {batch.importedAt
                            ? ` · Imported ${formatDate(batch.importedAt)}`
                            : " · Not yet imported"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {!batch.importedAt ? (
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Upload className="size-3.5" />
                            Import Batch
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <FileDown className="size-3.5" />
                          Export Numbers
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {sold} sold · {inactive} available
                        </span>
                        <span className="font-medium">{soldPct.toFixed(0)}% activated</span>
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

          {/* Full audit log */}
          <div>
            <h3 className="mb-3 font-semibold">Full Audit Trail</h3>
            <DataTable
              data={facilityAuditLogs}
              columns={auditColumns}
              searchKey="clientName"
              searchPlaceholder="Search audit log…"
              itemsPerPage={10}
            />
          </div>
        </TabsContent>

        {/* ── Settings ── */}
        <TabsContent value="settings">
          <GiftCardSettingsPanel facilityId={FACILITY_ID} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SellGiftCardModal
        open={sellMode !== null}
        onOpenChange={(v) => !v && setSellMode(null)}
        facilityId={FACILITY_ID}
        mode={sellMode ?? "digital"}
        onSuccess={(card) => {
          console.log("Gift card issued:", card);
        }}
      />

      <RedeemGiftCardModal
        open={showRedeem}
        onOpenChange={setShowRedeem}
        facilityId={FACILITY_ID}
        onSuccess={(code, amount) => {
          console.log("Redeemed:", code, amount);
        }}
      />

      <GiftCardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(v) => !v && setSelectedCard(null)}
        onVoid={(card) => {
          alert(`Gift card ${card.code} has been voided.`);
          setSelectedCard(null);
        }}
      />
    </div>
  );
}
