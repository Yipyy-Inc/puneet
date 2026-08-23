"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CalendarDays,
  CalendarPlus,
  Clock,
  Moon,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  scheduleTemplateQueries,
  useApplyScheduleTemplate,
  useDeleteScheduleTemplate,
  useUpdateScheduleTemplate,
  type ScheduleTemplateRow,
} from "@/lib/api/schedule-templates";
import { NewScheduleTemplateDialog } from "./NewScheduleTemplateDialog";

// ============================================================================
// Schedule templates, from Postgres.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `scheduleTemplates` in `src/data/scheduling.ts`, and four buttons that
// announced work they never did: "Template created", "Template deleted",
// "Template duplicated", and — the one that mattered —
//
//   Template "X" applied as draft shifts. Review and publish when ready.
//
// Nothing was applied and there was nothing to review. The roster itself was
// real the whole time; the step from "here is our week" to "put it on the
// calendar" simply did not exist.
//
// ── APPLYING SAYS WHAT IT ACTUALLY DID ────────────────────────────────────
//
// Pressing apply twice creates the week once, so the response distinguishes
// "34 shifts added" from "already applied". Those are different facts and
// somebody acts on them differently — reporting the second as a failure would
// send a manager looking for a problem that is not there.
//
// ── THE WEEK PICKER IS A DATE, NOT A `Date` ───────────────────────────────
//
// It stays a plain "YYYY-MM-DD" string all the way to the database, which
// converts it in the FACILITY's timezone. Parsing it here would attach this
// browser's offset, and a manager working away from the site would apply
// somebody else's week.
// ============================================================================

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The Sunday on or before today, as a plain calendar string. */
function currentWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function TemplateCard({ template }: { template: ScheduleTemplateRow }) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const apply = useApplyScheduleTemplate();
  const update = useUpdateScheduleTemplate();
  const remove = useDeleteScheduleTemplate();

  const byDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const shift of template.shifts) {
      map.set(shift.dayOfWeek, (map.get(shift.dayOfWeek) ?? 0) + shift.slots);
    }
    return map;
  }, [template.shifts]);

  const overnightCount = template.shifts.filter((s) => s.endsNextDay).length;
  const openCount = template.shifts.filter((s) => s.staffId === null).length;
  const alreadyApplied = template.appliedWeeks.includes(weekStart);

  return (
    <Card className={cn(!template.isActive && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {template.name}
              {!template.isActive && (
                <Badge variant="outline" className="text-[10px]">
                  retired
                </Badge>
              )}
              {template.departmentName && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Users className="size-3" />
                  {template.departmentName}
                </Badge>
              )}
            </CardTitle>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={update.isPending}
              title={template.isActive ? "Retire this template" : "Restore it"}
              onClick={() =>
                update.mutate(
                  { id: template.id, isActive: !template.isActive },
                  {
                    onSuccess: () =>
                      toast.success(
                        template.isActive
                          ? "Template retired"
                          : "Template restored",
                      ),
                    onError: (err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Could not save that.",
                      ),
                  },
                )
              }
            >
              {template.isActive ? (
                <Archive className="size-4" />
              ) : (
                <RotateCcw className="size-4 text-emerald-600" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={remove.isPending}
              title="Delete this template. Weeks already on the calendar stay."
              onClick={() =>
                remove.mutate(template.id, {
                  onSuccess: () =>
                    toast.success("Template deleted", {
                      description:
                        "Shifts already on the calendar were left alone.",
                    }),
                  onError: (err) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Could not delete that.",
                    ),
                })
              }
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {template.shifts.length} shift
            {template.shifts.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {template.weeklyHours} h a week
          </span>
          {openCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {openCount} open
            </span>
          )}
          {overnightCount > 0 && (
            <span className="flex items-center gap-1 text-indigo-600">
              <Moon className="size-3.5" />
              {overnightCount} overnight
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {DAY_LABELS.map((label, day) => {
            const count = byDay.get(day) ?? 0;
            return (
              <span
                key={label}
                className={cn(
                  "flex min-w-11 flex-col items-center rounded-md border px-1.5 py-1",
                  count === 0 && "text-muted-foreground",
                )}
              >
                <span className="text-[10px]">{label}</span>
                <span className="text-sm font-semibold">{count}</span>
              </span>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="space-y-1">
            <Label
              htmlFor={`week-${template.id}`}
              className="text-[11px] font-normal"
            >
              Week beginning
            </Label>
            <Input
              id={`week-${template.id}`}
              type="date"
              className="w-[150px]"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </div>
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={
              apply.isPending ||
              !template.isActive ||
              template.shifts.length === 0
            }
            onClick={() =>
              apply.mutate(
                { id: template.id, weekStart },
                {
                  onSuccess: (result) => {
                    // Says what it DID. "Already applied" is a success, not a
                    // failure, and reporting it as one sends somebody hunting
                    // for a problem that is not there.
                    if (result.created === 0) {
                      toast.info("That week is already on the calendar", {
                        description:
                          "Applying again changes nothing. Edit the shifts on the schedule instead.",
                      });
                    } else {
                      toast.success(
                        `${result.created} draft shift${result.created === 1 ? "" : "s"} added`,
                        {
                          description:
                            "Review them on the schedule, then publish when you are ready.",
                        },
                      );
                    }
                  },
                  onError: (err) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Could not apply the template.",
                    ),
                },
              )
            }
          >
            <CalendarPlus className="size-4" />
            {apply.isPending ? "Applying…" : "Apply to this week"}
          </Button>

          {alreadyApplied && (
            <span className="text-muted-foreground flex items-center gap-1.5 pb-2 text-xs">
              <AlertCircle className="size-3.5" />
              Already applied
            </span>
          )}
        </div>

        {template.appliedWeeks.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Applied to {template.appliedWeeks.length} week
            {template.appliedWeeks.length === 1 ? "" : "s"}, most recently{" "}
            {template.appliedWeeks[0]}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ScheduleTemplatesPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [showRetired, setShowRetired] = useState(false);

  const { data, isPending, isError, error } = useQuery(
    scheduleTemplateQueries.all({ includeRetired: showRetired }),
  );

  const templates = useMemo<ScheduleTemplateRow[]>(() => data ?? [], [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Schedule Templates
          </h2>
          <p className="text-muted-foreground text-sm">
            The shape of a week. Applying one creates draft shifts you review
            before anybody is told they are working.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRetired((s) => !s)}>
            {showRetired ? "Active only" : "Show retired"}
          </Button>
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="size-4" />
            New Template
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-16 text-center">
          <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
          <p>Could not load the templates.</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-16 text-center">
          <CalendarDays className="mb-4 size-10 opacity-50" />
          <p>No templates yet.</p>
          <p className="mt-1 max-w-sm text-sm">
            Build the week you keep re-typing, then apply it to any week you
            like.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <NewScheduleTemplateDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
      />
    </div>
  );
}
