import type { StaffProfile } from "@/types/facility-staff";
import { standaloneTasks } from "@/data/work-tasks";
import { shiftTasks } from "@/data/staff-availability";
import { incidents } from "@/data/incidents";

/**
 * Aggregates every OPEN task assigned to one staff member across the three
 * existing task stores, so the manager sees the full picture on the profile:
 *  - shift tasks    → `shiftTasks` (staff-availability), keyed by `fs-*` id
 *  - standalone     → `standaloneTasks` (work-tasks), incl. call follow-ups
 *  - incident tasks → `incidents[].followUpTasks`, keyed by assignee NAME
 *
 * The stores don't share an id scheme (shift tasks + profiles use `fs-*`;
 * standalone + incident tasks reference the assignee by name), so matching
 * falls back to a name bridge ("Sophie Laurent" / "Sophie L.").
 */

export type StaffTaskSource = "shift" | "standalone" | "incident";
export type StaffTaskPriority = "urgent" | "high" | "medium" | "low";

export interface StaffOpenTask {
  id: string;
  source: StaffTaskSource;
  title: string;
  description?: string;
  priority?: StaffTaskPriority;
  /** ISO date or datetime this task is due. */
  dueDate?: string;
  /** Short origin context, e.g. "Incident INC-001" or "Morning shift". */
  context?: string;
}

const OPEN_STATUSES = new Set(["pending", "in_progress"]);
const PRIORITY_RANK: Record<StaffTaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const fullName = (s: StaffProfile) => `${s.firstName} ${s.lastName}`.trim();
const shortName = (s: StaffProfile) =>
  s.lastName ? `${s.firstName} ${s.lastName.charAt(0)}.` : s.firstName;

function normalizePriority(v: string): StaffTaskPriority | undefined {
  return v === "urgent" || v === "high" || v === "medium" || v === "low"
    ? v
    : undefined;
}

export function getOpenTasksForStaff(staff: StaffProfile): StaffOpenTask[] {
  const full = fullName(staff);
  const short = shortName(staff);
  const nameMatches = (assignee: string | null | undefined) =>
    assignee != null &&
    (assignee === staff.id || assignee === full || assignee === short);

  const tasks: StaffOpenTask[] = [];

  // 1. Shift tasks — clean `fs-*` id match.
  for (const t of shiftTasks) {
    if (t.assignedToStaffId !== staff.id || !OPEN_STATUSES.has(t.status)) {
      continue;
    }
    tasks.push({
      id: `shift-${t.id}`,
      source: "shift",
      title: t.taskName,
      description: t.description,
      priority: normalizePriority(t.priority),
      dueDate: t.scheduleDate,
      context:
        t.shiftStartTime && t.shiftEndTime
          ? `${t.shiftStartTime}–${t.shiftEndTime} shift`
          : "Shift task",
    });
  }

  // 2. Standalone tasks — id or name bridge (includes call follow-ups).
  for (const t of standaloneTasks) {
    const mine = t.assignedToId === staff.id || nameMatches(t.assignedToName);
    if (!mine || !OPEN_STATUSES.has(t.status)) continue;
    tasks.push({
      id: `standalone-${t.id}`,
      source: "standalone",
      title: t.title,
      description: t.description,
      priority: normalizePriority(t.priority),
      dueDate: t.dueDate,
      context: t.callLogId ? "Call follow-up" : undefined,
    });
  }

  // 3. Incident follow-up tasks — assignee is a name.
  for (const inc of incidents) {
    for (const f of inc.followUpTasks) {
      if (!nameMatches(f.assignedTo) || !OPEN_STATUSES.has(f.status)) continue;
      tasks.push({
        id: `incident-${f.id}`,
        source: "incident",
        title: f.title,
        description: f.description,
        dueDate: f.dueDate,
        context: `Incident ${f.incidentId}`,
      });
    }
  }

  // Urgent first, then by soonest due date.
  return tasks.sort((a, b) => {
    const pr =
      PRIORITY_RANK[a.priority ?? "medium"] -
      PRIORITY_RANK[b.priority ?? "medium"];
    if (pr !== 0) return pr;
    return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  });
}
