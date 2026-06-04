"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { Coins, Crown, Gift, Wallet, Plus, Star } from "lucide-react";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdjustPointsModal } from "@/components/loyalty/AdjustPointsModal";
import type { LoyaltyTransaction } from "@/types/loyalty";

const TYPE_LABEL: Record<LoyaltyTransaction["transactionType"], string> = {
  earned: "Earned",
  redeemed: "Redeemed",
  expired: "Expired",
  adjusted: "Adjustment",
  manual_adjustment: "Staff adjustment",
  referral: "Referral",
};

const ADJUST_ROLES = ["owner", "general_manager", "department_manager"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientLoyaltyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const customerId = parseInt(id, 10);

  const { config, facilityId } = useLoyaltyProgram();
  const { user } = useCurrentUser();
  const canAdjust = ADJUST_ROLES.includes(user.role);

  const queryClient = useQueryClient();
  const { data: account } = useQuery(
    loyaltyQueries.account(facilityId, customerId),
  );
  const { data: transactions = [] } = useQuery(
    loyaltyQueries.transactions(facilityId, customerId),
  );

  const [adjustOpen, setAdjustOpen] = useState(false);

  const tier = account?.currentTierId
    ? config.tierDefinitions?.find((t) => t.id === account.currentTierId)
    : undefined;

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["loyalty", "account", facilityId, customerId],
    });
    queryClient.invalidateQueries({
      queryKey: ["loyalty", "transactions", facilityId, customerId],
    });
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

      {!account ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Star className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No loyalty account yet</p>
            <p className="text-muted-foreground max-w-md text-sm">
              A loyalty account is created automatically when this customer next
              books at a facility with an active program.
            </p>
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
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No transactions yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {transactions.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              t.transactionType === "manual_adjustment"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {TYPE_LABEL[t.transactionType]}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(t.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{t.description}</p>
                        {t.staffName && (
                          <p className="text-muted-foreground text-xs">
                            by {t.staffName}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          t.points > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {t.points > 0 ? "+" : ""}
                        {t.points.toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <AdjustPointsModal
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
            facilityId={facilityId}
            customerId={customerId}
            currentBalance={account.pointsBalance}
            onAdjusted={refresh}
          />
        </>
      )}
    </div>
  );
}
