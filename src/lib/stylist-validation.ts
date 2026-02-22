/**
 * Stylist Assignment Validation
 * 
 * Handles conflict detection, capacity limits, and skill-based filtering
 * for grooming appointment assignments.
 */

import type {
  GroomingAppointment,
  Stylist,
  StylistCapacity,
  PetSize,
  GroomingStatus,
} from "@/data/grooming";

export interface StylistConflict {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  reason: string | null;
}

export interface ConflictDetail {
  type: "overlap" | "capacity" | "skill" | "availability";
  message: string;
  conflictingAppointmentId?: string;
  conflictingAppointmentDate?: string;
  conflictingAppointmentTime?: string;
}

export interface StylistAvailabilityCheck {
  isAvailable: boolean;
  canHandlePet: boolean;
  conflicts: StylistConflict;
  dailyAppointmentCount: number;
  remainingCapacity: number;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes; // Convert to minutes since midnight
  };

  const start1Min = parseTime(start1);
  const end1Min = parseTime(end1);
  const start2Min = parseTime(start2);
  const end2Min = parseTime(end2);

  // Check for overlap: start1 < end2 && start2 < end1
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Check if a stylist has overlapping appointments on a given date
 */
export function checkStylistConflicts(
  stylistId: string,
  date: string,
  startTime: string,
  endTime: string,
  appointments: GroomingAppointment[],
  excludeAppointmentId?: string, // For editing existing appointments
  allowParallel?: boolean, // If true, allow overlapping appointments
): StylistConflict {
  const conflicts: ConflictDetail[] = [];

  // If parallel grooming is allowed, skip overlap checks
  if (allowParallel) {
    return {
      hasConflict: false,
      conflicts: [],
      reason: null,
    };
  }

  // Filter appointments for this stylist on this date
  const stylistAppointments = appointments.filter(
    (apt) =>
      apt.stylistId === stylistId &&
      apt.date === date &&
      apt.status !== "cancelled" &&
      apt.status !== "no-show" &&
      apt.id !== excludeAppointmentId,
  );

  // Check for time overlaps (only for active appointments)
  for (const apt of stylistAppointments) {
    // Only check conflicts for active appointments (checked-in, in-progress, ready-for-pickup)
    const activeStatuses = ["checked-in", "in-progress", "ready-for-pickup"];
    if (!activeStatuses.includes(apt.status)) {
      continue;
    }

    if (
      timeRangesOverlap(startTime, endTime, apt.startTime, apt.endTime)
    ) {
      conflicts.push({
        type: "overlap",
        message: `Time conflict with ${apt.petName} (${apt.startTime} - ${apt.endTime})`,
        conflictingAppointmentId: apt.id,
        conflictingAppointmentDate: apt.date,
        conflictingAppointmentTime: `${apt.startTime} - ${apt.endTime}`,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    reason:
      conflicts.length > 0
        ? `Stylist has ${conflicts.length} overlapping appointment(s)`
        : null,
  };
}

/**
 * Check if stylist has reached daily capacity
 */
export function checkStylistDailyCapacity(
  stylistId: string,
  date: string,
  appointments: GroomingAppointment[],
  maxDailyAppointments: number,
  excludeAppointmentId?: string,
  globalMaxPerDay?: number, // Optional global setting override
): { hasCapacity: boolean; currentCount: number; remaining: number } {
  const dayAppointments = appointments.filter(
    (apt) =>
      apt.stylistId === stylistId &&
      apt.date === date &&
      apt.status !== "cancelled" &&
      apt.status !== "no-show" &&
      apt.id !== excludeAppointmentId,
  );

  // Use global max if provided and it's lower than stylist's capacity
  const effectiveMax = globalMaxPerDay && globalMaxPerDay > 0
    ? Math.min(maxDailyAppointments, globalMaxPerDay)
    : maxDailyAppointments;

  const currentCount = dayAppointments.length;
  const remaining = Math.max(0, effectiveMax - currentCount);

  return {
    hasCapacity: currentCount < effectiveMax,
    currentCount,
    remaining,
  };
}

/**
 * Check if stylist can handle a specific pet based on skills and capacity
 */
export function canStylistHandlePet(
  stylist: Stylist,
  petSize: PetSize,
  coatCondition?: "normal" | "matted" | "severely-matted",
  isAnxious?: boolean,
  isAggressive?: boolean,
): boolean {
  const { capacity } = stylist;

  // Safety check: if capacity is missing, allow the appointment (fallback)
  if (!capacity) {
    return true;
  }

  // Check if stylist prefers/handles this pet size
  if (
    capacity.preferredPetSizes.length > 0 &&
    !capacity.preferredPetSizes.includes(petSize)
  ) {
    return false;
  }

  // Check matting handling capability
  if (
    (coatCondition === "matted" || coatCondition === "severely-matted") &&
    !capacity.canHandleMatted
  ) {
    return false;
  }

  // Check anxious pet handling
  if (isAnxious && !capacity.canHandleAnxious) {
    return false;
  }

  // Check aggressive pet handling
  if (isAggressive && !capacity.canHandleAggressive) {
    return false;
  }

  return true;
}

/**
 * Comprehensive availability check for a stylist
 */
export function checkStylistAvailability(
  stylist: Stylist,
  date: string,
  startTime: string,
  endTime: string,
  petSize: PetSize,
  appointments: GroomingAppointment[],
  excludeAppointmentId?: string,
  coatCondition?: "normal" | "matted" | "severely-matted",
  isAnxious?: boolean,
  isAggressive?: boolean,
): StylistAvailabilityCheck {
  const { capacity } = stylist;

  // Safety check: if capacity is missing, return unavailable
  if (!capacity) {
    return {
      isAvailable: false,
      canHandlePet: false,
      conflicts: {
        hasConflict: true,
        reason: "Stylist capacity configuration missing",
        conflicts: [
          {
            type: "configuration",
            message: "Stylist capacity configuration is missing",
          },
        ],
      },
      dailyAppointmentCount: 0,
      remainingCapacity: 0,
    };
  }

  // Check for time conflicts
  // TODO: Pass allowParallelGrooming from grooming settings
  const conflicts = checkStylistConflicts(
    stylist.id,
    date,
    startTime,
    endTime,
    appointments,
    excludeAppointmentId,
    undefined, // allowParallel - would come from settings
  );

  // Check daily capacity
  // TODO: Pass globalMaxPerDay from grooming settings (maxDogsPerStylistPerDay)
  const capacityCheck = checkStylistDailyCapacity(
    stylist.id,
    date,
    appointments,
    capacity.maxDailyAppointments,
    excludeAppointmentId,
    undefined, // globalMaxPerDay - would come from settings
  );

  // Check if stylist can handle this pet
  const canHandle = canStylistHandlePet(
    stylist,
    petSize,
    coatCondition,
    isAnxious,
    isAggressive,
  );

  // Add capacity conflict if needed
  if (!capacityCheck.hasCapacity) {
    conflicts.conflicts.push({
      type: "capacity",
      message: `Stylist has reached daily capacity (${capacityCheck.currentCount}/${capacity.maxDailyAppointments} appointments)`,
    });
    conflicts.hasConflict = true;
    conflicts.reason = "Daily capacity exceeded";
  }

  // Add skill conflict if needed
  if (!canHandle) {
    conflicts.conflicts.push({
      type: "skill",
      message: "Stylist does not have required skills for this pet",
    });
    conflicts.hasConflict = true;
    conflicts.reason = "Skill mismatch";
  }

  return {
    isAvailable:
      !conflicts.hasConflict && capacityCheck.hasCapacity && canHandle,
    canHandlePet: canHandle,
    conflicts,
    dailyAppointmentCount: capacityCheck.currentCount,
    remainingCapacity: capacityCheck.remaining,
  };
}

/**
 * Filter stylists based on availability and skills
 */
export function filterAvailableStylists(
  stylists: Stylist[],
  date: string,
  startTime: string,
  endTime: string,
  petSize: PetSize,
  appointments: GroomingAppointment[],
  excludeAppointmentId?: string,
  coatCondition?: "normal" | "matted" | "severely-matted",
  isAnxious?: boolean,
  isAggressive?: boolean,
): Array<{
  stylist: Stylist;
  availability: StylistAvailabilityCheck;
}> {
  return stylists
    .filter((stylist) => stylist.status === "active")
    .map((stylist) => ({
      stylist,
      availability: checkStylistAvailability(
        stylist,
        date,
        startTime,
        endTime,
        petSize,
        appointments,
        excludeAppointmentId,
        coatCondition,
        isAnxious,
        isAggressive,
      ),
    }))
    .filter((item) => item.availability.isAvailable)
    .sort((a, b) => {
      // Sort by skill level (master > senior > intermediate > junior)
      const skillOrder: Record<string, number> = {
        master: 4,
        senior: 3,
        intermediate: 2,
        junior: 1,
      };
      const aSkill = skillOrder[a.stylist.capacity.skillLevel] || 0;
      const bSkill = skillOrder[b.stylist.capacity.skillLevel] || 0;
      if (aSkill !== bSkill) return bSkill - aSkill;

      // Then by rating
      return b.stylist.rating - a.stylist.rating;
    });
}

/**
 * Get stylists suitable for a pet based on skills (without checking availability)
 */
export function getSuitableStylists(
  stylists: Stylist[],
  petSize: PetSize,
  coatCondition?: "normal" | "matted" | "severely-matted",
  isAnxious?: boolean,
  isAggressive?: boolean,
): Stylist[] {
  return stylists
    .filter((stylist) => stylist.status === "active")
    .filter((stylist) =>
      canStylistHandlePet(stylist, petSize, coatCondition, isAnxious, isAggressive),
    )
    .sort((a, b) => {
      // Sort by skill level
      const skillOrder: Record<string, number> = {
        master: 4,
        senior: 3,
        intermediate: 2,
        junior: 1,
      };
      const aSkill = skillOrder[a.capacity.skillLevel] || 0;
      const bSkill = skillOrder[b.capacity.skillLevel] || 0;
      if (aSkill !== bSkill) return bSkill - aSkill;

      // Then by rating
      return b.rating - a.rating;
    });
}
