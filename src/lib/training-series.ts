/**
 * Training Series Configuration
 * 
 * Defines the structure for training series (scheduled occurrences of course types)
 */

import { type TrainingCourseType } from "./training-config";
import { type Trainer } from "@/data/training";

export type SeriesStatus = "draft" | "open" | "closed" | "in-progress" | "completed" | "cancelled";

export interface TrainingSeries {
  id: string;
  courseTypeId: string; // Reference to TrainingCourseType
  courseTypeName: string; // Denormalized for quick access
  seriesName: string; // e.g., "Basic Obedience - Saturday Morning February"
  startDate: string; // ISO date string
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format (calculated from duration)
  duration: number; // Duration in minutes per session
  numberOfWeeks: number; // Auto-calculates session dates
  location: string; // e.g., "Training Room A"
  instructorId: string; // Reference to Trainer
  instructorName: string; // Denormalized for quick access
  maxCapacity: number; // Maximum number of dogs
  enrollmentRules: EnrollmentRules;
  status: SeriesStatus;
  sessions: TrainingSeriesSession[]; // Auto-generated session instances
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentRules {
  bookingOpensDate: string; // ISO date string - when enrollment opens
  bookingClosesDate: string; // ISO date string - when enrollment closes (e.g., 48 hours before start)
  depositRequired: number; // Deposit amount in dollars (0 if no deposit)
  fullPaymentAmount: number; // Full payment amount in dollars
  waitlistEnabled: boolean; // Whether waitlist is enabled
  allowDropIns: boolean; // Whether single-session drop-ins are allowed
}

export interface TrainingSeriesSession {
  id: string;
  seriesId: string;
  sessionNumber: number; // 1, 2, 3, etc.
  date: string; // ISO date string - calculated based on startDate + (sessionNumber - 1) weeks
  startTime: string; // Same as series startTime
  endTime: string; // Same as series endTime
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  enrolledCount: number; // Number of enrolled students
  notes?: string; // Optional session-specific notes
}

/**
 * Calculate session dates for a series
 */
export function calculateSessionDates(
  startDate: string,
  dayOfWeek: number,
  numberOfWeeks: number
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  
  // Find the first occurrence of the specified day of week
  const startDay = start.getDay();
  let daysToAdd = (dayOfWeek - startDay + 7) % 7;
  if (daysToAdd === 0 && start.getDay() !== dayOfWeek) {
    daysToAdd = 7; // If it's the same day but we want next week's occurrence
  }
  
  const firstSessionDate = new Date(start);
  firstSessionDate.setDate(start.getDate() + daysToAdd);
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const sessionDate = new Date(firstSessionDate);
    sessionDate.setDate(firstSessionDate.getDate() + i * 7);
    dates.push(sessionDate.toISOString().split("T")[0]);
  }
  
  return dates;
}

/**
 * Generate session instances for a series
 */
export function generateSeriesSessions(
  series: Omit<TrainingSeries, "sessions" | "id" | "createdAt" | "updatedAt">
): TrainingSeriesSession[] {
  const sessionDates = calculateSessionDates(
    series.startDate,
    series.dayOfWeek,
    series.numberOfWeeks
  );
  
  return sessionDates.map((date, index) => ({
    id: `session-${series.courseTypeId}-${date}-${index}`,
    seriesId: "", // Will be set when series is created
    sessionNumber: index + 1,
    date,
    startTime: series.startTime,
    endTime: series.endTime,
    status: "scheduled" as const,
    enrolledCount: 0,
  }));
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "";
}
