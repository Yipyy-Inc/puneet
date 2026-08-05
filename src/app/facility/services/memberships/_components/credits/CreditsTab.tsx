"use client";

import { useMemo, useState } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  History,
  MoreHorizontal,
  Plus,
  RotateCcw,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  useStoreCredit,
  useWriteStoreCredit,
  type StoreCreditAccount,
} from "@/lib/api/store-credit";
import { AddCreditsDialog } from "./AddCreditsDialog";
import { CreditsHistoryDrawer } from "./CreditsHistoryDrawer";

// ============================================================================
// Prepaid credits, which are store credit.
//
// This screen kept `prepaidCredits` — a fixture list, in `useState` — and its
// "Add credits" dialog took a typed-in name and invented a customer id
// (`cust-${Date.now()}`). The till spends `store_credit_entries`. So the
// facility had two balances for one customer and only one of them was ever
// honoured.
//
// ── EVERY FIGURE HERE IS A SUM ────────────────────────────────────────────
//
// The fixture stored `balance`, `totalPurchased`, `totalUsed` and `lastUsedAt`
// side by side with nothing keeping them in step. They are derived from the
// entries now, so they cannot disagree with each other or with the till.
//
// ── THE ROW ACTIONS THAT COULD NOT BE HONEST ARE GONE ─────────────────────
//
// "Remove" deleted the row from local state. The ledger is append-only — it has
// no DELETE policy at all — so un-issuing a credit is not something this screen
// can do, or should. A credit given in error is corrected by an entry that says
// so, which is what "Return balance" writes.
//
// "Refund balance" toasted "Refund initiated" and did nothing whatsoever.
// ============================================================================

type Row = StoreCreditAccount & Record<string, unknown>;

export function CreditsTab() {
  const { data, error } = useStoreCredit();
  const writeCredit = useWriteStoreCredit();
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [active, setActive] = useState<StoreCreditAccount | null>(null);

  // DataTable has no loading prop, so the empty state stands in until the
  // query resolves. It says "no store credit yet", which is briefly wrong and
  // was permanently wrong before this change.
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const entriesFor = (clientRef: number) =>
    (data?.entries ?? []).filter((e) => e.clientRef === clientRef);

  const openHistory = (account: StoreCreditAccount) => {
    setActive(account);
    setHistoryOpen(true);
  };

  /**
   * The customer takes their balance back.
   *
   * A negative `adjustment` bringing the account to zero — not a deletion, and
   * not a toast on its own. Whether the cash physically leaves the drawer is
   * outside this system either way; what this records is that the facility no
   * longer owes it.
   */
  const returnBalance = (account: StoreCreditAccount) => {
    if (account.balance <= 0) {
      toast.info(`${account.clientName} has no balance to return`);
      return;
    }
    writeCredit.mutate(
      {
        clientRef: account.clientRef,
        amount: -account.balance,
        reason: "adjustment",
        note: "Balance returned to customer",
      },
      {
        onSuccess: () =>
          toast.success(
            `$${account.balance.toFixed(2)} returned to ${account.clientName}`,
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const columns: ColumnDef<Row>[] = [
    { key: "clientName", label: "Customer", icon: User, defaultVisible: true },
    {
      key: "balance",
      label: "Balance",
      icon: Wallet,
      defaultVisible: true,
      render: (item) => {
        const balance = item.balance as number;
        return (
          <span
            className={
              balance > 0
                ? "font-medium text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground font-medium"
            }
          >
            ${balance.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "totalIssued",
      label: "Total issued",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => <span>${(item.totalIssued as number).toFixed(2)}</span>,
    },
    {
      key: "totalSpent",
      label: "Spent",
      defaultVisible: true,
      render: (item) => <span>${(item.totalSpent as number).toFixed(2)}</span>,
    },
    {
      key: "lastActivityAt",
      label: "Last movement",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => {
        const at = item.lastActivityAt as string | null;
        return at ? (
          <span>{new Date(at).toLocaleDateString()}</span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        );
      },
    },
    { key: "entryCount", label: "Entries", defaultVisible: false },
  ];

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription>
          Could not load store credit: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Store credit balances, summed from the ledger the till spends from.
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add credits
        </Button>
      </div>

      <DataTable<Row>
        data={accounts as Row[]}
        columns={columns}
        searchKey={"clientName" as keyof Row}
        searchPlaceholder="Search by customer..."
        onRowClick={(item) => openHistory(item as StoreCreditAccount)}
        emptyState={{
          icon: Wallet,
          title: "No store credit yet",
          description:
            "Credit issued here, and credit left over from a refund, both appear on this list.",
        }}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => openHistory(item as StoreCreditAccount)}
              >
                <History className="mr-2 size-4" />
                View history
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => returnBalance(item as StoreCreditAccount)}
                disabled={(item.balance as number) <= 0}
              >
                <RotateCcw className="mr-2 size-4" />
                Return balance
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <AddCreditsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (input) => {
          await writeCredit.mutateAsync({ ...input, reason: "added" });
          toast.success("Credits added", {
            description: `$${input.amount.toFixed(2)} on the customer's account`,
          });
        }}
      />

      <CreditsHistoryDrawer
        account={active}
        entries={active ? entriesFor(active.clientRef) : []}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
