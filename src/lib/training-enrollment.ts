/**
 * Training Enrollment and Attendance
 * 
 * Defines structures for training enrollments, session attendance, and progress tracking
 */

import { type TrainingSeries, type TrainingSeriesSession } from "./training-series";

export interface TrainingEnrollment {
  id: string;
  seriesId: string;
  seriesName: string;
  courseTypeId: string;
  courseTypeName: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  handlerName?: string; // Person dropping off the pet
  enrollmentDate: string;
  status: "enrolled" | "completed" | "dropped" | "waitlisted";
  sessionsAttended: number;
  totalSessions: number;
  currentSessionNumber: number; // Next session to attend
  progress: number; // 0-100 percentage
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionAttendance {
  id: string;
  enrollmentId: string;
  sessionId: string;
  sessionNumber: number;
  sessionDate: string;
  petId: number;
  petName: string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime: string | null;
  checkOutTime: string | null;
  trainerNotes: string;
  homeworkUnlocked: boolean;
  certificateGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingCertificate {
  id: string;
  enrollmentId: string;
  seriesId: string;
  courseTypeName: string;
  petId: number;
  petName: string;
  ownerId: number;
  ownerName: string;
  completionDate: string;
  issuedDate: string;
  certificateNumber: string;
  pdfUrl?: string;
  unlockedNextCourse?: string; // Course type ID that is now available
}

export interface TrainingHomework {
  id: string;
  enrollmentId: string;
  sessionNumber: number;
  sessionDate: string;
  title: string;
  description: string;
  instructions: string[];
  resources?: string[]; // URLs to videos, PDFs, etc.
  unlocked: boolean;
  unlockedDate: string | null;
  completed: boolean;
  completedDate: string | null;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  sessionsAttended: number,
  totalSessions: number
): number {
  if (totalSessions === 0) return 0;
  return Math.round((sessionsAttended / totalSessions) * 100);
}

/**
 * Check if session is today
 */
export function isSessionToday(sessionDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const session = new Date(sessionDate);
  session.setHours(0, 0, 0, 0);
  return session.getTime() === today.getTime();
}

/**
 * Generate certificate number
 */
export function generateCertificateNumber(
  courseTypeId: string,
  petId: number,
  completionDate: string
): string {
  const date = new Date(completionDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const courseCode = courseTypeId.substring(0, 3).toUpperCase();
  return `${courseCode}-${year}${month}-${String(petId).padStart(4, "0")}`;
}
