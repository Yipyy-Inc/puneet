"use client";

/**
 * Pathway Journey panel — rendered on the customer My Pets tab below the
 * current enrollment card whenever the pet is enrolled in (or has completed)
 * a program that belongs to a configured training pathway.
 *
 * Shows the full curriculum as a horizontal step bar with statuses pulled
 * from the pet's enrollment history. Upcoming steps open a popover with
 * program details + available series dates and a direct Enroll button.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Route,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import type { TrainingPackage } from "@/types/training";
import type {
  TrainingPathway,
  TrainingPathwayStep,
} from "@/data/training-pathways";

/** Loose name normalization — mirrors the helper in training-program-prereqs
 *  so a "Basic Obedience" enrollment maps to a "Basic Obedience Package"
 *  program. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(package|pack|class|course|training)\b/g, "")
    .trim();
}

type StepStatus = "completed" | "current" | "upcoming";

interface PathwayStepView extends TrainingPathwayStep {
  program: TrainingPackage | null;
  status: StepStatus;
  /** When current, how far through the underlying series the pet is. */
  progressPct?: number;
}

interface Props {
  petId: number;
  petName: string;
  /** All series enrollments for this pet — drives status detection. */
  enrollments: TrainingEnrollment[];
}

export function PathwayJourney({ petId, petName, enrollments }: Props) {
  void petId;
  const { data: pathways = [] } = useQuery(trainingQueries.trainingPathways());
  const { data: programs = [] } = useQuery(trainingQueries.packages());
  const { data: allSeries = [] } = useQuery(trainingQueries.series());

  const programById = useMemo(() => {
    const map = new Map<string, TrainingPackage>();
    for (const p of programs) map.set(p.id, p);
    return map;
  }, [programs]);

  // Build a normalized-name → status map from the pet's enrollment history.
  // "completed" wins over "current" if both are present (rare — usually only
  // happens for repeat takers).
  const statusByProgramName = useMemo(() => {
    const map = new Map<string, { status: StepStatus; progressPct?: number }>();
    for (const e of enrollments) {
      const key = normalize(e.courseTypeName);
      const prev = map.get(key);
      if (e.status === "completed") {
        map.set(key, { status: "completed" });
        continue;
      }
      if (
        (e.status === "enrolled" || e.status === "paused") &&
        prev?.status !== "completed"
      ) {
        const progressPct = Math.round(
          (e.sessionsAttended / Math.max(1, e.totalSessions)) * 100,
        );
        map.set(key, { status: "current", progressPct });
      }
    }
    return map;
  }, [enrollments]);

  // Pick the active pathway: the first one (by config order) that contains a
  // program matching one of this pet's enrollments. Most facilities will only
  // have one or two pathways per pet — if we ever support multiple journeys
  // this picker becomes a switcher.
  const activePathway = useMemo<TrainingPathway | null>(() => {
    if (pathways.length === 0) return null;
    for (const pathway of pathways) {
      for (const step of pathway.steps) {
        const program = programById.get(step.programId);
        if (!program) continue;
        if (statusByProgramName.has(normalize(program.name))) {
          return pathway;
        }
      }
    }
    return null;
  }, [pathways, programById, statusByProgramName]);

  // Resolve every step in the active pathway to a view-model with its status.
  const stepViews = useMemo<PathwayStepView[]>(() => {
    if (!activePathway) return [];
    return activePathway.steps.map((step) => {
      const program = programById.get(step.programId) ?? null;
      const key = program ? normalize(program.name) : "";
      const lookup = statusByProgramName.get(key);
      return {
        ...step,
        program,
        status: lookup?.status ?? "upcoming",
        progressPct: lookup?.progressPct,
      };
    });
  }, [activePathway, programById, statusByProgramName]);

  if (!activePathway || stepViews.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-linear-to-br from-indigo-50/50 via-white to-white p-3.5 shadow-sm">
      <header className="mb-3 flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <Route className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold tracking-wider text-indigo-700 uppercase">
            Pathway Journey
          </h4>
          <p className="mt-0.5 text-base font-semibold text-slate-800">
            {activePathway.name}
          </p>
          {activePathway.description && (
            <p className="text-muted-foreground mt-0.5 text-[11.5px]/relaxed">
              {activePathway.description}
            </p>
          )}
        </div>
      </header>

      {/* Step bar — horizontal scroll on mobile, fits inline on desktop. */}
      <ol className="-mx-1 flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-x-visible">
        {stepViews.map((step, idx) => (
          <li
            key={`${activePathway.id}-${idx}`}
            className="flex min-w-[220px] flex-1 snap-start items-center gap-1.5 sm:min-w-0"
          >
            <PathwayStepNode
              step={step}
              index={idx}
              petName={petName}
              allSeries={allSeries}
            />
            {idx < stepViews.length - 1 && <StepConnector />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepConnector() {
  return (
    <div className="hidden h-[2px] min-w-4 flex-1 bg-linear-to-r from-slate-200 to-slate-100 sm:block" />
  );
}

function PathwayStepNode({
  step,
  index,
  petName,
  allSeries,
}: {
  step: PathwayStepView;
  index: number;
  petName: string;
  allSeries: TrainingSeries[];
}) {
  const [open, setOpen] = useState(false);
  const program = step.program;

  // Completed / current steps are non-interactive — they're status displays.
  // Upcoming steps open a popover with details + Enroll deep-link.
  const clickable = step.status === "upcoming" && !!program;

  const node = (
    <div
      className={cn(
        "group bg-card relative flex min-w-0 flex-1 flex-col gap-1 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-all",
        clickable && "cursor-pointer hover:border-indigo-300 hover:shadow-md",
        step.status === "current" &&
          "border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-200",
        step.status === "completed" && "border-emerald-200 bg-emerald-50/40",
        !program && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1.5">
        <StatusBadge status={step.status} index={index} />
        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Step {index + 1}
        </span>
        {!step.required && (
          <Badge
            variant="outline"
            className="ml-auto border-slate-200 bg-slate-50 px-1.5 py-0 text-[9.5px] font-medium text-slate-600"
          >
            Optional
          </Badge>
        )}
      </div>
      <p className="truncate text-[13px] font-semibold text-slate-800">
        {program?.name ?? "Unknown program"}
      </p>
      {step.description && (
        <p className="text-muted-foreground line-clamp-2 text-[11px]/snug">
          {step.description}
        </p>
      )}
      <StatusLine step={step} />
    </div>
  );

  if (!clickable) return node;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="min-w-0 flex-1 text-left">
          {node}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <UpcomingStepDetail
          program={program!}
          petName={petName}
          allSeries={allSeries}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function StatusBadge({ status, index }: { status: StepStatus; index: number }) {
  if (status === "completed") {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-3.5" />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white">
        <Loader2 className="size-3 animate-spin" />
      </span>
    );
  }
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-[10px] font-bold text-slate-500">
      {index + 1}
    </span>
  );
}

function StatusLine({ step }: { step: PathwayStepView }) {
  if (step.status === "completed") {
    return (
      <p className="text-[10.5px] font-semibold tracking-wider text-emerald-700 uppercase">
        Completed
      </p>
    );
  }
  if (step.status === "current") {
    return (
      <p className="text-[10.5px] font-semibold tracking-wider text-indigo-700 uppercase">
        Currently enrolled
        {typeof step.progressPct === "number" && (
          <span className="text-muted-foreground ml-1 tracking-normal normal-case">
            · {step.progressPct}%
          </span>
        )}
      </p>
    );
  }
  return (
    <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
      Upcoming
    </p>
  );
}

function UpcomingStepDetail({
  program,
  petName,
  allSeries,
  onClose,
}: {
  program: TrainingPackage;
  petName: string;
  allSeries: TrainingSeries[];
  onClose: () => void;
}) {
  const todayISO = new Date().toISOString().slice(0, 10);

  // Match by normalized name overlap — same matching rule the rest of the
  // training module uses to bridge program ↔ series.
  const matchingUpcoming = useMemo(() => {
    const target = normalize(program.name);
    return allSeries
      .filter((s) => {
        const seriesKey = normalize(s.courseTypeName);
        if (seriesKey !== target) return false;
        return s.startDate >= todayISO;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [allSeries, program.name, todayISO]);

  void onClose;

  return (
    <div className="space-y-3 p-3">
      <div>
        <p className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
          Up next for {petName}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          {program.name}
        </p>
        {program.description && (
          <p className="text-muted-foreground mt-1 text-[12px]/relaxed">
            {program.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10.5px]">
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700"
        >
          {program.sessions} sessions
        </Badge>
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700"
        >
          ${program.price}
        </Badge>
        {program.classType === "group" && program.maxGroupSize && (
          <Badge
            variant="outline"
            className="gap-1 border-slate-200 bg-slate-50 text-slate-700"
          >
            <Users className="size-3" />
            Max {program.maxGroupSize}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 border-t pt-2.5">
        <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
          <CalendarClock className="size-3" />
          Available series
        </p>
        {matchingUpcoming.length === 0 ? (
          <p className="text-muted-foreground text-[11.5px] italic">
            No upcoming series scheduled — tap Enroll to join the waitlist or
            see future dates.
          </p>
        ) : (
          <ul className="space-y-1">
            {matchingUpcoming.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-slate-50/40 px-2 py-1.5 text-[11.5px]"
              >
                <span className="min-w-0 truncate text-slate-700">
                  {formatStartLabel(s.startDate)} · {s.instructorName}
                </span>
                <span className="text-muted-foreground shrink-0 text-[10.5px]">
                  {s.startTime}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button asChild size="sm" className="w-full gap-1">
        <Link
          href={`/customer/bookings/new?service=training&program=${encodeURIComponent(program.id)}`}
        >
          Enroll {petName}
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function formatStartLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
