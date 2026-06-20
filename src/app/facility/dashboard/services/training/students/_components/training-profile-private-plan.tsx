"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PawPrint, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trainingQueries } from "@/lib/api/training";
import {
  getEffectiveCurriculumStyle,
  TRAINING_CLASS_FORMAT_LABELS,
  type CourseCurriculumWeek,
} from "@/lib/training-config";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import { CourseCurriculumEditor } from "../../courses/_components/course-curriculum-editor";

interface Props {
  petId: number;
  petName: string;
}

/**
 * Dog-specific Custom Session Plan builder.
 *
 * Adaptive courses (Private 1-on-1, Reactive Rover, etc.) carry no course-level
 * session plan — the curriculum follows the individual dog. This card lets the
 * trainer build a structured, week-by-week plan for THIS dog. It's stored per
 * pet (not per course type) and pre-loads the live session when this dog is in
 * a 1-on-1 session. Only shown when the pet has an adaptive enrollment.
 */
export function TrainingProfilePrivatePlan({ petId, petName }: Props) {
  const queryClient = useQueryClient();
  const { data: allEnrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: courseTypes = [] } = useQuery(trainingQueries.allCourseTypes());
  const { data: plan = [] } = useQuery(
    trainingQueries.privateSessionPlanForPet(petId),
  );

  const courseTypeById = useMemo(
    () => new Map(courseTypes.map((c) => [c.id, c])),
    [courseTypes],
  );

  // The dog's primary adaptive enrollment — active first, then most recent.
  // Adaptive courses are the only ones that benefit from a dog-specific plan;
  // structured courses already pre-load their course curriculum.
  const adaptiveEnrollment = useMemo<TrainingEnrollment | null>(() => {
    const mine = allEnrollments.filter((e) => {
      if (e.petId !== petId) return false;
      const course = courseTypeById.get(e.courseTypeId);
      return !!course && getEffectiveCurriculumStyle(course) === "adaptive";
    });
    if (mine.length === 0) return null;
    const sorted = [...mine].sort((a, b) => {
      if (a.status === "enrolled" && b.status !== "enrolled") return -1;
      if (b.status === "enrolled" && a.status !== "enrolled") return 1;
      return a.enrollmentDate < b.enrollmentDate ? 1 : -1;
    });
    return sorted[0] ?? null;
  }, [allEnrollments, petId, courseTypeById]);

  if (!adaptiveEnrollment) return null;

  const course = courseTypeById.get(adaptiveEnrollment.courseTypeId);
  const weeks = adaptiveEnrollment.totalSessions || course?.defaultWeeks || 6;
  const formatLabel = course?.classFormat
    ? TRAINING_CLASS_FORMAT_LABELS[course.classFormat]
    : "Adaptive";

  function writePlan(next: CourseCurriculumWeek[]) {
    queryClient.setQueryData<CourseCurriculumWeek[]>(
      trainingQueries.privateSessionPlanForPet(petId).queryKey,
      next,
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b bg-violet-50/60 px-4 py-3 dark:bg-violet-950/20">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
          <PawPrint className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Custom Session Plan
            </p>
            <Badge
              variant="outline"
              className="gap-1 border-violet-200 bg-violet-50 text-[10px] text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200"
            >
              <Sparkles className="size-3" />
              {formatLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {adaptiveEnrollment.courseTypeName} is adaptive — no fixed course
            plan. Build a session-by-session plan tailored to {petName}. This
            private curriculum follows the dog (not the course) and pre-loads
            the live session when {petName} is in a 1-on-1 session.
          </p>
        </div>
      </div>
      <div className="p-4">
        <CourseCurriculumEditor
          weeks={weeks}
          disciplineId={course?.disciplineId || undefined}
          value={plan}
          onChange={writePlan}
        />
      </div>
    </Card>
  );
}
