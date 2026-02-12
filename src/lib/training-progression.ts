/**
 * Training Progression and Prerequisites Logic
 * 
 * Handles automatic level gating and prerequisite checking
 */

import { type TrainingCourseType } from "./training-config";
import { type TrainingEnrollment, type TrainingCertificate } from "./training-enrollment";

export interface CourseProgression {
  courseTypeId: string;
  courseTypeName: string;
  isUnlocked: boolean;
  requiredPrerequisites: string[]; // Course type IDs
  completedPrerequisites: string[]; // Course type IDs that have been completed
  missingPrerequisites: string[]; // Course type IDs still needed
  unlockReason?: string; // Why it's unlocked or locked
}

/**
 * Check if a pet has completed a course type (has certificate)
 */
export function hasCompletedCourse(
  petId: number,
  courseTypeId: string,
  certificates: TrainingCertificate[]
): boolean {
  return certificates.some(
    (cert) =>
      cert.petId === petId &&
      cert.courseTypeName.toLowerCase().includes(
        courseTypeId.toLowerCase().replace("-", " ")
      ) ||
      cert.courseTypeName.toLowerCase().includes(
        courseTypeId.split("-")[0].toLowerCase()
      )
  );
}

/**
 * Get all completed course types for a pet
 */
export function getCompletedCourses(
  petId: number,
  certificates: TrainingCertificate[]
): string[] {
  // In production, this would map certificates to course type IDs more accurately
  // For now, we'll use a simple matching approach
  const completed: string[] = [];
  
  certificates
    .filter((cert) => cert.petId === petId)
    .forEach((cert) => {
      // Map certificate course names to course type IDs
      const courseName = cert.courseTypeName.toLowerCase();
      if (courseName.includes("basic") || courseName.includes("beginner")) {
        completed.push("basic-obedience");
      } else if (courseName.includes("intermediate") || courseName.includes("level 2")) {
        completed.push("intermediate-obedience");
      } else if (courseName.includes("advanced")) {
        completed.push("advanced-obedience");
      }
    });
  
  return completed;
}

/**
 * Check course progression and prerequisites for a pet
 */
export function checkCourseProgression(
  petId: number,
  courseTypes: TrainingCourseType[],
  certificates: TrainingCertificate[]
): CourseProgression[] {
  const completedCourses = getCompletedCourses(petId, certificates);
  
  return courseTypes.map((courseType) => {
    const requiredPrerequisites = courseType.prerequisites || [];
    const completedPrerequisites = requiredPrerequisites.filter((prereqId) =>
      completedCourses.includes(prereqId)
    );
    const missingPrerequisites = requiredPrerequisites.filter(
      (prereqId) => !completedCourses.includes(prereqId)
    );
    
    const isUnlocked = missingPrerequisites.length === 0;
    
    let unlockReason: string | undefined;
    if (isUnlocked) {
      if (requiredPrerequisites.length === 0) {
        unlockReason = "No prerequisites required";
      } else {
        unlockReason = `Completed: ${completedPrerequisites.join(", ")}`;
      }
    } else {
      unlockReason = `Requires: ${missingPrerequisites.join(", ")}`;
    }
    
    return {
      courseTypeId: courseType.id,
      courseTypeName: courseType.name,
      isUnlocked,
      requiredPrerequisites,
      completedPrerequisites,
      missingPrerequisites,
      unlockReason,
    };
  });
}

/**
 * Get next available course after completing a course
 */
export function getNextAvailableCourses(
  completedCourseTypeId: string,
  allCourseTypes: TrainingCourseType[]
): TrainingCourseType[] {
  return allCourseTypes.filter((courseType) =>
    courseType.prerequisites.includes(completedCourseTypeId)
  );
}
