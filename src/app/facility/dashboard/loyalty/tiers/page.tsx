"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TierDefinitionsEditor } from "@/components/loyalty/config/TierDefinitionsEditor";
import { TiersEditor } from "@/components/loyalty/config/TiersEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { Tier, LoyaltyTierConfig } from "@/types/loyalty";

export default function TiersPage() {
  const { config, updateConfig, facilityId } = useLoyaltyProgram();

  const [tiers, setTiers] = useState<Tier[]>(() => config.tierDefinitions ?? []);
  const [legacyTiers, setLegacyTiers] = useState<LoyaltyTierConfig[]>(
    () => config.tiers,
  );
  const [showLegacy, setShowLegacy] = useState(false);

  const dirty =
    JSON.stringify(tiers) !== JSON.stringify(config.tierDefinitions ?? []) ||
    JSON.stringify(legacyTiers) !== JSON.stringify(config.tiers);

  const handleReset = () => {
    setTiers(config.tierDefinitions ?? []);
    setLegacyTiers(config.tiers);
  };

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
        onChange={setTiers}
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
              This points-only tier list is consumed by the engine
              (<code>getCustomerTier</code>). The customisable tiers above are
              the newer model; the engine will be migrated to consume them.
            </p>
            <TiersEditor value={legacyTiers} onChange={setLegacyTiers} />
          </div>
        )}
      </div>

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({
            ...config,
            tierDefinitions: tiers,
            tiers: legacyTiers,
          });
          toast.success("Tiers saved");
        }}
        onReset={handleReset}
      />
    </div>
  );
}
