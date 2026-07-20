"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopyPlus,
  Eye,
  GripVertical,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  groupExercisesByDisciplineAndDifficulty,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import type { CourseCurriculumWeek } from "@/lib/training-config";

interface Props {
  /** Number of sessions to lay out (the course's defaultWeeks). */
  weeks: number;
  /** Course discipline — the exercise picker filters to this discipline. */
  disciplineId?: string;
  value: CourseCurriculumWeek[];
  onChange: (next: CourseCurriculumWeek[]) => void;
}

/** Dense, ordered working copy of one session row. `uid` is a stable drag id
 *  (the persisted `sessionNumber` is derived from array position, so it can't
 *  double as a drag key once rows are reordered). */
interface SessionRow {
  uid: string;
  theme: string;
  exerciseIds: string[];
}

/** Expand the sparse persisted curriculum into a dense array of `n` rows.
 *  Initial drag ids are deterministic (`init-N`) so seeding stays render-pure;
 *  rows appended later by the grow effect use the `grow-N` counter instead. */
function toRows(value: CourseCurriculumWeek[], n: number): SessionRow[] {
  const byNumber = new Map(value.map((w) => [w.sessionNumber, w]));
  return Array.from({ length: n }, (_, i) => {
    const w = byNumber.get(i + 1);
    return {
      uid: `init-${i}`,
      theme: w?.title ?? "",
      exerciseIds: w?.exerciseIds ? [...w.exerciseIds] : [],
    };
  });
}

/** Collapse the dense rows back to the persisted shape — position drives the
 *  1-based `sessionNumber`, and empty rows (no theme + no exercises) drop out. */
function toValue(rows: SessionRow[]): CourseCurriculumWeek[] {
  return rows
    .map((r, i) => ({
      sessionNumber: i + 1,
      title: r.theme.trim() ? r.theme.trim() : undefined,
      exerciseIds: r.exerciseIds,
    }))
    .filter((w) => (w.title?.length ?? 0) > 0 || w.exerciseIds.length > 0);
}

/**
 * Session Plan editor for the Edit Course Type modal. One row per session, each
 * with an optional theme and a list of exercises (drawn from the discipline-
 * filtered library). Rows are drag-reorderable, Session 1's exercises can be
 * copied into every later session, and a Preview renders the full plan as a
 * table. Persists into `TrainingCourseType.sessionCurriculum`, which the live
 * session Exercises step reads to pre-load each week's plan.
 */
