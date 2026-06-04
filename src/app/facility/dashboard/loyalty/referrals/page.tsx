"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ReferralProgramEditor } from "@/components/loyalty/config/ReferralProgramEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { ReferralProgramConfig } from "@/types/loyalty";

export default function ReferralsPage() {
  const { config, updateConfig } = useLoyaltyProgram();
  const [draft, setDraft] = useState<ReferralProgramConfig | undefined>(
    () => config.referralProgram,
  );

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(config.referralProgram);

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

      <ReferralProgramEditor value={draft} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({ ...config, referralProgram: draft });
          toast.success("Referral program saved");
        }}
        onReset={() => setDraft(config.referralProgram)}
      />
    </div>
  );
}
