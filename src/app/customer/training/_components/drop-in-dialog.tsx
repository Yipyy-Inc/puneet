"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  DollarSign,
  Info,
  PawPrint,
  Ticket,
} from "lucide-react";
import {
  calculateSessionDates,
  getDayName,
  type TrainingSeries,
} from "@/lib/training-series";
import type { Pet } from "@/types/pet";
import { TrainingWaiversSection } from "./training-waivers-section";
import { allRequiredWaiversSigned } from "@/data/training-waivers";
import { trainingQueries } from "@/lib/api/training";
import {
  buildDropInCountsBySessionId,
  fanOutDropInUpsert,
  nextDropInId,
  nextDropInInvoiceLineId,
  resolveDropInMax,
  resolveDropInPrice,
  type TrainingDropInBooking,
} from "@/lib/training-drop-ins";
import { clients } from "@/data/clients";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: TrainingSeries | null;
  pets: Pet[];
}

function formatLongDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function nowMs() {
  return Date.now();
}

/** Single-session drop-in dialog. Pay for one session of a series without
 *  committing to the full enrollment — shown only when the series has
 *  `allowDropIns: true`. Drop-ins don't propagate to the trainer's Series
 *  Students list (they're per-session, not enrollments). */
export function DropInDialog({ open, onOpenChange, series, pets }: Props) {
  const queryClient = useQueryClient();
  const [petId, setPetId] = useState<number | null>(null);
  const [sessionDate, setSessionDate] = useState<string>("");
  const [agreedWaivers, setAgreedWaivers] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [openedAtMs] = useState<number>(nowMs);

  const { data: moduleSettings } = useQuery(trainingQueries.moduleSettings());
  const { data: dropInBookings = [] } = useQuery(
    trainingQueries.dropInBookings(),
  );

  // Restrict to dogs — the broader pet schema includes cats etc.
  const dogs = useMemo(() => pets.filter((p) => p.type === "Dog"), [pets]);

  // Upcoming sessions for this series. The picker now keeps each session's
  // id alongside its date so a booking can pin to the right
  // TrainingSeriesSession record (the same id the trainer sees on their
  // calendar).
  const upcomingSessions = useMemo(() => {
    if (!series)
      return [] as {
        id: string;
        date: string;
        sessionNumber: number;
        startTime: string;
      }[];
    const list = series.sessions
      .filter((s) => {
        const ms = new Date(`${s.date}T${s.startTime}`).getTime();
        return ms >= openedAtMs && s.status !== "cancelled";
      })
      .map((s) => ({
        id: s.id,
        date: s.date,
        sessionNumber: s.sessionNumber,
        startTime: s.startTime,
      }));
    if (list.length > 0) return list;
    // Fallback for series whose sessions[] hasn't been generated yet — keep
    // the legacy date-only flow so the dialog never goes empty.
    return calculateSessionDates(
      series.startDate,
      series.dayOfWeek,
      series.numberOfWeeks,
    )
      .filter((d) => {
        const ms = new Date(`${d}T${series.startTime}`).getTime();
        return ms >= openedAtMs;
      })
      .map((d, idx) => ({
        id: `${series.id}-fallback-${idx}`,
        date: d,
        sessionNumber: idx + 1,
        startTime: series.startTime,
      }));
  }, [series, openedAtMs]);

  // Reset state every time the dialog opens against a new series.
  useEffect(() => {
    if (!open) return;
    setPetId(null);
    setAgreedWaivers(new Set());
    setBusy(false);
    setSessionDate(upcomingSessions[0]?.id ?? "");
  }, [open, series?.id, upcomingSessions]);

  if (!series) return null;

  const dropInMax = resolveDropInMax(
    series,
    moduleSettings?.defaultDropInMaxPerSession,
  );
  const pricePerSession = resolveDropInPrice(
    series,
    moduleSettings?.defaultDropInPrice,
  );
  const countsBySession = buildDropInCountsBySessionId(dropInBookings);
  const selectedSession = upcomingSessions.find((s) => s.id === sessionDate);
  const selectedSeatsTaken = selectedSession
    ? countsBySession.get(selectedSession.id) ?? 0
    : 0;
  const selectedSeatsLeft = Math.max(0, dropInMax - selectedSeatsTaken);
  const selectedFull = !!selectedSession && selectedSeatsLeft === 0;

  const waiversOk = allRequiredWaiversSigned(agreedWaivers);
  const canSubmit =
    petId !== null &&
    !!sessionDate &&
    !!selectedSession &&
    !selectedFull &&
    waiversOk &&
    !busy;

  async function handleSubmit() {
    if (!canSubmit || !series || !selectedSession) return;
    const pet = dogs.find((p) => p.id === petId);
    if (!pet) {
      toast.error("Pet not found");
      return;
    }
    setBusy(true);
    try {
      // Mock: simulate an async charge + write
      await new Promise((resolve) => setTimeout(resolve, 800));
      const owner = clients.find((c) => c.pets.some((p) => p.id === pet.id));
      const nowISO = new Date().toISOString();
      const invoiceLineId = nextDropInInvoiceLineId();
      const booking: TrainingDropInBooking = {
        id: nextDropInId(),
        seriesId: series.id,
        sessionId: selectedSession.id,
        sessionDate: selectedSession.date,
        sessionNumber: selectedSession.sessionNumber,
        sessionStartTime: selectedSession.startTime,
        petId: pet.id,
        petName: pet.name,
        petBreed: pet.breed,
        ownerId: owner?.id ?? 0,
        ownerName: owner?.name ?? "Owner",
        ownerPhone: owner?.phone,
        ownerEmail: owner?.email,
        price: pricePerSession,
        invoiceLine: {
          id: invoiceLineId,
          description: `Drop-in fee — ${series.seriesName} · Session ${selectedSession.sessionNumber}`,
          category: "training-drop-in",
          amount: pricePerSession,
          dateISO: nowISO.slice(0, 10),
        },
        status: "booked",
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      fanOutDropInUpsert(queryClient, booking);
      toast.success(
        `${pet.name} is booked into ${series.seriesName} on ${formatLongDate(selectedSession.date)}. Confirmation email on the way.`,
        { duration: 5000 },
      );
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to book drop-in",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="text-muted-foreground size-4" />
            Book a Drop-In Session
          </DialogTitle>
          <DialogDescription>
            Pay for a single session of{" "}
            <span className="font-medium text-slate-800">
              {series.seriesName}
            </span>{" "}
            — no commitment to the full series.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pet picker ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <PawPrint className="size-4" />
              Select pet <span className="text-destructive">*</span>
            </Label>
            <Select
              value={petId?.toString() ?? ""}
              onValueChange={(v) => setPetId(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose which pet…" />
              </SelectTrigger>
              <SelectContent>
                {dogs.length === 0 && (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No dogs on file — add one to your profile first.
                  </div>
                )}
                {dogs.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id.toString()}>
                    {pet.name} — {pet.breed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session picker ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              Session date <span className="text-destructive">*</span>
            </Label>
            {upcomingSessions.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-[12px] italic">
                No upcoming sessions available for drop-in right now.
              </p>
            ) : (
              <Select value={sessionDate} onValueChange={setSessionDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a session…" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingSessions.map((s) => {
                    const taken = countsBySession.get(s.id) ?? 0;
                    const left = Math.max(0, dropInMax - taken);
                    const full = left === 0;
                    return (
                      <SelectItem key={s.id} value={s.id} disabled={full}>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                            S{s.sessionNumber}
                          </span>
                          {formatLongDate(s.date)} · {formatTime(series.startTime)}
                          <span
                            className={cn(
                              "ml-auto text-[10px]",
                              full
                                ? "text-rose-600"
                                : left === 1
                                  ? "text-amber-700"
                                  : "text-muted-foreground",
                            )}
                          >
                            {full
                              ? "Drop-in full"
                              : `${left} drop-in${left === 1 ? "" : "s"} left`}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {selectedSession && (
              <p
                className={cn(
                  "text-[11px]",
                  selectedFull
                    ? "text-rose-700"
                    : selectedSeatsLeft <= 1
                      ? "text-amber-700"
                      : "text-muted-foreground",
                )}
              >
                {selectedFull
                  ? "This session is already at its drop-in cap. Pick another."
                  : `${selectedSeatsLeft} of ${dropInMax} drop-in seat${dropInMax === 1 ? "" : "s"} still open.`}
              </p>
            )}
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              {getDayName(series.dayOfWeek)}s · {formatTime(series.startTime)} –{" "}
              {formatTime(series.endTime)} · {series.location}
            </p>
          </div>

          {/* Waivers ────────────────────────────────────────────────────── */}
          <TrainingWaiversSection
            agreed={agreedWaivers}
            onChange={setAgreedWaivers}
          />

          <Separator />

          {/* Payment summary ───────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <DollarSign className="size-4" />
              Single session
            </Label>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50/40 px-3 py-2.5">
              <div className="text-[12.5px] text-slate-700">
                Drop-in fee — one session
              </div>
              <span className="text-lg font-bold tabular-nums text-slate-900">
                ${pricePerSession}
              </span>
            </div>
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Info className="size-3" />
              Drop-ins don&apos;t carry over to the rest of the series — you
              can book additional sessions individually.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            <CalendarCheck className="size-4" />
            {busy ? "Booking…" : `Book drop-in · $${pricePerSession}`}
          </Button>
        </DialogFooter>
        {!waiversOk && (
          <Badge
            variant="outline"
            className="mx-auto mt-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
          >
            Sign every required waiver to continue
          </Badge>
        )}
      </DialogContent>
    </Dialog>
  );
}
