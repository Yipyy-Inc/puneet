"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingMutations } from "@/lib/api/booking";
import { useSetGroomingAppointmentStatus } from "@/lib/api/grooming-appointments";
import type { GroomingAppointment, Stylist } from "@/types/grooming";

export type BulkActionMode = "reschedule" | "book-again" | "cancel";

const UNFINISHED_STATUSES: GroomingAppointment["status"][] = [
  "scheduled",
  "checked-in",
  "in-progress",
  "ready-for-pickup",
];

const MODE_META: Record<
  BulkActionMode,
  { title: string; icon: React.ElementType; cta: string; ctaClassName: string }
> = {
  reschedule: {
    title: "Bulk Reschedule",
    icon: CalendarClock,
    cta: "Reschedule appointments",
    ctaClassName: "bg-sky-600 text-white hover:bg-sky-700",
  },
  "book-again": {
    title: "Bulk Book Again",
    icon: CalendarPlus,
    cta: "Create follow-ups",
    ctaClassName: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  cancel: {
    title: "Bulk Cancel",
    icon: XCircle,
    cta: "Cancel appointments",
    ctaClassName: "bg-red-600 text-white hover:bg-red-700",
  },
};

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

/**
 * Single dialog handling all three bulk operations a manager runs when a
 * groomer's day needs to change wholesale (sick day, schedule swap, mass
 * follow-up book). Each mode renders mode-specific options below the same
 * preview list so the manager can verify exactly which appointments move.
 *
 * Finished states (completed / cancelled / no-show) are excluded from the
 * preview and skipped by the mutation — they're already settled and must
 * not be churned by bulk actions.
 */
export function BulkActionsDialog({
  open,
  onOpenChange,
  mode,
  sourceStylist,
  date,
  appointments,
  allStylists,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BulkActionMode;
  sourceStylist: Pick<Stylist, "id" | "name">;
  date: string;
  /** Appointments for this stylist on this date (filtered by the caller). */
  appointments: GroomingAppointment[];
  /** Available stylists for the reschedule target picker. */
  allStylists: Stylist[];
}) {
  const queryClient = useQueryClient();
  const setStatus = useSetGroomingAppointmentStatus();
  const [busy, setBusy] = useState(false);

  // Affected = unfinished only. Finished ones are surfaced as a separate
  // "skipped" count so the manager understands what's NOT moving.
  const affected = useMemo(
    () => appointments.filter((a) => UNFINISHED_STATUSES.includes(a.status)),
    [appointments],
  );
  const skipped = appointments.length - affected.length;

  // Reschedule options.
  const [targetStylistId, setTargetStylistId] = useState<string>(
    sourceStylist.id,
  );
  const [targetDate, setTargetDate] = useState<string>(date);

  // Book-again options.
  const [followUpDate, setFollowUpDate] = useState<string>(addDays(date, 7));

  // Reset state every time the dialog opens or mode changes so stale picks
  // don't leak between sessions.
  useEffect(() => {
    if (!open) return;
    setTargetStylistId(sourceStylist.id);
    setTargetDate(date);
    setFollowUpDate(addDays(date, 7));
  }, [open, mode, sourceStylist.id, date]);

  const meta = MODE_META[mode];

  // For reschedule, the user must have changed at least one of date/groomer.
  const rescheduleHasChange =
    targetStylistId !== sourceStylist.id || targetDate !== date;

  const submitDisabled =
    busy ||
    affected.length === 0 ||
    (mode === "reschedule" && !rescheduleHasChange) ||
    (mode === "book-again" && !followUpDate);

  // ── EVERY MODE WRITES ───────────────────────────────────────────────────
  //
  // All three rewrote the query cache and toasted — "Rescheduled 6", "Created
  // 6 follow-ups", "Cancelled 6 · notifications queued to each client" — and a
  // reload put every appointment back. They go through the same writes the
  // single-appointment actions use, one per appointment, and report how many
  // landed. Nothing notifies clients, so nothing says it did.
  async function handleConfirm() {
    if (affected.length === 0 || busy) return;
    setBusy(true);
    const targetStylist = allStylists.find((s) => s.id === targetStylistId);

    const results = await Promise.allSettled(
      affected.map((a) => {
        if (mode === "reschedule") {
          return bookingMutations.update(Number(a.id), {
            startDate: targetDate,
            endDate: targetDate,
            ...(targetStylistId !== a.stylistId
              ? { stylistPreference: targetStylistId }
              : {}),
          });
        }
        if (mode === "cancel") {
          return setStatus.mutateAsync({ id: a.id, status: "cancelled" });
        }
        return bookingMutations.create({
          clientId: a.ownerId,
          petId: a.petId,
          facilityId: 0,
          service: "grooming",
          serviceType: a.packageId,
          startDate: followUpDate,
          endDate: followUpDate,
          checkInTime: a.startTime,
          checkOutTime: a.endTime,
          status: "confirmed",
          basePrice: a.basePrice,
          discount: 0,
          totalCost: a.basePrice,
          stylistPreference: a.stylistId || undefined,
        });
      }),
    );
    setBusy(false);
    await queryClient.invalidateQueries({ queryKey: ["grooming"] });
    await queryClient.invalidateQueries({ queryKey: ["bookings"] });

    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    const done = results.length - failed.length;
    const plural = (n: number) => (n === 1 ? "" : "s");
    if (done > 0) {
      toast.success(
        mode === "reschedule"
          ? `Rescheduled ${done} appointment${plural(done)} to ${
              targetStylist?.name ?? "the selected groomer"
            } on ${targetDate}`
          : mode === "cancel"
            ? `Cancelled ${done} appointment${plural(done)}`
            : `Created ${done} follow-up appointment${plural(done)} for ${followUpDate}`,
      );
    }
    if (failed.length > 0) {
      toast.error(
        `${failed.length} appointment${plural(failed.length)} not changed`,
        {
          description:
            failed[0].reason instanceof Error
              ? failed[0].reason.message
              : undefined,
        },
      );
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <meta.icon className="text-muted-foreground size-4" />
            {meta.title}
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              · {sourceStylist.name} · {date}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Affected preview */}
          <section className="bg-muted/30 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Affected appointments
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {affected.length} of {appointments.length}
              </Badge>
            </div>
            {affected.length === 0 ? (
              <p className="bg-card/30 text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center text-xs">
                Nothing to apply — all {appointments.length} appointment
                {appointments.length === 1 ? " is" : "s are"} already finished.
              </p>
            ) : (
              <ul className="max-h-44 space-y-1 overflow-y-auto text-xs">
                {affected
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((a) => (
                    <li
                      key={a.id}
                      className="bg-card flex items-center justify-between gap-2 rounded-md px-2 py-1"
                    >
                      <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                        {a.startTime}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{a.petName}</span>
                        <span className="text-muted-foreground ml-1">
                          · {a.packageName}
                        </span>
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {a.status.replace("-", " ")}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}
            {skipped > 0 && (
              <p className="text-muted-foreground mt-2 flex items-center gap-1 text-[10px]">
                <AlertTriangle className="size-3" />
                Skipping {skipped} finished appointment
                {skipped === 1 ? "" : "s"} — bulk actions don&apos;t touch
                completed, cancelled, or no-show records.
              </p>
            )}
          </section>

          {/* Mode-specific options */}
          {mode === "reschedule" && (
            <section className="space-y-3">
              <div>
                <Label className="text-xs">New date</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">New groomer</Label>
                <Select
                  value={targetStylistId}
                  onValueChange={setTargetStylistId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allStylists
                      .filter((s) => s.status === "active")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.id === sourceStylist.id && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              (current)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {!rescheduleHasChange && affected.length > 0 && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Pick a different date or groomer to enable the reschedule.
                </p>
              )}
            </section>
          )}

          {mode === "book-again" && (
            <section className="space-y-3">
              <div>
                <Label className="text-xs">Follow-up date</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[7, 14, 28, 42].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFollowUpDate(addDays(date, n))}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px]",
                      followUpDate === addDays(date, n)
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    +{n}d
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-[10px]">
                Same client, same pet, same service, same groomer — new date.
                Workflow history and ticket comments are cleared on the new
                bookings.
              </p>
            </section>
          )}

          {mode === "cancel" && (
            <section className="space-y-2">
              <p className="text-muted-foreground text-[10px]">
                Clients are not messaged from here.
              </p>
              <p className="text-[10px] text-red-700 dark:text-red-300">
                This sets each appointment&apos;s status to cancelled. The
                original schedule is preserved on the appointment record.
              </p>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={submitDisabled}
            onClick={handleConfirm}
            className={meta.ctaClassName}
          >
            <meta.icon className="mr-1.5 size-4" />
            {meta.cta} ({affected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
