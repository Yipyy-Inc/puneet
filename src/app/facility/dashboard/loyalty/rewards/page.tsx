"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RewardTypesEditor } from "@/components/loyalty/config/RewardTypesEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { RewardTypeConfig } from "@/types/loyalty";

export default function RewardsPage() {
  const { config, updateConfig, isPending, isSaving } = useLoyaltyProgram();

  // Derived, not seeded — the programme arrives from a request, and a
  // `useState` initialiser runs before it can. See the badges page.
  const [draft, setDraft] = useState<RewardTypeConfig[] | null>(null);
  const saved = config.rewardTypes;
  const rewardTypes = draft ?? saved;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reward Types</h2>
        <p className="text-muted-foreground text-sm">
          Choose which reward mechanisms customers can redeem points for, and
          set their default expiry, applicability, and restrictions.
        </p>
      </div>

      <RewardTypesEditor value={rewardTypes} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={async () => {
          try {
            await updateConfig({ ...config, rewardTypes });
            setDraft(null);
            toast.success("Reward types saved");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Reward types were not saved.",
            );
          }
        }}
        onReset={() => setDraft(null)}
      />
    </div>
  );
}
