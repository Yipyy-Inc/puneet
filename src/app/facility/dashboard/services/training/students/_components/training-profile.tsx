"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hourglass,
  PawPrint,
  PlayCircle,
  ShieldAlert,
  StickyNote,
  Syringe,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clients } from "@/data/clients";
import { trainingQueries } from "@/lib/api/training";
import {
  computeVaccineWarning,
  getConsecutiveNoShows,
  isAtNoShowRisk,
  NO_SHOW_RISK_THRESHOLD,
} from "@/lib/training-students";
import { TrainingProfileOverview } from "./training-profile-overview";
import { TrainingProfileHistory } from "./training-profile-history";
import { TrainingProfileProgress } from "./training-profile-progress";
import { TrainingProfileHomework } from "./training-profile-homework";
import { TrainingProfileNotes } from "./training-profile-notes";
import { TrainingProfileVaccinations } from "./training-profile-vaccinations";
import { TrainingProfileReportCards } from "./training-profile-report-cards";
import { TrainingProfilePackageChips } from "./training-profile-package-chips";

interface Props {
  petId: number;
}

const PROFILE_STATUS_META = {
  active: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: PlayCircle,
  },
  waitlisted: {
    label: "Waitlisted",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: Hourglass,
  },
  completed: {
    label: "Completed",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    Icon: CheckCircle2,
  },
  dropped: {
    label: "Dropped",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    Icon: UserMinus,
  },
  none: {
    label: "No enrollments",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: PawPrint,
  },
} as const;

const VALID_PROFILE_TABS = new Set([
  "overview",
  "progress",
  "history",
  "homework",
  "report-cards",
  "notes",
  "vaccinations",
]);

