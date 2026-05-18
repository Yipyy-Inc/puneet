"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { CalendarClock, Sparkles, User2 } from "lucide-react";
import type { TrainingSession } from "@/types/training";
import { trainingQueries } from "@/lib/api/training";
import {
  END_HOUR,
  START_HOUR,
  formatISODate,
  timeToMinutes,
} from "./training-calendar-utils";

const SLOT_GRANULARITY_MIN = 30;
const MAX_RESULTS = 25;

const DURATION_OPTIONS = [30, 45, 60, 90] as const;

const ANY_TRAINER = "__any__";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPickSlot: (slot: { trainerId: string; date: string; time: string }) => void;
}

type FreeSlot = {
  trainerId: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
};

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function eachDayInRange(fromISO: string, toISO: string): string[] {
  const start = new Date(fromISO + "T00:00:00");
  const end = new Date(toISO + "T00:00:00");
  if (end < start) return [];
  const out: string[] = [];
  for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    out.push(formatISODate(d));
  }
  return out;
}

export function SmartSchedulingDialog({
  open,
  onOpenChange,
  onPickSlot,
}: Props) {
  const todayISO = useMemo(() => formatISODate(new Date()), []);
  const sevenDaysOutISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatISODate(d);
  }, []);

  const [trainerId, setTrainerId] = useState<string>(ANY_TRAINER);
  const [duration, setDuration] = useState<number>(60);
  const [fromDate, setFromDate] = useState<string>(todayISO);
  const [toDate, setToDate] = useState<string>(sevenDaysOutISO);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasSearched(false);
      return;
    }
    setFromDate(todayISO);
    setToDate(sevenDaysOutISO);
  }, [open, todayISO, sevenDaysOutISO]);

  const { data: allTrainers = [] } = useQuery(trainingQueries.trainers());
  const { data: allClasses = [] } = useQuery(trainingQueries.classes());
  const { data: allSessions = [] } = useQuery(trainingQueries.sessions());

  // Only trainers who actually have an active private offering are eligible
  // to take private bookings — that's the universe smart-scheduling searches.
  const privateTrainers = useMemo(() => {
    const eligibleIds = new Set(
      allClasses
        .filter((c) => c.classType === "private" && c.status === "active")
        .map((c) => c.trainerId),
    );
    return allTrainers.filter(
      (t) => t.status === "active" && eligibleIds.has(t.id),
    );
  }, [allTrainers, allClasses]);

  const results = useMemo<FreeSlot[]>(() => {
    if (!hasSearched) return [];
    const candidateTrainers =
      trainerId === ANY_TRAINER
        ? privateTrainers
        : privateTrainers.filter((t) => t.id === trainerId);
    if (candidateTrainers.length === 0) return [];

    const days = eachDayInRange(fromDate, toDate);
    if (days.length === 0) return [];

    // Pre-index existing sessions per (trainer, date) for fast overlap checks.
    const sessionsKey = (tid: string, d: string) => `${tid}::${d}`;
    const sessionsByKey = new Map<string, TrainingSession[]>();
    for (const sess of allSessions) {
      if (sess.status === "cancelled") continue;
      const k = sessionsKey(sess.trainerId, sess.date);
      const arr = sessionsByKey.get(k);
      if (arr) arr.push(sess);
      else sessionsByKey.set(k, [sess]);
    }

    const out: FreeSlot[] = [];
    const dayStartMin = START_HOUR * 60;
    const dayEndMin = END_HOUR * 60;

    for (const day of days) {
      for (const trainer of candidateTrainers) {
        const busy = sessionsByKey.get(sessionsKey(trainer.id, day)) ?? [];
        const busyRanges = busy
          .map((s) => ({
            start: timeToMinutes(s.startTime),
            end: timeToMinutes(s.endTime),
          }))
          .sort((a, b) => a.start - b.start);

        for (
          let start = dayStartMin;
          start + duration <= dayEndMin;
          start += SLOT_GRANULARITY_MIN
        ) {
          const end = start + duration;
          const collides = busyRanges.some(
            (r) => r.start < end && r.end > start,
          );
          if (collides) continue;
          out.push({
            trainerId: trainer.id,
            trainerName: trainer.name,
            date: day,
            startTime: minutesToHHMM(start),
            endTime: minutesToHHMM(end),
          });
          if (out.length >= MAX_RESULTS * 4) break;
        }
        if (out.length >= MAX_RESULTS * 4) break;
      }
      if (out.length >= MAX_RESULTS * 4) break;
    }

    // Sort by date, then time, then trainer; cap the surfaced list.
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.startTime !== b.startTime)
        return a.startTime < b.startTime ? -1 : 1;
      return a.trainerName.localeCompare(b.trainerName);
    });
    return out.slice(0, MAX_RESULTS);
  }, [
    hasSearched,
    privateTrainers,
    trainerId,
    fromDate,
    toDate,
    duration,
    allSessions,
  ]);

  function handleSearch() {
    if (!fromDate || !toDate) {
      toast.error("Pick a date range to search.");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    setHasSearched(true);
  }

  function handlePick(slot: FreeSlot) {
    onPickSlot({
      trainerId: slot.trainerId,
      date: slot.date,
      time: slot.startTime,
    });
    onOpenChange(false);
  }

  const noPrivateOfferings = privateTrainers.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600" />
            Smart Scheduling
          </DialogTitle>
          <DialogDescription>
            Find open slots for a private 1-on-1 session across your private
            trainers&apos; calendars.
          </DialogDescription>
        </DialogHeader>

        {noPrivateOfferings ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No active private offerings yet. Create a private class in the
            Course Catalog first.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trainer</Label>
                <Select value={trainerId} onValueChange={setTrainerId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_TRAINER}>
                      Any private trainer
                    </SelectItem>
                    {privateTrainers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">From</Label>
                <DatePicker
                  value={fromDate}
                  onValueChange={(v) => setFromDate(v ?? fromDate)}
                  placeholder="Start date"
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Through</Label>
                <DatePicker
                  value={toDate}
                  onValueChange={(v) => setToDate(v ?? toDate)}
                  placeholder="End date"
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSearch}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <CalendarClock className="mr-1.5 size-4" />
              Find available slots
            </Button>

            {hasSearched && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
                {results.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">
                    No openings match those criteria — try a longer date range
                    or a shorter session.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {results.map((slot, i) => {
                      const dateLabel = new Date(
                        slot.date + "T00:00:00",
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <li
                          key={`${slot.trainerId}-${slot.date}-${slot.startTime}-${i}`}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 transition-colors hover:bg-indigo-50/50",
                          )}
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                            <User2 className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {dateLabel} · {slot.startTime}–{slot.endTime}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {slot.trainerName}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-transparent bg-emerald-100 text-[10px] font-bold text-emerald-700"
                          >
                            Open
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handlePick(slot)}
                            className="h-7 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
                          >
                            Book
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
