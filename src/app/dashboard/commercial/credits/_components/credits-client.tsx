"use client";

import { useMemo, useState } from "react";
import { BadgePercent, Plus, Wallet } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { deriveStatus, useCreditLedger } from "@/lib/credits-store";
import type { LedgerRow } from "@/types/credit-ledger";
import { ApplyCreditModal } from "./apply-credit-modal";
import { ApplyDiscountModal } from "./apply-discount-modal";
import {
  formatDate,
  formatMoney,
  STATUS_BADGE,
  TAB_DEFS,
  type TabValue,
  TYPE_BADGE,
} from "./credit-utils";

export function CreditsClient() {
  const ledger = useCreditLedger();
  const [tab, setTab] = useState<TabValue>("all");
  const [creditOpen, setCreditOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  const rows: LedgerRow[] = useMemo(() => {
    const now = new Date();
    return ledger.map((e) => ({ ...e, status: deriveStatus(e, now) }));
  }, [ledger]);

  const liability = useMemo(
    () =>
      rows
        .filter((r) => r.kind === "credit" && r.status === "active")
        .reduce((sum, r) => sum + r.remaining, 0),
    [rows],
  );

  const counts = useMemo(() => {
    const activeCredits = rows.filter(
      (r) => r.kind === "credit" && r.status === "active",
    ).length;
    const activeDiscounts = rows.filter(
      (r) => r.kind === "discount" && r.status === "active",
    ).length;
    const expired = rows.filter((r) => r.status === "expired").length;
    return {
      all: rows.length,
      active_credits: activeCredits,
      active_discounts: activeDiscounts,
      expired,
    };
  }, [rows]);

  const tableData = useMemo(() => {
    switch (tab) {
      case "active_credits":
        return rows.filter((r) => r.kind === "credit" && r.status === "active");
      case "active_discounts":
        return rows.filter(
          (r) => r.kind === "discount" && r.status === "active",
        );
      case "expired":
        return rows.filter((r) => r.status === "expired");
      default:
        return rows;
    }
  }, [rows, tab]);

  const columns: ColumnDef<LedgerRow>[] = [
    {
      key: "facilityName",
      label: "Facility",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium">{r.facilityName}</p>
          <p className="text-muted-foreground text-xs">
            Facility #{r.facilityId}
          </p>
        </div>
      ),
    },
    {
      key: "kind",
      label: "Type",
      sortable: true,
      render: (r) => (
        <Badge
          variant="outline"
          className={cn("capitalize", TYPE_BADGE[r.kind])}
        >
          {r.kind}
        </Badge>
      ),
    },
    {
      key: "amount",
      label: "Amount / %",
      sortable: true,
      sortValue: (r) =>
        r.valueType === "percent" ? (r.percent ?? 0) : r.amount,
      render: (r) =>
        r.kind === "discount" ? (
          <span className="font-medium tabular-nums">
            {r.valueType === "percent"
              ? `${r.percent}%`
              : formatMoney(r.amount, r.currency)}
            <span className="text-muted-foreground ml-1 text-xs">off</span>
          </span>
        ) : (
          <span className="tabular-nums">
            <span className="font-medium">
              {formatMoney(r.amount, r.currency)}
            </span>
            {r.remaining < r.amount && (
              <span className="text-muted-foreground ml-1 text-xs">
                ({formatMoney(r.remaining, r.currency)} left)
              </span>
            )}
          </span>
        ),
    },
    {
      key: "reason",
      label: "Reason",
      sortable: true,
      render: (r) => <span className="text-sm">{r.reason}</span>,
    },
    {
      key: "appliedBy",
      label: "Applied By",
      sortable: true,
      render: (r) => <span className="text-sm">{r.appliedBy}</span>,
    },
    {
      key: "appliedOn",
      label: "Applied On",
      sortable: true,
      sortValue: (r) => r.appliedOn,
      render: (r) => (
        <span className="text-sm tabular-nums">{formatDate(r.appliedOn)}</span>
      ),
    },
    {
      key: "expiry",
      label: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiry ?? "9999",
      render: (r) => (
        <span className="text-sm tabular-nums">{formatDate(r.expiry)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge
          variant="outline"
          className={cn("capitalize", STATUS_BADGE[r.status])}
        >
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Credits &amp; Discounts
          </h1>
          <p className="text-muted-foreground text-sm">
            Account credits and recurring discounts granted to facilities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDiscountOpen(true)}
            className="border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
          >
            <BadgePercent className="mr-2 size-4" />
            Apply Discount
          </Button>
          <Button
            onClick={() => setCreditOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 size-4" />
            Apply Credit
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Total Outstanding Credit Balance"
          value={formatMoney(liability)}
          hint="Yipyy liability — active credit owed to facilities"
          icon={Wallet}
          tone="rose"
          trail={[
            { label: "Active credits", value: counts.active_credits },
            { label: "Active discounts", value: counts.active_discounts },
            { label: "Expired", value: counts.expired },
          ]}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          {TAB_DEFS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="text-muted-foreground ml-1.5 text-xs">
                {counts[t.value] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={tableData}
        columns={columns}
        searchKeys={["facilityName", "reason", "appliedBy"]}
        searchPlaceholder="Search facility, reason, or admin…"
        itemsPerPage={20}
      />

      <ApplyCreditModal open={creditOpen} onOpenChange={setCreditOpen} />
      <ApplyDiscountModal open={discountOpen} onOpenChange={setDiscountOpen} />
    </div>
  );
}
