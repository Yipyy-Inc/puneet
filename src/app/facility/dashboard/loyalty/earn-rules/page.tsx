"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EarnRuleListEditor } from "@/components/loyalty/config/EarnRuleListEditor";
import { EarnRulesEditor } from "@/components/loyalty/config/EarnRulesEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { FutureChangesNotice } from "@/components/loyalty/config/FutureChangesNotice";
import {
  getActiveEarnRules,
  getArchivedEarnRules,
  reconcileEarnRules,
} from "@/lib/loyalty/earn-rule-versioning";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { EarnRule, PointsEarningRule } from "@/types/loyalty";

export default function EarnRulesPage() {
  const { config, updateConfig, facilityId } = useLoyaltyProgram();

  const [rules, setRules] = useState<EarnRule[]>(() =>
    getActiveEarnRules(config.earnRules ?? []),
  );
  const [legacyRule, setLegacyRule] = useState<PointsEarningRule>(
    () => config.pointsEarning,
  );
  const [showLegacy, setShowLegacy] = useState(false);

  const storedActive = getActiveEarnRules(config.earnRules ?? []);
  const archivedCount = getArchivedEarnRules(config.earnRules ?? []).length;

  const dirty =
    JSON.stringify(rules) !== JSON.stringify(storedActive) ||
    JSON.stringify(legacyRule) !== JSON.stringify(config.pointsEarning);

  const handleReset = () => {
    setRules(getActiveEarnRules(config.earnRules ?? []));
    setLegacyRule(config.pointsEarning);
  };

  const handleSave = () => {
    const reconciled = reconcileEarnRules(config.earnRules ?? [], rules);
    updateConfig({
      ...config,
      earnRules: reconciled,
      pointsEarning: legacyRule,
    });
    // Re-sync local draft to the persisted active set (new versions get new ids).
    setRules(getActiveEarnRules(reconciled));
    toast.success("Earn rules saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Earn Rules</h2>
        <p className="text-muted-foreground text-sm">
          Define how customers earn rewards. Each rule targets a trigger
          (booking, spend, visit count, birthday, referral, and more), grants a
          reward, can be limited to specific services, and can run always, over
          a date range, or on recurring days.
        </p>
      </div>

      <FutureChangesNotice />

      <EarnRuleListEditor
        value={rules}
        onChange={setRules}
        facilityId={facilityId}
      />

      {archivedCount > 0 && (
        <p className="text-muted-foreground text-xs">
          {archivedCount} archived rule version
          {archivedCount === 1 ? "" : "s"} retained for transaction history.
        </p>
      )}

      {/* Legacy points-calculation engine rule */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowLegacy((s) => !s)}
          className="hover:bg-muted/40 flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors"
        >
          {showLegacy ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          Points calculation engine (legacy)
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            Drives automatic point totals
          </span>
        </button>
        {showLegacy && (
          <div className="border-t p-4">
            <p className="text-muted-foreground mb-4 text-sm">
              This single rule is consumed by the points-calculation engine
              (<code>calculatePointsEarned</code>). The trigger-based earn rules
              above are the newer model; the engine will be migrated to consume
              them.
            </p>
            <EarnRulesEditor value={legacyRule} onChange={setLegacyRule} />
          </div>
        )}
      </div>

      <SaveBar dirty={dirty} onSave={handleSave} onReset={handleReset} />
    </div>
  );
}
