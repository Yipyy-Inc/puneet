/**
 * Training Prerequisites Validation
 * 
 * Validates if a pet meets the requirements for a training course type
 */

import { type TrainingCourseType } from "./training-config";
import { type Pet } from "@/lib/types";
import { vaccinationRecords } from "@/data/pet-data";

export interface PrerequisiteCheckResult {
  eligible: boolean;
  issues: PrerequisiteIssue[];
}

export interface PrerequisiteIssue {
  type: "age" | "vaccine" | "prerequisite" | "behavioral";
  message: string;
  severity: "error" | "warning";
}

/**
 * Calculate pet age in weeks
 */
export function calculatePetAgeInWeeks(pet: Pet): number {
  // Assuming pet.age is in years, convert to weeks
  // In production, this would use birthdate
  return Math.floor(pet.age * 52);
}

/**
 * Check if pet has required vaccines
 */
export function hasRequiredVaccines(
  petId: number,
  requiredVaccines: string[]
): { hasAll: boolean; missing: string[] } {
  const petVaccinations = vaccinationRecords.filter((v) => v.petId === petId);
  const now = new Date();
  
  const validVaccines = petVaccinations
    .filter((v) => {
      const expiryDate = new Date(v.expiryDate);
      return expiryDate >= now;
    })
    .map((v) => v.vaccineName);
  
  const missing: string[] = [];
  
  for (const required of requiredVaccines) {
    // Check if any valid vaccine matches (case-insensitive, partial match)
    const hasVaccine = validVaccines.some((v) =>
      v.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(v.toLowerCase().split(" ")[0])
    );
    
    if (!hasVaccine) {
      missing.push(required);
    }
  }
  
  return {
    hasAll: missing.length === 0,
    missing,
  };
}

/**
 * Check if pet has completed prerequisite courses
 * In production, this would check against training completion records
 */
export function hasCompletedPrerequisites(
  petId: number,
  prerequisiteCourseIds: string[]
): { hasAll: boolean; missing: string[] } {
  // TODO: In production, check against actual training completion records
  // For now, return false (no prerequisites completed)
  return {
    hasAll: prerequisiteCourseIds.length === 0,
    missing: prerequisiteCourseIds,
  };
}

/**
 * Check if pet has behavioral flags that would block enrollment
 */
export function checkBehavioralFlags(
  pet: Pet,
  courseTypeId: string
): { blocked: boolean; reason?: string } {
  // Check for reactive/aggressive flags
  // In production, this would check against pet behavior records
  const hasReactiveFlag = pet.specialNeeds?.toLowerCase().includes("reactive") ||
    pet.specialNeeds?.toLowerCase().includes("aggressive");
  
  // Basic obedience courses may block reactive dogs
  if (hasReactiveFlag && courseTypeId === "basic-obedience") {
    return {
      blocked: true,
      reason: "Reactive dogs are not eligible for Basic Obedience. Please consider 'Reactive Rover Recovery' instead.",
    };
  }
  
  return { blocked: false };
}

/**
 * Validate all prerequisites for a course type
 */
export function validatePrerequisites(
  pet: Pet,
  courseType: TrainingCourseType
): PrerequisiteCheckResult {
  const issues: PrerequisiteIssue[] = [];
  
  // Check age
  const petAgeWeeks = calculatePetAgeInWeeks(pet);
  if (petAgeWeeks < courseType.ageRange.minWeeks) {
    issues.push({
      type: "age",
      message: `Pet must be at least ${courseType.ageRange.minWeeks} weeks old. Current age: ${petAgeWeeks} weeks.`,
      severity: "error",
    });
  }
  
  if (
    courseType.ageRange.maxWeeks &&
    petAgeWeeks > courseType.ageRange.maxWeeks
  ) {
    issues.push({
      type: "age",
      message: `Pet must be no more than ${courseType.ageRange.maxWeeks} weeks old. Current age: ${petAgeWeeks} weeks.`,
      severity: "error",
    });
  }
  
  // Check vaccines
  const vaccineCheck = hasRequiredVaccines(pet.id, courseType.requiredVaccines);
  if (!vaccineCheck.hasAll) {
    issues.push({
      type: "vaccine",
      message: `Missing required vaccines: ${vaccineCheck.missing.join(", ")}. Please update vaccination records.`,
      severity: "error",
    });
  }
  
  // Check prerequisites
  if (courseType.prerequisites.length > 0) {
    const prereqCheck = hasCompletedPrerequisites(pet.id, courseType.prerequisites);
    if (!prereqCheck.hasAll) {
      issues.push({
        type: "prerequisite",
        message: `Must complete prerequisite courses first. Please complete: ${prereqCheck.missing.join(", ")}.`,
        severity: "error",
      });
    }
  }
  
  // Check behavioral flags
  const behaviorCheck = checkBehavioralFlags(pet, courseType.id);
  if (behaviorCheck.blocked) {
    issues.push({
      type: "behavioral",
      message: behaviorCheck.reason || "Pet has behavioral flags that prevent enrollment.",
      severity: "error",
    });
  }
  
  return {
    eligible: issues.length === 0,
    issues,
  };
}
