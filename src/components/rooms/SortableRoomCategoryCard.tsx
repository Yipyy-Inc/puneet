"use client";

import type { ComponentProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RoomCategoryCard } from "@/components/rooms/RoomCategoryCard";
import { useStaffText } from "@/lib/staff/use-staff-text";

type Props = Omit<ComponentProps<typeof RoomCategoryCard>, "dragHandle">;

/**
 * A kennel class card that can be dragged into place.
 *
 * The handle is always there, never revealed on hover (§6 rule 11: two of the
 * three contexts have no hover), and it is a real icon button, so it takes the
 * 40/48px target every control does and is reachable by keyboard — the list
 * uses dnd-kit's keyboard sensor, as the daily-care steps do.
 */
export function SortableRoomCategoryCard(props: Props) {
  const { fill } = useStaffText("roomsOrder");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.category.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging}
      className="relative data-[dragging=true]:z-(--z-sticky)"
    >
      <RoomCategoryCard
        {...props}
        dragHandle={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            aria-label={fill("handle", { name: props.category.name })}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
