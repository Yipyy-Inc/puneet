"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Hourglass,
  PauseCircle,
  Repeat,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  subscriptionQueries,
  type SubscriptionBillingStatus,
  type SubscriptionRow,
} from "@/lib/api/subscriptions";
import {
  setAutoRenewOverride,
  useAutoRenewOverrides,
} from "@/lib/subscription-auto-renew-store";
import {
  formatCycle,
  formatMoney,
  formatRenewal,
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_TABS,
} from "./subscription-utils";

type TabValue = "all" | SubscriptionBillingStatus;

export function SubscriptionsClient() {
  const router = useRouter();
  const { data: rows = [] } = useQuery(subscriptionQueries.all());
  const overrides = useAutoRenewOverrides();
  const [tab, setTab] = useState<TabValue>("all");

  // Apply any auto-renew toggles made in this session.
  const allRows = useMemo(
    () =>
      rows.map((r) =>
        r.id in overrides ? { ...r, autoRenew: overrides[r.id] } : r,
      ),
    [rows, overrides],
  );

  const kpis = useMemo(() => {
    const count = (s: SubscriptionBillingStatus) =>
      allRows.filter((r) => r.status === s).length;
    return {
      total: allRows.length,
      active: count("active"),
      trial: count("trial"),
      pastDue: count("past_due"),
      paused: count("paused"),
    };
  }, [allRows]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRows.length };
    for (const t of STATUS_TABS) {
      if (t.value !== "all") {
        counts[t.value] = allRows.filter((r) => r.status === t.value).length;
      }
    }
    return counts;
  }, [allRows]);

  const tableData = useMemo(
    () => (tab === "all" ? allRows : allRows.filter((r) => r.status === tab)),
    [allRows, tab],
  );

  const handleToggle = (row: SubscriptionRow, value: boolean) => {
    setAutoRenewOverride(row.id, value);
    toast.success(
      `Auto-renew ${value ? "enabled" : "disabled"} for ${row.facilityName}`,
    );
  };

  const columns: ColumnDef<SubscriptionRow>[] = [
    {
      key: "facilityName",
      label: "Facility Name",
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
      key: "planName",
      label: "Plan",
      sortable: true,
      render: (r) => <Badge variant="secondary">{r.planName}</Badge>,
    },
    {
      key: "billingCycle",
      label: "Billing Cycle",
      sortable: true,
      render: (r) => (
        <span className="text-sm">{formatCycle(r.billingCycle)}</span>
      ),
    },
    {
      key: "mrr",
      label: "MRR",
      sortable: true,
      sortValue: (r) => r.mrr,
      render: (r) => (
        <span className="font-medium tabular-nums">
          {formatMoney(r.mrr, r.currency)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge variant="outline" className={cn(STATUS_BADGE[r.status])}>
          {STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "nextRenewalDate",
      label: "Next Renewal",
      sortable: true,
      sortValue: (r) => r.nextRenewalDate,
      render: (r) => (
        <span className="text-sm tabular-nums">
          {formatRenewal(r.nextRenewalDate)}
        </span>
      ),
    },
    {
      key: "autoRenew",
      label: "Auto-Renew",
      sortable: false,
      render: (r) => (
        // Stop the row's navigation click from firing when toggling.
        <div
          className="flex"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Switch
            checked={r.autoRenew}
            onCheckedChange={(v) => handleToggle(r, v)}
            aria-label={`Toggle auto-renew for ${r.facilityName}`}
          />
        </div>
      ),
    },
  ];

  const exportCsv = () => {
    const headers = [
      "Facility",
      "Facility ID",
      "Plan",
      "Billing Cycle",
      "MRR",
      "Currency",
      "Status",
      "Next Renewal",
      "Auto-Renew",
    ];
    const body = tableData.map((r) => [
      r.facilityName,
      String(r.facilityId),
      r.planName,
      formatCycle(r.billingCycle),
      String(r.mrr),
      r.currency,
      STATUS_LABEL[r.status],
      r.nextRenewalDate,
      r.autoRenew ? "On" : "Off",
    ]);
    const csv = [headers, ...body]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${tab}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-muted-foreground text-sm">
            Every facility&apos;s plan, billing cycle, and renewal status.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="Total Subscriptions"
          value={kpis.total}
          icon={CreditCard}
          tone="indigo"
        />
        <KpiTile
          label="Active"
          value={kpis.active}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Trial"
          value={kpis.trial}
          icon={Hourglass}
          tone="violet"
        />
        <KpiTile
          label="Past Due"
          value={kpis.pastDue}
          icon={AlertTriangle}
          tone="rose"
          alert={
            kpis.pastDue > 0
              ? { label: "Needs attention", tone: "rose" }
              : undefined
          }
        />
        <KpiTile
          label="Paused"
          value={kpis.paused}
          icon={PauseCircle}
          tone="amber"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="text-muted-foreground ml-1.5 text-xs">
                {tabCounts[t.value] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={tableData}
        columns={columns}
        searchKeys={["facilityName", "planName"]}
        searchPlaceholder="Search facility or plan…"
        itemsPerPage={12}
        onRowClick={(r) =>
          router.push(`/dashboard/facilities/${r.facilityId}?tab=billing`)
        }
        emptyState={{
          icon: Repeat,
          title: "No subscriptions yet",
          description:
            "Facility subscriptions will appear here once plans are active.",
        }}
      />
    </div>
  );
}
