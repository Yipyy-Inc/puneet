"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgesEditor } from "@/components/loyalty/config/BadgesEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { Badge } from "@/types/loyalty";

export default function BadgesPage() {
  const { config, updateConfig, isPending, isSaving } = useLoyaltyProgram();

  // ── DERIVED, NOT SEEDED ─────────────────────────────────────────────────
  //
  // Was `useState(() => config.badges ?? [])`. That initialiser runs on the
  // first render, and the programme now arrives from a request that cannot
  // have answered by then — so the editor would latch onto the empty fallback
  // and Save would write it over the facility's real badges. `null` means
  // "nothing edited yet"; the stored list shows through until it is.
  const [draft, setDraft] = useState<Badge[] | null>(null);
  const saved = config.badges ?? [];
  const badges = draft ?? saved;
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
        <h2 className="text-lg font-semibold">Achievement Badges</h2>
        <p className="text-muted-foreground text-sm">
          Reward customer milestones — visit counts, spend, consecutive months,
          referrals, or reviews — with an optional bonus.
        </p>
      </div>

      <BadgesEditor value={badges} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={async () => {
          // Awaited, and the failure reported. RLS refuses this write without
          // `manage_settings`; an unawaited one would show the same "saved"
          // toast for a refusal as for a success.
          try {
            await updateConfig({ ...config, badges });
            setDraft(null);
            toast.success("Badges saved");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Badges were not saved.",
            );
          }
        }}
        onReset={() => setDraft(null)}
      />
    </div>
  );
}
