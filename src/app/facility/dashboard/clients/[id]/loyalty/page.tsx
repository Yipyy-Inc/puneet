"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Coins, Crown, Gift, Wallet, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loyaltyLedgerQueries,
  useOpenLoyaltyAccount,
} from "@/lib/api/loyalty-ledger";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdjustPointsModal } from "@/components/loyalty/AdjustPointsModal";
import { LoyaltyTransactionHistory } from "@/components/loyalty/LoyaltyTransactionHistory";

const ADJUST_ROLES = ["owner", "general_manager", "department_manager"];

export default function ClientLoyaltyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientRef = parseInt(id, 10);

  const { config } = useLoyaltyProgram();
  const { user } = useCurrentUser();
  const canAdjust = ADJUST_ROLES.includes(user.role);

  // ── FROM POSTGRES ──────────────────────────────────────────────────────
  //
  // Balance, credit and history all came from `src/data/loyalty-*` keyed by a
  // numeric customer id. `null` from this query is a real answer — a customer
  // who has never been enrolled — and is not the same as a request that has not
  // finished, which is why `isPending` is checked separately below.
  const { data: account, isPending } = useQuery(
    loyaltyLedgerQueries.accountForClient(clientRef),
  );
  const { data: transactions = [] } = useQuery(
    loyaltyLedgerQueries.transactions(account?.id),
  );

  const openAccount = useOpenLoyaltyAccount();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const tier = account?.currentTierId
    ? config.tierDefinitions?.find((t) => t.id === account.currentTierId)
    : undefined;

  // The mutations invalidate the whole ledger key themselves, so there is
  // nothing for a caller to remember to refresh.
  const refresh = () => {};

  const handleEnrol = async () => {
    try {
      await openAccount.mutateAsync({ clientRef });
      toast.success("Loyalty account opened");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The account was not opened.",
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Star className="text-primary size-5" />
            Loyalty
          </h2>
          <p className="text-muted-foreground text-sm">
            Points balance, tier, and transaction history for this customer.
          </p>
        </div>
        {canAdjust && account && (
          <Button onClick={() => setAdjustOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Adjust Points
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !account ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Star className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No loyalty account yet</p>
            <p className="text-muted-foreground max-w-md text-sm">
              This customer is not in the programme. Opening an account starts
              them at zero points — nothing is awarded until they earn it or a
              member of staff grants it.
            </p>
            {/* The old copy promised an account would appear "automatically
                when this customer next books". Nothing did that, so the screen
                said no and meant never. This button is the thing that does it. */}
            {canAdjust && (
              <Button
                onClick={() => void handleEnrol()}
                disabled={openAccount.isPending}
              >
                <Plus className="mr-1.5 size-4" />
                {openAccount.isPending ? "Opening…" : "Open a loyalty account"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Points Balance"
              value={account.pointsBalance.toLocaleString()}
              hint={`${account.lifetimePointsEarned.toLocaleString()} lifetime`}
              icon={Coins}
              tone="amber"
            />
            <KpiTile
              label="Tier"
              value={tier?.name ?? "—"}
              hint={tier ? `${tier.icon} member` : "No tier"}
              icon={Crown}
              tone="violet"
            />
            <KpiTile
              label="Credit"
              value={`$${account.creditBalance.toLocaleString()}`}
              hint="Account credit"
              icon={Wallet}
              tone="emerald"
            />
            <KpiTile
              label="Redeemed"
              value={account.lifetimePointsRedeemed.toLocaleString()}
              hint="Lifetime points redeemed"
              icon={Gift}
              tone="indigo"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <LoyaltyTransactionHistory
                transactions={transactions}
                currentBalance={account.pointsBalance}
              />
            </CardContent>
          </Card>

          <AdjustPointsModal
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
            accountId={account.id}
            currentBalance={account.pointsBalance}
            onAdjusted={refresh}
          />
        </>
      )}
    </div>
  );
}
