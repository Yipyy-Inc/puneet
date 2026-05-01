"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    google: { label: "Google", color: "bg-blue-100 text-blue-700" },
    facebook: { label: "Facebook", color: "bg-indigo-100 text-indigo-700" },
    yelp: { label: "Yelp", color: "bg-red-100 text-red-700" },
  };
  const c = cfg[platform] ?? { label: platform, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}>
      <Globe className="h-3 w-3" />{c.label}
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
    <Card className={`flex flex-col transition-all hover:shadow-md ${req.isPubliclyDisplayed ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-900" : ""}`}>
      <CardContent className="flex flex-col gap-3 p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-sm font-bold text-primary">
              {req.clientName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{req.clientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{req.petName} · {req.serviceLabel}</p>
            </div>
          </div>
          {req.isPubliclyDisplayed && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs gap-1 shrink-0">
              <Eye className="h-3 w-3" /> Live
            </Badge>
          )}
          {req.isApprovedForPublicDisplay && !req.isPubliclyDisplayed && (
            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <StarRow rating={req.rating!} />
          <span className="text-xs font-bold">{req.rating}.0</span>
          {req.publicPlatform && <PlatformBadge platform={req.publicPlatform} />}
        </div>

        {/* Comment */}
        <p className="text-sm text-muted-foreground italic flex-1 leading-relaxed">
          "{req.clientComment}"
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(req.ratedAt!).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button
            variant={req.isPubliclyDisplayed ? "outline" : "default"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onToggleDisplay(req.id)}
          >
            {req.isPubliclyDisplayed ? (
              <><EyeOff className="h-3.5 w-3.5" /> Hide</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Display</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm
      ${req.isPubliclyDisplayed ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10" : "bg-background"}`}>
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-sm font-bold text-primary shrink-0">
        {req.clientName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{req.clientName}</p>
          <StarRow rating={req.rating!} />
          {req.publicPlatform && <PlatformBadge platform={req.publicPlatform} />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate italic">"{req.clientComment}"</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {req.isPubliclyDisplayed && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Live</Badge>}
        <Button
          variant={req.isPubliclyDisplayed ? "outline" : "default"}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onToggleDisplay(req.id)}
        >
          {req.isPubliclyDisplayed ? (
            <><EyeOff className="h-3.5 w-3.5" /> Hide</>
          ) : (
            <><Eye className="h-3.5 w-3.5" /> Display</>
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Eligible Reviews", value: eligible.length, icon: ThumbsUp, color: "text-blue-600 bg-blue-50" },
          { label: "Live on Booking Page", value: displayed.length, icon: Eye, color: "text-emerald-600 bg-emerald-50" },
          { label: "Approved, Not Shown", value: notDisplayed.length, icon: CheckCircle2, color: "text-amber-600 bg-amber-50" },
          { label: "Pending Approval", value: pending.length, icon: Clock, color: "text-purple-600 bg-purple-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none">{s.label}</p>
                <p className="text-2xl font-bold mt-0.5">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approval */}
      {pending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
              Pending Your Approval ({pending.length})
            </CardTitle>
            <CardDescription>These 4–5 star reviews are waiting to be approved for public display.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((req) => (
              <div key={req.id} className="flex items-start gap-4 rounded-xl border bg-background p-4">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {req.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{req.clientName}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: req.rating! }, (_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">· {req.serviceLabel}</span>
                  </div>
                  <p className="text-sm italic text-muted-foreground mt-1">"{req.clientComment}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <ExternalLink className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Booking page showcase</span> — Reviews set to "Live" will appear on your public booking page automatically. You control which reviews are shown and can hide them at any time. Only reviews with a written comment are eligible.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
