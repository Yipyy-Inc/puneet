"use client";

import Link from "next/link";
import { CreditCard, Receipt, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import type { Transaction } from "@/lib/api/yipyy-pay-transactions";

// ============================================================================
// Every transaction behind the totals.
//
// ── THE IMPORT IS `DataTable`, NOT `data-table` ───────────────────────────
//
// There are two tracked files in `components/ui/` whose names differ only by
// case: `DataTable.tsx` (88 importers, `ColumnDef` = { key, label, render })
// and `data-table.tsx` (7 importers, `{ accessorKey, header, cell }`). They are
// different components. On a case-insensitive filesystem only one of them can
// exist in the working tree at a time, so reading the file locally can return
// the OTHER one's contents — which is exactly how `header` got used against the
// component that wants `label` once already, and failed typecheck in CI where
// the filesystem tells them apart. This one is the canonical component
// CLAUDE.md means. Check `git show HEAD:<path>` rather than the working tree if
// the two ever disagree again.
//
// ── A REFUND IS NEGATIVE AND STAYS NEGATIVE ───────────────────────────────
//
// `amountCents` is signed all the way from the ledger. Rendering the absolute
// value with a red badge would make a refund and a sale sort identically and
// add up wrong in anybody's head. Money returned reads as money returned.
// ============================================================================

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const amount = (Math.abs(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${amount}`;
}

function when(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "—", time: "" };
  return {
    day: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    time: date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const CHANNEL: Record<
  Transaction["channel"],
  { label: string; icon: typeof CreditCard }
> = {
  in_person: { label: "In person", icon: Smartphone },
  online: { label: "Online", icon: CreditCard },
  other: { label: "Other", icon: Receipt },
};

const columns: ColumnDef<Transaction>[] = [
  {
    key: "at",
    label: "When",
    sortable: true,
    sortValue: (row) => row.at,
    render: (row) => {
      const at = when(row.at);
      return (
        <div className="leading-tight">
          <p className="font-medium">{at.day}</p>
          <p className="text-muted-foreground text-xs">{at.time}</p>
        </div>
      );
    },
  },
  {
    key: "amountCents",
    label: "Amount",
    align: "right",
    sortable: true,
    sortValue: (row) => row.amountCents,
    render: (row) => (
      <div className="leading-tight">
        <p
          className={
            row.amountCents < 0
              ? "font-semibold text-amber-600 dark:text-amber-400"
              : "font-semibold"
          }
        >
          {money(row.amountCents)}
        </p>
        {row.tipCents !== 0 && (
          <p className="text-muted-foreground text-xs">
            incl. {money(row.tipCents)} tip
          </p>
        )}
      </div>
    ),
  },
  {
    key: "cardBrand",
    label: "Card",
    render: (row) =>
      row.cardBrand || row.cardLast4 ? (
        <span className="text-sm">
          {row.cardBrand ?? "Card"}
          {row.cardLast4 ? ` ••••${row.cardLast4}` : ""}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm capitalize">
          {row.method?.replace(/-/g, " ") ?? "—"}
        </span>
      ),
  },
  {
    key: "channel",
    label: "Taken",
    render: (row) => {
      const channel = CHANNEL[row.channel];
      const Icon = channel.icon;
      return (
        <div className="flex items-center gap-1.5">
          <Icon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-sm">{channel.label}</span>
        </div>
      );
    },
  },
  {
    key: "service",
    label: "For",
    render: (row) =>
      row.bookingRef ? (
        <div className="leading-tight">
          <p className="text-sm capitalize">{row.service ?? "Booking"}</p>
          <p className="text-muted-foreground text-xs">
            {row.clientName ?? "—"}
            {row.petNames.length > 0 ? ` · ${row.petNames.join(", ")}` : ""}
          </p>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">Not attached</span>
      ),
  },
  {
    key: "kind",
    label: "Status",
    render: (row) => (
      <Badge variant={row.kind === "refund" ? "outline" : "success"}>
        {row.kind === "refund" ? "Refunded" : "Paid"}
      </Badge>
    ),
  },
  {
    key: "cloverPaymentId",
    label: "Clover",
    defaultVisible: false,
    render: (row) =>
      row.cloverPaymentId ? (
        <div className="leading-tight">
          <p className="font-mono text-xs">{row.cloverPaymentId}</p>
          <p className="text-muted-foreground font-mono text-[10px]">
            {row.deviceSerial ?? row.cloverOrderId ?? ""}
          </p>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
];

export function TransactionsTable({
  transactions,
  loading,
  total,
  offset,
  limit,
  onOffset,
}: {
  transactions: Transaction[];
  loading: boolean;
  total: number;
  offset: number;
  limit: number;
  onOffset: (next: number) => void;
}) {
  if (loading) {
    return (
      <div
        data-slot="skeleton"
        className="bg-muted/50 h-[420px] animate-pulse rounded-xl"
      />
    );
  }

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + transactions.length, total);

  return (
    <div className="space-y-3">
      <DataTable
        data={transactions}
        columns={columns}
        // Paging is done by the SERVER — the table is handed exactly one page,
        // so its own pager must not also chop that page into tens.
        itemsPerPage={limit}
        getSearchValue={(row) =>
          [
            row.clientName,
            row.service,
            row.cardLast4,
            row.cloverPaymentId,
            row.bookingRef ? `#${row.bookingRef}` : null,
            ...row.petNames,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search customer, pet, card, booking…"
        emptyState={{
          icon: Receipt,
          title: "No payments in this period",
          description:
            "Card payments appear here as Clover takes them. Cash and e-transfers appear as staff record them.",
        }}
        rowClassName={(row) =>
          row.kind === "refund" ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
        }
        actions={(row) =>
          row.bookingRef ? (
            <Button asChild size="sm" variant="ghost">
              <Link
                href={`/facility/dashboard/clients?booking=${row.bookingRef}`}
              >
                Booking #{row.bookingRef}
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Server paging. Shown only when there is more than one page, because a
          pager under a six-row table invites people to look for rows that are
          not missing. */}
      {total > limit && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {from}–{to} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0}
              onClick={() => onOffset(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={to >= total}
              onClick={() => onOffset(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
