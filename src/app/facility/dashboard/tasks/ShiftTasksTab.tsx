"use client";

import { TaskGroupsTab } from "./TaskGroupsTab";

// Shift and position groups differ only in what they target, so they share one
// component. The fixture had two near-identical 340-line files and the drift
// had already begun: one rendered a day-of-week strip and the other did not,
// for no reason anybody could state.
export function ShiftTasksTab() {
  return <TaskGroupsTab scope="shift" />;
}
