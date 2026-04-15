/**
 * Schedule audit & compliance log.
 * Every change is logged:
 * - Shift create / update / delete
 * - Shift assign / unassign / move / copy
 * - Schedule publish (draft → published) and discard
 * - Open shift posted / claimed
 */

import type {
  ScheduleAuditAction,
  ScheduleAuditEntry,
} from "@/types/scheduling";

export type {
  ScheduleAuditAction,
  ScheduleAuditEntry,
} from "@/types/scheduling";

const FACILITY_ID = 11;

const auditLog: ScheduleAuditEntry[] = [
  // ─── Seed data — realistic entries for demo ───────────────────
  {
    id: "sa-seed-001",
    timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    action: "shift_created",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-1",
    shiftDate: "2026-04-08",
    shiftTimeRange: "08:00 – 16:00",
    positionId: "pos-2",
    positionName: "Kennel Tech",
    employeeId: "emp-2",
    employeeName: "Mike Chen",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "sa-seed-002",
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    action: "schedule_published",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
    count: 24,
    metadata: { weekStart: "2026-04-06" },
  },
  {
    id: "sa-seed-003",
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    action: "shift_updated",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-2",
    shiftDate: "2026-04-10",
    shiftTimeRange: "09:00 – 17:00",
    positionId: "pos-1",
    positionName: "Receptionist",
    employeeId: "emp-1",
    employeeName: "Sarah Johnson",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
    changes: [
      { field: "Start time", oldValue: "08:00", newValue: "09:00" },
      { field: "End time", oldValue: "16:00", newValue: "17:00" },
    ],
  },
  {
    id: "sa-seed-004",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "shift_moved",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-3",
    shiftDate: "2026-04-11",
    shiftTimeRange: "12:00 – 20:00",
    positionId: "pos-3",
    positionName: "Groomer",
    employeeId: "emp-3",
    employeeName: "Emily Davis",
    previousEmployeeId: "emp-4",
    previousEmployeeName: "David Wilson",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
    changes: [
      {
        field: "Date",
        oldValue: "2026-04-10",
        newValue: "2026-04-11",
      },
      {
        field: "Assigned to",
        oldValue: "David Wilson",
        newValue: "Emily Davis",
      },
    ],
  },
  {
    id: "sa-seed-005",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    action: "open_shift_posted",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-4",
    shiftDate: "2026-04-15",
    shiftTimeRange: "14:00 – 22:00",
    positionId: "pos-2",
    positionName: "Kennel Tech",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "sa-seed-006",
    timestamp: new Date(
      Date.now() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    ).toISOString(),
    action: "open_shift_claimed",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-4",
    shiftDate: "2026-04-15",
    shiftTimeRange: "14:00 – 22:00",
    positionId: "pos-2",
    positionName: "Kennel Tech",
    employeeId: "emp-5",
    employeeName: "Alex Tremblay",
    actorId: "emp-5",
    actorName: "Alex Tremblay",
    actorType: "employee",
  },
  {
    id: "sa-seed-007",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action: "shift_deleted",
    facilityId: FACILITY_ID,
    departmentId: "dept-2",
    departmentName: "Ruby Cafe MTL",
    shiftId: "shift-seed-5",
    shiftDate: "2026-04-12",
    shiftTimeRange: "06:00 – 14:00",
    positionId: "pos-8",
    positionName: "Barista",
    employeeId: "emp-7",
    employeeName: "Olivia Martin",
    actorId: "user-103",
    actorName: "Emily Chen",
    actorType: "staff",
  },
  {
    id: "sa-seed-008",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    action: "shift_assigned",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-6",
    shiftDate: "2026-04-13",
    shiftTimeRange: "10:00 – 18:00",
    positionId: "pos-5",
    positionName: "Supervisor",
    employeeId: "emp-1",
    employeeName: "Sarah Johnson",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "sa-seed-009",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action: "schedule_published",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
    count: 31,
    metadata: { weekStart: "2026-04-13" },
  },
  {
    id: "sa-seed-010",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    action: "shift_unassigned",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-7",
    shiftDate: "2026-04-16",
    shiftTimeRange: "08:00 – 16:00",
    positionId: "pos-2",
    positionName: "Kennel Tech",
    previousEmployeeId: "emp-2",
    previousEmployeeName: "Mike Chen",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
  },
  {
    id: "sa-seed-011",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    action: "shift_copied",
    facilityId: FACILITY_ID,
    departmentId: "dept-1",
    departmentName: "Doggieville MTL",
    shiftId: "shift-seed-8",
    shiftDate: "2026-04-17",
    shiftTimeRange: "09:00 – 17:00",
    positionId: "pos-1",
    positionName: "Receptionist",
    employeeId: "emp-1",
    employeeName: "Sarah Johnson",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "sa-seed-012",
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    action: "draft_discarded",
    facilityId: FACILITY_ID,
    departmentId: "dept-2",
    departmentName: "Ruby Cafe MTL",
    actorId: "user-103",
    actorName: "Emily Chen",
    actorType: "staff",
    count: 7,
  },
];

