"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgesEditor } from "@/components/loyalty/config/BadgesEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { Badge } from "@/types/loyalty";

export default function BadgesPage() {
  const { config, updateConfig } = useLoyaltyProgram();
  const [draft, setDraft] = useState<Badge[]>(() => config.badges ?? []);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(config.badges ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Achievement Badges</h2>
        <p className="text-muted-foreground text-sm">
          Reward customer milestones — visit counts, spend, consecutive months,
          referrals, or reviews — with an optional bonus.
        </p>
      </div>

      <BadgesEditor value={draft} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({ ...config, badges: draft });
          toast.success("Badges saved");
        }}
        onReset={() => setDraft(config.badges ?? [])}
      />
    </div>
  );
}
