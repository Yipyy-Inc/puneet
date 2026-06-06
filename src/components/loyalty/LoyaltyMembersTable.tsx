"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Download,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  History,
  Plus,
  Gift,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { clients } from "@/data/clients";
import { AdjustPointsModal } from "@/components/loyalty/AdjustPointsModal";
import { SendRewardModal } from "@/components/loyalty/SendRewardModal";
import { LoyaltyTransactionHistory } from "@/components/loyalty/LoyaltyTransactionHistory";
import type { CustomerLoyaltyAccount } from "@/types/loyalty";

const ADJUST_ROLES = ["owner", "general_manager", "department_manager"];
const ACTIVE_DAYS = 30;
const LAPSED_DAYS = 90;
// Captured once at module load; status is only rendered after hydration so SSR
// and the first client render match (see `hydrated` gate below).
const NOW_MS = Date.now();

type Status = "active" | "inactive" | "lapsed";
type SortKey =
  | "name"
  | "tier"
  | "points"
  | "lifetimeEarned"
  | "spend"
  | "lastActivity"
  | "status";

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  inactive: "Inactive",
  lapsed: "Lapsed",
};
const STATUS_TONE: Record<Status, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  inactive:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  lapsed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

interface MemberRow {
  account: CustomerLoyaltyAccount;
  customerId: number;
  name: string;
  tierId: string | null;
  tierName: string;
  tierColor?: string;
  tierSort: number;
  points: number;
  lifetimeEarned: number;
  spend: number;
  lastActivityISO: string;
  lastActivityMs: number;
  status: Status;
}

