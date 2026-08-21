"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ReferralProgramEditor } from "@/components/loyalty/config/ReferralProgramEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { ReferralProgramConfig } from "@/types/loyalty";

export default function ReferralsPage() {
  const { config, updateConfig, isPending, isSaving } = useLoyaltyProgram();

  // `undefined` is a legitimate stored value here (no referral programme), so
  // "nothing edited yet" cannot be represented by it. A wrapper object gives
  // the two states somewhere separate to live.
  const [draft, setDraft] = useState<{
    value: ReferralProgramConfig | undefined;
  } | null>(null);
  const saved = config.referralProgram;
  const referralProgram = draft ? draft.value : saved;
  const dirty =
    draft !== null && JSON.stringify(draft.value) !== JSON.stringify(saved);

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
        <h2 className="text-lg font-semibold">Referral Program</h2>
        <p className="text-muted-foreground text-sm">
          Configure referrer and referee rewards, when they&apos;re issued, and
          how referral codes are generated. Per-customer codes are created
          automatically once enabled.
        </p>
      </div>

      <ReferralProgramEditor
        value={referralProgram}
        onChange={(value) => setDraft({ value })}
      />

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={async () => {
          try {
            await updateConfig({ ...config, referralProgram });
            setDraft(null);
            toast.success("Referral program saved");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "The referral program was not saved.",
            );
          }
        }}
        onReset={() => setDraft(null)}
      />
    </div>
  );
}
