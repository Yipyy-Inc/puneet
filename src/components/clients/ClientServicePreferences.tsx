"use client";

import { useState } from "react";
import { BellOff, Calendar, Check, Save, TrendingDown, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableSkeleton } from "@/components/ui/skeletons";
import {
  useClientRebookPreferences,
  useSaveRebookPreference,
} from "@/lib/api/client-rebook";
import type { ClientServiceRebook } from "@/types/rebook";

// ============================================================================
// How often THIS client comes back.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `clientServicePreferences` and `clientRebookOptOuts` — two hand-written
// arrays keyed by fixture client ids, edited into a `useState` and gone on
// reload. The section offered "override the default for this client" from the
// day it was built and stored nothing, on a screen where the whole point is
// that this client is different from the default.
//
// ── THREE NUMBERS, AND ONLY ONE OF THEM IS A SETTING ──────────────────────
//
// The facility's interval, the override, and what actually HAPPENS — the mean
// gap between their real completed visits. The third is derived on every read
// and is the evidence for or against the other two: a dog booked in every 19
// days against a 28-day default is the argument for an override, in a number
// nobody had to keep.
//
// ── THE SWITCH IS THE FACILITY'S NOTE, NOT AN UNSUBSCRIBE ─────────────────
//
// It stops rebook reminders for this client and nothing else. A customer who
// unsubscribes is a suppression, keyed by their address, and it stops every
// marketing message from every source. Two different facts, both enforced, and
// this screen can only write the one it is about — which is why it says so.
// ============================================================================

export function ClientServicePreferences({ clientId }: { clientId: number }) {
  const prefs = useClientRebookPreferences(clientId);
  const save = useSaveRebookPreference(clientId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState(28);
  const [draftReason, setDraftReason] = useState("");

  if (prefs.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={3} cols={3} />
        </CardContent>
      </Card>
    );
  }
  if (prefs.error || !prefs.data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground pt-6 text-sm">
          Rebook settings could not be loaded
          {prefs.error ? `: ${prefs.error.message}` : "."}
        </CardContent>
      </Card>
    );
  }

  const data = prefs.data;

  const startEdit = (row: ClientServiceRebook) => {
    setEditing(row.service);
    setDraftDays(row.effectiveDays ?? 28);
    setDraftReason(row.reason ?? "");
  };

  const commit = (service: string, days: number | null) => {
    save.mutate(
      {
        service,
        frequencyDays: days,
        remindersEnabled: true,
        reason: days === null ? null : draftReason,
      },
      {
        onSuccess: () => {
          toast.success(
            days === null
              ? "Back to the facility's interval."
              : `Every ${days} days for this client.`,
          );
          setEditing(null);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4" />
          Rebook settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* The master switch */}
        <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <BellOff className="size-3.5" />
              Rebook reminders
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {data.remindersEnabled
                ? "This client is chased when they are overdue."
                : "This client is never chased, for any service."}{" "}
              This is your note about them — it does not affect anything they
              unsubscribed from themselves.
            </p>
          </div>
          <Switch
            checked={data.remindersEnabled}
            disabled={save.isPending}
            onCheckedChange={(on) =>
              save.mutate(
                { service: null, remindersEnabled: on },
                {
                  onSuccess: () =>
                    toast.success(
                      on
                        ? "Rebook reminders back on for this client."
                        : "This client will not be chased.",
                    ),
                  onError: (e: Error) => toast.error(e.message),
                },
              )
            }
          />
        </div>

        {data.services.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No services are configured for rebook reminders yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.services.map((row) => (
              <div key={row.service} className="rounded-lg border p-3">
                {editing === row.service ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {row.service}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        every
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        value={draftDays}
                        onChange={(e) =>
                          setDraftDays(
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          )
                        }
                        className="h-7 w-20 text-xs"
                      />
                      <span className="text-muted-foreground text-xs">
                        days
                      </span>
                    </div>
                    <Input
                      placeholder="Why? e.g. coat grows fast"
                      value={draftReason}
                      onChange={(e) => setDraftReason(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditing(null)}
                      >
                        <X className="mr-1 size-3" />
                        Cancel
                      </Button>
                      {row.overrideDays !== null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={save.isPending}
                          onClick={() => commit(row.service, null)}
                        >
                          Use the default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        disabled={save.isPending}
                        onClick={() => commit(row.service, draftDays)}
                      >
                        <Save className="mr-1 size-3" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {row.service}
                        </span>
                        {row.source === "override" ? (
                          <Badge
                            variant="outline"
                            className="border-violet-200 bg-violet-50 text-[10px] text-violet-700"
                          >
                            theirs
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            facility default
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {row.effectiveDays === null
                          ? "Not configured for rebook reminders"
                          : `Every ${row.effectiveDays} days`}
                        {row.source === "override" &&
                          row.defaultDays !== null &&
                          ` · facility default is ${row.defaultDays}`}
                      </p>
                      {/* The evidence. Two visits is the minimum that can have
                          a gap between them; below that the honest answer is
                          that we do not know yet. */}
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {row.observedDays === null ? (
                          `${row.completedVisits} completed visit${row.completedVisits === 1 ? "" : "s"} — not enough to see a pattern`
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="size-3" />
                            They actually come every {row.observedDays} days
                            over {row.completedVisits} visits
                          </span>
                        )}
                      </p>
                      {row.reason && (
                        <p className="text-muted-foreground mt-0.5 text-xs italic">
                          “{row.reason}”
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => startEdit(row)}
                    >
                      {row.source === "override" ? (
                        <>
                          <Check className="mr-1 size-3" />
                          Change
                        </>
                      ) : (
                        "Set for this client"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
