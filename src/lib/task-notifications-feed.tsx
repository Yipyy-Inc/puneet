"use client";

import { useSyncExternalStore } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getAllTaskNotifications,
  type TaskNotification,
} from "@/lib/task-notifications";
import type { FacilityNotification } from "@/types/facility";

/**
 * Task alerts (spec Tables 34 & 39) surfaced through the unified bell + full
 * page as category "tasks". Per Table 34 the bell only ALERTS — it does not host
 * task management; every row links back to the Task Management Center
 * (/facility/dashboard/tasks). Mapping:
 *  - reminder / due_now             → type "task_assigned" (amber, "new task")
 *  - overdue / critical / escalation → type "task_overdue"  (red / urgent)
 *  - shift_summary / shift_handoff  → skipped (digest, not a per-task alert)
 *
 * The underlying task generator hands out non-stable ids across calls, so the
 * raw alerts are built ONCE as a singleton — giving each notification a stable
 * `task-<taskId>` id shared by both surfaces. "Mark Complete" records the task
 * id in this store; the derived notification is then filtered out everywhere.
 */

const TASK_LINK = "/facility/dashboard/tasks";
const STORAGE_KEY = "yipyy-completed-task-notifications-v1";
const CHANNEL = "yipyy-completed-task-notifications-v1";

const EMPTY: FacilityNotification[] = [];

function mapType(
  t: TaskNotification["type"],
): FacilityNotification["type"] | null {
  switch (t) {
    case "reminder":
    case "due_now":
      return "task_assigned";
    case "overdue":
    case "critical_overdue":
    case "escalation":
      return "task_overdue";
    // Shift digests are not per-task alerts — the workspace owns those.
    case "shift_summary":
    case "shift_handoff":
      return null;
    default:
      return null;
  }
}

// Built once — see the note above about non-stable task ids.
let rawCache: FacilityNotification[] | null = null;
function buildRaw(): FacilityNotification[] {
  const seen = new Set<string>();
  const items: FacilityNotification[] = [];
  for (const n of getAllTaskNotifications()) {
    if (!n.taskId) continue; // only actionable, per-task alerts
    const type = mapType(n.type);
    if (!type) continue;
    // Dedup by task; an overdue alert wins over an assignment reminder.
    if (seen.has(n.taskId)) {
      if (type !== "task_overdue") continue;
      const idx = items.findIndex((i) => i.id === `task-${n.taskId}`);
      if (idx >= 0) items.splice(idx, 1);
    }
    seen.add(n.taskId);
    items.push({
      id: `task-${n.taskId}`,
      type,
      title: n.title,
      message: n.message,
      read: false,
      timestamp: n.createdAt,
      category: "tasks",
      link: n.taskId ? `${TASK_LINK}?taskId=${n.taskId}` : TASK_LINK,
    });
  }
  return items;
}
function getRaw(): FacilityNotification[] {
  if (!rawCache) rawCache = buildRaw();
  return rawCache;
}

// ── Persisted "completed" set + derived cache (System A pattern) ──────────────

let completed = new Set<string>();
let derived: FacilityNotification[] = EMPTY;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function taskIdOf(n: FacilityNotification): string {
  return n.id.slice("task-".length);
}

function recompute() {
  derived = getRaw().filter((n) => !completed.has(taskIdOf(n)));
}

function emit() {
  listeners.forEach((cb) => cb());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  } catch {
    // ignore (SSR / quota)
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) completed = new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore malformed
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    recompute();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  recompute();
  ensureChannel();
}

/** Extract the task id from a `task_*` notification's id, or null. */
export function taskIdFromNotification(
  n: Pick<FacilityNotification, "id" | "category">,
): string | null {
  if (n.category !== "tasks" || !n.id.startsWith("task-")) return null;
  return n.id.slice("task-".length);
}

/** Mark a task complete — resolves the alert in place across all surfaces. */
export function completeTaskNotification(taskId: string): void {
  ensureReady();
  if (completed.has(taskId)) return;
  completed = new Set(completed).add(taskId);
  persist();
  recompute();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function subscribe(callback: () => void): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): FacilityNotification[] {
  return derived;
}

function getServerSnapshot(): FacilityNotification[] {
  // Empty on the server + first client render (task alerts depend on the live
  // clock), then the real list loads on subscribe — keeps hydration stable.
  return EMPTY;
}

export function useTaskNotifications(): FacilityNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Inline "Mark Complete" for a task alert row. Resolves the task via the store
 * (removing the derived notification) and fires a toast — without navigating.
 * Actual task management still lives in the sidebar workspace (Table 34).
 */
export function TaskCompleteAction({ taskId }: { taskId: string }) {
  return (
    <Button
      size="sm"
      className="h-7 gap-1 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        completeTaskNotification(taskId);
        toast.success("Task marked complete");
      }}
    >
      <CheckCheck className="size-3.5" />
      Mark Complete
    </Button>
  );
}
