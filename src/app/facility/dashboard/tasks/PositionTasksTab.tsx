"use client";

import { TaskGroupsTab } from "./TaskGroupsTab";

// See the note in ShiftTasksTab: one component, two targets.
export function PositionTasksTab() {
  return <TaskGroupsTab scope="position" />;
}
