"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Pill,
  AlertTriangle,
  UtensilsCrossed,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { boardingGuests } from "@/data/boarding";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import type {
  FacilityFeedingConfig,
  BoardingGuest,
  MedicationSchedule,
} from "@/types/boarding";
import type { UserRole } from "@/types/scheduling";

// ── helpers ──────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h_ = h ?? 0;
  const ampm = h_ < 12 ? "AM" : "PM";
  return `${h_ % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

type Completion = { initials: string; at: string };

type SlotEntry = {
  guest: BoardingGuest;
  medsDue: MedicationSchedule[];
  isScheduled: boolean;
};

const ROLE_ORDER: UserRole[] = [
  "owner",
  "general_manager",
  "department_manager",
  "supervisor",
  "employee",
];

// ── component ─────────────────────────────────────────────────────────────────

export function FeedingChecklist({ config }: { config: FacilityFeedingConfig }) {
  const enabledSlots = config.slots
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [activeSlotId, setActiveSlotId] = useState(enabledSlots[0]?.id ?? "");
  const [completions, setCompletions] = useState<Map<string, Completion>>(new Map());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [pendingInitials, setPendingInitials] = useState<Record<string, string>>({});
  const [simulatedRole, setSimulatedRole] = useState<UserRole>("supervisor");

  const canView = hasPermission(simulatedRole, "boarding.feeding.view");
  const canManage = hasPermission(simulatedRole, "boarding.feeding.manage");

  const activeSlot = enabledSlots.find((s) => s.id === activeSlotId);
  const activeGuests = boardingGuests.filter((g) => g.status === "checked-in");

  const entries = useMemo<SlotEntry[]>(() => {
    if (!activeSlot) return [];
    return activeGuests
      .map((guest) => {
        const medsDue = config.showMedicationsInChecklist
          ? guest.medications.filter((med) =>
              med.times.some(
                (t) =>
                  Math.abs(timeToMins(t) - timeToMins(activeSlot.time)) <=
                  config.matchWindowMinutes,
              ),
            )
          : [];
        const isScheduled = guest.feedingTimes.some(
          (t) =>
            Math.abs(timeToMins(t) - timeToMins(activeSlot.time)) <=
            config.matchWindowMinutes,
        );
        return { guest, medsDue, isScheduled };
      })
      .sort((a, b) => {
        if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
        return a.guest.petName.localeCompare(b.guest.petName);
      });
  }, [activeSlot, activeGuests, config]);

  const doneCount = entries.filter((e) =>
    completions.has(`${e.guest.id}-${activeSlotId}`),
  ).length;
  const skipCount = entries.filter((e) =>
    skipped.has(`${e.guest.id}-${activeSlotId}`),
  ).length;
  const pendingCount = entries.length - doneCount - skipCount;

  const nowTime = new Date().toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function markFed(guestId: string) {
    const initials = (pendingInitials[guestId] ?? "").trim().toUpperCase();
    if (!initials) return;
    const key = `${guestId}-${activeSlotId}`;
    setCompletions((prev) => new Map(prev).set(key, { initials, at: nowTime }));
    setSkipped((prev) => {
      const s = new Set(prev);
      s.delete(key);
      return s;
    });
    setPendingInitials((prev) => {
      const p = { ...prev };
      delete p[guestId];
      return p;
    });
  }

  function markSkipped(guestId: string) {
    const key = `${guestId}-${activeSlotId}`;
    setSkipped((prev) => new Set(prev).add(key));
    setCompletions((prev) => {
      const m = new Map(prev);
      m.delete(key);
      return m;
    });
  }

  function undoRow(guestId: string) {
    const key = `${guestId}-${activeSlotId}`;
    setCompletions((prev) => {
      const m = new Map(prev);
      m.delete(key);
      return m;
    });
    setSkipped((prev) => {
      const s = new Set(prev);
      s.delete(key);
      return s;
    });
  }

  const progressPct = entries.length
    ? Math.round((doneCount / entries.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feeding Rounds</h2>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">Viewing as:</span>
          <Select
            value={simulatedRole}
            onValueChange={(v) => setSimulatedRole(v as UserRole)}
          >
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ORDER.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Access gate */}
      {!canView ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
          <Shield className="text-muted-foreground mb-4 size-12" />
          <h3 className="font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {ROLE_LABELS[simulatedRole]}s do not have permission to view feeding
            rounds.
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Required: Supervisor or above
          </p>
        </div>
      ) : (
        <>
          {/* Slot tabs */}
          {enabledSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
              <UtensilsCrossed className="text-muted-foreground mb-3 size-10" />
              <p className="text-muted-foreground text-sm">
                No feeding slots configured. Add slots in Settings → Feeding
                Rounds.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {enabledSlots.map((slot) => {
                  const slotDone = activeGuests.filter((g) =>
                    completions.has(`${g.id}-${slot.id}`),
                  ).length;
                  const isActive = slot.id === activeSlotId;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setActiveSlotId(slot.id)}
                      className={cn(
                        "flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-all",
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <span className="text-sm font-semibold">{slot.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {fmt12(slot.time)}
                      </span>
                      <span className="mt-1 text-xs">
                        <span className="font-medium text-green-600">
                          {slotDone}
                        </span>
                        <span className="text-muted-foreground">
                          /{activeGuests.length} fed
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-sm font-medium">{doneCount} fed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="text-muted-foreground size-4" />
                  <span className="text-sm font-medium">
                    {skipCount} skipped
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-orange-400" />
                  <span className="text-sm font-medium">
                    {pendingCount} pending
                  </span>
                </div>
                <div className="bg-border ml-auto h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-sm">
                  {progressPct}%
                </span>
              </div>

              {/* Guest rows */}
              <div className="space-y-2">
                {entries.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
                    <UtensilsCrossed className="text-muted-foreground mb-3 size-10" />
                    <p className="text-muted-foreground text-sm">
                      No guests currently checked in.
                    </p>
                  </div>
                )}

                {entries.map(({ guest, medsDue, isScheduled }) => {
                  const key = `${guest.id}-${activeSlotId}`;
                  const completion = completions.get(key);
                  const isSkipped = skipped.has(key);
                  const state =
                    completion ? "done" : isSkipped ? "skipped" : "pending";

                  return (
                    <div
                      key={guest.id}
                      className={cn(
                        "rounded-lg border p-4 transition-all",
                        state === "done" &&
                          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20",
                        state === "skipped" &&
                          "border-border bg-muted/40 opacity-60",
                        state === "pending" &&
                          isScheduled &&
                          "border-border bg-background",
                        state === "pending" &&
                          !isScheduled &&
                          "border-dashed border-border/60 bg-background",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">
                          {state === "done" ? (
                            <CheckCircle2 className="size-5 text-green-500" />
                          ) : state === "skipped" ? (
                            <XCircle className="text-muted-foreground size-5" />
                          ) : (
                            <Clock className="size-5 text-orange-400" />
                          )}
                        </div>

                        {/* Pet + feeding info */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{guest.petName}</span>
                            <span className="text-muted-foreground text-sm">
                              {guest.petBreed}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {guest.kennelName}
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {guest.petSize} · {guest.petWeight} lbs
                            </Badge>
                            {!isScheduled && (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                              >
                                Not on this meal schedule
                              </Badge>
                            )}
                            {state === "done" && (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                Fed at {completion!.at} · {completion!.initials}
                              </span>
                            )}
                            {state === "skipped" && (
                              <span className="text-muted-foreground text-xs italic">
                                Skipped
                              </span>
                            )}
                          </div>

                          {/* Feeding details */}
                          <p className="text-sm">
                            <span className="font-medium">{guest.feedingAmount}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              {guest.foodBrand}
                            </span>
                            {guest.feedingInstructions && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {guest.feedingInstructions}
                              </span>
                            )}
                          </p>

                          {/* Allergy + med pills */}
                          {(guest.allergies.length > 0 || medsDue.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {guest.allergies.map((a) => (
                                <span
                                  key={a}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                >
                                  <AlertTriangle className="size-3" />
                                  {a}
                                </span>
                              ))}
                              {medsDue.map((med) => (
                                <span
                                  key={med.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-400"
                                >
                                  <Pill className="size-3" />
                                  {med.medicationName} {med.dosage}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {canManage && state === "pending" && (
                          <div className="flex shrink-0 items-center gap-2">
                            <Input
                              value={pendingInitials[guest.id] ?? ""}
                              onChange={(e) =>
                                setPendingInitials((prev) => ({
                                  ...prev,
                                  [guest.id]: e.target.value
                                    .slice(0, 3)
                                    .toUpperCase(),
                                }))
                              }
                              placeholder="AAA"
                              maxLength={3}
                              className="h-8 w-16 text-center font-mono text-sm uppercase"
                              title="Staff initials"
                            />
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => markFed(guest.id)}
                              disabled={!(pendingInitials[guest.id] ?? "").trim()}
                            >
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Fed
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground h-8"
                              onClick={() => markSkipped(guest.id)}
                            >
                              Skip
                            </Button>
                          </div>
                        )}
                        {canManage && state !== "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground h-8 shrink-0 text-xs"
                            onClick={() => undoRow(guest.id)}
                          >
                            Undo
                          </Button>
                        )}
                        {!canManage && state === "pending" && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground shrink-0 text-xs"
                          >
                            View only
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
