"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RewardTypesEditor } from "@/components/loyalty/config/RewardTypesEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";

export default function RewardsPage() {
  const { config, updateConfig } = useLoyaltyProgram();
  const [draft, setDraft] = useState(() => config.rewardTypes);

  const dirty = JSON.stringify(draft) !== JSON.stringify(config.rewardTypes);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reward Types</h2>
        <p className="text-muted-foreground text-sm">
          Choose which reward mechanisms customers can redeem points for, and
          set their default expiry, applicability, and restrictions.
        </p>
      </div>

      <RewardTypesEditor value={draft} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({ ...config, rewardTypes: draft });
          toast.success("Reward types saved");
        }}
        onReset={() => setDraft(config.rewardTypes)}
      />
    </div>
  );
}
