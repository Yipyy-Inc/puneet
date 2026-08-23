"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  PenLine,
  Plus,
  Users,
} from "lucide-react";
import {
  chorelistQueries,
  useGenerateTasks,
  useUpdateGroup,
  type TaskGroupRow,
  type TaskGroupScope,
} from "@/lib/api/task-groups";
import { NewTaskGroupDialog } from "./NewTaskGroupDialog";

// ============================================================================
// Chore groups — one component for both the shift tab and the position tab.
//
// ── THEY DIFFER ONLY IN WHAT THEY TARGET ──────────────────────────────────
//
// A shift group names a daypart; a position group names a department. The
// fixture had two near-identical 340-line components and the drift had already
// started — one showed a day-of-week strip and the other did not, for no reason
// anybody could state.
//
// ── "GENERATE TODAY" IS THE POINT OF THE WHOLE TAB ────────────────────────
//
// The fixture's groups generated nothing, so both tabs listed sets of chores
// nobody was ever asked to do. Pressing this writes real tasks onto the board,
// and pressing it twice writes nothing the second time — the dedup index sees
// the same group, date and chore.
//
// So the button reports what it ACTUALLY did: "6 tasks added" or "already
// generated for today". Those are different facts and a person acts on them
// differently.
// ============================================================================

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function GroupCard({ group }: { group: TaskGroupRow }) {
  const [expanded, setExpanded] = useState(false);
  const update = useUpdateGroup();
  const generate = useGenerateTasks();

  const chores = group.items.map((item) => item.definition).filter(Boolean);
  const activeChores = chores.filter((c) => c?.isActive);

  const totalMinutes = activeChores.reduce(
    (sum, c) => sum + (c?.estimatedMinutes ?? 0),
    0,
  );

  return (
    <div
      className={cn(
        "bg-card rounded-xl border",
        !group.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{group.name}</span>
              {group.scope === "shift" ? (
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-[10px]"
                >
                  <Clock className="size-3" />
                  {SHIFT_LABELS[group.shiftKey ?? ""] ?? group.shiftKey}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-[10px]"
                >
                  <Users className="size-3" />
                  {group.departmentName ?? "Department"}
                </Badge>
              )}
              {!group.isRecurring && group.specificDate && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0 text-[10px] text-amber-700"
                >
                  one-off · {group.specificDate}
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-muted-foreground text-xs">
                {group.description}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {activeChores.length} chore
              {activeChores.length === 1 ? "" : "s"}
              {totalMinutes > 0 && ` · about ${totalMinutes} min`}
              {chores.length !== activeChores.length &&
                ` · ${chores.length - activeChores.length} retired`}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={group.isActive}
            disabled={update.isPending}
            aria-label={
              group.isActive ? "Retire this group" : "Restore this group"
            }
            onCheckedChange={(next) =>
              update.mutate(
                { id: group.id, isActive: next },
                {
                  onSuccess: () =>
                    toast.success(next ? "Group restored" : "Group retired"),
                  onError: (err) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Could not save that.",
                    ),
                },
              )
            }
          />
        </div>
      </div>

      {group.isRecurring && (
        <div className="flex items-center gap-1 px-4 pb-3 pl-10">
          {DAY_LABELS.map((label, index) => {
            // EMPTY MEANS EVERY DAY, which is what the fixture meant and what
            // the generator reads. Rendering it as "no days" would say the
            // group never runs.
            const on =
              group.daysOfWeek.length === 0 || group.daysOfWeek.includes(index);
            return (
              <span
                key={label}
                className={cn(
                  "flex size-6 items-center justify-center rounded-sm text-[10px] font-medium",
                  on
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {label}
              </span>
            );
          })}
          {group.daysOfWeek.length === 0 && (
            <span className="text-muted-foreground ml-1 text-[11px]">
              every day
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-2 border-t px-4 py-3 pl-10">
          {chores.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No chores in this group yet, so it generates nothing.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {chores.map((chore) => (
                <li key={chore!.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      !chore!.isActive && "text-muted-foreground line-through",
                    )}
                  >
                    {chore!.title}
                  </span>
                  {chore!.estimatedMinutes && (
                    <span className="text-muted-foreground text-xs">
                      {chore!.estimatedMinutes}m
                    </span>
                  )}
                  {chore!.requiresPhoto && (
                    <Camera className="text-muted-foreground size-3" />
                  )}
                  {chore!.requiresSignoff && (
                    <PenLine className="text-muted-foreground size-3" />
                  )}
                  {!chore!.isActive && (
                    <Badge variant="outline" className="px-1 py-0 text-[9px]">
                      retired — skipped
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={
                generate.isPending ||
                !group.isActive ||
                activeChores.length === 0
              }
              onClick={() =>
                generate.mutate(
                  { id: group.id, forDate: todayISO() },
                  {
                    onSuccess: (result) => {
                      // What it ACTUALLY did. "Already generated" and "6 added"
                      // are different facts and a person acts on them
                      // differently.
                      if (result.created.length === 0) {
                        toast.info("Already generated for today", {
                          description:
                            "These tasks are on the board. Pressing again changes nothing.",
                        });
                      } else {
                        toast.success(
                          `${result.created.length} task${result.created.length === 1 ? "" : "s"} added to the board`,
                        );
                      }
                    },
                    onError: (err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Could not generate those tasks.",
                      ),
                  },
                )
              }
            >
              <CalendarPlus className="size-4" />
              {generate.isPending ? "Generating…" : "Generate today's tasks"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskGroupsTab({ scope }: { scope: TaskGroupScope }) {
  const [newOpen, setNewOpen] = useState(false);
  const { data, isPending, isError, error } = useQuery(
    chorelistQueries.groups(scope),
  );

  const groups = useMemo<TaskGroupRow[]>(() => data ?? [], [data]);
  const activeCount = groups.filter((g) => g.isActive).length;

  const blurb =
    scope === "shift"
      ? "Chores owed on a given shift. An empty day strip means every day."
      : "Chores owed by everyone in a department.";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{blurb}</p>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="size-4" />
          New Group
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Groups</span>
          <span className="text-2xl font-bold">{groups.length}</span>
          <span className="text-muted-foreground text-[11px]">
            {activeCount} active
          </span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">
            Chores assigned
          </span>
          <span className="text-2xl font-bold">
            {groups.reduce((n, g) => n + g.items.length, 0)}
          </span>
          <span className="text-muted-foreground text-[11px]">
            across all groups
          </span>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-12 text-center">
          <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
          <p>Could not load these groups.</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-12 text-center">
          {scope === "shift" ? (
            <CalendarClock className="mb-4 size-10 opacity-50" />
          ) : (
            <ClipboardList className="mb-4 size-10 opacity-50" />
          )}
          <p>No groups yet.</p>
          <p className="mt-1 text-sm">
            Build one from the chore library and it will generate tasks onto the
            board.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <NewTaskGroupDialog
        scope={scope}
        open={newOpen}
        onClose={() => setNewOpen(false)}
      />
    </div>
  );
}
