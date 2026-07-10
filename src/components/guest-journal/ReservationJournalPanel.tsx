"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, AlertTriangle, Download, Plus, Phone } from "lucide-react";
import { boardingGuests, type BoardingGuest } from "@/data/boarding";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { useGuestCareLog } from "@/hooks/use-care-log";
import {
  generateScheduledTasks,
  todayIso,
  format12h,
} from "@/lib/care-log-scheduler";
import { getOutcomeOption } from "@/components/daily-care/outcome-meta";
import { downloadReportPdf } from "@/lib/report-export";
import { JournalDayCard } from "./JournalDayCard";
import { JournalActivityLog } from "./JournalActivityLog";
import { LogModalRouter } from "@/components/daily-care/log-modals/LogModalRouter";
import { petFlagsStore } from "@/data/pet-flags-store";
import { petCareNotesStore } from "@/data/pet-care-notes";
import { journalNotesStore } from "@/data/journal-notes-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PetCareNoteCard } from "./PetCareNoteCard";
import { toast } from "sonner";
import type {
  ScheduledTask,
  TaskExecution,
  HealthObservation,
  CleaningDetail,
  AddonLogDetail,
  EnrichmentDetail,
} from "@/types/care-log";

type Props = {
  /** The booking ID, e.g. "bk-001" or numeric — we resolve guests by either */
  bookingId: number | string;
  /** Optional list of pet IDs from the booking. If provided, we filter guests
   *  to only those pets. Otherwise we match by bookingId. */
  petIds?: number[];
};

// Single-facility mock — matches DailyCareView's facility naming.
const FACILITY_NAME = "Yipyy";

