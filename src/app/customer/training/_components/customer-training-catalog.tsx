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
  Check,
  ImageIcon,
  Inbox,
  Lock,
  Star,
  User2,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { SKILL_LEVEL_LABELS } from "@/types/training";
import type { TrainingPackage } from "@/types/training";
import type { TrainingSeries } from "@/lib/training-series";
import { hexToRgba } from "@/lib/color-utils";

interface Props {
  series: TrainingSeries[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCourse: (course: TrainingPackage) => void;
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
  onSelectCourse,
}: Props) {
  const { data: packages = [] } = useQuery(trainingQueries.packages());
  const { data: disciplines = [] } = useQuery(
    trainingQueries.disciplines(),
  );

  const disciplineById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );

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
            const hasPrereqs =
              (course.prerequisitePackageIds?.length ?? 0) > 0;
            return (
              <li key={course.id}>
                <CourseCard
                  course={course}
                  disciplineName={discipline?.name}
                  disciplineColor={discipline?.color}
                  upcomingCount={upcoming.length}
                  hasPrereqs={hasPrereqs}
                  onSelect={() => onSelectCourse(course)}
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
  upcomingCount,
  hasPrereqs,
  onSelect,
}: {
  course: TrainingPackage;
  disciplineName?: string;
  disciplineColor?: string;
  upcomingCount: number;
  hasPrereqs: boolean;
  onSelect: () => void;
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
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
              title="This course has prerequisite programs"
            >
              <Lock className="size-3" />
              Prereqs apply
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

        <div className="flex flex-col items-stretch gap-2">
          <Button onClick={onSelect} className="gap-1">
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
