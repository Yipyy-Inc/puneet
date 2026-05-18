"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  GraduationCap,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  PawPrint,
  Phone,
  PhoneCall,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  UserMinus,
  User2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import {
  NO_SHOW_RISK_THRESHOLD,
  getConsecutiveNoShows,
} from "@/lib/training-students";
import type {
  Enrollment,
  TrainingClass,
  TrainingSession,
} from "@/types/training";
import {
  SessionCompletionDialog,
  type AttendanceChoice,
  type SessionCompletionResult,
} from "./session-completion-dialog";
import type {
  SessionAttendance,
  SessionExerciseRating,
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import { seriesEnrollments } from "@/data/training-series";
import { petQueries } from "@/lib/api/pet";
import type { ReportCard } from "@/types/pet";

/** Facility setting — eventually owned by Settings → Training. When true,
 *  completing a session auto-creates draft report cards for every present /
 *  late student so staff can review and send from the Report Cards tab. */
const AUTO_REPORT_CARD_ENABLED = true;

// ── Local lifecycle ──────────────────────────────────────────────────────────
// Pet attendance flows scheduled → checked-in → completed, or scheduled →
// no-show as the exception path. Session lifecycle (pending → in-progress →
// completed) is derived from clock time so the "In Progress" tile updates
// as the day moves without staff intervention.
type PetState = "scheduled" | "checked-in" | "completed" | "no-show";
type SessionLifecycle = "pending" | "in-progress" | "completed";
type ActiveTab =
  | "today"
  | "checked-in"
  | "in-progress"
  | "completed";

interface Arrival {
  key: string; // sessionId::enrollmentId
  session: TrainingSession;
  classRecord: TrainingClass | undefined;
  enrollment: Enrollment | undefined;
  petId: number;
  petName: string;
  petBreed: string;
  petPhotoUrl?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  state: PetState;
  checkInTime: string | null;
  checkOutTime: string | null;
  noShowTime: string | null;
  sessionLifecycle: SessionLifecycle;
}

interface Props {
  defaultTab?: ActiveTab;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function lifecycleFromClock(
  session: TrainingSession,
  now: Date,
  todayDateISO: string,
): SessionLifecycle {
  if (session.date < todayDateISO) return "completed";
  if (session.date > todayDateISO) return "pending";
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin >= timeToMin(session.endTime)) return "completed";
  if (nowMin >= timeToMin(session.startTime)) return "in-progress";
  return "pending";
}

// ── Initial demo state ──────────────────────────────────────────────────────
// Pre-seed a few check-ins so all four KPI tiles read non-zero on load. Each
// key is sessionId::enrollmentId for an attendee in today's mock sessions.
const INITIAL_CHECK_INS: Record<string, string> = {
  // Basic Obedience tonight @ 18:00 — 2 of 4 already arrived
  "session-002::enroll-004": "T17:45:00",
  "session-002::enroll-005": "T17:52:00",
  // Trick Training @ 11:00 — 1 of 2 already arrived
  "session-004::enroll-001": "T10:55:00",
  // Private with Buddy @ 14:00 — already in class
  "session-005::enroll-004": "T13:55:00",
};
const INITIAL_CHECK_OUTS: Record<string, string> = {
  // Charlie's private @ 16:00 — already wrapped up
  "session-006::enroll-006": "T16:58:00",
};

// Anchor the seeded times to today so badges read realistically. The values
// above are clock-only; this glues them to today's date.
function inflateSeed(
  seed: Record<string, string>,
  todayDate: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, t] of Object.entries(seed)) {
    out[key] = `${todayDate}${t}`;
  }
  return out;
}

const TAB_META: Record<
  ActiveTab,
  { label: string; emptyText: string }
> = {
  today: {
    label: "today's roster",
    emptyText: "No sessions scheduled for today.",
  },
  "checked-in": {
    label: "checked in",
    emptyText: "No pets are currently checked in.",
  },
  "in-progress": {
    label: "in progress",
    emptyText: "No sessions are currently running.",
  },
  completed: {
    label: "completed",
    emptyText: "No sessions have wrapped up yet.",
  },
};

// ── Pet/owner index from clients data ────────────────────────────────────────
function buildPetIndex(): Map<
  number,
  {
    name: string;
    breed: string;
    imageUrl?: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
  }
> {
  const map = new Map<
    number,
    {
      name: string;
      breed: string;
      imageUrl?: string;
      ownerName: string;
      ownerPhone: string;
      ownerEmail: string;
    }
  >();
  for (const c of clients) {
    for (const p of c.pets) {
      map.set(p.id, {
        name: p.name,
        breed: p.breed,
        imageUrl: p.imageUrl,
        ownerName: c.name,
        ownerPhone: c.phone ?? "",
        ownerEmail: c.email,
      });
    }
  }
  return map;
}

