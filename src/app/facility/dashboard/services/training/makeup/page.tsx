"use client";

/**
 * Facility-side Make-up Sessions view — the staff counterpart to the
 * customer portal's Makeup Sessions tab. Lists every dog across every
 * active series with an Absent mark, sorted by urgency (soonest to leave
 * the eligibility window first).
 *
 * Each row offers two outbound actions:
 *   - Offer make-up slot — picks an available host session (same course
 *     type, future, has open capacity) and writes a `MakeupSession` record
 *     in `offered` state. Customer accepts from their portal.
 *   - Mark as ineligible — records a deactivation reason and flips the
 *     absence into a permanent "no make-up" state.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Ban,
  CalendarRange,
  CheckCircle2,
  Clock,
  GraduationCap,
  Inbox,
  Mail,
  MapPin,
  Phone,
  Search,
  Send,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import {
  computeMakeupCandidates,
  listHostSessionsForCandidate,
  type HostSessionOption,
  type MakeupCandidate,
} from "@/lib/training-makeup-candidates";
import type { MakeupSession } from "@/lib/training-makeup";
import type {
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";

export default function FacilityMakeupSessionsPage() {
  const queryClient = useQueryClient();
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: allEnrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: allSeries = [] } = useQuery(trainingQueries.series());
  const { data: allAttendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  const { data: makeupSessions = [] } = useQuery(
    trainingQueries.allMakeupSessions(),
  );

  const seriesById = useMemo(
    () => new Map(allSeries.map((s) => [s.id, s])),
    [allSeries],
  );

  // Owner lookup walks the canonical clients catalog so the row card always
  // shows live phone / email instead of denormalized enrollment data.
  const clientLookup = useMemo(() => {
    const map = new Map<
      number,
      { name: string; phone?: string; email?: string }
    >();
    for (const c of clients) {
      map.set(c.id, { name: c.name, phone: c.phone, email: c.email });
    }
    return (ownerId: number) => map.get(ownerId) ?? null;
  }, []);

  const candidates = useMemo(
    () =>
      computeMakeupCandidates({
        attendances: allAttendances,
        enrollments: allEnrollments,
        seriesById,
        clientLookup,
        makeupSessions,
        todayISO,
      }),
    [
      allAttendances,
      allEnrollments,
      seriesById,
      clientLookup,
      makeupSessions,
      todayISO,
    ],
  );

  const offered = useMemo(
    () =>
      computeMakeupCandidates(
        {
          attendances: allAttendances,
          enrollments: allEnrollments,
          seriesById,
          clientLookup,
          makeupSessions,
          todayISO,
        },
        { includeResolved: true },
      ).filter(
        (c) =>
          c.makeup?.status === "offered" ||
          c.makeup?.status === "scheduled" ||
          c.makeup?.status === "pending",
      ),
    [
      allAttendances,
      allEnrollments,
      seriesById,
      clientLookup,
      makeupSessions,
      todayISO,
    ],
  );

  const ineligible = useMemo(
    () =>
      computeMakeupCandidates(
        {
          attendances: allAttendances,
          enrollments: allEnrollments,
          seriesById,
          clientLookup,
          makeupSessions,
          todayISO,
        },
        { includeResolved: true },
      ).filter((c) => c.makeup?.status === "ineligible"),
    [
      allAttendances,
      allEnrollments,
      seriesById,
      clientLookup,
      makeupSessions,
      todayISO,
    ],
  );

  // Capacity helper — counts each enrollment + each offered/scheduled
  // make-up against the host session's max capacity.
  const seatsAvailableForSession = useMemo(() => {
    const enrollmentCountBySeriesId = new Map<string, number>();
    for (const e of allEnrollments) {
      if (e.status === "enrolled") {
        enrollmentCountBySeriesId.set(
          e.seriesId,
          (enrollmentCountBySeriesId.get(e.seriesId) ?? 0) + 1,
        );
      }
    }
    const makeupCountBySessionId = new Map<string, number>();
    for (const m of makeupSessions) {
      if (
        (m.status === "offered" || m.status === "scheduled") &&
        m.targetSessionId
      ) {
        makeupCountBySessionId.set(
          m.targetSessionId,
          (makeupCountBySessionId.get(m.targetSessionId) ?? 0) + 1,
        );
      }
    }
    return (series: TrainingSeries, session: TrainingSeriesSession) => {
      const enrolled = enrollmentCountBySeriesId.get(series.id) ?? 0;
      const makeups = makeupCountBySessionId.get(session.id) ?? 0;
      return Math.max(0, series.maxCapacity - enrolled - makeups);
    };
  }, [allEnrollments, makeupSessions]);

  // Search filter — quick scan across pet, owner, series.
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  function matchesQuery(row: MakeupCandidate): boolean {
    if (!q) return true;
    return (
      row.attendance.petName.toLowerCase().includes(q) ||
      row.ownerName.toLowerCase().includes(q) ||
      row.series.seriesName.toLowerCase().includes(q) ||
      row.series.courseTypeName.toLowerCase().includes(q)
    );
  }
  const filteredCandidates = candidates.filter(matchesQuery);
  const filteredOffered = offered.filter(matchesQuery);
  const filteredIneligible = ineligible.filter(matchesQuery);

  // Dialog state ────────────────────────────────────────────────────
  const [offerCandidate, setOfferCandidate] = useState<MakeupCandidate | null>(
    null,
  );
  const [ineligibleCandidate, setIneligibleCandidate] =
    useState<MakeupCandidate | null>(null);

  function persistMakeup(record: MakeupSession) {
    const key = trainingQueries.allMakeupSessions().queryKey;
    queryClient.setQueryData<MakeupSession[]>(key, (prev = []) => {
      const exists = prev.some((m) => m.id === record.id);
      if (exists) return prev.map((m) => (m.id === record.id ? record : m));
      return [...prev, record];
    });
  }

  function offerSlot(candidate: MakeupCandidate, option: HostSessionOption) {
    const nowISO = new Date().toISOString();
    const record: MakeupSession = {
      id: `makeup-${candidate.enrollment.id}-${candidate.attendance.sessionId}-${nowISO}`,
      enrollmentId: candidate.enrollment.id,
      missedSessionId: candidate.attendance.sessionId,
      missedSessionNumber: candidate.attendance.sessionNumber,
      missedSessionDate: candidate.attendance.sessionDate,
      status: "offered",
      scheduledDate: option.session.date,
      scheduledTime: option.session.startTime,
      price: 0,
      trainerId: option.series.instructorId,
      trainerName: option.series.instructorName,
      notes: "Slot offered — awaiting customer acceptance.",
      targetSeriesId: option.series.id,
      targetSeriesName: option.series.seriesName,
      targetSessionId: option.session.id,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    persistMakeup(record);
    setOfferCandidate(null);
    toast.success(
      `Offer sent to ${candidate.ownerName} — ${candidate.attendance.petName} can join ${option.series.seriesName} on ${option.session.date}.`,
    );
  }

  function markIneligible(candidate: MakeupCandidate, reason: string) {
    const nowISO = new Date().toISOString();
    const existing = candidate.makeup;
    const record: MakeupSession = existing
      ? {
          ...existing,
          status: "ineligible",
          ineligibleReason: reason,
          ineligibleByName: "Staff",
          updatedAt: nowISO,
        }
      : {
          id: `makeup-${candidate.enrollment.id}-${candidate.attendance.sessionId}-${nowISO}`,
          enrollmentId: candidate.enrollment.id,
          missedSessionId: candidate.attendance.sessionId,
          missedSessionNumber: candidate.attendance.sessionNumber,
          missedSessionDate: candidate.attendance.sessionDate,
          status: "ineligible",
          scheduledDate: null,
          scheduledTime: null,
          price: 0,
          trainerId: null,
          trainerName: null,
          notes: "",
          ineligibleReason: reason,
          ineligibleByName: "Staff",
          createdAt: nowISO,
          updatedAt: nowISO,
        };
    persistMakeup(record);
    setIneligibleCandidate(null);
    toast.success(
      `Marked ineligible — ${candidate.attendance.petName} will no longer surface here.`,
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Make-up Sessions
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Every student across every active series who has an Absent mark and
            is inside the make-up eligibility window. Offer a host slot or mark
            the absence ineligible.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dog, owner, or series…"
            className="h-9 pl-9"
          />
        </div>
      </header>

      <Tabs defaultValue="needs-action" className="space-y-4">
        <TabsList>
          <TabsTrigger value="needs-action" className="gap-1.5">
            <CalendarRange className="size-3.5" />
            Needs action
            <CountPill count={filteredCandidates.length} />
          </TabsTrigger>
          <TabsTrigger value="offered" className="gap-1.5">
            <Send className="size-3.5" />
            Offered / Scheduled
            <CountPill count={filteredOffered.length} />
          </TabsTrigger>
          <TabsTrigger value="ineligible" className="gap-1.5">
            <Ban className="size-3.5" />
            Ineligible
            <CountPill count={filteredIneligible.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs-action" className="space-y-3">
          <CandidateList
            rows={filteredCandidates}
            emptyMessage="No outstanding absences — every missed session has been offered, scheduled, or marked ineligible."
            renderActions={(c) => (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setOfferCandidate(c)}
                  disabled={!c.withinWindow}
                  title={
                    c.withinWindow
                      ? "Pick an available host session and send the offer"
                      : "Make-up window has expired — mark ineligible instead"
                  }
                >
                  <Send className="mr-1.5 size-3.5" />
                  Offer make-up slot
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIneligibleCandidate(c)}
                  className="text-rose-700 hover:bg-rose-50"
                >
                  <Ban className="mr-1.5 size-3.5" />
                  Mark ineligible
                </Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="offered" className="space-y-3">
          <CandidateList
            rows={filteredOffered}
            emptyMessage="No offers in flight — issue one from the Needs action tab."
            renderActions={(c) => <ResolvedRowMeta candidate={c} />}
          />
        </TabsContent>

        <TabsContent value="ineligible" className="space-y-3">
          <CandidateList
            rows={filteredIneligible}
            emptyMessage="Nothing marked ineligible yet."
            renderActions={(c) => <ResolvedRowMeta candidate={c} />}
          />
        </TabsContent>
      </Tabs>

      <OfferMakeupDialog
        candidate={offerCandidate}
        onOpenChange={(o) => !o && setOfferCandidate(null)}
        allSeries={allSeries}
        seatsAvailableForSession={seatsAvailableForSession}
        todayISO={todayISO}
        onOffer={offerSlot}
      />

      <IneligibleDialog
        candidate={ineligibleCandidate}
        onOpenChange={(o) => !o && setIneligibleCandidate(null)}
        onConfirm={markIneligible}
      />
    </div>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-bold text-slate-700 tabular-nums">
      {count}
    </span>
  );
}

function CandidateList({
  rows,
  emptyMessage,
  renderActions,
}: {
  rows: MakeupCandidate[];
  emptyMessage: string;
  renderActions: (row: MakeupCandidate) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <CalendarRange className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-800">
                  {row.attendance.petName}
                </p>
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                >
                  <Users className="size-3" />
                  {row.ownerName}
                </Badge>
                <WindowBadge
                  daysRemaining={row.daysRemaining}
                  withinWindow={row.withinWindow}
                />
              </div>
              <p className="text-muted-foreground mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="size-3" />
                  {row.series.seriesName}
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Missed Session {row.attendance.sessionNumber} ·{" "}
                  {formatLongDate(row.attendance.sessionDate)}
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-2 text-[11px]">
                {row.ownerPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {row.ownerPhone}
                  </span>
                )}
                {row.ownerEmail && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {row.ownerEmail}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {renderActions(row)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function WindowBadge({
  daysRemaining,
  withinWindow,
}: {
  daysRemaining: number;
  withinWindow: boolean;
}) {
  if (!withinWindow) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
        title={`Window expired ${Math.abs(daysRemaining)}d ago`}
      >
        <Clock className="size-3" />
        Past window
      </Badge>
    );
  }
  if (daysRemaining <= 3) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
      >
        <Clock className="size-3" />
        {daysRemaining}d left
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
    >
      <Clock className="size-3" />
      {daysRemaining}d left
    </Badge>
  );
}

function ResolvedRowMeta({ candidate }: { candidate: MakeupCandidate }) {
  const makeup = candidate.makeup;
  if (!makeup) return null;
  if (makeup.status === "ineligible") {
    return (
      <div className="max-w-xs text-right text-[11.5px] text-rose-700">
        <p className="font-semibold tracking-wider uppercase">Ineligible</p>
        {makeup.ineligibleReason && (
          <p className="text-muted-foreground mt-0.5 tracking-normal normal-case italic">
            {makeup.ineligibleReason}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="text-right text-[11.5px] text-emerald-700">
      <p className="font-semibold tracking-wider uppercase">
        {makeup.status === "scheduled"
          ? "Scheduled"
          : makeup.status === "offered"
            ? "Offer sent"
            : "Pending request"}
      </p>
      <p className="text-muted-foreground mt-0.5 tracking-normal normal-case">
        {makeup.targetSeriesName && `${makeup.targetSeriesName}`}
        {makeup.scheduledDate && ` · ${makeup.scheduledDate}`}
        {makeup.scheduledTime && ` ${makeup.scheduledTime}`}
      </p>
    </div>
  );
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Offer Make-up Dialog
// ─────────────────────────────────────────────────────────────────────────

function OfferMakeupDialog({
  candidate,
  onOpenChange,
  allSeries,
  seatsAvailableForSession,
  todayISO,
  onOffer,
}: {
  candidate: MakeupCandidate | null;
  onOpenChange: (open: boolean) => void;
  allSeries: TrainingSeries[];
  seatsAvailableForSession: (
    series: TrainingSeries,
    session: TrainingSeriesSession,
  ) => number;
  todayISO: string;
  onOffer: (candidate: MakeupCandidate, option: HostSessionOption) => void;
}) {
  const options = useMemo(() => {
    if (!candidate) return [];
    return listHostSessionsForCandidate(
      candidate,
      allSeries,
      seatsAvailableForSession,
      todayISO,
    );
  }, [candidate, allSeries, seatsAvailableForSession, todayISO]);

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-emerald-600" />
            Offer make-up slot
          </DialogTitle>
          {candidate && (
            <DialogDescription>
              Pick an available host session for{" "}
              <span className="font-medium">
                {candidate.attendance.petName}
              </span>{" "}
              — only sessions in{" "}
              <span className="font-medium">
                {candidate.series.courseTypeName}
              </span>{" "}
              with at least one open seat show up. The customer gets a booking
              link and confirms from their portal.
            </DialogDescription>
          )}
        </DialogHeader>

        {candidate && (
          <div className="space-y-3 py-1">
            <Card>
              <CardHeader className="space-y-1 p-3">
                <CardTitle className="text-sm">Missed session</CardTitle>
                <CardDescription className="text-xs">
                  Session {candidate.attendance.sessionNumber} of{" "}
                  {candidate.series.seriesName} ·{" "}
                  {formatLongDate(candidate.attendance.sessionDate)}
                </CardDescription>
              </CardHeader>
            </Card>

            {options.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
                <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
                No future {candidate.series.courseTypeName} sessions have an
                open seat right now. Either wait for the next cohort or schedule
                a private make-up.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                  Available host sessions ({options.length})
                </p>
                <ul className="space-y-2">
                  {options.map((opt) => (
                    <li
                      key={`${opt.series.id}-${opt.session.id}`}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-slate-50/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {opt.series.seriesName}
                        </p>
                        <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-2 text-[11.5px]">
                          <span>
                            Session {opt.session.sessionNumber} ·{" "}
                            {formatLongDate(opt.session.date)} ·{" "}
                            {opt.session.startTime}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {opt.series.location}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{opt.series.instructorName}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px]",
                            opt.seatsAvailable === 1
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          <CheckCircle2 className="size-3" />
                          {opt.seatsAvailable} seat
                          {opt.seatsAvailable === 1 ? "" : "s"} open
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => onOffer(candidate, opt)}
                        >
                          Send offer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Mark Ineligible Dialog
// ─────────────────────────────────────────────────────────────────────────

function IneligibleDialog({
  candidate,
  onOpenChange,
  onConfirm,
}: {
  candidate: MakeupCandidate | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (candidate: MakeupCandidate, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  // Reset reason when dialog closes so the next pet starts clean.
  useEffect(() => {
    if (!candidate) setReason("");
  }, [candidate]);

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-rose-600" />
            Mark absence ineligible
          </DialogTitle>
          {candidate && (
            <DialogDescription>
              {candidate.attendance.petName}&apos;s missed session won&apos;t be
              offered a make-up. Add a short reason so the audit trail explains
              the call.
            </DialogDescription>
          )}
        </DialogHeader>
        {candidate && (
          <div className="space-y-3 py-1">
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2">
              <p className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                {candidate.attendance.petName}
              </p>
              <p className="mt-0.5 text-[12.5px] text-rose-900">
                Session {candidate.attendance.sessionNumber} of{" "}
                {candidate.series.seriesName} ·{" "}
                {formatLongDate(candidate.attendance.sessionDate)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Reason</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Past make-up window. No advance notice given."
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!candidate) return;
              if (!reason.trim()) {
                toast.error(
                  "Add a reason so the audit trail explains the call.",
                );
                return;
              }
              onConfirm(candidate, reason.trim());
            }}
            disabled={!reason.trim()}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            Mark ineligible
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
