"use client";

import { useState } from "react";
import type { DragEvent } from "react";

/**
 * Lightweight native HTML5 drag-to-reorder for a vertical list. The drag is
 * initiated from a dedicated handle (so inputs in the row stay usable); the row
 * itself is the drop target.
 */
export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function getHandleProps(index: number) {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setFrom(index);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => {
        setFrom(null);
        setOver(null);
      },
    };
  }

  function getRowProps(index: number) {
    return {
      onDragEnter: () => setOver(index),
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (from !== null && from !== index) onReorder(from, index);
        setFrom(null);
        setOver(null);
      },
    };
  }

  return { getHandleProps, getRowProps, from, over };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
