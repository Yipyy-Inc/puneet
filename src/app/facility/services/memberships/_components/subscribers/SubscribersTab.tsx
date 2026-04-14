"use client";

import { useState } from "react";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Calendar, Crown, DollarSign, User, CircleDot } from "lucide-react";
import {
  memberships as seedMemberships,
  type Membership,
  type MembershipStatus,
} from "@/data/services-pricing";
import { SubscriptionDetailSheet } from "./SubscriptionDetailSheet";

type Row = Membership & Record<string, unknown>;

const statusTone: Record<MembershipStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  paused:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  cancelled:
    "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

const statusLabel: Record<MembershipStatus, string> = {
  active: "In subscription",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
};

export function SubscribersTab() {
  const [rows, setRows] = useState<Membership[]>(seedMemberships);
  const [active, setActive] = useState<Membership | null>(null);
  const [open, setOpen] = useState(false);

  const handleUpdate = (m: Membership) => {
    setRows((prev) => prev.map((r) => (r.id === m.id ? m : r)));
    setActive(m);
  };

  const columns: ColumnDef<Row>[] = [
    {
      key: "customerName",
      label: "Customer",
      icon: User,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.customerName as string}</div>
          <div className="text-muted-foreground text-xs">
            {item.customerEmail as string}
          </div>
        </div>
      ),
    },
    {
      key: "planName",
      label: "Plan",
      icon: Crown,
      defaultVisible: true,
    },
    {
      key: "billingCycle",
      label: "Cycle",
      defaultVisible: true,
      render: (item) => (
        <span className="capitalize">{item.billingCycle as string}</span>
      ),
    },
    {
      key: "monthlyPrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <span className="font-medium">
          ${(item.monthlyPrice as number).toFixed(2)}
        </span>
      ),
    },
    {
      key: "creditsRemaining",
      label: "Credits",
      defaultVisible: true,
      render: (item) => {
        const remaining = item.creditsRemaining as number;
        const total = item.creditsTotal as number;
        if (remaining === -1) return <span>Unlimited</span>;
        return (
          <span>
            {remaining} / {total}
          </span>
        );
      },
    },
    {
      key: "nextBillingDate",
      label: "Next billing",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => {
        const s = item.status as MembershipStatus;
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[s]}`}
          >
            <CircleDot className="size-3" />
            {statusLabel[s]}
          </span>
        );
      },
    },
    {
      key: "autoRenew",
      label: "Auto-renew",
      defaultVisible: false,
      render: (item) =>
        (item.autoRenew as boolean) ? (
          <Badge variant="outline">On</Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "cancelled", label: "Cancelled" },
        { value: "expired", label: "Expired" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "billingCycle",
      label: "Cycle",
      options: [
        { value: "all", label: "All cycles" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "annually", label: "Annually" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<Row>
        data={rows as Row[]}
        columns={columns}
        filters={filters}
        searchKey={"customerName" as keyof Row}
        searchPlaceholder="Search subscribers by name..."
        onRowClick={(item) => {
          setActive(item as Membership);
          setOpen(true);
        }}
      />

      <SubscriptionDetailSheet
        membership={active}
        open={open}
        onOpenChange={setOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
