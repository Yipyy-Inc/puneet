/**
 * Task assignment engine — shift-based and skill-based auto-assignment.
 */

import {
  getShiftForTime,
  getStaffOnShift,
  getStaffOnShiftWithSkill,
  type StaffShiftEntry,
} from "@/data/shifts";

export interface TaskAssignment {
  type: "specific_staff" | "shift" | "skill_based" | "unassigned";
  staffId?: string;
  staffName?: string;
  shiftId?: string;
  shiftName?: string;
  requiredSkill?: string;
  autoAssigned: boolean;
  reason?: string;
}

/**
 * Assign a task based on its time and requirements.
 *
 * @param date - Scheduled date (YYYY-MM-DD)
 * @param time - Scheduled time (HH:MM)
 * @param requiredSkill - If set, only staff with this skill qualify
 * @param specificStaffId - If set, assign directly
 * @param specificStaffName - Name of specific staff
 * @param existingAssignments - Current assignments for load balancing
 */
export function assignTask(opts: {
  date: string;
  time: string;
  requiredSkill?: string;
  specificStaffId?: string;
  specificStaffName?: string;
  existingAssignments?: Map<string, number>; // staffId → task count
}): TaskAssignment {
  const { date, time, requiredSkill, specificStaffId, specificStaffName } =
    opts;
  const assignments = opts.existingAssignments ?? new Map();

  // 1. Specific staff assignment
  if (specificStaffId) {
    return {
      type: "specific_staff",
      staffId: specificStaffId,
      staffName: specificStaffName,
      autoAssigned: false,
    };
  }

  // 2. Find the shift for this time
  const shift = getShiftForTime(time);
  if (!shift) {
    return {
      type: "unassigned",
      autoAssigned: false,
      reason: "No shift covers this time",
    };
  }

  // 3. Skill-based assignment
  if (requiredSkill) {
    const qualified = getStaffOnShiftWithSkill(date, shift.id, requiredSkill);
    if (qualified.length === 0) {
      return {
        type: "skill_based",
        requiredSkill,
        shiftId: shift.id,
        shiftName: shift.name,
        autoAssigned: false,
        reason: `No staff with "${requiredSkill}" skill on ${shift.name} shift`,
      };
    }
    const best = pickLeastBusy(qualified, assignments);
    return {
      type: "skill_based",
      staffId: best.staffId,
      staffName: best.staffName,
      shiftId: shift.id,
      shiftName: shift.name,
      requiredSkill,
      autoAssigned: true,
    };
  }

  // 4. Shift-based assignment (no specific skill needed)
  const onShift = getStaffOnShift(date, shift.id);
  if (onShift.length === 0) {
    return {
      type: "shift",
      shiftId: shift.id,
      shiftName: shift.name,
      autoAssigned: false,
      reason: `No staff on ${shift.name} shift`,
    };
  }
  const best = pickLeastBusy(onShift, assignments);
  return {
    type: "shift",
    staffId: best.staffId,
    staffName: best.staffName,
    shiftId: shift.id,
    shiftName: shift.name,
    autoAssigned: true,
  };
}

function pickLeastBusy(
  candidates: StaffShiftEntry[],
  assignments: Map<string, number>,
): StaffShiftEntry {
  return candidates.reduce((best, c) => {
    const bestCount = assignments.get(best.staffId) ?? 0;
    const cCount = assignments.get(c.staffId) ?? 0;
    return cCount < bestCount ? c : best;
  }, candidates[0]);
}
