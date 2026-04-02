/**
 * Task notification engine — generates reminders, overdue alerts, and shift summaries.
 *
 * In production this would run server-side on a cron. For now it generates
 * notifications from the mock task data that the UI can display.
 */

import type { FacilityTask } from "@/data/facility-tasks";
import { generateAllTasksForDate } from "@/lib/booking-task-generator";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskNotificationType =
  | "reminder" // 15 min before task
  | "due_now" // task time reached
  | "overdue" // 15 min past due
  | "critical_overdue" // 30 min past due (medication)
  | "shift_summary" // start of shift
  | "shift_handoff" // end of shift
  | "escalation"; // sent to supervisor

export type TaskNotificationPriority = "low" | "medium" | "high" | "critical";

export interface TaskNotification {
  id: string;
  type: TaskNotificationType;
  priority: TaskNotificationPriority;
  title: string;
  message: string;
  taskId?: string;
  taskName?: string;
  petName?: string;
  assignedTo?: string;
  scheduledTime?: string;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
}

// ── Priority mapping ─────────────────────────────────────────────────────────

function getPriority(
  type: TaskNotificationType,
  task?: FacilityTask,
): TaskNotificationPriority {
  if (type === "critical_overdue") return "critical";
  if (type === "escalation") return "critical";
  if (type === "overdue") return "high";
  if (type === "due_now" && task?.isCritical) return "high";
  if (type === "reminder" && task?.isCritical) return "medium";
  if (type === "shift_summary") return "low";
  return "medium";
}

// ── Notification generators ──────────────────────────────────────────────────

let _notifId = 1000;
function nextId() {
  _notifId += 1;
  return `notif-${_notifId}`;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function generateTaskReminder(task: FacilityTask): TaskNotification {
  return {
    id: nextId(),
    type: "reminder",
    priority: getPriority("reminder", task),
    title: `${task.petName}'s ${task.category} due in 15 min`,
    message: `${task.name} is scheduled for ${fmtTime(task.scheduledTime)}`,
    taskId: task.id,
    taskName: task.name,
    petName: task.petName,
    assignedTo: task.assignedToName,
    scheduledTime: task.scheduledTime,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

export function generateDueNowNotification(
  task: FacilityTask,
): TaskNotification {
  return {
    id: nextId(),
    type: "due_now",
    priority: getPriority("due_now", task),
    title: `${task.name} is now due`,
    message: `${task.petName}'s ${task.category} at ${fmtTime(task.scheduledTime)} — please complete now`,
    taskId: task.id,
    taskName: task.name,
    petName: task.petName,
    assignedTo: task.assignedToName,
    scheduledTime: task.scheduledTime,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

export function generateOverdueNotification(
  task: FacilityTask,
  minutesOverdue: number,
): TaskNotification {
  const isCritical = task.isCritical && minutesOverdue >= 30;
  return {
    id: nextId(),
    type: isCritical ? "critical_overdue" : "overdue",
    priority: isCritical ? "critical" : "high",
    title: isCritical
      ? `⚠ CRITICAL: ${task.petName}'s medication is ${minutesOverdue} min overdue`
      : `${task.name} is ${minutesOverdue} min overdue`,
    message: isCritical
      ? `${task.name} was due at ${fmtTime(task.scheduledTime)}. Immediate action required.`
      : `Assigned to ${task.assignedToName ?? "unassigned"}. Was due at ${fmtTime(task.scheduledTime)}.`,
    taskId: task.id,
    taskName: task.name,
    petName: task.petName,
    assignedTo: task.assignedToName,
    scheduledTime: task.scheduledTime,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

export function generateEscalation(task: FacilityTask): TaskNotification {
  return {
    id: nextId(),
    type: "escalation",
    priority: "critical",
    title: `Escalation: ${task.name} unresolved`,
    message: `${task.petName}'s task assigned to ${task.assignedToName ?? "unassigned"} is overdue and has been escalated to management.`,
    taskId: task.id,
    taskName: task.name,
    petName: task.petName,
    assignedTo: task.assignedToName,
    scheduledTime: task.scheduledTime,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

export function generateShiftSummary(
  staffName: string,
  shiftName: string,
  tasks: FacilityTask[],
): TaskNotification {
  const byCategory = new Map<string, number>();
  for (const t of tasks) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
  }
  const breakdown = Array.from(byCategory.entries())
    .map(([cat, count]) => `${count} ${cat}`)
    .join(", ");

  return {
    id: nextId(),
    type: "shift_summary",
    priority: "low",
    title: `${shiftName} shift — ${tasks.length} tasks today`,
    message: `Hi ${staffName}, you have ${tasks.length} tasks: ${breakdown}`,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

export function generateShiftHandoff(
  staffName: string,
  shiftName: string,
  completed: number,
  total: number,
  pendingTasks: FacilityTask[],
): TaskNotification {
  const pending = pendingTasks.length;
  return {
    id: nextId(),
    type: "shift_handoff",
    priority: pending > 0 ? "medium" : "low",
    title: `End of ${shiftName} shift — ${completed}/${total} completed`,
    message:
      pending > 0
        ? `${pending} pending task${pending !== 1 ? "s" : ""} transferred to next shift: ${pendingTasks.map((t) => t.name).join(", ")}`
        : `All tasks completed. Great work, ${staffName}!`,
    createdAt: new Date().toISOString(),
    actionUrl: `/facility/dashboard/tasks`,
  };
}

// ── Generate all current notifications (mock) ────────────────────────────────

export function getAllTaskNotifications(): TaskNotification[] {
  const notifications: TaskNotification[] = [];

  // Generate tasks from all active bookings for today
  const today = new Date().toISOString().slice(0, 10);
  const allTasks = generateAllTasksForDate(today);

  // Shift summary for morning staff
  const morningTasks = allTasks.filter(
    (t) => t.shiftPeriod === "morning" && t.assignedToName === "Jessica M.",
  );
  if (morningTasks.length > 0) {
    notifications.push(
      generateShiftSummary("Jessica", "Morning", morningTasks),
    );
  }

  // Reminders for pending tasks
  for (const task of allTasks) {
    if (task.status === "pending") {
      notifications.push(generateTaskReminder(task));
    }
  }

  // Overdue notifications
  for (const task of allTasks) {
    if (task.isOverdue) {
      notifications.push(generateOverdueNotification(task, 15));
      if (task.isCritical) {
        notifications.push(generateEscalation(task));
      }
    }
  }

  // Sort by priority (critical first) then by date
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  notifications.sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );

  return notifications;
}