export function TrainingProfile({ petId }: Props) {
  const searchParams = useSearchParams();
  const defaultTab = (() => {
    const raw = searchParams.get("tab");
    return raw && VALID_PROFILE_TABS.has(raw) ? raw : "overview";
  })();

  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const { data: allEnrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: allSeries = [] } = useQuery(trainingQueries.series());
  const { data: allVaccinations = [] } = useQuery(
    trainingQueries.vaccinations(),
  );
  const { data: allNotes = [] } = useQuery(trainingQueries.trainerNotes());
  const { data: allAttendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );

  const noShowConsecutive = getConsecutiveNoShows(petId, allAttendances);
  const noShowAtRisk = isAtNoShowRisk(petId, allAttendances);

  // Pet + owner lookup — re-derived from clients data so the header shows
  // canonical info even if the enrollment row is stale. Plain locals so the
  // React Compiler can analyze them without manual memo getting in the way.
  const owningClient = clients.find((c) =>
    c.pets.some((p) => p.id === petId),
  );
  const pet = owningClient?.pets.find((p) => p.id === petId) ?? null;
  const ownerId = owningClient?.id ?? 0;
  const ownerName = owningClient?.name ?? "";
  const ownerPhone = owningClient?.phone ?? "";

  const enrollments = useMemo(
    () => allEnrollments.filter((e) => e.petId === petId),
    [allEnrollments, petId],
  );

  const seriesById = useMemo(
    () => new Map(allSeries.map((s) => [s.id, s])),
    [allSeries],
  );

  const trainerNotesForPet = useMemo(
    () =>
      allNotes
        .filter((n) => n.petId === petId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allNotes, petId],
  );

  // Pick the "primary" enrollment the way the Students list does: active first,
  // then waitlisted, then most recent. Drives header status badge + overview.
  const primaryEnrollment = useMemo(() => {
    if (enrollments.length === 0) return null;
    const sorted = [...enrollments].sort((a, b) =>
      a.enrollmentDate < b.enrollmentDate ? 1 : -1,
    );
    return (
      sorted.find((e) => e.status === "enrolled") ??
      sorted.find((e) => e.status === "waitlisted") ??
      sorted[0]
    );
  }, [enrollments]);

  const headerStatusKey: keyof typeof PROFILE_STATUS_META = !primaryEnrollment
    ? "none"
    : primaryEnrollment.status === "enrolled"
      ? "active"
      : primaryEnrollment.status === "waitlisted"
        ? "waitlisted"
        : primaryEnrollment.status === "completed"
          ? "completed"
          : "dropped";
  const headerStatus = PROFILE_STATUS_META[headerStatusKey];
  const HeaderStatusIcon = headerStatus.Icon;

  const vaccine = useMemo(
    () => computeVaccineWarning(petId, allVaccinations, todayISO),
    [petId, allVaccinations, todayISO],
  );

  // If the petId snuck past the server-side check (e.g., raw URL), fail safe.
  if (!pet) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Loading student…
      </div>
    );
  }

  const sessionsCompleted = enrollments.reduce(
    (sum, e) => sum + (e.sessionsAttended ?? 0),
    0,
  );

  const generalProfileHref = `/facility/dashboard/clients/${ownerId}/pets/${petId}`;

  return (
    <div className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-slate-500 hover:text-slate-800"
      >
        <Link href="/facility/dashboard/services/training/students">
          <ArrowLeft className="mr-1 size-4" />
          Back to students
        </Link>
      </Button>

      {/* Pet header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-muted relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-white shadow-sm">
            {pet.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pet.imageUrl}
                alt={pet.name}
                className="size-full object-cover"
              />
            ) : (
              <PawPrint className="text-muted-foreground size-6" />
            )}
            {vaccine.hasWarning && (
              <span
                title={
                  vaccine.soonestName
                    ? `${vaccine.soonestName} ${
                        vaccine.soonestDays !== null && vaccine.soonestDays < 0
                          ? `expired ${-vaccine.soonestDays}d ago`
                          : `expires in ${vaccine.soonestDays}d`
                      }`
                    : "Vaccine expiring"
                }
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-2 ring-white"
              >
                <ShieldAlert className="size-3" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {pet.name}
              </h2>
              <Badge
                variant="outline"
                className={cn("gap-1 border", headerStatus.cls)}
              >
                <HeaderStatusIcon className="size-3" />
                {headerStatus.label}
              </Badge>
              {noShowAtRisk && (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-rose-700"
                  title={`${noShowConsecutive} consecutive missed session${
                    noShowConsecutive === 1 ? "" : "s"
                  } — threshold is ${NO_SHOW_RISK_THRESHOLD}. Consider reaching out to the owner.`}
                >
                  <ShieldAlert className="size-3" />
                  No-Show Risk
                </Badge>
              )}
              <TrainingProfilePackageChips
                petId={petId}
                todayISO={todayISO ?? ""}
              />
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {pet.breed} ·{" "}
              <Users className="mr-1 inline size-3 align-text-bottom" />
              <Link
                href={`/facility/dashboard/clients/${ownerId}`}
                className="hover:text-foreground hover:underline"
              >
                {ownerName}
              </Link>
              {ownerPhone && (
                <>
                  {" · "}
                  <a
                    href={`tel:${ownerPhone}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {ownerPhone}
                  </a>
                </>
              )}
            </p>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {sessionsCompleted}
                </span>{" "}
                sessions attended
              </span>
              <span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {enrollments.length}
                </span>{" "}
                program{enrollments.length === 1 ? "" : "s"} on file
              </span>
              <span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {trainerNotesForPet.length}
                </span>{" "}
                trainer note
                {trainerNotesForPet.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={generalProfileHref}>
              <PawPrint className="mr-1.5 size-4" />
              View general profile
              <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-1.5">
            <PlayCircle className="size-3.5" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <CalendarDays className="size-3.5" />
            Training History
          </TabsTrigger>
          <TabsTrigger value="homework" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Homework
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="size-3.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="report-cards" className="gap-1.5">
            <FileText className="size-3.5" />
            Report Cards
          </TabsTrigger>
          <TabsTrigger value="vaccinations" className="gap-1.5">
            <Syringe className="size-3.5" />
            Vaccinations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <TrainingProfileOverview
            petId={petId}
            petName={pet.name}
            enrollments={enrollments}
            seriesById={seriesById}
            primaryEnrollment={primaryEnrollment}
            trainerNotes={trainerNotesForPet}
            todayISO={todayISO ?? ""}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <TrainingProfileHistory
            petId={petId}
            enrollments={enrollments}
            seriesById={seriesById}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-3">
          <TrainingProfileProgress
            petId={petId}
            petName={pet.name}
            enrollments={enrollments}
            seriesById={seriesById}
          />
        </TabsContent>

        <TabsContent value="homework" className="space-y-3">
          <TrainingProfileHomework
            petId={petId}
            petName={pet.name}
            enrollments={enrollments}
          />
        </TabsContent>

        <TabsContent value="report-cards" className="space-y-3">
          <TrainingProfileReportCards petId={petId} petName={pet.name} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-3">
          <TrainingProfileNotes petId={petId} petName={pet.name} />
        </TabsContent>

        <TabsContent value="vaccinations" className="space-y-3">
          <TrainingProfileVaccinations
            petId={petId}
            petName={pet.name}
            ownerId={ownerId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
