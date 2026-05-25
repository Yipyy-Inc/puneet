"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  GraduationCap,
  ImageIcon,
  Inbox,
  Lock,
  Route,
  Star,
  User2,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trainingQueries } from "@/lib/api/training";
import { SKILL_LEVEL_LABELS } from "@/types/training";
import type { Pet } from "@/types/pet";
import type { TrainingPackage } from "@/types/training";
import {
  distinctEnrolledForSeries,
} from "@/data/training-series";
import {
  getDayName,
  type TrainingSeries,
} from "@/lib/training-series";
import {
  checkPrerequisitesForPet,
  checkPrerequisitesWithProgress,
  hasCompletedPrerequisites,
  lookupPrerequisitePrograms,
  type PrereqDetail,
} from "@/lib/training-program-prereqs";
import { hexToRgba } from "@/lib/color-utils";

interface Props {
  series: TrainingSeries[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  /** This customer's pets — feeds prerequisite eligibility on each card. */
  pets: Pet[];
  onSelectCourse: (course: TrainingPackage) => void;
  /** Deep-link directly into the booking flow at Step 3 with this program
   *  pre-selected — skips the service picker entirely. */
  onEnrollInCourse: (course: TrainingPackage) => void;
  /** Open the program-level waitlist signup form. Fires when every matching
   *  upcoming series is at capacity. */
  onJoinProgramWaitlist: (course: TrainingPackage) => void;
}

const CLASS_TYPE_LABEL: Record<TrainingPackage["classType"], string> = {
  group: "Group",
  private: "Private",
};

const CLASS_TYPE_CLS: Record<TrainingPackage["classType"], string> = {
  group: "border-indigo-200 bg-indigo-50 text-indigo-700",
  private: "border-orange-200 bg-orange-50 text-orange-700",
};

const SKILL_LEVEL_CLS: Record<string, string> = {
  beginner: "border-emerald-200 bg-emerald-50 text-emerald-700",
  intermediate: "border-sky-200 bg-sky-50 text-sky-700",
  advanced: "border-amber-200 bg-amber-50 text-amber-700",
  "all-levels": "border-slate-200 bg-slate-50 text-slate-700",
};

/** Loose name normalization used to match a package to the series catalog —
 *  the package's `name` and a series's `courseTypeName` are entered
 *  separately so we tolerate slashes, dashes, and the "Package" / "Pack"
 *  suffix variations. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(package|pack|class|course|training)\b/g, "")
    .trim();
}

/** Count upcoming series that look like instances of this catalog package.
 *  Match by the normalized name overlap so the demo's "Basic Obedience
 *  Package" → "Basic Obedience / Beginner Manners" link works without
 *  forcing every series to carry a packageId. */
export function matchSeriesForCourse(
  course: TrainingPackage,
  series: TrainingSeries[],
): TrainingSeries[] {
  const target = normalize(course.name);
  if (!target) return [];
  return series.filter((s) => {
    if (s.status !== "upcoming") return false;
    const candidate = normalize(s.courseTypeName);
    return (
      candidate.includes(target) || target.includes(candidate)
    );
  });
}

export function CustomerTrainingCatalog({
  series,
  searchQuery,
  onSearchChange,
  pets,
  onSelectCourse,
  onEnrollInCourse,
  onJoinProgramWaitlist,
}: Props) {
  const { data: packages = [] } = useQuery(trainingQueries.packages());
  const { data: disciplines = [] } = useQuery(
    trainingQueries.disciplines(),
  );
  const { data: pathways = [] } = useQuery(trainingQueries.trainingPathways());

  const disciplineById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );

  // Index pathways by the program ids they contain so the catalog card can
  // surface a "Part of {Pathway}" badge without scanning the list per render.
  const pathwayNameByProgramId = useMemo(() => {
    const map = new Map<string, string>();
    for (const pathway of pathways) {
      for (const step of pathway.steps) {
        // First pathway to reference a program wins — most facilities only
        // have one pathway per program, but the deterministic order keeps
        // the badge stable when there are overlaps.
        if (!map.has(step.programId)) {
          map.set(step.programId, pathway.name);
        }
      }
    }
    return map;
  }, [pathways]);