function statusOf(lastMs: number): Status {
  const days = (NOW_MS - lastMs) / 86_400_000;
  if (days <= ACTIVE_DAYS) return "active";
  if (days <= LAPSED_DAYS) return "inactive";
  return "lapsed";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toCsv(rows: MemberRow[]): string {
  const header = [
    "Customer",
    "Tier",
    "Points",
    "Lifetime Earned",
    "Lifetime Spend",
    "Last Activity",
    "Status",
  ];
  const body = rows.map((r) => [
    r.name,
    r.tierName,
    String(r.points),
    String(r.lifetimeEarned),
    r.spend.toFixed(2),
    r.lastActivityISO.slice(0, 10),
    STATUS_LABEL[r.status],
  ]);
  return [header, ...body]
    .map((cols) =>
      cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

export function LoyaltyMembersTable() {
  const hydrated = useHydrated();
  const { config, facilityId } = useLoyaltyProgram();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery(loyaltyQueries.accounts(facilityId));

  const canManage = ADJUST_ROLES.includes(user.role);

  const tierDefs = useMemo(
    () => config.tierDefinitions ?? [],
    [config.tierDefinitions],
  );
  const tierMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; sortOrder: number }>();
    for (const t of tierDefs) {
      map.set(t.id, { name: t.name, color: t.color, sortOrder: t.sortOrder });
    }
    return map;
  }, [tierDefs]);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [historyFor, setHistoryFor] = useState<CustomerLoyaltyAccount | null>(null);
  const [adjustFor, setAdjustFor] = useState<CustomerLoyaltyAccount | null>(null);
  const [rewardFor, setRewardFor] = useState<CustomerLoyaltyAccount | null>(null);

  const rows = useMemo<MemberRow[]>(() => {
    return accounts.map((a) => {
      const tier = a.currentTierId ? tierMap.get(a.currentTierId) : undefined;
      const name =
        clients.find((c) => c.id === a.customerId)?.name ??
        `Client #${a.customerId}`;
      const lastActivityISO = a.lastActivityAt ?? a.updatedAt;
      const lastActivityMs = new Date(lastActivityISO).getTime();
      return {
        account: a,
        customerId: a.customerId,
        name,
        tierId: a.currentTierId,
        tierName: tier?.name ?? "—",
        tierColor: tier?.color,
        tierSort: tier?.sortOrder ?? -1,
        points: a.pointsBalance,
        lifetimeEarned: a.lifetimePointsEarned,
        spend: a.totalSpend,
        lastActivityISO,
        lastActivityMs,
        status: statusOf(lastActivityMs),
      };
    });
  }, [accounts, tierMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    const out = rows.filter((r) => {
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.account.referralCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (tierFilter !== "all" && r.tierId !== tierFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (fromMs !== null && r.lastActivityMs < fromMs) return false;
      if (toMs !== null && r.lastActivityMs > toMs) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "tier":
          cmp = a.tierSort - b.tierSort;
          break;
        case "points":
          cmp = a.points - b.points;
          break;
        case "lifetimeEarned":
          cmp = a.lifetimeEarned - b.lifetimeEarned;
          break;
        case "spend":
          cmp = a.spend - b.spend;
          break;
        case "lastActivity":
          cmp = a.lastActivityMs - b.lastActivityMs;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return cmp * dir;
    });
  }, [rows, search, tierFilter, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["loyalty"] });

  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loyalty-members.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        Loading members…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + filters + export */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-50 flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder="Search name or referral code…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {tierDefs.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="lapsed">Lapsed</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker
          value={dateFrom}
          onValueChange={(v) => setDateFrom(v)}
          placeholder="Activity from"
          className="w-40"
        />
        <DatePicker
          value={dateTo}
          onValueChange={(v) => setDateTo(v)}
          placeholder="Activity to"
          className="w-40"
        />
        <Button variant="outline" onClick={handleExport} className="ml-auto">
          <Download className="mr-1.5 size-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Customer" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHead label="Tier" k="tier" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHead label="Points" k="points" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortHead label="Lifetime" k="lifetimeEarned" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortHead label="Spend" k="spend" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortHead label="Last activity" k="lastActivity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHead label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-8 text-center"
                >
                  No members match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.account.id}>
                  <TableCell>
                    <Link
                      href={`/facility/dashboard/clients/${r.customerId}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.tierColor ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${r.tierColor}22`, color: r.tierColor }}
                      >
                        <span className="size-2 rounded-full" style={{ backgroundColor: r.tierColor }} />
                        {r.tierName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.points.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                    {r.lifetimeEarned.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${r.spend.toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {fmtDate(r.lastActivityISO)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_TONE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setHistoryFor(r.account)}>
                          <History className="mr-2 size-4" /> View history
                        </DropdownMenuItem>
                        {canManage && (
                          <DropdownMenuItem onClick={() => setAdjustFor(r.account)}>
                            <Plus className="mr-2 size-4" /> Adjust points
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem onClick={() => setRewardFor(r.account)}>
                            <Gift className="mr-2 size-4" /> Send reward
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} of {rows.length} member{rows.length === 1 ? "" : "s"}
      </p>

      {/* History drawer */}
      <Sheet
        open={!!historyFor}
        onOpenChange={(o) => !o && setHistoryFor(null)}
      >
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
          {historyFor && (
            <MemberHistoryBody
              account={historyFor}
              facilityId={facilityId}
              tierName={
                historyFor.currentTierId
                  ? tierMap.get(historyFor.currentTierId)?.name
                  : undefined
              }
              customerName={
                clients.find((c) => c.id === historyFor.customerId)?.name
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {adjustFor && (
        <AdjustPointsModal
          open
          onOpenChange={(v) => !v && setAdjustFor(null)}
          facilityId={facilityId}
          customerId={adjustFor.customerId}
          currentBalance={adjustFor.pointsBalance}
          onAdjusted={refresh}
        />
      )}
      {rewardFor && (
        <SendRewardModal
          open
          onOpenChange={(v) => !v && setRewardFor(null)}
          facilityId={facilityId}
          customerId={rewardFor.customerId}
          customerName={
            clients.find((c) => c.id === rewardFor.customerId)?.name
          }
          onSent={refresh}
        />
      )}
    </div>
  );
}

function SortHead({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align?: "right";
}) {
  const active = sortKey === k;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse",
          active ? "text-foreground font-semibold" : "",
        )}
      >
        {label}
        {!active ? (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        ) : sortDir === "asc" ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>
    </TableHead>
  );
}

function MemberHistoryBody({
  account,
  facilityId,
  tierName,
  customerName,
}: {
  account: CustomerLoyaltyAccount;
  facilityId: number;
  tierName?: string;
  customerName?: string;
}) {
  const { data: transactions = [] } = useQuery(
    loyaltyQueries.transactions(facilityId, account.customerId),
  );
  return (
    <>
      <SheetHeader>
        <SheetTitle>{customerName ?? `Client #${account.customerId}`}</SheetTitle>
        <SheetDescription>Loyalty balances and transaction history</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Points" value={account.pointsBalance.toLocaleString()} />
          <Stat label="Credit" value={`$${account.creditBalance.toLocaleString()}`} />
          <Stat label="Tier" value={tierName ?? "—"} />
          <Stat label="Redeemed" value={account.lifetimePointsRedeemed.toLocaleString()} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Transaction history</h3>
          <LoyaltyTransactionHistory
            transactions={transactions}
            currentBalance={account.pointsBalance}
          />
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/facility/dashboard/clients/${account.customerId}/loyalty`}>
            Open full profile
            <ExternalLink className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
