"use client";

import Link from "next/link";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink, Receipt, User, Wallet } from "lucide-react";
import { clients } from "@/data/clients";
import { SOURCE_LABELS } from "@/lib/cash-register";
import type { CapturedCashTxn } from "@/data/cash-drawer";

interface Props {
  txns: CapturedCashTxn[];
  currencySymbol: string;
}

export function CashLedgerTable({ txns, currencySymbol }: Props) {
  const total = txns.reduce((s, t) => s + t.amount, 0);

  const columns: ColumnDef<CapturedCashTxn>[] = [
    {
      key: "capturedAt",
      label: "Time",
      icon: Clock,
      defaultVisible: true,
      sortable: true,
      sortValue: (t) => t.capturedAt,
      render: (t) => (
        <div className="text-xs">
          <div className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="size-3" />
            {new Date(t.capturedAt).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="font-medium tabular-nums">
            {new Date(t.capturedAt).toLocaleTimeString("en-CA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ),
    },
    {
      key: "clientId",
      label: "Client",
      icon: User,
      defaultVisible: true,
      render: (t) => {
        const client = clients.find((c) => c.id === t.clientId);
        return (
          <span className="text-sm">{client?.name ?? `Client #${t.clientId}`}</span>
        );
      },
    },
    {
      key: "description",
      label: "Description",
      defaultVisible: true,
      render: (t) => <span className="text-sm">{t.description}</span>,
    },
    {
      key: "source",
      label: "Source",
      defaultVisible: true,
      render: (t) => (
        <Badge
          variant="outline"
          className="text-[11px] capitalize"
          data-source={t.source}
        >
          {SOURCE_LABELS[t.source]}
        </Badge>
      ),
    },
    {
      key: "link",
      label: "Linked to",
      defaultVisible: true,
      render: (t) => {
        if (t.bookingId) {
          return (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link href={`/facility/dashboard/bookings/${t.bookingId}`}>
                <ExternalLink className="mr-1 size-3" />
                Booking #{t.bookingId}
              </Link>
            </Button>
          );
        }
        if (t.invoiceId) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Receipt className="size-3" />
              {t.invoiceId}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      key: "staffName",
      label: "Captured by",
      icon: User,
      defaultVisible: true,
      render: (t) => <span className="text-xs">{t.staffName}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      icon: Wallet,
      defaultVisible: true,
      sortable: true,
      sortValue: (t) => t.amount,
      render: (t) => (
        <span className="font-semibold tabular-nums text-emerald-700">
          +{currencySymbol}
          {t.amount.toFixed(2)}
        </span>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "source",
      label: "Source",
      options: [
        { value: "all", label: "All sources" },
        { value: "service", label: "Service" },
        { value: "retail", label: "Retail" },
        { value: "deposit", label: "Deposit" },
        { value: "other", label: "Other" },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border bg-emerald-50/40 px-4 py-2.5 text-sm">
        <span>
          {txns.length} cash transaction{txns.length === 1 ? "" : "s"} this
          session
        </span>
        <span className="font-semibold tabular-nums text-emerald-700">
          {currencySymbol}
          {total.toFixed(2)} captured
        </span>
      </div>
      <DataTable
        data={txns}
        columns={columns}
        filters={filters}
        searchKey="description"
        searchPlaceholder="Search description..."
        itemsPerPage={10}
      />
    </div>
  );
}