function nextId(): string {
  return `sa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function log(
  entry: Omit<ScheduleAuditEntry, "id" | "timestamp">,
): ScheduleAuditEntry {
  const full: ScheduleAuditEntry = {
    ...entry,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

// ─── Convenience loggers ─────────────────────────────────────────────

interface ShiftContext {
  facilityId?: number;
  departmentId?: string;
  departmentName?: string;
  shiftId?: string;
  shiftDate?: string;
  shiftTimeRange?: string;
  positionId?: string;
  positionName?: string;
  employeeId?: string;
  employeeName?: string;
  actorId?: string | number;
  actorName?: string;
  actorType?: "staff" | "system" | "employee";
  metadata?: Record<string, unknown>;
}

export function logShiftCreated(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "shift_created",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftUpdated(
  ctx: ShiftContext & {
    changes: { field: string; oldValue: string; newValue: string }[];
  },
): ScheduleAuditEntry {
  return log({
    action: "shift_updated",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftDeleted(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "shift_deleted",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftAssigned(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "shift_assigned",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftUnassigned(
  ctx: ShiftContext & { previousEmployeeId?: string; previousEmployeeName?: string },
): ScheduleAuditEntry {
  return log({
    action: "shift_unassigned",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftMoved(
  ctx: ShiftContext & {
    previousEmployeeId?: string;
    previousEmployeeName?: string;
    changes?: { field: string; oldValue: string; newValue: string }[];
  },
): ScheduleAuditEntry {
  return log({
    action: "shift_moved",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logShiftCopied(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "shift_copied",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logSchedulePublished(params: {
  facilityId?: number;
  departmentId: string;
  departmentName: string;
  count: number;
  weekStart?: string;
  actorId?: string | number;
  actorName?: string;
}): ScheduleAuditEntry {
  return log({
    action: "schedule_published",
    facilityId: params.facilityId ?? FACILITY_ID,
    departmentId: params.departmentId,
    departmentName: params.departmentName,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    count: params.count,
    metadata: params.weekStart ? { weekStart: params.weekStart } : undefined,
  });
}

export function logDraftDiscarded(params: {
  facilityId?: number;
  departmentId: string;
  departmentName: string;
  count: number;
  actorId?: string | number;
  actorName?: string;
}): ScheduleAuditEntry {
  return log({
    action: "draft_discarded",
    facilityId: params.facilityId ?? FACILITY_ID,
    departmentId: params.departmentId,
    departmentName: params.departmentName,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    count: params.count,
  });
}

export function logOpenShiftPosted(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "open_shift_posted",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "staff",
  });
}

export function logOpenShiftClaimed(ctx: ShiftContext): ScheduleAuditEntry {
  return log({
    action: "open_shift_claimed",
    facilityId: ctx.facilityId ?? FACILITY_ID,
    ...ctx,
    actorType: ctx.actorType ?? "employee",
  });
}

// ─── Query ────────────────────────────────────────────────────────────

export interface ScheduleAuditFilters {
  facilityId?: number;
  departmentId?: string;
  shiftId?: string;
  employeeId?: string;
  action?: ScheduleAuditAction;
  from?: string;
  to?: string;
}

export function getScheduleAuditLog(
  filters?: ScheduleAuditFilters,
): ScheduleAuditEntry[] {
  let list = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  if (filters?.facilityId != null)
    list = list.filter((e) => e.facilityId === filters.facilityId);
  if (filters?.departmentId)
    list = list.filter((e) => e.departmentId === filters.departmentId);
  if (filters?.shiftId)
    list = list.filter((e) => e.shiftId === filters.shiftId);
  if (filters?.employeeId)
    list = list.filter((e) => e.employeeId === filters.employeeId);
  if (filters?.action) list = list.filter((e) => e.action === filters.action);
  if (filters?.from) list = list.filter((e) => e.timestamp >= filters.from!);
  if (filters?.to) list = list.filter((e) => e.timestamp <= filters.to!);
  return list;
}