  // Active + published catalog ordered by the facility-side drag order so
  // both audiences see the same sequence.
  const courses = useMemo(() => {
    const active = packages.filter((p) => p.isActive);
    const q = searchQuery.trim().toLowerCase();
    const filtered = !q
      ? active
      : active.filter((p) => {
          const disciplineName = p.disciplineId
            ? disciplineById.get(p.disciplineId)?.name ?? ""
            : "";
          const skillLabel = SKILL_LEVEL_LABELS[p.skillLevel] ?? "";
          return [
            p.name,
            p.description,
            disciplineName,
            skillLabel,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
    return filtered.slice().sort((a, b) => {
      const ao = a.sortOrder;
      const bo = b.sortOrder;
      if (ao !== undefined && bo !== undefined) return ao - bo;
      if (ao !== undefined) return -1;
      if (bo !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [packages, disciplineById, searchQuery]);

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="Search by course name, discipline, or skill level…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {courses.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          {packages.length === 0
            ? "This facility hasn't published any training programs yet."
            : "No courses match your search."}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const discipline = course.disciplineId
              ? disciplineById.get(course.disciplineId)
              : undefined;
            const upcoming = matchSeriesForCourse(course, series);
            const upcomingWithSpots = upcoming
              .slice()
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((s) => ({
                series: s,
                spotsLeft: Math.max(
                  0,
                  s.maxCapacity - distinctEnrolledForSeries(s),
                ),
              }));
            const allFull =
              upcomingWithSpots.length > 0 &&
              upcomingWithSpots.every((row) => row.spotsLeft === 0);
            const hasPrereqs =
              (course.prerequisitePackageIds?.length ?? 0) > 0;
            // Richer per-pet prereq details — used for the catalog
            // tooltip that surfaces "currently in {prereq} — N of M".
            const eligibilityByPet = pets.map((p) => ({
              pet: p,
              eligible: hasCompletedPrerequisites(p.id, course),
              details: checkPrerequisitesWithProgress(p.id, course),
            }));
            const anyEligible =
              !hasPrereqs || eligibilityByPet.some((e) => e.eligible);
            return (
              <li key={course.id}>
                <CourseCard
                  course={course}
                  disciplineName={discipline?.name}
                  disciplineColor={discipline?.color}
                  pathwayName={pathwayNameByProgramId.get(course.id)}
                  upcomingCount={upcoming.length}
                  upcomingWithSpots={upcomingWithSpots.slice(0, 3)}
                  hasPrereqs={hasPrereqs}
                  anyEligible={anyEligible}
                  eligibilityByPet={eligibilityByPet}
                  allFull={allFull}
                  onSelect={() => onSelectCourse(course)}
                  onEnroll={() => onEnrollInCourse(course)}
                  onJoinWaitlist={() => onJoinProgramWaitlist(course)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CourseCard({
  course,
  disciplineName,
  disciplineColor,
  pathwayName,
  upcomingCount,
  upcomingWithSpots,
  hasPrereqs,
  anyEligible,
  eligibilityByPet,
  allFull,
  onSelect,
  onEnroll,
  onJoinWaitlist,
}: {
  course: TrainingPackage;
  disciplineName?: string;
  disciplineColor?: string;
  pathwayName?: string;
  upcomingCount: number;
  upcomingWithSpots: { series: TrainingSeries; spotsLeft: number }[];
  hasPrereqs: boolean;
  anyEligible: boolean;
  eligibilityByPet: {
    pet: Pet;
    eligible: boolean;
    details: PrereqDetail[];
  }[];
  allFull: boolean;
  onSelect: () => void;
  onEnroll: () => void;
  onJoinWaitlist: () => void;
}) {
  const includes = course.includes ?? [];
  const showIncludes = includes.slice(0, 4);
  const overflow = includes.length - showIncludes.length;
  const skillLevelLabel = SKILL_LEVEL_LABELS[course.skillLevel] ?? course.skillLevel;

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      {/* Cover image (or gradient placeholder) ─────────────────────────── */}
      <div className="relative aspect-video w-full bg-slate-100">
        {course.imageUrl ? (
          <Image
            src={course.imageUrl}
            alt={course.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-linear-to-br"
            style={{
              background: disciplineColor
                ? `linear-gradient(135deg, ${hexToRgba(disciplineColor, 0.18)} 0%, ${hexToRgba(disciplineColor, 0.04)} 100%)`
                : undefined,
            }}
          >
            <ImageIcon className="text-muted-foreground/40 size-8" />
          </div>
        )}
        {course.popular && (
          <Badge
            variant="default"
            className="absolute left-2 top-2 gap-1 bg-amber-500 text-white shadow-sm"
            title="Popular pick"
          >
            <Star className="size-3 fill-current" />
            Popular
          </Badge>
        )}
      </div>

      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg/tight font-semibold text-slate-900">
            {course.name}
          </h3>
          <p className="text-lg/tight font-bold tabular-nums text-slate-900">
            ${course.price}
          </p>
        </div>
        {course.description && (
          <p className="text-muted-foreground line-clamp-2 text-[12.5px]/relaxed">
            {course.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {disciplineName && (
            <Badge
              variant="outline"
              className="gap-1 border-transparent text-[10px]"
              style={
                disciplineColor
                  ? {
                      backgroundColor: hexToRgba(disciplineColor, 0.12),
                      color: disciplineColor,
                    }
                  : undefined
              }
            >
              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: disciplineColor ?? "rgb(148 163 184)",
                }}
              />
              {disciplineName}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px]",
              SKILL_LEVEL_CLS[course.skillLevel] ??
                "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            {skillLevelLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn("gap-1 text-[10px]", CLASS_TYPE_CLS[course.classType])}
          >
            {course.classType === "private" ? (
              <User2 className="size-3" />
            ) : (
              <Users className="size-3" />
            )}
            {CLASS_TYPE_LABEL[course.classType]}
            {course.classType === "group" && course.maxGroupSize && (
              <span className="text-muted-foreground/70 ml-0.5">
                · max {course.maxGroupSize}
              </span>
            )}
          </Badge>
          {hasPrereqs && (
            <PrereqsBadge
              eligibilityByPet={eligibilityByPet}
              courseName={course.name}
            />
          )}
          {pathwayName && (
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
              title={`This program is part of the ${pathwayName} training pathway`}
            >
              <Route className="size-3" />
              Part of {pathwayName}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-3 pt-0 pb-3">
        {/* What's included ────────────────────────────────────────────── */}
        <div className="flex-1">
          <p className="text-muted-foreground mb-1.5 text-[10px] font-bold uppercase tracking-wider">
            What&apos;s included
          </p>
          {showIncludes.length === 0 ? (
            <p className="text-muted-foreground text-[12px] italic">
              {course.sessions} session
              {course.sessions === 1 ? "" : "s"}
              {course.validityDays
                ? ` · valid for ${course.validityDays} days`
                : ""}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {showIncludes.map((item, idx) => (
                <li
                  key={`${course.id}-inc-${idx}`}
                  className="flex items-start gap-1.5 text-[12px]/relaxed text-slate-700"
                >
                  <Check className="text-emerald-500 mt-0.5 size-3 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
              {overflow > 0 && (
                <li className="text-muted-foreground pl-4 text-[11px] italic">
                  + {overflow} more
                </li>
              )}
            </ul>
          )}
        </div>

        <Separator />

        {/* Upcoming sessions ───────────────────────────────────────────── */}
        {upcomingWithSpots.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <CalendarClock className="size-3" />
              Upcoming sessions
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {upcomingWithSpots.map(({ series, spotsLeft }) => (
                <li key={series.id}>
                  <UpcomingSessionChip series={series} spotsLeft={spotsLeft} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        <div className="flex flex-col items-stretch gap-2">
          <EnrollAction
            upcomingCount={upcomingCount}
            anyEligible={anyEligible}
            hasPrereqs={hasPrereqs}
            eligibilityByPet={eligibilityByPet}
            allFull={allFull}
            onEnroll={onEnroll}
            onJoinWaitlist={onJoinWaitlist}
          />
          <Button
            onClick={onSelect}
            variant="outline"
            className="gap-1"
          >
            View Available Classes
            <ArrowRight className="size-4" />
          </Button>
          <p className="text-muted-foreground text-center text-[11px]">
            {upcomingCount === 0
              ? "No classes scheduled right now"
              : `${upcomingCount} upcoming ${upcomingCount === 1 ? "class" : "classes"}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function UpcomingSessionChip({
  series,
  spotsLeft,
}: {
  series: TrainingSeries;
  spotsLeft: number;
}) {
  const dayShort = getDayName(series.dayOfWeek).slice(0, 3);
  const dateLabel = formatShortDate(series.startDate);
  const timeLabel = formatTime12(series.startTime);
  const isFull = spotsLeft === 0;
  const isAlmostFull = !isFull && spotsLeft <= 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        isFull
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : isAlmostFull
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
      title={`${series.seriesName} · starts ${dateLabel} · ${dayShort} ${timeLabel}`}
    >
      <span className="font-semibold tabular-nums">{dateLabel}</span>
      <span className="text-muted-foreground/80">·</span>
      <span className="tabular-nums">
        {dayShort} {timeLabel}
      </span>
      <span className="text-muted-foreground/80">—</span>
      <span className="font-medium">
        {isFull
          ? "Full (Join waitlist)"
          : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
      </span>
    </span>
  );
}

function EnrollAction({
  upcomingCount,
  anyEligible,
  hasPrereqs,
  eligibilityByPet,
  allFull,
  onEnroll,
  onJoinWaitlist,
}: {
  upcomingCount: number;
  anyEligible: boolean;
  hasPrereqs: boolean;
  eligibilityByPet: {
    pet: Pet;
    eligible: boolean;
    details: PrereqDetail[];
  }[];
  allFull: boolean;
  onEnroll: () => void;
  onJoinWaitlist: () => void;
}) {
  // No upcoming series at all — disable both paths.
  if (upcomingCount === 0) {
    return (
      <Button
        disabled
        className="gap-1.5 bg-emerald-600 text-white"
        title="No upcoming series — check back soon."
      >
        <GraduationCap className="size-4" />
        Enroll
      </Button>
    );
  }

  // All available series are full — pivot to waitlist signup.
  if (allFull) {
    return (
      <Button
        onClick={onJoinWaitlist}
        variant="outline"
        className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
      >
        <Clock className="size-4" />
        Join Waitlist
      </Button>
    );
  }

  // Prereqs not met for any of the customer's pets — surface the lock.
  if (hasPrereqs && !anyEligible) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              className="gap-1.5 bg-emerald-600/60 text-white"
            >
              <Lock className="size-4" />
              Enroll when eligible
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-[12px]">
            <PrereqTooltipBody
              eligibilityByPet={eligibilityByPet}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Eligible — primary call to action.
  return (
    <Button
      onClick={onEnroll}
      className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
      title="Jump into the enrollment flow with this program pre-selected."
    >
      <GraduationCap className="size-4" />
      Enroll
    </Button>
  );
}

// ============================================================================
// Prereqs badge + tooltip — surfaces exactly what's missing per pet,
// including "currently in {prereq} — N of M" progress when relevant.
// ============================================================================

function PrereqsBadge({
  eligibilityByPet,
  courseName,
}: {
  eligibilityByPet: {
    pet: Pet;
    eligible: boolean;
    details: PrereqDetail[];
  }[];
  courseName: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            // Tap target for mobile — the badge is interactive so screen
            // readers + keyboard users can open the tooltip too.
            onClick={(e) => e.preventDefault()}
            className="cursor-help"
          >
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
            >
              <Lock className="size-3" />
              Prereqs apply
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-[12px]">
          <p className="mb-1 font-semibold">
            Prerequisites for {courseName}
          </p>
          <PrereqTooltipBody eligibilityByPet={eligibilityByPet} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PrereqTooltipBody({
  eligibilityByPet,
}: {
  eligibilityByPet: {
    pet: Pet;
    eligible: boolean;
    details: PrereqDetail[];
  }[];
}) {
  if (eligibilityByPet.length === 0) {
    return (
      <span className="text-[12px]">
        Required programs must be completed first.
      </span>
    );
  }
  return (
    <ul className="space-y-1.5">
      {eligibilityByPet.map(({ pet, eligible, details }) => {
        if (eligible) {
          return (
            <li
              key={pet.id}
              className="inline-flex items-start gap-1"
            >
              <Check className="text-emerald-500 mt-0.5 size-3 shrink-0" />
              <span>
                <span className="font-semibold">{pet.name}</span>{" "}
                meets every prerequisite.
              </span>
            </li>
          );
        }
        const missing = details.filter((d) => !d.satisfied);
        return (
          <li key={pet.id} className="space-y-0.5">
            <p>
              <span className="font-semibold">{pet.name}</span> still needs:
            </p>
            <ul className="ml-3 list-disc space-y-0.5">
              {missing.map((d) => (
                <li key={d.programId} className="leading-snug">
                  <span className="font-medium">{d.programName}</span>
                  {d.inProgress ? (
                    <>
                      {" "}
                      —{" "}
                      <span className="text-emerald-700 dark:text-emerald-300">
                        currently in {d.inProgress.seriesName} ·{" "}
                        {d.inProgress.sessionsAttended} of{" "}
                        {d.inProgress.totalSessions} sessions completed
                      </span>
                      {". Enrollment will unlock after the series completes."}
                    </>
                  ) : (
                    <> — not started yet.</>
                  )}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