export function CourseCurriculumEditor({
  weeks,
  disciplineId,
  value,
  onChange,
}: Props) {
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());
  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  );

  const weekCount = Math.max(1, Math.floor(weeks) || 1);

  // Monotonic id source for rows appended by the grow effect (read only inside
  // effects, never during render).
  const uidRef = useRef(0);

  const [rows, setRows] = useState<SessionRow[]>(() =>
    toRows(value, weekCount),
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  // Grow/shrink the row list when the course duration changes, preserving the
  // rows the trainer already filled in.
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === weekCount) return prev;
      if (prev.length > weekCount) return prev.slice(0, weekCount);
      const extra = Array.from({ length: weekCount - prev.length }, () => ({
        uid: `grow-${uidRef.current++}`,
        theme: "",
        exerciseIds: [] as string[],
      }));
      return [...prev, ...extra];
    });
  }, [weekCount]);

  /** Single write path — update local rows and push the persisted shape up. */
  function commit(next: SessionRow[]) {
    setRows(next);
    onChange(toValue(next));
  }

  function setTheme(uid: string, theme: string) {
    commit(rows.map((r) => (r.uid === uid ? { ...r, theme } : r)));
  }

  function toggleExercise(uid: string, exerciseId: string) {
    commit(
      rows.map((r) => {
        if (r.uid !== uid) return r;
        const has = r.exerciseIds.includes(exerciseId);
        return {
          ...r,
          exerciseIds: has
            ? r.exerciseIds.filter((id) => id !== exerciseId)
            : [...r.exerciseIds, exerciseId],
        };
      }),
    );
  }

  function removeExercise(uid: string, exerciseId: string) {
    commit(
      rows.map((r) =>
        r.uid === uid
          ? {
              ...r,
              exerciseIds: r.exerciseIds.filter((id) => id !== exerciseId),
            }
          : r,
      ),
    );
  }

  /** Merge Session 1's exercises into every later session (deduped, additive) —
   *  for a standing exercise that runs every week alongside the new material. */
  function copyFirstToRemaining() {
    const first = rows[0];
    if (!first || first.exerciseIds.length === 0) return;
    commit(
      rows.map((r, i) =>
        i === 0
          ? r
          : {
              ...r,
              exerciseIds: Array.from(
                new Set([...r.exerciseIds, ...first.exerciseIds]),
              ),
            },
      ),
    );
    toast.success(
      `Copied Session 1's exercises into ${rows.length - 1} session${
        rows.length - 1 === 1 ? "" : "s"
      }.`,
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.uid === active.id);
    const newIndex = rows.findIndex((r) => r.uid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(rows, oldIndex, newIndex));
  }

  const showCopyOption =
    weekCount > 1 && (rows[0]?.exerciseIds.length ?? 0) > 0;
  const hasAnyContent = rows.some(
    (r) => r.theme.trim().length > 0 || r.exerciseIds.length > 0,
  );

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={rows.map((r) => r.uid)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {rows.map((row, index) => (
              <SortableSessionRow
                key={row.uid}
                row={row}
                sessionNumber={index + 1}
                disciplineId={disciplineId}
                exerciseById={exerciseById}
                onThemeChange={(theme) => setTheme(row.uid, theme)}
                onToggleExercise={(exId) => toggleExercise(row.uid, exId)}
                onRemoveExercise={(exId) => removeExercise(row.uid, exId)}
                copySlot={
                  index === 0 && showCopyOption
                    ? copyFirstToRemaining
                    : undefined
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between pt-1">
        <p className="text-muted-foreground text-[11px]">
          Drag the <GripVertical className="inline size-3 align-text-bottom" />{" "}
          handle to reorder sessions.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setPreviewOpen(true)}
          disabled={!hasAnyContent}
        >
          <Eye className="size-3.5" />
          Preview
        </Button>
      </div>

      <CurriculumPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        rows={rows}
        exerciseById={exerciseById}
      />
    </div>
  );
}

// ============================================================================
// Session row (sortable)
// ============================================================================

function SortableSessionRow({
  row,
  sessionNumber,
  disciplineId,
  exerciseById,
  onThemeChange,
  onToggleExercise,
  onRemoveExercise,
  copySlot,
}: {
  row: SessionRow;
  sessionNumber: number;
  disciplineId?: string;
  exerciseById: Map<string, TrainingExerciseDef>;
  onThemeChange: (theme: string) => void;
  onToggleExercise: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  /** When provided (Session 1, exercises present), renders the
   *  "Copy to all remaining sessions" affordance under this row. */
  copySlot?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card space-y-2 rounded-lg border p-3",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
          aria-label={`Reorder session ${sessionNumber}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-bold text-indigo-700 tabular-nums">
          {sessionNumber}
        </span>
        <Input
          value={row.theme}
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder="Session theme (optional) — e.g. Foundation commands"
          className="h-8"
        />
        <ExerciseMultiPicker
          disciplineId={disciplineId}
          selectedIds={row.exerciseIds}
          onToggle={onToggleExercise}
        />
      </div>

      {row.exerciseIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-8">
          {row.exerciseIds.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {exerciseById.get(id)?.name ?? id}
              <button
                type="button"
                onClick={() => onRemoveExercise(id)}
                className="hover:text-destructive ml-0.5"
                aria-label={`Remove ${exerciseById.get(id)?.name ?? id}`}
              >
                <XCircle className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {copySlot && (
        <div className="pl-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-indigo-700 hover:text-indigo-800"
            onClick={copySlot}
          >
            <CopyPlus className="size-3.5" />
            Copy to all remaining sessions
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exercise multi-select picker (discipline-filtered)
// ============================================================================

function ExerciseMultiPicker({
  disciplineId,
  selectedIds,
  onToggle,
}: {
  disciplineId?: string;
  selectedIds: string[];
  onToggle: (exerciseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: exercises = [] } = useQuery(trainingQueries.exercises());
  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());

  const grouped = useMemo(
    () => groupExercisesByDisciplineAndDifficulty(exercises),
    [exercises],
  );
  const disciplineName = useMemo(() => {
    const m = new Map(disciplines.map((d) => [d.id, d.name]));
    return (id: string) => m.get(id) ?? "Other";
  }, [disciplines]);

  // Filtered to the course's discipline when set; otherwise every discipline,
  // alpha-sorted.
  const visibleDisciplineIds = useMemo(() => {
    if (disciplineId) return grouped[disciplineId] ? [disciplineId] : [];
    return Object.keys(grouped).sort((a, b) =>
      disciplineName(a).localeCompare(disciplineName(b)),
    );
  }, [grouped, disciplineId, disciplineName]);

  const ql = query.trim().toLowerCase();
  const matches = (name: string) => !ql || name.toLowerCase().includes(ql);

  const anyMatches = visibleDisciplineIds.some((discId) =>
    DIFFICULTY_LEVELS.some((level) =>
      (grouped[discId]?.[level] ?? []).some((e) => matches(e.name)),
    ),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5"
        >
          <Plus className="size-3.5" />
          Add exercises
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1">
            {visibleDisciplineIds.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                No exercises in this discipline yet. Add some in Settings →
                Exercise Library.
              </p>
            ) : !anyMatches ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                No matching exercises.
              </p>
            ) : (
              visibleDisciplineIds.map((discId) => {
                const tiers = grouped[discId];
                if (!tiers) return null;
                const tierBlocks = DIFFICULTY_LEVELS.map((level) => ({
                  level,
                  list: (tiers[level] ?? []).filter((e) => matches(e.name)),
                })).filter((b) => b.list.length > 0);
                if (tierBlocks.length === 0) return null;
                return (
                  <div key={discId} className="pb-1">
                    {!disciplineId && (
                      <div className="text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
                        {disciplineName(discId)}
                      </div>
                    )}
                    {tierBlocks.map(({ level, list }) => (
                      <div key={level}>
                        <div className="text-muted-foreground px-2 pt-1 text-[9px] font-bold tracking-wider uppercase">
                          {DIFFICULTY_LABELS[level]}
                        </div>
                        {list.map((e) => {
                          const checked = selectedIds.includes(e.id);
                          return (
                            <button
                              type="button"
                              key={e.id}
                              onClick={() => onToggle(e.id)}
                              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                className="pointer-events-none"
                                tabIndex={-1}
                              />
                              <span>{e.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between border-t p-2">
          <span className="text-muted-foreground text-[11px]">
            {selectedIds.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Preview dialog
// ============================================================================

function CurriculumPreviewDialog({
  open,
  onOpenChange,
  rows,
  exerciseById,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: SessionRow[];
  exerciseById: Map<string, TrainingExerciseDef>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Plan preview</DialogTitle>
          <DialogDescription>
            The full curriculum, in teaching order. Review before saving.
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Session</TableHead>
              <TableHead className="w-44">Theme</TableHead>
              <TableHead>Exercises</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.uid}>
                <TableCell className="font-semibold tabular-nums">
                  {i + 1}
                </TableCell>
                <TableCell>
                  {row.theme.trim() ? (
                    row.theme.trim()
                  ) : (
                    <span className="text-muted-foreground italic">
                      No theme
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.exerciseIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.exerciseIds.map((id) => (
                        <Badge key={id} variant="secondary">
                          {exerciseById.get(id)?.name ?? id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">
                      No exercises planned
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
