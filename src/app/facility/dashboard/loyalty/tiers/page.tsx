"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TierDefinitionsEditor } from "@/components/loyalty/config/TierDefinitionsEditor";
import { TiersEditor } from "@/components/loyalty/config/TiersEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { Tier, LoyaltyTierConfig } from "@/types/loyalty";

export default function TiersPage() {
  const { config, updateConfig, facilityId, isPending, isSaving } =
    useLoyaltyProgram();

  // Derived, not seeded. A `useState` initialiser runs before the programme
  // has been read, and this page would otherwise offer to save an empty tier
  // list over a facility's real one. See the badges page.
  const [tierDraft, setTierDraft] = useState<Tier[] | null>(null);
  const [legacyDraft, setLegacyDraft] = useState<LoyaltyTierConfig[] | null>(
    null,
  );
  const [showLegacy, setShowLegacy] = useState(false);

  const savedTiers = config.tierDefinitions ?? [];
  const savedLegacy = config.tiers;
  const tiers = tierDraft ?? savedTiers;
  const legacyTiers = legacyDraft ?? savedLegacy;

  const dirty =
    (tierDraft !== null &&
      JSON.stringify(tierDraft) !== JSON.stringify(savedTiers)) ||
    (legacyDraft !== null &&
      JSON.stringify(legacyDraft) !== JSON.stringify(savedLegacy));

  const handleReset = () => {
    setTierDraft(null);
    setLegacyDraft(null);
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
        <h2 className="text-lg font-semibold">Tiers</h2>
        <p className="text-muted-foreground text-sm">
          Define fully-customisable membership tiers — any count, with a
          configurable threshold (points, spend, or visits), color, icon, sort
          order, and per-tier benefits.
        </p>
      </div>

      <TierDefinitionsEditor
        value={tiers}
        onChange={setTierDraft}
        facilityId={facilityId}
      />

      {/* Legacy engine tier list */}
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
          Tier engine (legacy)
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            Drives current tier resolution
          </span>
        </button>
        {showLegacy && (
          <div className="border-t p-4">
            <p className="text-muted-foreground mb-4 text-sm">
              This points-only tier list is consumed by the engine (
              <code>getCustomerTier</code>). The customisable tiers above are
              the newer model; the engine will be migrated to consume them.
            </p>
            <TiersEditor value={legacyTiers} onChange={setLegacyDraft} />
          </div>
        )}
      </div>

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={async () => {
          try {
            await updateConfig({
              ...config,
              tierDefinitions: tiers,
              tiers: legacyTiers,
            });
            handleReset();
            toast.success("Tiers saved");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Tiers were not saved.",
            );
          }
        }}
        onReset={handleReset}
      />
    </div>
  );
}
