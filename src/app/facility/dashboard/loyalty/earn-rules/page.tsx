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
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { EarnRule, PointsEarningRule } from "@/types/loyalty";

export default function EarnRulesPage() {
  const { config, updateConfig, facilityId, isPending, isSaving } =
    useLoyaltyProgram();

  // Derived, not seeded — an earn rule decides what a customer is owed, and a
  // `useState` initialiser runs before the programme has been read. See the
  // badges page.
  const [ruleDraft, setRuleDraft] = useState<EarnRule[] | null>(null);
  const [legacyDraft, setLegacyDraft] = useState<PointsEarningRule | null>(
    null,
  );
  const [showLegacy, setShowLegacy] = useState(false);

  const storedActive = getActiveEarnRules(config.earnRules ?? []);
  const archivedCount = getArchivedEarnRules(config.earnRules ?? []).length;

  const rules = ruleDraft ?? storedActive;
  const legacyRule = legacyDraft ?? config.pointsEarning;

  const dirty =
    (ruleDraft !== null &&
      JSON.stringify(ruleDraft) !== JSON.stringify(storedActive)) ||
    (legacyDraft !== null &&
      JSON.stringify(legacyDraft) !== JSON.stringify(config.pointsEarning));

  const handleReset = () => {
    setRuleDraft(null);
    setLegacyDraft(null);
  };

  const handleSave = async () => {
    const reconciled = reconcileEarnRules(config.earnRules ?? [], rules);
    try {
      await updateConfig({
        ...config,
        earnRules: reconciled,
        pointsEarning: legacyRule,
      });
      // Drop the drafts: the stored value is the truth again, and versioning
      // gives new rule versions new ids, so a retained draft would disagree.
      handleReset();
      toast.success("Earn rules saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Earn rules were not saved.",
      );
    }
  };

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
        onChange={setRuleDraft}
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
              This single rule is consumed by the points-calculation engine (
              <code>calculatePointsEarned</code>). The trigger-based earn rules
              above are the newer model; the engine will be migrated to consume
              them.
            </p>
            <EarnRulesEditor value={legacyRule} onChange={setLegacyDraft} />
          </div>
        )}
      </div>

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
