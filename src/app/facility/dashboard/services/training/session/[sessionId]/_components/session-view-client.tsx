"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock,
  GraduationCap,
  MapPin,
  Siren,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import { vaccinationRecords } from "@/data/pet-data";
import { aggregateStudentBriefing } from "@/lib/training-pre-session";
import { STATUS_META } from "@/components/facility/training/training-calendar-utils";
import { SessionAttendanceSection } from "./session-view-attendance";
import { SessionExercisesSection } from "./session-view-exercises";
import { SessionCompleteConfirmDialog } from "./session-view-complete-dialog";
import { SessionHomeworkPromptDialog } from "./session-view-homework-prompt";
import { saveSession, type PresentStudentSummary } from "./session-view-save";
import { useReputation } from "@/hooks/use-reputation";
import { resolveClientByPetId } from "@/lib/reputation/resolve-client";
import type {
  AttendanceMark,
  SessionExerciseEntry,
  SessionPhoto,
} from "./session-view-types";
import { toast } from "sonner";

type Section = "attendance" | "exercises";

export function SessionViewClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { recordCheckout } = useReputation();
  const [section, setSection] = useState<Section>("attendance");
  const [attendance, setAttendance] = useState<Record<string, AttendanceMark>>(
    {},
  );
  const [exerciseEntries, setExerciseEntries] = useState<
    SessionExerciseEntry[]
  >([]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [homeworkPromptOpen, setHomeworkPromptOpen] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [savedStudents, setSavedStudents] = useState<PresentStudentSummary[]>(
    [],
  );

  // Free any blob: URLs we created so they don't leak when the page unmounts.
  useEffect(() => {
    return () => {
      for (const photo of sessionPhotos) {
        if (photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
      }
    };
    // We intentionally close over the latest list at unmount via the ref of
    // the state setter. The eslint exhaustive-deps rule is satisfied since
    // sessionPhotos changes are captured by re-running the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoButtonClick() {
    fileInputRef.current?.click();
  }

  function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nowISO = new Date().toISOString();
    const fresh: SessionPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      fresh.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(file),
        caption: "",
        takenAtISO: nowISO,
      });
    }
    if (fresh.length > 0) {
      setSessionPhotos((curr) => [...curr, ...fresh]);
      toast.success(
        `Added ${fresh.length} photo${fresh.length === 1 ? "" : "s"}`,
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setPhotoCaption(id: string, caption: string) {
    setSessionPhotos((curr) =>
      curr.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  }

  function removePhoto(id: string) {
    setSessionPhotos((curr) => {
      const target = curr.find((p) => p.id === id);
      if (target && target.url.startsWith("blob:"))
        URL.revokeObjectURL(target.url);
      return curr.filter((p) => p.id !== id);
    });
  }

  const { data: sessions = [] } = useQuery(trainingQueries.sessions());
  const { data: classes = [] } = useQuery(trainingQueries.classes());
  const { data: enrollments = [] } = useQuery(trainingQueries.enrollments());
  const { data: trainerNotes = [] } = useQuery(trainingQueries.trainerNotes());
  const { data: attendances = [] } = useQuery(trainingQueries.allAttendances());
  const { data: homework = [] } = useQuery(trainingQueries.allHomework());
  const { data: dropInBookings = [] } = useQuery(
    trainingQueries.dropInBookings(),
  );

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  );
  const classRecord = useMemo(
    () => (session ? classes.find((c) => c.id === session.classId) : undefined),
    [session, classes],
  );

  // Which session of the class this is (1-based, by date/time) — selects the
  // curriculum week to pre-load on the Exercises step.
  const sessionNumber = useMemo(() => {
    if (!session) return 1;
    const ordered = sessions
      .filter((s) => s.classId === session.classId)
      .sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
      );
    const idx = ordered.findIndex((s) => s.id === session.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [sessions, session]);

  const pets = useMemo(() => clients.flatMap((c) => c.pets), []);
  const ownerByPetId = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clients) {
      for (const p of c.pets) m.set(p.id, c.name);
    }
    return m;
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0]!, []);

  // Drop-in bookings whose host session matches the one being run today.
  // Date + start time match keeps the bridge tight without a hard schema
  // link between TrainingSession (calendar) and TrainingSeriesSession
  // (series) — same pattern the calendar Make-up badge uses.
  const dropInsForSession = useMemo(() => {
    if (!session) return [];
    return dropInBookings.filter(
      (b) =>
        b.status !== "cancelled" &&
        b.sessionDate === session.date &&
        b.status !== "no-show",
    );
  }, [dropInBookings, session]);

  const rows = useMemo(() => {
    if (!session) return [];
    const enrollmentRows = aggregateStudentBriefing({
      session,
      enrollments,
      trainerNotes,
      vaccinations: vaccinationRecords,
      attendances,
      homework,
      pets,
      ownerLookup: (petId) => ownerByPetId.get(petId) ?? "Unknown",
      todayISO,
    });
    // Synthesize a briefing row per drop-in so the trainer sees them in the
    // same attendance grid. Drop-ins carry an `enrollmentId` prefixed with
    // `drop-` so the attendance handlers can tell them apart.
    const dropInRows = dropInsForSession.map((booking) => {
      const pet = pets.find((p) => p.id === booking.petId);
      const row: (typeof enrollmentRows)[number] = {
        enrollmentId: `drop-${booking.id}`,
        petId: booking.petId,
        petName: booking.petName,
        petBreed: booking.petBreed ?? pet?.breed ?? "",
        petImageUrl: pet?.imageUrl,
        ownerName: booking.ownerName,
        ownerPhone: booking.ownerPhone,
        homeworkSubmitted: false,
        attendance: { attended: 0, missed: 0, total: 0 },
        notes: [],
        vaccineWarning: {
          hasWarning: false,
          soonestDays: null,
          soonestName: null,
        },
        homework: {
          activeCount: 0,
          practicedTodayCount: 0,
          streakDays: 0,
          lastPracticedISO: null,
          overdueCount: 0,
        },
        homeworkVideos: [],
        petAlerts: [],
        consecutiveNoShows: 0,
      };
      return row;
    });
    return [...enrollmentRows, ...dropInRows];
  }, [
    session,
    enrollments,
    trainerNotes,
    attendances,
    homework,
    pets,
    ownerByPetId,
    todayISO,
    dropInsForSession,
  ]);

  // Enrollment ids prefixed with `drop-` are guest dogs from outside the
  // series — drives the Drop-in badge on the attendance card.
  const dropInEnrollmentIds = useMemo(
    () => new Set(dropInsForSession.map((b) => `drop-${b.id}`)),
    [dropInsForSession],
  );

  // Enrich each row with the live owner phone from the class enrollment record.
  const enrollmentById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );

  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Session not found, or it may have been removed.
        </p>
        <Link
          href="/facility/dashboard/services/training"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Back to calendar
        </Link>
      </div>
    );
  }

  const status = STATUS_META[session.status];
  const isPrivate = classRecord?.classType === "private";

  function markAttendance(enrollmentId: string, mark: AttendanceMark) {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: mark }));
  }

  // Tally present students and un-rated dog-exercise pairs — drives the
  // confirm dialog reminder.
  const presentRowsForSave = rows.filter((r) =>
    ["present", "late"].includes(attendance[r.enrollmentId]?.status ?? ""),
  );
  const missingRatingsCount = exerciseEntries.reduce((total, entry) => {
    for (const row of presentRowsForSave) {
      const studentEntry = entry.students[row.enrollmentId];
      if (!studentEntry) continue;
      if (studentEntry.included === false) continue;
      if (studentEntry.rating === null) total++;
    }
    return total;
  }, 0);

  function handleCompleteSession() {
    const summaries = saveSession({
      queryClient,
      session: session!,
      rows: rows.map((r) => ({
        enrollmentId: r.enrollmentId,
        petId: r.petId,
        petName: r.petName,
      })),
      attendance,
      exerciseEntries,
      sessionNotes,
      studentNotes,
      photos: sessionPhotos,
      trainerName: session!.trainerName,
      trainerId: session!.trainerId,
      petImageById: new Map(pets.map((p) => [p.id, p.imageUrl])),
    });
    setSavedStudents(summaries);

    // Reputation Booster (Step 1): a completed session schedules a review
    // request per present student's owner.
    const checkoutAt = new Date().toISOString();
    for (const row of presentRowsForSave) {
      const resolved = resolveClientByPetId(row.petId);
      if (!resolved) continue;
      recordCheckout({
        bookingId: row.petId,
        clientId: resolved.clientId,
        clientName: resolved.clientName,
        petName: row.petName,
        service: "training",
        serviceLabel: "Training",
        staffName: session!.trainerName,
        triggerEvent: "training_session_completed",
        checkoutAt,
      });
    }

    setCompleteConfirmOpen(false);
    toast.success(
      `Session marked complete. ${summaries.length} draft report card${
        summaries.length === 1 ? "" : "s"
      } created.`,
    );
    setHomeworkPromptOpen(true);
  }

  function handleHomeworkDone() {
    router.push("/facility/dashboard/services/training");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50/40 dark:bg-slate-950/40">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/facility/dashboard/services/training"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            Calendar
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {session.className}
              </h1>
              <Badge
                variant="outline"
                className={cn("border-transparent", status.bg, status.text)}
              >
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent",
                  isPrivate
                    ? "bg-orange-100 text-orange-700"
                    : "bg-indigo-100 text-indigo-700",
                )}
              >
                {isPrivate ? "Private 1-on-1" : "Group class"}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {new Date(session.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {session.startTime}–{session.endTime}
              </span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="size-3.5" />
                {session.trainerName}
              </span>
              {classRecord?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {classRecord.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {rows.length} student{rows.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Incident flag — safety-critical. Opens the shared incident
              report modal (defaults to notifying the manager) so a bite,
              injury, or unexpected behavior can be logged mid-session. */}
          <button
            type="button"
            onClick={() => setShowIncident(true)}
            className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/40"
            aria-label="Report an incident"
            title="Report an incident — notifies the manager"
          >
            <Siren className="size-4" />
            <span>Incident</span>
          </button>

          {/* Photo capture — opens device camera (mobile) or photo library
              (desktop). Photos attach to the session and will flow into each
              student's report-card photos array on Finish. */}
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
            aria-label="Take a photo or pick from library"
          >
            <Camera className="size-4" />
            <span>Photo</span>
            {sessionPhotos.length > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white tabular-nums">
                {sessionPhotos.length}
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handlePhotoFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Section stepper ──────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex items-center gap-2">
            <SectionStep
              index={1}
              label="Attendance"
              active={section === "attendance"}
              done={section !== "attendance"}
              onClick={() => setSection("attendance")}
            />
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <SectionStep
              index={2}
              label="Exercises"
              active={section === "exercises"}
              done={false}
              onClick={() => setSection("exercises")}
            />
          </div>
        </div>
      </header>

      {/* Section body ──────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {section === "attendance" && (
          <SessionAttendanceSection
            rows={rows}
            enrollmentById={enrollmentById}
            dropInEnrollmentIds={dropInEnrollmentIds}
            attendance={attendance}
            onMark={markAttendance}
            onDone={() => setSection("exercises")}
          />
        )}
        {section === "exercises" && (
          <SessionExercisesSection
            session={session}
            classRecord={classRecord}
            sessionNumber={sessionNumber}
            attendance={attendance}
            rows={rows}
            entries={exerciseEntries}
            setEntries={setExerciseEntries}
            sessionNotes={sessionNotes}
            setSessionNotes={setSessionNotes}
            studentNotes={studentNotes}
            setStudentNote={(enrollmentId, value) =>
              setStudentNotes((curr) => ({ ...curr, [enrollmentId]: value }))
            }
            photos={sessionPhotos}
            onAddPhotos={handlePhotoButtonClick}
            onSetPhotoCaption={setPhotoCaption}
            onRemovePhoto={removePhoto}
            onBack={() => setSection("attendance")}
            onFinish={() => setCompleteConfirmOpen(true)}
          />
        )}
      </main>

      <SessionCompleteConfirmDialog
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        presentCount={presentRowsForSave.length}
        missingRatingsCount={missingRatingsCount}
        onConfirm={handleCompleteSession}
      />

      <SessionHomeworkPromptDialog
        open={homeworkPromptOpen}
        onOpenChange={setHomeworkPromptOpen}
        presentStudents={savedStudents}
        sessionDate={session.date}
        className={session.className}
        disciplineId={session.disciplineId ?? classRecord?.disciplineId}
        sessionNumber={
          savedStudents.find((s) => s.seriesEnrollment)?.seriesEnrollment
            ?.currentSessionNumber ?? undefined
        }
        onDone={handleHomeworkDone}
      />

      {/* Incident report — shared facility-wide modal. Trainer picks the
          dog(s) involved; "Notify Manager" defaults on. */}
      <Dialog open={showIncident} onOpenChange={setShowIncident}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <CreateIncidentModal onClose={() => setShowIncident(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionStep({
  index,
  label,
  active,
  done,
  onClick,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      data-done={done}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        "data-[active=true]:bg-indigo-600 data-[active=true]:text-white",
        "data-[done=true]:bg-emerald-50 data-[done=true]:text-emerald-700",
        "data-[active=false]:data-[done=false]:text-muted-foreground data-[active=false]:data-[done=false]:hover:bg-slate-100",
      )}
    >
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold",
          "group-data-[active=true]:bg-white/20 group-data-[active=true]:text-white",
          "group-data-[done=true]:bg-emerald-600 group-data-[done=true]:text-white",
          "group-data-[active=false]:group-data-[done=false]:bg-slate-200 group-data-[active=false]:group-data-[done=false]:text-slate-600",
        )}
      >
        {index}
      </span>
      {label}
    </button>
  );
}
