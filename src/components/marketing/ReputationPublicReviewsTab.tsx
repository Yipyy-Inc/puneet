"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Star,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
  ThumbsUp,
  Clock,
  ExternalLink,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import type { ReputationRequest } from "@/types/reputation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    google: { label: "Google", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
    facebook: { label: "Facebook", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
    yelp: { label: "Yelp", color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  };
  const c = cfg[platform] ?? { label: platform, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.color}`}>
      <Globe className="h-2.5 w-2.5" />
      {c.label}
    </span>
  );
}

// ─── Review card (grid view) ──────────────────────────────────────────────────

function ReviewCard({
  req,
  onToggleDisplay,
}: {
  req: ReputationRequest;
  onToggleDisplay: (id: string) => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm ${
        req.isPubliclyDisplayed
          ? "border-emerald-300 dark:border-emerald-800"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-bold text-primary">
            {req.clientName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-none">
              {req.clientName}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
              {req.petName} · {req.serviceLabel}
            </p>
          </div>
        </div>
        {req.isPubliclyDisplayed ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Eye className="h-2.5 w-2.5" /> Live
          </span>
        ) : req.isApprovedForPublicDisplay ? (
          <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="h-2.5 w-2.5" /> Approved
          </span>
        ) : null}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1.5">
        <StarRow rating={req.rating!} />
        <span className="text-[11px] font-bold tabular-nums">
          {req.rating}.0
        </span>
        {req.publicPlatform && <PlatformBadge platform={req.publicPlatform} />}
      </div>

      {/* Comment */}
      <p className="text-muted-foreground line-clamp-3 flex-1 text-xs italic leading-relaxed">
        "{req.clientComment}"
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
          <Clock className="h-2.5 w-2.5" />
          {new Date(req.ratedAt!).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Button
          variant={req.isPubliclyDisplayed ? "outline" : "default"}
          size="sm"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={() => onToggleDisplay(req.id)}
        >
          {req.isPubliclyDisplayed ? (
            <>
              <EyeOff className="h-3 w-3" /> Hide
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" /> Display
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Review row (list view) ───────────────────────────────────────────────────

function ReviewRow({
  req,
  onToggleDisplay,
}: {
  req: ReputationRequest;
  onToggleDisplay: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:bg-muted/30
      ${req.isPubliclyDisplayed ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10" : "bg-card"}`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-bold text-primary">
        {req.clientName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-semibold">{req.clientName}</p>
          <StarRow rating={req.rating!} />
          {req.publicPlatform && <PlatformBadge platform={req.publicPlatform} />}
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px] italic">
          "{req.clientComment}"
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {req.isPubliclyDisplayed && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Live
          </span>
        )}
        <Button
          variant={req.isPubliclyDisplayed ? "outline" : "default"}
          size="sm"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={() => onToggleDisplay(req.id)}
        >
          {req.isPubliclyDisplayed ? (
            <>
              <EyeOff className="h-3 w-3" /> Hide
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" /> Display
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Public reviews tab ───────────────────────────────────────────────────────

export function ReputationPublicReviewsTab() {
  const { data: requests = [] } = useQuery(reputationQueries.requests());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const eligible = useMemo(
    () => requests.filter((r) => r.isApprovedForPublicDisplay && r.rating && r.rating >= 4 && r.clientComment),
    [requests]
  );

  const pending = useMemo(
    () => requests.filter((r) => !r.isApprovedForPublicDisplay && r.rating && r.rating >= 4 && r.clientComment),
    [requests]
  );

  const displayed = eligible.filter((r) => overrides[r.id] !== undefined ? overrides[r.id] : r.isPubliclyDisplayed);
  const notDisplayed = eligible.filter((r) => !(overrides[r.id] !== undefined ? overrides[r.id] : r.isPubliclyDisplayed));

  const visible = showLiveOnly ? displayed : eligible;

  function toggleDisplay(id: string) {
    const current = overrides[id] !== undefined ? overrides[id] : eligible.find((r) => r.id === id)?.isPubliclyDisplayed ?? false;
    setOverrides((prev) => ({ ...prev, [id]: !current }));
  }

  const isLive = (req: ReputationRequest) =>
    overrides[req.id] !== undefined ? overrides[req.id] : req.isPubliclyDisplayed;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Eligible", value: eligible.length, icon: ThumbsUp, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-300" },
          { label: "Live", value: displayed.length, icon: Eye, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300" },
          { label: "Approved, hidden", value: notDisplayed.length, icon: CheckCircle2, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300" },
          { label: "Pending", value: pending.length, icon: Clock, color: "text-purple-600 bg-purple-50 dark:bg-purple-500/15 dark:text-purple-300" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5"
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide leading-none">
                {s.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums leading-none">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending approval */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-800 dark:bg-amber-950/10">
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            <p className="text-xs font-semibold">
              Pending your approval ({pending.length})
            </p>
          </div>
          <div className="space-y-1.5">
            {pending.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-bold text-primary">
                  {req.clientName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold">{req.clientName}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: req.rating! }, (_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      · {req.serviceLabel}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px] italic">
                    "{req.clientComment}"
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-6 shrink-0 gap-1 bg-emerald-600 px-2 text-[11px] hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={showLiveOnly ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowLiveOnly((v) => !v)}
          >
            <Eye className="h-3.5 w-3.5" />
            {showLiveOnly ? "Showing live only" : "Show all approved"}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Review grid / list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((req) => (
            <ReviewCard key={req.id} req={{ ...req, isPubliclyDisplayed: isLive(req) }} onToggleDisplay={toggleDisplay} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((req) => (
            <ReviewRow key={req.id} req={{ ...req, isPubliclyDisplayed: isLive(req) }} onToggleDisplay={toggleDisplay} />
          ))}
        </div>
      )}

      {eligible.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No approved reviews yet</p>
          <p className="text-xs mt-1">Once clients rate their experience 4 or 5 stars, you'll be able to approve and display them here.</p>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-muted/30 flex items-start gap-2 rounded-xl border border-dashed px-3 py-2.5">
        <ExternalLink className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">
            Booking page showcase
          </span>{" "}
          — Reviews set to "Live" appear on your public booking page. Only
          reviews with a written comment are eligible.
        </div>
      </div>
    </div>
  );
}
