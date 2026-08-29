"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Globe,
  Info,
  Loader2,
  Shield,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  NO_REPUTATION_CONFIG,
  type ReputationConfig,
} from "@/lib/settings/reputation";
import { cn } from "@/lib/utils";

// ============================================================================
// What the facility decides.
//
// ── WHAT IS NO LONGER DECIDED HERE, AND WHY ───────────────────────────────
//
// **The send delay.** It is `automation_rules.offset_minutes`, edited on the
// Automations screen, and this page links there. It used to be editable in
// three places — a trigger card, a send sequence, and a chip on the Messages
// tab — with no rule anywhere about which won. The fix was not a precedence
// order; it was deleting two of the three editors.
//
// **The reminder sequence.** There is one nudge per request, ever, and its
// branch is chosen at evaluation time. Two configurable reminder systems both
// firing at 48 hours into a one-per-day cap is what there was before.
//
// **Anything that hides the public review link.** Removed 2026-08-28;
// `bun run check:no-review-gating` fails the build if it returns.
//
// ── AND THE ONE THING THAT MOVED IN ───────────────────────────────────────
//
// The channel list writes to `review_channels` rather than a fixture, so the
// survey a customer opens on their phone shows the facility's own destinations.
// Yelp is display-only and the database refuses to make it otherwise.
// ============================================================================

interface ChannelRow {
  id: string;
  platform: string;
  place_id: string | null;
  profile_url: string | null;
  enabled: boolean;
  solicitable: boolean;
  priority: number;
  weight: number;
}

const PLATFORMS = [
  { value: "google", label: "Google Business" },
  { value: "facebook", label: "Facebook" },
  { value: "yelp", label: "Yelp" },
] as const;

export function ReputationSettingsTab() {
  const { settings } = useFacilitySettings();
  const save = useSaveFacilitySetting();
  const [draft, setDraft] = useState<ReputationConfig>(NO_REPUTATION_CONFIG);
  const [dirty, setDirty] = useState(false);

  // The stored value once it arrives. Not a `defaultValue`, because the query
  // resolves after first paint and a defaulted input would keep showing the
  // fallback while the facility's own numbers sat unused behind it.
  useEffect(() => {
    if (!dirty) setDraft(settings.reputation_config.value);
  }, [settings.reputation_config.value, dirty]);

  function update<K extends keyof ReputationConfig>(
    key: K,
    value: ReputationConfig[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4" />
            Escalation threshold
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            At or below this rating we open a recovery ticket and alert the
            assignee. It does not change whether the public review link is shown
            — it always is.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update("escalationThreshold", value)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  draft.escalationThreshold === value
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {value}★ &amp; below
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
            <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Every client is invited to review publicly and privately, whatever
              they rate. Showing the public link only to happy clients is review
              gating, which the FTC&apos;s Rule on Consumer Reviews and
              Google&apos;s review policies both prohibit.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">When we ask, and how often</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Do not ask again for"
            suffix="days"
            value={draft.cooldownDays}
            onChange={(value) => update("cooldownDays", value)}
            hint="Counted from the last time this client was asked."
          />
          <NumberField
            label="After a poor rating, wait"
            suffix="days"
            value={draft.negativePauseDays}
            onChange={(value) => update("negativePauseDays", value)}
            hint="Whichever of these two windows runs longer is the one that applies."
          />
          <NumberField
            label="Follow up once, after"
            suffix="hours"
            value={draft.nudgeAfterHours}
            onChange={(value) => update("nudgeAfterHours", value)}
            hint="One follow-up per request, ever. What it says depends on what they did."
          />
          <NumberField
            label="The link stops working after"
            suffix="days"
            value={draft.linkTtlDays}
            onChange={(value) => update("linkTtlDays", value)}
          />
          <NumberField
            label="Stop following up after"
            suffix="days"
            value={draft.expiresAfterDays}
            onChange={(value) => update("expiresAfterDays", value)}
            hint="Past this, an outstanding follow-up is dropped rather than sent late."
          />
          <NumberField
            label="Show on the booking page from"
            suffix="★ and up"
            value={draft.showcaseMin}
            min={1}
            max={5}
            onChange={(value) => update("showcaseMin", value)}
            hint="With a written comment and the client's consent."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Retail-only visits</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3">
            <Switch
              checked={draft.askAfterRetailOnly}
              onCheckedChange={(value) => update("askAfterRetailOnly", value)}
            />
            <span className="text-xs">
              <span className="font-medium">
                Ask after a purchase with no service
              </span>
              <span className="text-muted-foreground block">
                Off by default. &ldquo;How was your visit?&rdquo; after buying a
                bag of food reads as a form letter, and it spends the cooldown
                the next groom would have used.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {dirty && (
        <div className="bg-background sticky bottom-4 flex items-center justify-end gap-2 rounded-xl border p-3 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(settings.reputation_config.value);
              setDirty(false);
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { domain: "reputation_config", value: draft },
                {
                  onSuccess: () => {
                    setDirty(false);
                    toast.success("Saved.");
                  },
                  onError: (failure) =>
                    toast.error(
                      failure instanceof Error
                        ? failure.message
                        : "That could not be saved.",
                    ),
                },
              )
            }
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      )}

      <ChannelManager />
      <DelayNote />
    </div>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  hint,
  min = 0,
  max = 3650,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next))
              onChange(Math.min(max, Math.max(min, next)));
          }}
          className="h-9 w-24 text-sm"
        />
        <span className="text-muted-foreground text-xs">{suffix}</span>
      </div>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

