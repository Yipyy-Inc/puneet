"use client";

import { useState } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  User,
  Wallet,
  Calendar,
  DollarSign,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  prepaidCredits as seedCredits,
  type PrepaidCredits,
} from "@/data/services-pricing";
import { AddCreditsDialog } from "./AddCreditsDialog";
import { CreditsHistoryDrawer } from "./CreditsHistoryDrawer";
import { toast } from "sonner";

type Row = PrepaidCredits & Record<string, unknown>;

function makeId() {
  return `credit-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreditsTab() {
  const [rows, setRows] = useState<PrepaidCredits[]>(seedCredits);
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [active, setActive] = useState<PrepaidCredits | null>(null);

  const openHistory = (c: PrepaidCredits) => {
    setActive(c);
    setHistoryOpen(true);
  };

  const columns: ColumnDef<Row>[] = [
    { key: "customerName", label: "Customer", icon: User, defaultVisible: true },
    {
      key: "balance",
      label: "Balance",
      icon: Wallet,
      defaultVisible: true,
      render: (item) => (
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          ${(item.balance as number).toFixed(2)}
        </span>
      ),
    },
    {
      key: "totalPurchased",
      label: "Total purchased",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <span>${(item.totalPurchased as number).toFixed(2)}</span>
      ),
    },
    {
      key: "totalUsed",
      label: "Used",
      defaultVisible: true,
      render: (item) => <span>${(item.totalUsed as number).toFixed(2)}</span>,
    },
    {
      key: "expiresAt",
      label: "Expires",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => {
        const exp = item.expiresAt as string | undefined;
        if (!exp) return <span className="text-muted-foreground">Never</span>;
        const expired = new Date(exp) < new Date();
        return (
          <span className={expired ? "text-red-700 dark:text-red-400" : ""}>
            {exp}
            {expired && " (expired)"}
          </span>
        );
      },
    },
    {
      key: "lastUsedAt",
      label: "Last used",
      defaultVisible: false,
      render: (item) => {
        const d = item.lastUsedAt as string | undefined;
        return d ? (
          <span>{d}</span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add credits
        </Button>
      </div>

      <DataTable<Row>
        data={rows as Row[]}
        columns={columns}
        searchKey={"customerName" as keyof Row}
        searchPlaceholder="Search by customer..."
        onRowClick={(item) => openHistory(item as PrepaidCredits)}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => openHistory(item as PrepaidCredits)}>
                <History className="mr-2 size-4" />
                View history
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info("Refund initiated", {
                    description: (item as PrepaidCredits).customerName,
                  })
                }
              >
                <RotateCcw className="mr-2 size-4" />
                Refund balance
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  setRows((prev) =>
                    prev.filter((r) => r.id !== (item as PrepaidCredits).id),
                  )
                }
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <AddCreditsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={({ customerName, amount, expiresAt }) => {
          const entry: PrepaidCredits = {
            id: makeId(),
            customerId: `cust-${Date.now()}`,
            customerName,
            balance: amount,
            totalPurchased: amount,
            totalUsed: 0,
            expiresAt,
            transactions: [
              {
                id: `txn-${Date.now()}`,
                type: "purchase",
                amount,
                description: "Prepaid credit purchase",
                date: new Date().toISOString(),
              },
            ],
          };
          setRows((prev) => [entry, ...prev]);
        }}
      />

      <CreditsHistoryDrawer
        credits={active}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