// ── Card ────────────────────────────────────────────────────────────────────
function ArrivalCard({
  arrival,
  atNoShowRisk,
  onCheckIn,
  onCheckOut,
  onMarkNoShow,
  onUndoNoShow,
}: {
  arrival: Arrival;
  /** True when this pet would be at or over the no-show threshold based on
   *  historical attendance + any local no-shows already marked today. */
  atNoShowRisk: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onMarkNoShow: () => void;
  onUndoNoShow: () => void;
}) {
  const isPrivate = arrival.classRecord?.classType === "private";

  return (
    <div
      className={cn(
        "group bg-card relative flex h-full items-stretch gap-3 rounded-2xl border p-3 transition-all",
        "hover:border-border hover:shadow-sm",
        arrival.state === "completed" && "opacity-80",
        arrival.state === "no-show" && "border-rose-200 bg-rose-50/40",
      )}
    >
      {/* Pet avatar */}
      <div className="relative shrink-0">
        {arrival.petPhotoUrl ? (
          <div className="ring-background size-12 overflow-hidden rounded-2xl ring-2">
            <Image
              src={arrival.petPhotoUrl}
              alt={arrival.petName}
              width={48}
              height={48}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground ring-background flex size-12 items-center justify-center rounded-2xl ring-2">
            <PawPrint className="size-5" />
          </div>
        )}
        {atNoShowRisk && arrival.state !== "no-show" && (
          <span
            title={`At No-Show Risk — ${NO_SHOW_RISK_THRESHOLD}+ consecutive misses on record`}
            className="ring-background absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-2"
          >
            <ShieldAlert className="size-3" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
          <span className="min-w-0 truncate text-sm font-semibold leading-none">
            {arrival.petName}
          </span>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {arrival.petBreed}
          </span>
          {atNoShowRisk && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              title={`${NO_SHOW_RISK_THRESHOLD}+ consecutive no-shows on record`}
            >
              <ShieldAlert className="size-2.5" />
              No-Show Risk
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {arrival.ownerName}
          {arrival.ownerPhone && (
            <>
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {arrival.ownerPhone}
              </span>
            </>
          )}
        </p>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          <span className="text-foreground/80 font-medium">
            {arrival.session.trainerName}
          </span>
          <span className="mx-1.5">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatTime(arrival.session.startTime)} –{" "}
            {formatTime(arrival.session.endTime)}
          </span>
        </p>
        {/* Check-in / out / no-show state badge */}
        {arrival.state === "checked-in" && arrival.checkInTime && (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            title="Checked in"
          >
            <CheckCircle2 className="size-2.5" />
            {isPrivate
              ? `Checked in · ${formatClock(arrival.checkInTime)}`
              : `In at ${formatClock(arrival.checkInTime)}`}
          </Badge>
        )}
        {arrival.state === "completed" && arrival.checkOutTime && (
          <Badge
            variant="outline"
            className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
          >
            <LogOut className="size-2.5" />
            Out at {formatClock(arrival.checkOutTime)}
          </Badge>
        )}
        {arrival.state === "no-show" && arrival.noShowTime && (
          <Badge
            variant="outline"
            className="gap-1 border-rose-200 bg-rose-100 text-[10px] text-rose-700"
            title="Marked as no-show"
          >
            <CircleSlash className="size-2.5" />
            No Show · marked {formatClock(arrival.noShowTime)}
          </Badge>
        )}
      </div>

      {/* Action column */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {arrival.state === "scheduled" && (
          <>
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onCheckIn();
              }}
            >
              <LogIn className="size-3.5" />
              Check In
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-rose-200 px-2 text-xs text-rose-700 hover:bg-rose-50"
              onClick={(e) => {
                e.stopPropagation();
                onMarkNoShow();
              }}
            >
              <UserMinus className="size-3" />
              No Show
            </Button>
          </>
        )}
        {arrival.state === "checked-in" && (
          <Button
            size="sm"
            className="gap-1 bg-red-600 text-xs text-white hover:bg-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onCheckOut();
            }}
          >
            <LogOut className="size-3.5" />
            Check Out
          </Button>
        )}
        {arrival.state === "no-show" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-7 gap-1 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onUndoNoShow();
            }}
            title="They actually showed up — undo no-show"
          >
            <RotateCcw className="size-3" />
            Undo
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <PhoneCall className="size-3.5" />
              Contact
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>{arrival.ownerName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {arrival.ownerPhone && (
              <>
                <DropdownMenuItem asChild>
                  <a href={`tel:${arrival.ownerPhone}`} className="gap-2">
                    <Phone className="size-3.5" />
                    Call {arrival.ownerPhone}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`sms:${arrival.ownerPhone}`} className="gap-2">
                    <MessageSquare className="size-3.5" />
                    Text
                  </a>
                </DropdownMenuItem>
              </>
            )}
            {arrival.ownerEmail && (
              <DropdownMenuItem asChild>
                <a href={`mailto:${arrival.ownerEmail}`} className="gap-2">
                  <Mail className="size-3.5" />
                  Email
                </a>
              </DropdownMenuItem>
            )}
            {!arrival.ownerPhone && !arrival.ownerEmail && (
              <DropdownMenuItem disabled>
                No contact info on file
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Session sub-header ──────────────────────────────────────────────────────
function SessionHeader({
  session,
  classRecord,
  arrivals,
  onComplete,
}: {
  session: TrainingSession;
  classRecord: TrainingClass | undefined;
  arrivals: Arrival[];
  onComplete: () => void;
}) {
  const isPrivate = classRecord?.classType === "private";
  const checkedInCount = arrivals.filter(
    (a) => a.state === "checked-in" || a.state === "completed",
  ).length;
  const total = arrivals.length;
  const lifecycle = arrivals[0]?.sessionLifecycle ?? "pending";

  const lifecycleMeta: Record<
    SessionLifecycle,
    { label: string; cls: string; Icon: typeof PlayCircle }
  > = {
    pending: {
      label: "Pending",
      cls: "border-sky-200 bg-sky-50 text-sky-700",
      Icon: Clock,
    },
    "in-progress": {
      label: "In progress",
      cls: "border-amber-200 bg-amber-50 text-amber-700",
      Icon: PlayCircle,
    },
    completed: {
      label: "Completed",
      cls: "border-slate-200 bg-slate-50 text-slate-600",
      Icon: CheckCircle2,
    },
  };
  const lc = lifecycleMeta[lifecycle];
  const LifecycleIcon = lc.Icon;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-slate-50/60 px-3 py-2">
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          isPrivate
            ? "bg-orange-100 text-orange-700"
            : "bg-indigo-100 text-indigo-700",
        )}
      >
        {isPrivate ? (
          <User2 className="size-3.5" />
        ) : (
          <Users className="size-3.5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {session.className}
          <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
            with {session.trainerName}
          </span>
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("gap-1 border text-[10px]", lc.cls)}
      >
        <LifecycleIcon className="size-3" />
        {lc.label}
      </Badge>
      {/* Attendance counter — group sessions show "N of M checked in";
          private sessions show a compact checked-in / scheduled label. */}
      {isPrivate ? (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 border text-[10px]",
            checkedInCount > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          {checkedInCount > 0 ? (
            <>
              <CheckCircle2 className="size-3" />
              Checked in
            </>
          ) : (
            <>
              <Clock className="size-3" />
              Awaiting drop-off
            </>
          )}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 border text-[10px] tabular-nums",
            checkedInCount >= total && total > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : checkedInCount > 0
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-600",
          )}
          title="Group class attendance"
        >
          <Users className="size-3" />
          {checkedInCount} of {total} checked in
        </Badge>
      )}
      {/* Complete Session — instructors hit this when the class wraps up.
          Disabled until the session has actually started so staff can't
          finalize records ahead of time. */}
      <Button
        size="sm"
        variant="outline"
        onClick={onComplete}
        disabled={lifecycle === "pending"}
        className="ml-auto h-7 gap-1 border-emerald-200 px-2 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        title={
          lifecycle === "pending"
            ? "Session hasn't started yet"
            : "Confirm attendance and complete this session"
        }
      >
        <CheckCircle2 className="size-3.5" />
        Complete Session
      </Button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function TrainingCheckInOut({ defaultTab = "today" }: Props) {
  const today = useMemo(() => todayISO(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);
  const [query, setQuery] = useState("");

  const queryClient = useQueryClient();
  const { data: trainingSessions = [] } = useQuery(trainingQueries.sessions());
  const { data: trainingClasses = [] } = useQuery(trainingQueries.classes());
  const { data: enrollments = [] } = useQuery(trainingQueries.enrollments());
  const { data: allAttendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );

  // Local state — until an attendance API exists, lifecycle is tracked here.
  const [checkInTimes, setCheckInTimes] = useState<Record<string, string>>(() =>
    inflateSeed(INITIAL_CHECK_INS, today),
  );
  const [checkOutTimes, setCheckOutTimes] = useState<Record<string, string>>(
    () => inflateSeed(INITIAL_CHECK_OUTS, today),
  );
  const [noShowTimes, setNoShowTimes] = useState<Record<string, string>>({});
  const [completingSession, setCompletingSession] =
    useState<TrainingSession | null>(null);

  const classesById = useMemo(
    () => new Map(trainingClasses.map((c) => [c.id, c])),
    [trainingClasses],
  );
  const enrollmentsById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );
  const petIndex = useMemo(() => buildPetIndex(), []);

  // Recalc lifecycle off real time so the In-Progress tile reads live.
  const now = useMemo(() => new Date(), []);

  // One Arrival per (session, enrollment) pair.
  const arrivals = useMemo<Arrival[]>(() => {
    const out: Arrival[] = [];
    for (const sess of trainingSessions) {
      if (sess.date !== today) continue;
      if (sess.status === "cancelled") continue;
      const classRecord = classesById.get(sess.classId);
      const sessionLifecycle = lifecycleFromClock(sess, now, today);
      for (const enrollmentId of sess.attendees ?? []) {
        const enrollment = enrollmentsById.get(enrollmentId);
        const petId = enrollment?.petId ?? 0;
        const indexed = petIndex.get(petId);
        const key = `${sess.id}::${enrollmentId}`;
        const checkInTime = checkInTimes[key] ?? null;
        const checkOutTime = checkOutTimes[key] ?? null;
        const noShowTime = noShowTimes[key] ?? null;
        const state: PetState = noShowTime
          ? "no-show"
          : checkOutTime
            ? "completed"
            : checkInTime
              ? "checked-in"
              : "scheduled";
        const fallbackPetName =
          enrollment?.petName ?? indexed?.name ?? `Pet #${petId}`;
        out.push({
          key,
          session: sess,
          classRecord,
          enrollment,
          petId,
          petName: indexed?.name ?? fallbackPetName,
          petBreed: indexed?.breed ?? enrollment?.petBreed ?? "",
          petPhotoUrl: indexed?.imageUrl,
          ownerName: indexed?.ownerName ?? enrollment?.ownerName ?? "",
          ownerPhone: indexed?.ownerPhone ?? enrollment?.ownerPhone ?? "",
          ownerEmail: indexed?.ownerEmail ?? enrollment?.ownerEmail ?? "",
          state,
          checkInTime,
          checkOutTime,
          noShowTime,
          sessionLifecycle,
        });
      }
    }
    return out;
  }, [
    trainingSessions,
    today,
    classesById,
    enrollmentsById,
    petIndex,
    checkInTimes,
    checkOutTimes,
    noShowTimes,
    now,
  ]);

  // KPI counts — sessions today, pets checked-in, sessions in progress
  // (by clock), pets that have either completed or been marked no-show
  // (either way, the session is over for them).
  const counts = useMemo(() => {
    const distinctSessions = new Set(arrivals.map((a) => a.session.id));
    const inProgressSessions = new Set(
      arrivals
        .filter((a) => a.sessionLifecycle === "in-progress")
        .map((a) => a.session.id),
    );
    return {
      sessions: distinctSessions.size,
      checkedIn: arrivals.filter((a) => a.state === "checked-in").length,
      inProgress: inProgressSessions.size,
      completed: arrivals.filter(
        (a) => a.state === "completed" || a.state === "no-show",
      ).length,
    };
  }, [arrivals]);

  // Tab-level filter on the visible card list. No-shows are visible alongside
  // checkouts in the Completed tab.
  const filtered = useMemo(() => {
    let base = arrivals;
    if (activeTab === "checked-in") {
      base = arrivals.filter((a) => a.state === "checked-in");
    } else if (activeTab === "in-progress") {
      base = arrivals.filter((a) => a.sessionLifecycle === "in-progress");
    } else if (activeTab === "completed") {
      base = arrivals.filter(
        (a) => a.state === "completed" || a.state === "no-show",
      );
    }
    if (!query.trim()) return base;
    const v = query.toLowerCase();
    return base.filter(
      (a) =>
        a.petName.toLowerCase().includes(v) ||
        a.ownerName.toLowerCase().includes(v) ||
        a.ownerPhone.includes(v) ||
        a.session.trainerName.toLowerCase().includes(v) ||
        a.session.className.toLowerCase().includes(v),
    );
  }, [arrivals, activeTab, query]);

  // Group filtered arrivals by time slot, then by session within slot. Time
  // ascending; within a slot, sessions sorted by name for deterministic order.
  const groups = useMemo(() => {
    type SessionGroup = {
      sessionId: string;
      session: TrainingSession;
      arrivals: Arrival[];
    };
    type TimeGroup = {
      time: string;
      sessions: SessionGroup[];
    };

    const byTime = new Map<string, Map<string, SessionGroup>>();
    for (const a of filtered) {
      const t = a.session.startTime;
      let timeBucket = byTime.get(t);
      if (!timeBucket) {
        timeBucket = new Map();
        byTime.set(t, timeBucket);
      }
      let sessGroup = timeBucket.get(a.session.id);
      if (!sessGroup) {
        sessGroup = {
          sessionId: a.session.id,
          session: a.session,
          arrivals: [],
        };
        timeBucket.set(a.session.id, sessGroup);
      }
      sessGroup.arrivals.push(a);
    }

    const out: TimeGroup[] = [];
    for (const [time, sessions] of [...byTime.entries()].sort(([a], [b]) =>
      a < b ? -1 : 1,
    )) {
      out.push({
        time,
        sessions: [...sessions.values()].sort((a, b) =>
          a.session.className.localeCompare(b.session.className),
        ),
      });
    }
    return out;
  }, [filtered]);

  // For session-level attendance counts on the headers, use the FULL roster
  // (not filtered) so "4 of 8 checked in" stays accurate when the user
  // filters down to just "Checked In".
  const fullArrivalsBySession = useMemo(() => {
    const map = new Map<string, Arrival[]>();
    for (const a of arrivals) {
      const arr = map.get(a.session.id);
      if (arr) arr.push(a);
      else map.set(a.session.id, [a]);
    }
    return map;
  }, [arrivals]);

  function handleCheckIn(arrival: Arrival) {
    const at = new Date().toISOString();
    setCheckInTimes((prev) => ({ ...prev, [arrival.key]: at }));
    toast.success(`${arrival.petName} — Checked In`, {
      description: `${arrival.session.className} with ${arrival.session.trainerName}`,
    });
  }

  function handleCheckOut(arrival: Arrival) {
    const at = new Date().toISOString();
    setCheckOutTimes((prev) => ({ ...prev, [arrival.key]: at }));
    toast.success(`${arrival.petName} — Checked Out`, {
      description: `Session with ${arrival.session.trainerName} complete`,
    });
  }

  function handleMarkNoShow(arrival: Arrival) {
    const at = new Date().toISOString();
    setNoShowTimes((prev) => ({ ...prev, [arrival.key]: at }));
    // Combine historical consecutive no-shows + the one we just marked + any
    // earlier no-shows local to today's roster for the same pet so the toast
    // can decide whether the auto-follow-up should mention being triggered.
    const historical = getConsecutiveNoShows(arrival.petId, allAttendances);
    const otherLocalToday = Object.keys(noShowTimes).filter((k) => {
      if (k === arrival.key) return false;
      const enrollmentId = k.split("::")[1];
      const enrollment = enrollmentsById.get(enrollmentId);
      return enrollment?.petId === arrival.petId;
    }).length;
    const total = historical + otherLocalToday + 1;
    const atRisk = total >= NO_SHOW_RISK_THRESHOLD;
    toast.warning(`${arrival.petName} — Marked No Show`, {
      description: atRisk
        ? `${total} consecutive misses on record — auto-follow-up sent to ${arrival.ownerName}.`
        : `Logged — ${total} miss${total === 1 ? "" : "es"} in a row.`,
    });
  }

  function handleUndoNoShow(arrival: Arrival) {
    setNoShowTimes((prev) => {
      const next = { ...prev };
      delete next[arrival.key];
      return next;
    });
    toast.success(`${arrival.petName} — No Show undone`);
  }

  function handleSessionComplete(
    session: TrainingSession | null,
    result: SessionCompletionResult,
  ) {
    if (!session) return;
    const nowISO = new Date().toISOString();
    const nextCheckIns = { ...checkInTimes };
    const nextCheckOuts = { ...checkOutTimes };
    const nextNoShows = { ...noShowTimes };
    let present = 0;
    let late = 0;
    let absent = 0;
    const newAttendances: SessionAttendance[] = [];

    for (const [enrollmentId, choice] of Object.entries(result.attendance)) {
      const key = `${session.id}::${enrollmentId}`;
      const enrollment = enrollmentsById.get(enrollmentId);
      const petId = enrollment?.petId ?? 0;
      const petIndexed = petIndex.get(petId);
      const exerciseLogs = result.exercisesByEnrollment[enrollmentId] ?? [];
      const exercises: SessionExerciseRating[] = exerciseLogs.map((l) => ({
        exerciseName: l.exerciseName,
        rating: l.rating,
        notes: l.note || undefined,
      }));

      if (choice === "absent") {
        nextNoShows[key] = nowISO;
        delete nextCheckIns[key];
        delete nextCheckOuts[key];
        absent++;
      } else {
        if (!nextCheckIns[key]) nextCheckIns[key] = nowISO;
        nextCheckOuts[key] = nowISO;
        delete nextNoShows[key];
        if (choice === "late") late++;
        else present++;
      }

      // Build the persisted attendance record. Absent students still get a
      // record (status="absent") so the No-Show Risk count picks them up
      // automatically — they just don't carry exercises.
      const attendanceStatus: SessionAttendance["status"] =
        choice === "absent"
          ? "absent"
          : choice === "late"
            ? "late"
            : "present";
      // Only attach conditions when staff actually filled some in, and only
      // for present/late students — absent students don't carry the context.
      const conditionsApply =
        choice !== "absent" &&
        (result.conditions.weather.length > 0 ||
          !!result.conditions.distractionLevel);

      // Per-dog trainer note: shared summary + optional dog-specific note.
      // The individual note only lands on this dog's record so it shows up
      // only in their training history, not on every present student's.
      const individualNote =
        result.individualNotesByEnrollment[enrollmentId];
      const trainerNotes =
        choice === "absent"
          ? ""
          : [result.sessionSummary, individualNote]
              .filter((s) => s && s.trim())
              .join("\n\n");

      newAttendances.push({
        id: `attendance-${session.id}-${enrollmentId}`,
        enrollmentId,
        sessionId: session.id,
        sessionNumber: enrollment?.sessionsAttended
          ? enrollment.sessionsAttended + 1
          : 1,
        sessionDate: session.date,
        petId,
        petName:
          petIndexed?.name ?? enrollment?.petName ?? `Pet #${petId}`,
        status: attendanceStatus,
        checkInTime: choice !== "absent" ? nextCheckIns[key] : null,
        checkOutTime: choice !== "absent" ? nextCheckOuts[key] : null,
        trainerNotes,
        exercises: exercises.length > 0 ? exercises : undefined,
        conditions: conditionsApply ? result.conditions : undefined,
        homeworkUnlocked: false,
        certificateGenerated: false,
        createdAt: nowISO,
        updatedAt: nowISO,
      });
    }

    setCheckInTimes(nextCheckIns);
    setCheckOutTimes(nextCheckOuts);
    setNoShowTimes(nextNoShows);

    // Persist the new attendance records in react-query's cache so the
    // Training Profile (Progress + History tabs) and the no-show counter
    // reflect what just happened, without waiting on a real backend.
    queryClient.setQueryData<SessionAttendance[]>(
      trainingQueries.allAttendances().queryKey,
      (prev = []) => mergeAttendances(prev, newAttendances),
    );
    const petIds = new Set(newAttendances.map((a) => a.petId));
    for (const petId of petIds) {
      queryClient.setQueryData<SessionAttendance[]>(
        trainingQueries.attendancesForPet(petId).queryKey,
        (prev = []) =>
          mergeAttendances(
            prev,
            newAttendances.filter((a) => a.petId === petId),
          ),
      );
    }

    // Build TrainingHomework records keyed to each present student's series
    // enrollment so the homework shows up on the Training Profile → Homework
    // tab automatically.
    const newHomework: TrainingHomework[] = [];
    for (const [enrollmentId, choice] of Object.entries(result.attendance)) {
      if (choice === "absent") continue;
      if (result.homework.length === 0) break;
      const enrollment = enrollmentsById.get(enrollmentId);
      const petId = enrollment?.petId;
      if (!petId) continue;
      // Match the pet's most recent active series enrollment so homework
      // lands on the right context. Fall back to the most recent one
      // regardless of status when nothing's active.
      const petSeriesEnrollments = seriesEnrollments
        .filter((e) => e.petId === petId)
        .sort((a, b) => (a.enrollmentDate < b.enrollmentDate ? 1 : -1));
      const targetSeriesEnrollment =
        petSeriesEnrollments.find((e) => e.status === "enrolled") ??
        petSeriesEnrollments[0];
      if (!targetSeriesEnrollment) continue;
      for (const assignment of result.homework) {
        const instructions = assignment.instructions
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        newHomework.push({
          id: `homework-${session.id}-${enrollmentId}-${assignment.rowId}`,
          enrollmentId: targetSeriesEnrollment.id,
          sessionNumber: enrollment?.sessionsAttended
            ? enrollment.sessionsAttended + 1
            : 1,
          sessionDate: session.date,
          title: assignment.exerciseName,
          description: "",
          instructions,
          frequency: assignment.frequency || undefined,
          unlocked: true,
          unlockedDate: session.date,
          completed: false,
          completedDate: null,
        });
      }
    }

    // Push homework into every cached homework query — both the catch-all
    // `allHomework()` cache and per-pet `homeworkForEnrollments` caches. The
    // homework query keys carry the enrollment id list, so we filter on the
    // way in so each pet sees only their own assignments.
    if (newHomework.length > 0) {
      const cache = queryClient.getQueryCache();
      cache.findAll({ queryKey: ["training", "homework"] }).forEach((query) => {
        const key = query.queryKey;
        let toAdd: TrainingHomework[] = [];
        if (key.length === 3 && key[2] === "all") {
          toAdd = newHomework;
        } else if (key.length === 3 && Array.isArray(key[2])) {
          const ids = new Set(key[2] as string[]);
          toAdd = newHomework.filter((h) => ids.has(h.enrollmentId));
        }
        if (toAdd.length === 0) return;
        queryClient.setQueryData<TrainingHomework[]>(key, (prev = []) => {
          const existing = new Set(prev.map((h) => h.id));
          return [...prev, ...toAdd.filter((h) => !existing.has(h.id))];
        });
      });
    }

    // ── Package debit — every attendee (present, late, OR absent) consumes
    // one session of their series enrollment. The class itself ran, so the
    // package counter ticks even for absent students per the earlier spec.
    const enrollmentDebits = new Map<string, TrainingEnrollment>();
    for (const [enrollmentId] of Object.entries(result.attendance)) {
      const classEnrollment = enrollmentsById.get(enrollmentId);
      const petId = classEnrollment?.petId;
      if (!petId) continue;
      const target = seriesEnrollments
        .filter((e) => e.petId === petId)
        .sort((a, b) => (a.enrollmentDate < b.enrollmentDate ? 1 : -1))
        .find((e) => e.status === "enrolled");
      if (!target) continue;
      // If we already debited this series enrollment (multi-class pet, rare
      // for one session), skip — one session counts as one debit.
      if (enrollmentDebits.has(target.id)) continue;
      const nextAttended = Math.min(
        target.sessionsAttended + 1,
        target.totalSessions,
      );
      const nextProgress =
        target.totalSessions > 0
          ? Math.round((nextAttended / target.totalSessions) * 100)
          : 0;
      enrollmentDebits.set(target.id, {
        ...target,
        sessionsAttended: nextAttended,
        currentSessionNumber: Math.min(
          target.currentSessionNumber + 1,
          target.totalSessions,
        ),
        progress: nextProgress,
        updatedAt: nowISO,
      });
    }

    if (enrollmentDebits.size > 0) {
      // Refresh the all-enrollments cache, then per-series caches.
      queryClient.setQueryData<TrainingEnrollment[]>(
        trainingQueries.allSeriesEnrollments().queryKey,
        (prev = []) =>
          prev.map((e) => enrollmentDebits.get(e.id) ?? e),
      );
      const affectedSeries = new Set(
        [...enrollmentDebits.values()].map((e) => e.seriesId),
      );
      for (const seriesId of affectedSeries) {
        queryClient.setQueryData<TrainingEnrollment[]>(
          trainingQueries.seriesEnrollments(seriesId).queryKey,
          (prev = []) =>
            prev.map((e) => enrollmentDebits.get(e.id) ?? e),
        );
      }
    }

    // ── Report card drafts — one per present/late student, only when the
    // facility has auto-report-card enabled. Written to each pet's
    // `petQueries.reportCards(petId)` cache so the existing Report Cards
    // tab picks them up immediately. `sentToOwner: false` keeps them as
    // drafts pending review.
    const reportCardDrafts: ReportCard[] = [];
    if (AUTO_REPORT_CARD_ENABLED) {
      for (const [enrollmentId, choice] of Object.entries(result.attendance)) {
        if (choice === "absent") continue;
        const classEnrollment = enrollmentsById.get(enrollmentId);
        const petId = classEnrollment?.petId;
        if (!petId) continue;
        reportCardDrafts.push({
          id: `report-${session.id}-${enrollmentId}`,
          petId,
          bookingId: 0,
          date: session.date,
          serviceType: "training",
          activities: result.exercisesByEnrollment[enrollmentId]?.map(
            (l) => `${l.exerciseName} — ${l.rating}/5`,
          ) ?? [],
          meals: [],
          pottyBreaks: [],
          mood: "happy",
          photos: [],
          staffNotes: result.sessionSummary,
          createdBy: session.trainerName,
          createdById: 0,
          sentToOwner: false,
        });
      }
      for (const draft of reportCardDrafts) {
        queryClient.setQueryData<ReportCard[]>(
          petQueries.reportCards(draft.petId).queryKey,
          (prev = []) =>
            prev.some((r) => r.id === draft.id) ? prev : [draft, ...prev],
        );
      }
    }

    // The exercise list is shared across all present students, so we count
    // it once rather than summing the fanned-out per-pet copies.
    const uniqueExerciseCount = Math.max(
      ...Object.values(result.exercisesByEnrollment).map((arr) => arr.length),
      0,
    );
    const individualNoteCount = Object.values(
      result.individualNotesByEnrollment,
    ).filter((n) => n.trim()).length;
    const uniqueOwnersNotified = new Set(
      newHomework
        .map((h) => {
          const enroll = seriesEnrollments.find((e) => e.id === h.enrollmentId);
          return enroll?.ownerId;
        })
        .filter((o): o is number => !!o),
    ).size;
    const detail = [
      present > 0 ? `${present} present` : null,
      late > 0 ? `${late} late` : null,
      absent > 0 ? `${absent} absent` : null,
      uniqueExerciseCount > 0
        ? `${uniqueExerciseCount} exercise${uniqueExerciseCount === 1 ? "" : "s"} logged`
        : null,
      individualNoteCount > 0
        ? `${individualNoteCount} individual note${individualNoteCount === 1 ? "" : "s"}`
        : null,
      enrollmentDebits.size > 0
        ? `${enrollmentDebits.size} session${enrollmentDebits.size === 1 ? "" : "s"} debited`
        : null,
      result.homework.length > 0
        ? `${result.homework.length} homework · ${uniqueOwnersNotified} owner${uniqueOwnersNotified === 1 ? "" : "s"} notified`
        : null,
      reportCardDrafts.length > 0
        ? `${reportCardDrafts.length} report card draft${reportCardDrafts.length === 1 ? "" : "s"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    toast.success(`${session.className} — Session completed`, {
      description: `${detail} · ${result.locationOverride}`,
    });
    setCompletingSession(null);
  }

  // Merge new attendance records on top of existing, replacing any record
  // with the same id (so re-completing a session updates in place).
  function mergeAttendances(
    prev: SessionAttendance[],
    next: SessionAttendance[],
  ): SessionAttendance[] {
    const map = new Map(prev.map((a) => [a.id, a]));
    for (const a of next) map.set(a.id, a);
    return [...map.values()];
  }

  // Pre-compute "at risk" per pet so we can flash the No-Show Risk indicator
  // on every card belonging to that pet, including before staff marks the
  // current session.
  const atRiskByPet = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const a of arrivals) {
      if (map.has(a.petId)) continue;
      const historicalConsecutive = getConsecutiveNoShows(
        a.petId,
        allAttendances,
      );
      const todayLocalNoShows = Object.keys(noShowTimes).filter((k) => {
        const enrollmentId = k.split("::")[1];
        const enrollment = enrollmentsById.get(enrollmentId);
        return enrollment?.petId === a.petId;
      }).length;
      map.set(
        a.petId,
        historicalConsecutive + todayLocalNoShows >= NO_SHOW_RISK_THRESHOLD,
      );
    }
    return map;
  }, [arrivals, allAttendances, noShowTimes, enrollmentsById]);

  return (
    <div className="space-y-5">
      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Today's Sessions"
          value={counts.sessions}
          hint="Total scheduled"
          icon={CalendarDays}
          tone="indigo"
          active={activeTab === "today"}
          onClick={() => setActiveTab("today")}
        />
        <KpiTile
          label="Checked In"
          value={counts.checkedIn}
          hint="Currently on site"
          icon={LogIn}
          tone="emerald"
          active={activeTab === "checked-in"}
          onClick={() => setActiveTab("checked-in")}
        />
        <KpiTile
          label="In Progress"
          value={counts.inProgress}
          hint="Sessions running now"
          icon={PlayCircle}
          tone="amber"
          active={activeTab === "in-progress"}
          onClick={() => setActiveTab("in-progress")}
        />
        <KpiTile
          label="Completed"
          value={counts.completed}
          hint="Already checked out"
          icon={CheckCircle2}
          tone="slate"
          active={activeTab === "completed"}
          onClick={() => setActiveTab("completed")}
        />
      </div>

      {/* ── Activity board ── */}
      <Card className="bg-card overflow-hidden border">
        <CardHeader className="from-card via-card relative space-y-0 overflow-hidden border-b bg-linear-to-br to-indigo-50/40 pb-4 dark:to-indigo-950/20">
          <div className="pointer-events-none absolute -top-10 right-0 size-32 rounded-full bg-linear-to-br from-indigo-200/40 via-violet-200/20 to-transparent blur-2xl dark:from-indigo-500/15 dark:via-violet-500/10" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 via-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Training Activity Board
                </h3>
                <p className="text-muted-foreground text-xs">
                  {filtered.length} {TAB_META[activeTab].label} ·{" "}
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:flex-1 md:justify-end">
              <div className="relative w-full md:max-w-xl">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pet, owner, instructor, class, phone…"
                  className="h-9 w-full pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
              {TAB_META[activeTab].emptyText}
            </div>
          ) : (
            groups.map(({ time, sessions }) => (
              <section key={time} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Clock className="size-3.5" />
                  </div>
                  <h4 className="text-sm font-bold tracking-tight text-slate-800">
                    {formatTime(time)}
                  </h4>
                  <div className="h-px flex-1 bg-slate-200/70" />
                </div>
                <div className="space-y-3">
                  {sessions.map(({ sessionId, session, arrivals: rows }) => (
                    <div key={sessionId} className="space-y-2">
                      <SessionHeader
                        session={session}
                        classRecord={classesById.get(session.classId)}
                        arrivals={
                          fullArrivalsBySession.get(session.id) ?? rows
                        }
                        onComplete={() => setCompletingSession(session)}
                      />
                      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                        {rows.map((arrival) => (
                          <ArrivalCard
                            key={arrival.key}
                            arrival={arrival}
                            atNoShowRisk={
                              atRiskByPet.get(arrival.petId) ?? false
                            }
                            onCheckIn={() => handleCheckIn(arrival)}
                            onCheckOut={() => handleCheckOut(arrival)}
                            onMarkNoShow={() => handleMarkNoShow(arrival)}
                            onUndoNoShow={() => handleUndoNoShow(arrival)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </CardContent>
      </Card>

      <SessionCompletionDialog
        open={!!completingSession}
        onOpenChange={(o) => {
          if (!o) setCompletingSession(null);
        }}
        session={completingSession}
        classRecord={
          completingSession
            ? classesById.get(completingSession.classId)
            : undefined
        }
        rows={
          completingSession
            ? (completingSession.attendees ?? []).map((eid) => {
                const enrollment = enrollmentsById.get(eid);
                const petId = enrollment?.petId ?? 0;
                const indexed = petIndex.get(petId);
                return {
                  enrollmentId: eid,
                  petId,
                  petName:
                    indexed?.name ??
                    enrollment?.petName ??
                    `Pet #${petId}`,
                  petBreed: indexed?.breed ?? enrollment?.petBreed ?? "",
                  petPhotoUrl: indexed?.imageUrl,
                  ownerName:
                    indexed?.ownerName ?? enrollment?.ownerName ?? "",
                };
              })
            : []
        }
        initialAttendance={
          completingSession
            ? (completingSession.attendees ?? []).reduce<
                Record<string, AttendanceChoice | undefined>
              >((acc, eid) => {
                const key = `${completingSession.id}::${eid}`;
                if (noShowTimes[key]) {
                  acc[eid] = "absent";
                } else if (checkInTimes[key]) {
                  // Mark "late" when the recorded check-in landed after the
                  // session start time — instructor still has final say.
                  const checkInMs = new Date(checkInTimes[key]).getTime();
                  const startMs = new Date(
                    `${completingSession.date}T${completingSession.startTime}:00`,
                  ).getTime();
                  acc[eid] =
                    checkInMs - startMs > 5 * 60 * 1000 ? "late" : "present";
                } else {
                  acc[eid] = undefined;
                }
                return acc;
              }, {})
            : {}
        }
        onConfirm={(result: SessionCompletionResult) =>
          handleSessionComplete(completingSession, result)
        }
      />
    </div>
  );
}