function ChannelManager() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["reputation", "channels"],
    queryFn: async (): Promise<ChannelRow[]> => {
      const response = await fetch("/api/reputation/channels", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not read the channels.");
      const body = (await response.json()) as { channels: ChannelRow[] };
      return body.channels;
    },
  });

  const [platform, setPlatform] = useState<string>("google");
  const [url, setUrl] = useState("");

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: ["reputation", "channels"],
    });

  const upsert = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await fetch("/api/reputation/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? "That could not be saved.");
      }
    },
    onSuccess: invalidate,
    onError: (failure) =>
      toast.error(
        failure instanceof Error ? failure.message : "That could not be saved.",
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/reputation/channels?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("That could not be removed.");
    },
    onSuccess: invalidate,
    onError: () => toast.error("That could not be removed."),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="size-4" />
          Where happy clients are sent
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          These appear on the survey, in this order. Yelp can be connected for
          its rating but never used as a destination — its guidelines prohibit
          asking for reviews at all.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending ? (
          <Loader2 className="text-muted-foreground mx-auto size-5 animate-spin" />
        ) : (
          (data ?? []).map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium capitalize">
                  {channel.platform}
                  {!channel.solicitable && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      Monitor only
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {channel.place_id
                    ? `Place ID ${channel.place_id}`
                    : (channel.profile_url ?? "No link yet")}
                </p>
              </div>

              <Switch
                checked={channel.enabled}
                disabled={!channel.solicitable || upsert.isPending}
                onCheckedChange={(enabled) =>
                  upsert.mutate({
                    platform: channel.platform,
                    profileUrl: channel.profile_url ?? "",
                    placeId: channel.place_id ?? "",
                    enabled,
                    priority: channel.priority,
                    weight: channel.weight,
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-8"
                onClick={() => remove.mutate(channel.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}

        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Platform</Label>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            >
              {PLATFORMS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[16rem] flex-1 space-y-1">
            <Label className="text-xs">Link to your profile</Label>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste your Google Maps or profile link"
              className="h-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            disabled={!url.trim() || upsert.isPending}
            onClick={() =>
              upsert.mutate(
                {
                  platform,
                  profileUrl: url.trim(),
                  enabled: platform !== "yelp",
                },
                { onSuccess: () => setUrl("") },
              )
            }
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The delay has ONE editor, and it is not here.
 *
 * A read-only mirror would be a third place showing the same number. A link is
 * one place showing it, and one place to change it.
 */
function DelayNote() {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="text-xs">
          <p className="font-medium">
            When the ask goes out, and whether it goes out at all
          </p>
          <p className="text-muted-foreground mt-1">
            The review request is an automation on check-out. Its delay,
            channels and on/off switch live on the Automations screen, so there
            is one place to change them rather than three that can disagree.
          </p>
          <Link
            href="/facility/dashboard/marketing/automations"
            className="mt-2 inline-flex items-center gap-1 font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Open Automations
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
