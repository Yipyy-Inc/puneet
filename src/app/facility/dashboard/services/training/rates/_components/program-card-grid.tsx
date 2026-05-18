"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { trainingQueries } from "@/lib/api/training";
import type { TrainingPackage } from "@/types/training";
import { ProgramCard } from "./program-card";

interface Props {
  programs: TrainingPackage[];
  onToggleActive: (id: string) => void;
  onEdit: (program: TrainingPackage) => void;
  onDelete: (program: TrainingPackage) => void;
}

/** Stable ordering: sortOrder ascending, then alphabetical fallback for any
 *  records that haven't been ordered yet (newly created programs). */
function compareForOrder(a: TrainingPackage, b: TrainingPackage): number {
  const ao = a.sortOrder;
  const bo = b.sortOrder;
  if (ao !== undefined && bo !== undefined) return ao - bo;
  if (ao !== undefined) return -1;
  if (bo !== undefined) return 1;
  return a.name.localeCompare(b.name);
}

export function ProgramCardGrid({
  programs,
  onToggleActive,
  onEdit,
  onDelete,
}: Props) {
  const queryClient = useQueryClient();

  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());
  const { data: series = [] } = useQuery(trainingQueries.series());

  const disciplineById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );
  const programById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs],
  );

  // Sorted view — does NOT mutate the source array.
  const ordered = useMemo(
    () => [...programs].sort(compareForOrder),
    [programs],
  );

  const seriesRunByProgramId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of series) {
      if (!s.programId) continue;
      out[s.programId] = (out[s.programId] ?? 0) + 1;
    }
    return out;
  }, [series]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small activation distance so a click on the drag handle doesn't fire
      // a drag if the user just taps it. Below this they're treated as clicks.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((p) => p.id === active.id);
    const newIndex = ordered.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(ordered, oldIndex, newIndex).map(
      (p, idx): TrainingPackage => ({ ...p, sortOrder: idx + 1 }),
    );

    queryClient.setQueryData<TrainingPackage[]>(
      ["training", "packages"],
      reordered,
    );
    toast.success("Reordered — this is the new booking-page order.");
  }

  if (ordered.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ordered.map((p) => p.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((program) => {
            const prereqNames =
              program.prerequisitePackageIds
                ?.map((id) => programById.get(id)?.name)
                .filter((n): n is string => !!n) ?? [];
            return (
              <ProgramCard
                key={program.id}
                program={program}
                discipline={
                  program.disciplineId
                    ? disciplineById.get(program.disciplineId)
                    : undefined
                }
                seriesRunCount={seriesRunByProgramId[program.id] ?? 0}
                prerequisiteNames={prereqNames}
                onToggleActive={() => onToggleActive(program.id)}
                onEdit={() => onEdit(program)}
                onDelete={() => onDelete(program)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