function fmtDate(s: string): string {
  const d = new Date((s ?? "").slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Digits (and leading +) only, for a tel: href. */
function telHref(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function dateRange(checkIn: string, checkOut: string): string[] {
  // Both inputs may include a time component; normalize to date-only
  const start = new Date((checkIn ?? "").slice(0, 10) + "T00:00:00");
  const end = new Date((checkOut ?? "").slice(0, 10) + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function GuestJournalContent({ guest }: { guest: BoardingGuest }) {
  const { config } = useDailyCareConfig();
  const { executions, log } = useGuestCareLog(guest.id);

  const days = useMemo(
    () => dateRange(guest.checkInDate, guest.checkOutDate),
    [guest.checkInDate, guest.checkOutDate],
  );

  const today = todayIso();
  const [activeDay, setActiveDay] = useState<string>(() => {
    if (days.includes(today)) return today;
    return days[0] ?? today;
  });

  // Stay-long per-pet care notes (A4.5) — stable map, flips reference on edit so
  // the schedule re-derives careNote for the sticky-note indicator.
  const careNotes = useSyncExternalStore(
    petCareNotesStore.subscribe,
    petCareNotesStore.getNotesMap,
    petCareNotesStore.getNotesMap,
  );

  // Manual journal notes for this guest (A8.4) — free-text, non-task entries
  // that show in the Activity Log timeline with author + time.
  const { user } = useCurrentUser();
  const allJournalNotes = useSyncExternalStore(
    journalNotesStore.subscribe,
    journalNotesStore.getSnapshot,
    journalNotesStore.getSnapshot,
  );
  const guestNotes = useMemo(
    () => allJournalNotes.filter((n) => n.guestId === guest.id),
    [allJournalNotes, guest.id],
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  function saveNote() {
    const text = noteText.trim();
    if (!text) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    journalNotesStore.add({
      guestId: guest.id,
      date: todayIso(),
      time: `${hh}:${mm}`,
      author: user.name,
      authorInitials: user.initials,
      text,
      createdAt: now.toISOString(),
    });
    setNoteText("");
    setNoteOpen(false);
    toast.success("Note added to journal.");
  }

  const tasksForDay = useMemo(() => {
    const dateObj = new Date(activeDay + "T00:00:00");
    return generateScheduledTasks([guest], config, dateObj, careNotes);
  }, [guest, config, activeDay, careNotes]);

  const dayExecutions = useMemo(
    () => executions.filter((e) => e.date === activeDay),
    [executions, activeDay],
  );

  const [modalState, setModalState] = useState<{
    task: ScheduledTask | null;
    existing: TaskExecution | undefined;
    /** Medication step-through queue (rule a) — same pet + time, unlogged. */
    queue?: ScheduledTask[];
  }>({ task: null, existing: undefined });

  function handleLog(task: ScheduledTask, existing?: TaskExecution) {
    // Medication (rule a): step through every not-yet-logged med for this pet
    // at this time. Editing a single logged med skips the queue.
    if (task.taskType === "medication" && !existing) {
      const siblings = tasksForDay
        .filter(
          (t) =>
            t.taskType === "medication" &&
            t.guestId === task.guestId &&
            t.scheduledTime === task.scheduledTime &&
            !dayExecutions.some((e) => e.taskId === t.id),
        )
        .sort((a, b) => a.details.localeCompare(b.details));
      const queue = [task, ...siblings.filter((t) => t.id !== task.id)];
      setModalState({ task, existing, queue });
      return;
    }
    setModalState({ task, existing });
  }

  // Log a single medication as its own TaskExecution (the med modal advances
  // the queue itself between calls).
  function handleLogMedication(
    task: ScheduledTask,
    entry: {
      outcome: string;
      notes?: string;
      staffInitials: string;
      staffName?: string;
      executedAt?: string;
      photoUrls?: string[];
    },
  ) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date: activeDay,
      executedAt: entry.executedAt ?? `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      staffName: entry.staffName,
      photoUrls: entry.photoUrls,
      photoUrl: entry.photoUrls?.[0],
    });
    toast.success(
      `Logged ${task.medDetail?.name ?? "medication"} for ${task.petName}`,
    );
  }

  // Rule (c): tasks are re-derived from the booking on every render, so a
  // "reload" just closes the (stale) modal and lets the fresh list take over.
  function handleReloadMeds() {
    toast.info("Reloaded medication data from booking.");
    setModalState({ task: null, existing: undefined });
  }

  function handleSubmit(entry: {
    outcome: string;
    notes?: string;
    staffInitials: string;
    staffName?: string;
    executedAt?: string;
    servedAt?: string;
    photoUrls?: string[];
    healthObservation?: HealthObservation;
    cleaning?: CleaningDetail;
    waterVolume?: string;
    missedReason?: string;
    notifyOwner?: boolean;
    addon?: AddonLogDetail;
    enrichment?: EnrichmentDetail;
  }) {
    if (!modalState.task) return;
    const task = modalState.task;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date: activeDay,
      executedAt: entry.executedAt ?? `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      staffName: entry.staffName,
      servedAt: entry.servedAt,
      photoUrls: entry.photoUrls,
      photoUrl: entry.photoUrls?.[0],
      healthObservation: entry.healthObservation,
      cleaning: entry.cleaning,
      waterVolume: entry.waterVolume,
      missedReason: entry.missedReason,
      addon: entry.addon,
      enrichment: entry.enrichment,
    });

    // An escalating log (health concern or add-on incident) raises the pet flag
    // (A4.3) and notifies the on-shift manager (toast stands in for a real push).
    if (entry.healthObservation) {
      const obs = entry.healthObservation;
      petFlagsStore.raise(activeDay, task.guestId, {
        reason: `Health concern: ${obs.type} · ${obs.severity}`,
        createdBy: entry.staffName ?? entry.staffInitials,
        createdAt: new Date().toISOString(),
      });
      toast.warning(
        `${task.petName} flagged for attention — manager notified of health concern.`,
      );
    } else if (entry.addon?.incident) {
      petFlagsStore.raise(activeDay, task.guestId, {
        reason: `Add-on incident (${entry.addon.incident.severity}): ${task.details}`,
        createdBy: entry.staffName ?? entry.staffInitials,
        createdAt: new Date().toISOString(),
      });
      toast.warning(
        `${task.petName} flagged — incident logged, manager notified.`,
      );
    } else if (entry.missedReason) {
      toast.warning(
        `Logged ${task.details} as not delivered.${
          entry.notifyOwner ? " Owner notified." : ""
        }`,
      );
    } else {
      toast.success(`Logged for ${task.petName}`);
    }
    setModalState({ task: null, existing: undefined });
  }

  const stayDayIndex = days.indexOf(activeDay);
  const dayLabel =
    stayDayIndex >= 0
      ? `Day ${stayDayIndex + 1} of ${days.length}`
      : "Outside stay";

  // Build a complete-stay owner report and download it as a PDF, reusing the
  // shared report-export helper (AREA 9). Latin-1 text only — no glyphs.
  function handleDownload() {
    const L: string[] = [];
    L.push(`${FACILITY_NAME} — Guest Journal`);
    L.push(`${guest.petName} · ${guest.kennelName}`);
    if (guest.ownerName) L.push(`Owner: ${guest.ownerName}`);
    L.push(
      `Stay: ${guest.checkInDate.slice(0, 10)} to ${guest.checkOutDate.slice(
        0,
        10,
      )} (${guest.totalNights} ${guest.totalNights === 1 ? "night" : "nights"})`,
    );
    const stayNote = petCareNotesStore.getSnapshot(guest.id) ?? guest.notes;
    if (stayNote) L.push(`Care note: ${stayNote}`);
    L.push("");

    days.forEach((d, i) => {
      const dateObj = new Date(d + "T00:00:00");
      const dateLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      L.push(`Day ${i + 1} of ${days.length} — ${dateLabel}`);

      const dayTasks = generateScheduledTasks(
        [guest],
        config,
        dateObj,
        careNotes,
      )
        .slice()
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
      const dayExecs = executions.filter((e) => e.date === d);

      if (dayTasks.length === 0) {
        L.push("  No tasks scheduled.");
      } else {
        for (const task of dayTasks) {
          const exec = dayExecs.find((e) => e.taskId === task.id);
          if (!exec) {
            L.push(
              `  ${format12h(task.scheduledTime)} ${task.details}: (not logged)`,
            );
            continue;
          }
          const outcome =
            getOutcomeOption(exec.taskType, String(exec.outcome))?.label ??
            String(exec.outcome);
          const staff = exec.staffName ?? exec.staffInitials;
          L.push(
            `  ${format12h(exec.executedAt)} ${task.details}: ${outcome} — ${staff}`,
          );
          if (exec.notes) L.push(`      Note: "${exec.notes}"`);
          if (exec.healthObservation) {
            const h = exec.healthObservation;
            L.push(
              `      Health observation: ${h.type} (${h.severity})${
                h.notes ? ` — ${h.notes}` : ""
              }`,
            );
          }
        }
      }

      const flag = petFlagsStore.getSnapshot(d, guest.id);
      if (flag) {
        L.push(
          `  Health flag raised: ${flag.reason ?? "attention"} (by ${flag.createdBy})`,
        );
      }
      for (const n of guestNotes.filter((n) => n.date === d)) {
        L.push(`  Note (${n.author}): "${n.text}"`);
      }
      L.push("");
    });

    const slug = guest.petName.replace(/\s+/g, "-").toLowerCase();
    downloadReportPdf(
      `journal-${slug}-${guest.id}`,
      `${FACILITY_NAME} — ${guest.petName} — Guest Journal`,
      L,
    );
    toast.success(`Journal downloaded for ${guest.petName}.`);
  }

  return (
    <div className="space-y-3">
      {/* Stay summary — sourced from the booking / BoardingGuest record. */}
      <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Check-in</dt>
            <dd className="font-medium">{fmtDate(guest.checkInDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Check-out</dt>
            <dd className="font-medium">{fmtDate(guest.checkOutDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Room / Kennel</dt>
            <dd className="font-medium">
              {guest.kennelName}
              {guest.packageType ? ` · ${guest.packageType}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">{guest.ownerName}</dd>
          </div>
          {guest.ownerPhone && (
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>
                <a
                  href={`tel:${telHref(guest.ownerPhone)}`}
                  className="text-primary flex items-center gap-1 font-medium hover:underline"
                >
                  <Phone className="size-3" />
                  {guest.ownerPhone}
                </a>
              </dd>
            </div>
          )}
        </dl>
        {guest.notes && (
          <div className="border-t pt-2 text-xs">
            <p className="text-muted-foreground">Special instructions</p>
            <p className="mt-0.5 whitespace-pre-wrap">{guest.notes}</p>
          </div>
        )}
      </div>

      <PetCareNoteCard
        guestId={guest.id}
        petName={guest.petName}
        fallbackNote={guest.notes}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {days.length}-day stay · {executions.length}{" "}
          {executions.length === 1 ? "entry" : "entries"} logged
        </p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 size-4" />
          Download Journal
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {days.map((d, i) => {
          const isActive = d === activeDay;
          const isToday = d === today;
          const dateObj = new Date(d + "T00:00:00");
          const label = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              data-active={isActive}
              data-today={isToday}
              className="data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[today=true]:border-amber-400"
            >
              <span className="mr-1 text-[9px] opacity-70">D{i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      <JournalDayCard
        date={activeDay}
        dayLabel={dayLabel}
        tasks={tasksForDay}
        executions={dayExecutions}
        onLog={handleLog}
      />

      {/* Manual journal note composer (A8.4). */}
      <div className="rounded-lg border p-3">
        {noteOpen ? (
          <div className="space-y-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="e.g. Owner called — told them Bella is doing great."
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteText("");
                  setNoteOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveNote} disabled={!noteText.trim()}>
                Save note
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => setNoteOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Add Note
          </Button>
        )}
      </div>

      <JournalActivityLog executions={executions} notes={guestNotes} />

      <LogModalRouter
        open={modalState.task !== null}
        task={modalState.task}
        existing={modalState.existing}
        onOpenChange={(open) => {
          if (!open) setModalState({ task: null, existing: undefined });
        }}
        onSubmit={handleSubmit}
        medicationQueue={modalState.queue}
        onLogMedication={handleLogMedication}
        onReloadMedication={handleReloadMeds}
      />
    </div>
  );
}

export function ReservationJournalPanel({ bookingId, petIds }: Props) {
  const guests = useMemo(() => {
    const refId =
      typeof bookingId === "number"
        ? `bk-${String(bookingId).padStart(3, "0")}`
        : bookingId;
    let matches = boardingGuests.filter((g) => g.bookingId === refId);
    if (matches.length === 0 && petIds && petIds.length > 0) {
      matches = boardingGuests.filter((g) => petIds.includes(g.petId));
    }
    return matches;
  }, [bookingId, petIds]);

  if (guests.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4" />
            Guest Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="size-4 shrink-0" />
            <div>
              <p className="font-medium">
                Journal not yet built for this reservation.
              </p>
              <p className="mt-0.5">
                The Guest Journal is auto-generated from the feeding plan,
                medications, and add-ons entered when the booking was confirmed.
                Once those details are present this panel will populate
                automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (guests.length === 1) {
    const guest = guests[0]!;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4" />
              Guest Journal · {guest.petName}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {guest.totalNights} {guest.totalNights === 1 ? "night" : "nights"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <GuestJournalContent guest={guest} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4" />
          Guest Journals
          <Badge variant="secondary" className="text-[10px]">
            {guests.length} pets
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={guests[0]!.id}>
          <TabsList className="mb-3">
            {guests.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>
                {g.petName}
              </TabsTrigger>
            ))}
          </TabsList>
          {guests.map((g) => (
            <TabsContent key={g.id} value={g.id}>
              <GuestJournalContent guest={g} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
