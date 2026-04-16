"use client";

import { useState } from "react";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Crown,
  DollarSign,
  User,
  CircleDot,
  Download,
  Users,
  TrendingUp,
  CreditCard,
  Mail as MailIcon,
} from "lucide-react";
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
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-sky-200 text-sky-700",
    "bg-violet-200 text-violet-700",
    "bg-emerald-200 text-emerald-700",
    "bg-amber-200 text-amber-700",
    "bg-rose-200 text-rose-700",
    "bg-indigo-200 text-indigo-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const exportToCSV = (data: Membership[]) => {
  const headers = [
    "ID",
    "Customer",
    "Email",
    "Plan",
    "Billing Cycle",
    "Price",
    "Status",
    "Next Billing",
  ];
  const csvContent = [
    headers.join(","),
    ...data.map((m) =>
      [
        m.id,
        `"${m.customerName}"`,
        m.customerEmail,
        `"${m.planName}"`,
        m.billingCycle,
        m.monthlyPrice.toFixed(2),
        m.status,
        m.nextBillingDate,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute(
    "download",
    `subscribers_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function SubscribersTab() {
  const [rows, setRows] = useState<Membership[]>(seedMemberships);
  const [active, setActive] = useState<Membership | null>(null);
  const [open, setOpen] = useState(false);

  const handleUpdate = (m: Membership) => {
    setRows((prev) => prev.map((r) => (r.id === m.id ? m : r)));
    setActive(m);
  };

  const activeCount = rows.filter((r) => r.status === "active").length;
  const pausedCount = rows.filter((r) => r.status === "paused").length;
  const monthlyRevenue = rows
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.monthlyPrice, 0);
  const avgPrice =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.monthlyPrice, 0) / rows.length)
      : 0;

  const columns: ColumnDef<Row>[] = [
    {
      key: "customerName",
      label: "Subscriber",
      icon: User,
      defaultVisible: true,
      render: (item) => {
        const name = item.customerName as string;
        const email = item.customerEmail as string;
        const status = item.status as MembershipStatus;
        const avatarUrl = item.customerAvatarUrl as string | undefined;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ring-2 ring-slate-100 ${avatarUrl ? "" : getAvatarColor(name)}`}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="size-full object-cover" />
              ) : (
                getInitials(name)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                <span
                  className={`size-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : status === "paused" ? "bg-amber-400" : "bg-slate-400"}`}
                />
                <span className="text-muted-foreground capitalize">
                  {statusLabel[status]}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "customerEmail",
      label: "Email",
      icon: MailIcon,
      defaultVisible: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <MailIcon className="size-3.5 text-sky-500" />
          {item.customerEmail as string}
        </span>
      ),
    },
    {
      key: "planName",
      label: "Plan",
      icon: Crown,
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant="outline"
          className="border-violet-200 bg-violet-50/80 text-xs font-medium text-violet-700"
        >
          <Crown className="mr-1 size-3" />
          {item.planName as string}
        </Badge>
      ),
    },
    {
      key: "billingCycle",
      label: "Cycle",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant="outline"
          className="border-indigo-200 bg-indigo-50/80 text-[11px] font-medium text-indigo-700 capitalize"
        >
          {item.billingCycle as string}
        </Badge>
      ),
    },
    {
      key: "monthlyPrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
          <DollarSign className="size-3.5 text-emerald-500" />
          {(item.monthlyPrice as number).toFixed(2)}
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
        if (remaining === -1)
          return (
            <Badge
              variant="outline"
              className="border-sky-200 bg-sky-50 text-xs text-sky-700"
            >
              Unlimited
            </Badge>
          );
        return (
          <span className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{remaining}</span>
            <span className="text-muted-foreground">/{total}</span>
          </span>
        );
      },
    },
    {
      key: "nextBillingDate",
      label: "Next billing",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="size-3.5 text-slate-400" />
          {item.nextBillingDate as string}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CircleDot,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-sky-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit rounded-full px-3 py-1 text-[11px] uppercase"
            >
              Membership Management
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Subscribers
              </h2>
              <p className="text-muted-foreground text-sm">
                All clients with active membership plans
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {rows.length} total
              </Badge>
              <Badge className="bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-100">
                {activeCount} active
              </Badge>
              {pausedCount > 0 && (
                <Badge className="bg-amber-100 text-xs text-amber-700 hover:bg-amber-100">
                  {pausedCount} paused
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90"
              onClick={() => exportToCSV(rows)}
            >
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-sky-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-muted-foreground text-xs">All membership plans</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-emerald-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscribers
            </CardTitle>
            <CircleDot className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-violet-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="size-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlyRevenue.toFixed(0)}
            </div>
            <p className="text-muted-foreground text-xs">From active plans</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-indigo-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Plan Price</CardTitle>
            <CreditCard className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPrice}</div>
            <p className="text-muted-foreground text-xs">Per subscriber/mo</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <CardTitle className="text-base">Subscriber Directory</CardTitle>
            <p className="text-muted-foreground text-xs">
              {rows.length} subscriber{rows.length === 1 ? "" : "s"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative rounded-xl border border-slate-200/80 bg-linear-to-br from-violet-50/60 via-white to-sky-50/50 p-2.5">
            <div className="overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="[&_tbody_td]:py-3 [&_tbody_td]:align-middle [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_thead_th]:bg-slate-50/90 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 [&_thead_th]:uppercase">
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
                  rowClassName={(item) =>
                    (item as Membership).status === "active"
                      ? "bg-white/95 hover:bg-emerald-50/40 border-b border-slate-100/80 [&>td]:py-3"
                      : "bg-slate-50/60 hover:bg-slate-100/80 border-b border-slate-100/80 [&>td]:py-3"
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscriptionDetailSheet
        membership={active}
        open={open}
        onOpenChange={setOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
