"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDraftInvoiceForFacility } from "@/data/platform-invoices";
import { cn } from "@/lib/utils";
import { platformInvoiceQueries } from "@/lib/api/platform-invoices";
import type {
  InvoicePayment,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from "@/types/platform-invoices";
import {
  CreateInvoiceDialog,
  type InvoiceFacilityOption,
} from "./create-invoice-dialog";
import { InvoiceDetailDrawer } from "./invoice-detail-drawer";
import {
  RANGE_OPTIONS,
  STATUS_BADGE,
  STATUS_TABS,
  type RangePreset,
  formatDate,
  formatMoney,
  hoursUntil,
  invoiceTotals,
  isCurrentMonth,
  isWithinRange,
  rangeFromPreset,
} from "./invoice-utils";

export function PlatformInvoicesClient() {
  const { data, isLoading } = useQuery(platformInvoiceQueries.list());

  const [now] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Record<string, PlatformInvoice>>(
    {},
  );
  const [created, setCreated] = useState<PlatformInvoice[]>([]);
  const [tab, setTab] = useState<"All" | PlatformInvoiceStatus>("All");
  const [preset, setPreset] = useState<RangePreset>("3m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Deep-link: global search navigates here with ?invoice=<id> to open the drawer.
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    searchParams.get("invoice"),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<PlatformInvoice | null>(null);

  const baseInvoices = useMemo(() => data ?? [], [data]);

  const invoices = useMemo(
    () => [...created, ...baseInvoices.map((i) => overrides[i.id] ?? i)],
    [created, baseInvoices, overrides],
  );

  const byId = useMemo(
    () => new Map(invoices.map((i) => [i.id, i])),
    [invoices],
  );

  const range = rangeFromPreset(preset, now, customFrom, customTo);
  const rangeFiltered = useMemo(
    () =>
      invoices.filter((i) => isWithinRange(i.issuedDate, range.from, range.to)),
    [invoices, range.from, range.to],
  );

  const totalInvoicedMonth = useMemo(
    () =>
      invoices
        .filter((i) => isCurrentMonth(i.issuedDate, now))
        .reduce((s, i) => s + i.amount, 0),
    [invoices, now],
  );
  const totals = invoiceTotals(rangeFiltered);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: rangeFiltered.length };
    for (const t of STATUS_TABS) {
      if (t.value === "All") continue;
      counts[t.value] = rangeFiltered.filter(
        (i) => i.status === t.value,
      ).length;
    }
    return counts;
  }, [rangeFiltered]);

  const tableData = useMemo(
    () =>
      tab === "All"
        ? rangeFiltered
        : rangeFiltered.filter((i) => i.status === tab),
    [rangeFiltered, tab],
  );

  const facilityOptions: InvoiceFacilityOption[] = useMemo(() => {
    const map = new Map<number, InvoiceFacilityOption>();
    for (const i of invoices) {
      if (!map.has(i.facilityId)) {
        map.set(i.facilityId, {
          id: i.facilityId,
          name: i.facilityName,
          plan: i.planName,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const rangeLabel =
    RANGE_OPTIONS.find((r) => r.value === preset)?.label ?? "Selected range";

  // --- mutations -----------------------------------------------------------

  function applyUpdate(
    inv: PlatformInvoice,
    updates: Partial<PlatformInvoice>,
  ) {
    const next = { ...inv, ...updates };
    if (created.some((c) => c.id === inv.id)) {
      setCreated((prev) => prev.map((c) => (c.id === inv.id ? next : c)));
    } else {
      setOverrides((prev) => ({ ...prev, [inv.id]: next }));
    }
  }

  function handleDownloadPdf(inv: PlatformInvoice) {
    toast.success(`${inv.number} — PDF generated`);
  }
  function handleSendEmail(inv: PlatformInvoice) {
    applyUpdate(inv, { status: "Sent", autoSendAt: null });
    toast.success(`${inv.number} emailed to ${inv.facilityName}`);
  }
  function handlePay(
    inv: PlatformInvoice,
    payment: Omit<InvoicePayment, "id">,
  ) {
    applyUpdate(inv, {
      status: "Paid",
      paidDate: payment.date,
      payments: [
        ...inv.payments,
        { ...payment, id: `pay-manual-${inv.id}-${inv.payments.length}` },
      ],
    });
    toast.success(`Payment recorded — ${inv.number} marked paid`);
  }
  function confirmVoid() {
    if (!voidTarget) return;
    applyUpdate(voidTarget, { status: "Void", autoSendAt: null });
    toast.success(`${voidTarget.number} voided`);
    setVoidTarget(null);
  }
  function handleCreate(facilityId: number) {
    const draft = buildDraftInvoiceForFacility(
      facilityId,
      now,
      String(Date.now()),
    );
    if (!draft) return;
    setCreated((prev) => [draft, ...prev]);
    toast.success(`Draft ${draft.number} created`);
  }

  // --- table columns -------------------------------------------------------

  const columns: ColumnDef<PlatformInvoice>[] = [
    {
      key: "number",
      label: "Invoice #",
      sortable: true,
      render: (i) => <span className="font-medium">{i.number}</span>,
    },
    { key: "facilityName", label: "Facility", sortable: true },
    { key: "planName", label: "Plan", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      sortValue: (i) => i.amount,
      render: (i) => (
        <span className="tabular-nums">
          {formatMoney(i.amount, i.currency)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (i) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className={cn(STATUS_BADGE[i.status])}>
            {i.status}
          </Badge>
          {i.status === "Draft" && i.autoSendAt && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Auto-sends ~{hoursUntil(i.autoSendAt, now)}h
            </p>
          )}
        </div>
      ),
    },
    {
      key: "issuedDate",
      label: "Issued",
      sortable: true,
      render: (i) => formatDate(i.issuedDate),
    },
    {
      key: "dueDate",
      label: "Due",
      sortable: true,
      render: (i) => formatDate(i.dueDate),
    },
    {
      key: "paidDate",
      label: "Paid",
      sortable: true,
      render: (i) => formatDate(i.paidDate),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Subscription billing across all facilities.
          </p>
        </div>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          Create Invoice
        </Button>
      </div>

      {/* Auto-generation notice */}
      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm">
        <Clock className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="text-muted-foreground">
          Draft invoices are auto-generated at the start of each billing cycle.
          Review them within{" "}
          <span className="text-foreground font-medium">24 hours</span> or they
          are automatically sent to the facility.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total Invoiced"
          value={formatMoney(totalInvoicedMonth)}
          hint="This month"
          icon={FileText}
          tone="indigo"
        />
        <KpiTile
          label="Collected"
          value={formatMoney(totals.collected)}
          hint={rangeLabel}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Outstanding"
          value={formatMoney(totals.outstanding)}
          hint={rangeLabel}
          icon={Clock}
          tone="amber"
        />
        <KpiTile
          label="Overdue"
          value={formatMoney(totals.overdue)}
          hint={rangeLabel}
          icon={AlertTriangle}
          tone={totals.overdue > 0 ? "rose" : "slate"}
          alert={
            totals.overdue > 0
              ? { label: "Action needed", tone: "rose" }
              : undefined
          }
        />
      </div>

      {/* Tabs + date range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
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

        <div className="flex items-center gap-2">
          <Select
            value={preset}
            onValueChange={(v) => setPreset(v as RangePreset)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <>
              <DatePicker
                value={customFrom}
                onValueChange={(v) => setCustomFrom(v)}
                placeholder="From"
                className="w-36"
              />
              <DatePicker
                value={customTo}
                onValueChange={(v) => setCustomTo(v)}
                placeholder="To"
                className="w-36"
              />
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          searchKeys={["number", "facilityName", "planName"]}
          searchPlaceholder="Search invoice #, facility, or plan…"
          itemsPerPage={12}
          onRowClick={(i) => setSelectedId(i.id)}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <InvoiceDetailDrawer
          invoice={selected}
          onClose={() => setSelectedId(null)}
          onDownloadPdf={handleDownloadPdf}
          onSendEmail={handleSendEmail}
          onVoid={(inv) => setVoidTarget(inv)}
          onPay={handlePay}
        />
      )}

      {/* Create dialog */}
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        facilities={facilityOptions}
        onCreate={handleCreate}
      />

      {/* Void confirm */}
      <AlertDialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Voiding {voidTarget?.number} marks it as uncollectible and removes
              it from outstanding balances. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmVoid}
            >
              Void invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
