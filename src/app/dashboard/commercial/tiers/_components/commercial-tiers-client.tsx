"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Eye, Layers, Plus } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { commercialTiersQueries } from "@/lib/api/commercial-tiers";
import type { TierWithUsage } from "@/types/commercial-tiers";
import { TierCard } from "./tier-card";
import { TierComparisonMatrix } from "./tier-comparison-matrix";
import { TierEditorDrawer } from "./tier-editor-drawer";
import { createDraftTier } from "./tier-utils";

export function CommercialTiersClient() {
  const { data, isLoading } = useQuery(commercialTiersQueries.list());

  // Local mock persistence: edits to existing tiers live in `overrides`,
  // brand-new tiers in `created`. No backend to write through to.
  const [overrides, setOverrides] = useState<Record<string, TierWithUsage>>({});
  const [created, setCreated] = useState<TierWithUsage[]>([]);
  const [editing, setEditing] = useState<TierWithUsage | null>(null);

  const baseTiers = useMemo(() => data ?? [], [data]);

  const tiers = useMemo(
    () => [...baseTiers.map((t) => overrides[t.id] ?? t), ...created],
    [baseTiers, overrides, created],
  );

  const isNew = editing
    ? !baseTiers.some((t) => t.id === editing.id) &&
      !created.some((t) => t.id === editing.id)
    : false;

  const stats = useMemo(() => {
    return {
      total: tiers.length,
      active: tiers.filter((t) => t.isActive).length,
      public: tiers.filter((t) => t.isPublic ?? true).length,
      facilities: tiers.reduce((sum, t) => sum + t.facilityCount, 0),
    };
  }, [tiers]);

  function handleSave(tier: TierWithUsage) {
    const updated = { ...tier, updatedAt: new Date().toISOString() };
    const inBase = baseTiers.some((t) => t.id === tier.id);
    const inCreated = created.some((t) => t.id === tier.id);
    if (inCreated) {
      setCreated((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    } else if (inBase) {
      setOverrides((prev) => ({ ...prev, [tier.id]: updated }));
    } else {
      setCreated((prev) => [...prev, updated]);
    }
    setEditing(null);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tiers &amp; Pricing
          </h1>
          <p className="text-muted-foreground">
            Configure subscription tiers, included modules and platform limits.
          </p>
        </div>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setEditing(createDraftTier())}
        >
          <Plus className="mr-2 size-4" />
          Create New Tier
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total Tiers"
          value={stats.total}
          icon={Layers}
          tone="indigo"
        />
        <KpiTile
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Publicly Visible"
          value={stats.public}
          icon={Eye}
          tone="violet"
        />
        <KpiTile
          label="Facilities Assigned"
          value={stats.facilities}
          icon={Building2}
          tone="amber"
        />
      </div>

      {/* Tier cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* Comparison matrix */}
      {!isLoading && tiers.length > 0 && <TierComparisonMatrix tiers={tiers} />}

      {/* Editor drawer */}
      {editing && (
        <TierEditorDrawer
          key={editing.id}
          tier={editing}
          isNew={isNew}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
