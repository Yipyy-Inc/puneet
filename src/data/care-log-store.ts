import type { TaskExecution } from "@/types/care-log";

// ============================================================================
// Care log store — single source of truth for task executions across the
// Daily Care List (facility-wide) and the Guest Journal (per-reservation).
// Both screens subscribe; logging from either writes here, and both re-render.
//
// This is a mock client-side store. Swap getSnapshot/log to a real API when
// the backend exists; the subscribe contract stays the same.
// ============================================================================

type Listener = () => void;

const SEED_EXECUTIONS: TaskExecution[] = [
  // Buddy (bg-001) — 4 days of historical logs to demo the journal
  {
    id: "exec-bg001-d1-potty-1",
    taskId: "potty-bg-001-step-morning-potty",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "potty",
    date: "2026-04-22",
    executedAt: "06:15",
    staffInitials: "JS",
    outcome: "both",
  },
  {
    id: "exec-bg001-d1-feed-1",
    taskId: "feed-bg-001-07:30",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "feeding",
    date: "2026-04-22",
    executedAt: "07:50",
    servedAt: "07:35",
    staffInitials: "JS",
    outcome: "ate_all",
  },
  {
    id: "exec-bg001-d1-med-1",
    taskId: "med-bg-001-med-001-08:00",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "medication",
    date: "2026-04-22",
    executedAt: "08:05",
    staffInitials: "JS",
    outcome: "administered",
    notes: "Hidden in pill pocket, no resistance",
  },
  {
    id: "exec-bg001-d2-potty-1",
    taskId: "potty-bg-001-step-morning-potty",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "potty",
    date: "2026-04-23",
    executedAt: "06:10",
    staffInitials: "MK",
    outcome: "pee",
  },
  {
    id: "exec-bg001-d2-feed-1",
    taskId: "feed-bg-001-07:30",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "feeding",
    date: "2026-04-23",
    executedAt: "07:55",
    servedAt: "07:40",
    staffInitials: "MK",
    outcome: "ate_half",
    notes: "Less interested today",
  },
  {
    id: "exec-bg001-d2-med-1",
    taskId: "med-bg-001-med-001-08:00",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "medication",
    date: "2026-04-23",
    executedAt: "08:10",
    staffInitials: "MK",
    outcome: "administered",
  },
  {
    id: "exec-bg001-d3-potty-1",
    taskId: "potty-bg-001-step-morning-potty",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "potty",
    date: "2026-04-24",
    executedAt: "06:20",
    staffInitials: "JS",
    outcome: "soft_stool",
    notes: "Watch closely — soft stool noted",
  },
  {
    id: "exec-bg001-d3-feed-1",
    taskId: "feed-bg-001-07:30",
    guestId: "bg-001",
    bookingId: "bk-001",
    taskType: "feeding",
    date: "2026-04-24",
    executedAt: "08:00",
    servedAt: "07:35",
    staffInitials: "JS",
    outcome: "ate_all",
  },
];

let executions: TaskExecution[] = [...SEED_EXECUTIONS];
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

export const careLogStore = {
  getSnapshot(): TaskExecution[] {
    return executions;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  log(entry: Omit<TaskExecution, "id">): TaskExecution {
    const record: TaskExecution = {
      ...entry,
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    executions = [...executions, record];
    notify();
    return record;
  },

  getForGuest(guestId: string): TaskExecution[] {
    return executions.filter((e) => e.guestId === guestId);
  },

  getForBooking(bookingId: string): TaskExecution[] {
    return executions.filter((e) => e.bookingId === bookingId);
  },

  getForDate(date: string): TaskExecution[] {
    return executions.filter((e) => e.date === date);
  },

  /** Find an execution that matches a scheduled task on a given date */
  findForTask(taskId: string, date: string): TaskExecution | undefined {
    return executions.find((e) => e.taskId === taskId && e.date === date);
  },
};
