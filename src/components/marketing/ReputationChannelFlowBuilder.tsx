"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  ArrowRight,
  Star,
  Plus,
  Trash2,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  orderedPlatforms,
  orderedEnabledPlatforms,
  availablePlatforms,
  platformWeightPercents,
  toGoogleReviewLink,
  PLATFORM_META,
} from "@/lib/reputation/review-link";
import type {
  ReputationSettings,
  ReputationPublicPlatform,
  ReputationPlatformConfig,
} from "@/types/reputation";

/**
 * Multi-platform channel manager. Facilities add / modify / disable / reorder
 * the public review channels happy reviewers are routed to. The order here is
 * the exact order "Share on …" buttons appear in the micro-survey.
 */
export function ReputationChannelFlowBuilder({
  value,
  onChange,
}: {
  value: ReputationSettings;
  onChange: (patch: Partial<ReputationSettings>) => void;
}) {
  const [dragId, setDragId] = useState<ReputationPublicPlatform | null>(null);
  const [dragOverId, setDragOverId] = useState<ReputationPublicPlatform | null>(
    null,
  );
  const [adding, setAdding] = useState(false);

  const order = orderedPlatforms(value);
  const enabledFlow = orderedEnabledPlatforms(value);
  const available = availablePlatforms(value);
  const weighting = value.channelWeighting ?? false;
  const pcts = platformWeightPercents(value);

  function patchPlatform(
    platform: ReputationPublicPlatform,
    patch: Partial<ReputationPlatformConfig>,
  ) {
    onChange({
      reviewPlatforms: {
        ...value.reviewPlatforms,
        [platform]: { ...value.reviewPlatforms[platform], ...patch },
      },
    });
  }

  function addPlatform(platform: ReputationPublicPlatform) {
    onChange({
      platformOrder: [...order, platform],
      reviewPlatforms: {
        ...value.reviewPlatforms,
        [platform]: { ...value.reviewPlatforms[platform], enabled: true },
      },
    });
    setAdding(false);
  }

  function removePlatform(platform: ReputationPublicPlatform) {
    onChange({ platformOrder: order.filter((p) => p !== platform) });
  }

  function optimizeGoogle() {
    const current = value.reviewPlatforms.google.url;
    const { url, optimized } = toGoogleReviewLink(current);
    if (!current.trim()) {
      toast.info("Paste your Google Maps link first");
      return;
    }
    if (optimized && url !== current) {
      patchPlatform("google", { url });
      toast.success("Converted to a direct “write a review” link");
    } else if (optimized) {
      toast.info("This is already a direct review link");
    } else {
      toast.error("Couldn't find a Place ID", {
        description: "Paste the Google Maps link for your business listing.",
      });
    }
  }

  function handleDrop(target: ReputationPublicPlatform) {
    if (!dragId || dragId === target) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(target);
    if (from !== -1 && to !== -1) {
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      onChange({ platformOrder: next });
    }
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="space-y-4">
      {/* Display weighting toggle */}
      <label className="bg-card flex items-start justify-between gap-3 rounded-xl border p-3">
        <span>
          <span className="block text-sm font-medium">
            Distribute by weight
          </span>
          <span className="text-muted-foreground block text-xs">
            Send reviewers to channels by % share (e.g. Google 60% / Yelp 40%)
            instead of fixed order.
          </span>
        </span>
        <Switch
          checked={weighting}
          onCheckedChange={(v) => onChange({ channelWeighting: v })}
          aria-label="Distribute by weight"
        />
      </label>

      {/* Live flow preview */}
      <div className="bg-muted/30 rounded-xl border p-3">
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
          {weighting
            ? "Reviewers are split across"
            : "Happy reviewers are routed to"}
        </p>
        {enabledFlow.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {enabledFlow.map((p, i) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className="bg-background inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
                      PLATFORM_META[p].badgeCls,
                    )}
                  >
                    {PLATFORM_META[p].badge}
                  </span>
                  {PLATFORM_META[p].label}
                  {weighting && (
                    <span className="text-muted-foreground tabular-nums">
                      {pcts[p] ?? 0}%
                    </span>
                  )}
                </span>
                {!weighting && i < enabledFlow.length - 1 && (
                  <ArrowRight className="text-muted-foreground/50 size-3" />
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No public channels enabled — happy reviews stay internal until you
            turn one on.
          </p>
        )}
      </div>

      {/* Channel cards */}
      <div className="space-y-2">
        {order.map((platform, index) => {
          const cfg = value.reviewPlatforms[platform];
          const meta = PLATFORM_META[platform];
          const isDragOver = dragOverId === platform && dragId !== platform;

          return (
            <div
              key={platform}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverId !== platform) setDragOverId(platform);
              }}
              onDrop={() => handleDrop(platform)}
              className={cn(
                "bg-card rounded-xl border transition-all",
                isDragOver && "border-amber-400 ring-1 ring-amber-300",
                !cfg.enabled && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragId(platform)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                  aria-label="Drag to reorder channel"
                  className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </button>

                <span
                  className="text-muted-foreground w-5 shrink-0 text-center text-xs font-bold tabular-nums"
                  title="Priority"
                >
                  {index + 1}
                </span>

                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    meta.badgeCls,
                  )}
                >
                  {meta.badge}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{meta.label}</p>
                  {cfg.reviewCount != null && (
                    <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      {cfg.reviewCount} reviews
                      {cfg.avgRating != null && (
                        <>
                          {" · "}
                          {cfg.avgRating}
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                        </>
                      )}
                    </p>
                  )}
                </div>

                <Switch
                  checked={cfg.enabled}
                  onCheckedChange={(enabled) =>
                    patchPlatform(platform, { enabled })
                  }
                  aria-label={`Enable ${meta.label}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground/50 hover:text-destructive size-7"
                  onClick={() => removePlatform(platform)}
                  aria-label={`Remove ${meta.label}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {cfg.enabled && (
                <div className="space-y-2 border-t px-3 pt-2 pb-3">
                  <Label className="text-muted-foreground block text-xs">
                    Direct review page URL
                  </Label>
                  <Input
                    value={cfg.url}
                    onChange={(e) =>
                      patchPlatform(platform, { url: e.target.value })
                    }
                    placeholder={meta.placeholder}
                    className="h-8 text-sm"
                  />
                  {platform === "google" && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-[11px]">
                        Paste a Google Maps link and optimize it to land clients
                        on the review box.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={optimizeGoogle}
                        className="h-7 shrink-0 gap-1.5 text-xs"
                      >
                        <Sparkles className="size-3.5 text-amber-500" />
                        Optimize link
                      </Button>
                    </div>
                  )}
                  {weighting && (
                    <div className="flex items-center gap-2">
                      <Label className="text-muted-foreground text-xs">
                        Weight
                      </Label>
                      <div className="relative w-24">
                        <Input
                          type="number"
                          min={0}
                          value={cfg.weight ?? 0}
                          onChange={(e) =>
                            patchPlatform(platform, {
                              weight: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-8 pr-9 text-sm"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                          pts
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        = {pcts[platform] ?? 0}% of reviewers
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add platform */}
      {adding ? (
        <div className="rounded-xl border border-dashed p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Add a channel</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setAdding(false)}
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          {available.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {available.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => addPlatform(p)}
                  className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      PLATFORM_META[p].badgeCls,
                    )}
                  >
                    {PLATFORM_META[p].badge}
                  </span>
                  <span className="text-sm font-medium">
                    {PLATFORM_META[p].label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              All supported channels have been added.
            </p>
          )}
        </div>
      ) : (
        available.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setAdding(true)}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="size-4" /> Add Platform
          </Button>
        )
      )}
    </div>
  );
}
