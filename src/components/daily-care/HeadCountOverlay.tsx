"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, AlertTriangle, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import type { BoardingGuest } from "@/data/boarding";

type DogStatus = "pending" | "inside" | "cannot_locate";

type Props = {
  /** All dogs currently in the facility (getCurrentGuests). */
  guests: BoardingGuest[];
  /** The Last Call step's name, shown in the banner. */
  stepName: string;
  facilityName: string;
  /** Called only once the count is complete (the X / Complete both route here). */
  onComplete: (result: {
    insideGuestIds: string[];
    cannotLocate: { guestId: string; note?: string }[];
    overrideNote?: string;
    /** "HH:MM" */
    completedAt: string;
    total: number;
  }) => void;
};

/** "Kennel 12 - Premium" → "12" (falls back to the full label). */
function kennelNumber(kennelName: string): string {
  return kennelName.match(/\d+/)?.[0] ?? kennelName;
}

export function HeadCountOverlay({
  guests,
  stepName,
  facilityName,
  onComplete,
}: Props) {
  // Fresh mount per open (the host renders this conditionally), so a lazy
  // initializer is enough — every dog starts Pending. No seeding effect needed.
  const [status, setStatus] = useState<Record<string, DogStatus>>(() =>
    Object.fromEntries(
      guests.map((g) => [g.id, "pending"] as [string, DogStatus]),
    ),
  );
  const [overrideNote, setOverrideNote] = useState("");

  const total = guests.length;
  const insideIds = guests
    .filter((g) => status[g.id] === "inside")
    .map((g) => g.id);
  const cannotLocateIds = guests
    .filter((g) => status[g.id] === "cannot_locate")
    .map((g) => g.id);
  const insideCount = insideIds.length;
  const cannotLocateCount = cannotLocateIds.length;
  const pendingCount = total - insideCount - cannotLocateCount;
  const pct = total > 0 ? Math.round((insideCount / total) * 100) : 0;
  const allInside = insideCount === total && total > 0;

  // Complete requires every dog accounted for (0 pending) and, when any dog is
  // missing, a manager override note.
  const needsOverride = cannotLocateCount > 0;
  const canComplete =
    total > 0 &&
    pendingCount === 0 &&
    (!needsOverride || overrideNote.trim().length > 0);

  function setInside(guest: BoardingGuest) {
    setStatus((prev) => ({
      ...prev,
      [guest.id]: prev[guest.id] === "inside" ? "pending" : "inside",
    }));
  }

  function setCannotLocate(guest: BoardingGuest) {
    const next =
      (status[guest.id] ?? "pending") === "cannot_locate"
        ? "pending"
        : "cannot_locate";
    // Fire the CRITICAL manager alert on transition into the missing state.
    if (next === "cannot_locate") {
      // TODO: replace with a real push / SMS escalation to the on-shift manager.
      toast.error(
        `${facilityName}: ${guest.petName} (Kennel ${kennelNumber(
          guest.kennelName,
        )} · ${guest.packageType}) cannot be located during Last Call. Immediate attention required.`,
        { duration: 12000 },
      );
    }
    setStatus((prev) => ({ ...prev, [guest.id]: next }));
  }

  function handleComplete() {
    if (!canComplete) return;
    const now = new Date();
    const completedAt = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    onComplete({
      insideGuestIds: insideIds,
      cannotLocate: cannotLocateIds.map((id) => ({ guestId: id })),
      overrideNote: needsOverride ? overrideNote.trim() : undefined,
      completedAt,
      total,
    });
  }

  return (
    <div className="bg-background fixed inset-0 z-60 flex flex-col">
      {/* Sticky banner: progress + the (gated) close control. */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <ClipboardCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="truncate text-base font-semibold sm:text-lg">
                Head Count · {stepName}
              </h2>
              <span
                data-full={allInside}
                className="text-muted-foreground text-sm font-medium tabular-nums data-[full=true]:text-green-600 dark:data-[full=true]:text-green-400"
              >
                {insideCount} of {total} dogs inside
              </span>
            </div>
            <div className="bg-muted mt-1.5 h-2 w-full overflow-hidden rounded-full">
              <div
                data-full={allInside}
                className="bg-primary h-full rounded-full transition-all data-[full=true]:bg-green-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canComplete}
            onClick={handleComplete}
            aria-label="Close head count"
            className="shrink-0"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable dog grid. */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {pendingCount > 0 && (
            <p className="text-muted-foreground mb-3 text-sm">
              {pendingCount} {pendingCount === 1 ? "dog" : "dogs"} still to
              account for. Every dog must be marked Inside or Cannot Locate
              before Last Call can close.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {guests.map((guest) => {
              const s = status[guest.id] ?? "pending";
              return (
                <div
                  key={guest.id}
                  data-status={s}
                  className="bg-card flex flex-col rounded-xl border p-3 transition-colors data-[status=cannot_locate]:border-red-300 data-[status=cannot_locate]:bg-red-50 data-[status=inside]:border-green-300 data-[status=inside]:bg-green-50 dark:data-[status=cannot_locate]:border-red-900/50 dark:data-[status=cannot_locate]:bg-red-950/30 dark:data-[status=inside]:border-green-900/50 dark:data-[status=inside]:bg-green-950/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="size-14">
                        {guest.petPhotoUrl && (
                          <AvatarImage
                            src={guest.petPhotoUrl}
                            alt={guest.petName}
                          />
                        )}
                        <AvatarFallback className="text-lg font-semibold">
                          {guest.petName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {s === "inside" && (
                        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-green-500 text-white ring-2 ring-white dark:ring-green-950">
                          <Check className="size-3.5" />
                        </span>
                      )}
                      {s === "cannot_locate" && (
                        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-white dark:ring-red-950">
                          <X className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{guest.petName}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        Kennel {kennelNumber(guest.kennelName)}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1 h-4 px-1.5 py-0 text-[10px]"
                      >
                        {guest.packageType}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Button
                      type="button"
                      onClick={() => setInside(guest)}
                      data-active={s === "inside"}
                      className="w-full gap-1.5 bg-green-600 text-white hover:bg-green-700 data-[active=false]:bg-transparent data-[active=false]:text-green-700 data-[active=false]:ring-1 data-[active=false]:ring-green-300 data-[active=false]:ring-inset dark:data-[active=false]:text-green-400"
                    >
                      <Check className="size-4" />
                      {s === "inside" ? "Inside" : "Mark Inside"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCannotLocate(guest)}
                      data-active={s === "cannot_locate"}
                      className="h-8 w-full gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 data-[active=true]:bg-red-600 data-[active=true]:text-white dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <AlertTriangle className="size-3.5" />
                      {s === "cannot_locate" ? "Cannot Locate" : "Can't locate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky action bar. */}
      <div className="bg-background sticky bottom-0 border-t px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-3">
          {needsOverride && (
            <div className="space-y-1.5 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
              <Label
                htmlFor="override-note"
                className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300"
              >
                <AlertTriangle className="size-3.5" />
                Manager override required — {cannotLocateCount}{" "}
                {cannotLocateCount === 1 ? "dog" : "dogs"} not located
              </Label>
              <Textarea
                id="override-note"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                rows={2}
                placeholder="Explain the situation and the action taken before closing Last Call..."
                className="resize-none bg-white dark:bg-transparent"
                aria-invalid={overrideNote.trim().length === 0}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {pendingCount === 0
                ? needsOverride && overrideNote.trim().length === 0
                  ? "Add the override note to finish."
                  : "All dogs accounted for."
                : `${pendingCount} still pending`}
            </p>
            <Button
              size="lg"
              disabled={!canComplete}
              onClick={handleComplete}
              className="gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              <ClipboardCheck className="size-4" />
              Complete Head Count
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
