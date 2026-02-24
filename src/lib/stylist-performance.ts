/**
 * Stylist Performance Tracking
 * 
 * Calculates performance metrics for grooming stylists including:
 * - Today's appointments
 * - Revenue per stylist
 * - Average groom time
 * - Cancellation rate
 */

import type {
  GroomingAppointment,
  Stylist,
} from "@/data/grooming";
import { groomingAppointments } from "@/data/grooming";

export interface StylistPerformanceMetrics {
  stylistId: string;
  todayAppointments: number;
  totalRevenue: number; // Total revenue from completed appointments
  averageGroomTime: number; // Average duration in minutes
  cancellationRate: number; // Percentage of cancelled appointments
  completedCount: number;
  cancelledCount: number;
  totalAppointments: number;
}

/**
 * Calculate time difference in minutes between two time strings (HH:MM format)
 */
function timeDifferenceInMinutes(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(":").map(Number);
  const [endHours, endMins] = endTime.split(":").map(Number);
  
  const startTotal = startHours * 60 + startMins;
  const endTotal = endHours * 60 + endMins;
  
  return endTotal - startTotal;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Calculate performance metrics for a specific stylist
 */
export function calculateStylistPerformance(
  stylistId: string,
  appointments: GroomingAppointment[] = groomingAppointments,
): StylistPerformanceMetrics {
  const today = getTodayDateString();
  
  // Filter appointments for this stylist
  const stylistAppointments = appointments.filter(
    (apt) => apt.stylistId === stylistId,
  );

  // Today's appointments
  const todayAppointments = stylistAppointments.filter(
    (apt) => apt.date === today && apt.status !== "cancelled" && apt.status !== "no-show",
  ).length;

  // Completed appointments (for revenue and average time)
  const completedAppointments = stylistAppointments.filter(
    (apt) => apt.status === "completed",
  );

  // Calculate total revenue from completed appointments
  const totalRevenue = completedAppointments.reduce(
    (sum, apt) => sum + apt.totalPrice,
    0,
  );

  // Calculate average groom time from completed appointments
  const groomTimes = completedAppointments
    .map((apt) => {
      const duration = timeDifferenceInMinutes(apt.startTime, apt.endTime);
      return duration > 0 ? duration : null; // Filter out invalid durations
    })
    .filter((time): time is number => time !== null);

  const averageGroomTime =
    groomTimes.length > 0
      ? Math.round(groomTimes.reduce((sum, time) => sum + time, 0) / groomTimes.length)
      : 0;

  // Calculate cancellation rate
  const totalAppointments = stylistAppointments.length;
  const cancelledAppointments = stylistAppointments.filter(
    (apt) => apt.status === "cancelled" || apt.status === "no-show",
  ).length;

  const cancellationRate =
    totalAppointments > 0
      ? Math.round((cancelledAppointments / totalAppointments) * 100)
      : 0;

  return {
    stylistId,
    todayAppointments,
    totalRevenue,
    averageGroomTime,
    cancellationRate,
    completedCount: completedAppointments.length,
    cancelledCount: cancelledAppointments,
    totalAppointments,
  };
}

/**
 * Calculate performance metrics for all stylists
 */
export function calculateAllStylistsPerformance(
  stylists: Stylist[],
  appointments: GroomingAppointment[] = groomingAppointments,
): Map<string, StylistPerformanceMetrics> {
  const metricsMap = new Map<string, StylistPerformanceMetrics>();

  stylists.forEach((stylist) => {
    const metrics = calculateStylistPerformance(stylist.id, appointments);
    metricsMap.set(stylist.id, metrics);
  });

  return metricsMap;
}

/**
 * Get revenue for a specific date range
 */
export function getStylistRevenueForPeriod(
  stylistId: string,
  startDate: string,
  endDate: string,
  appointments: GroomingAppointment[] = groomingAppointments,
): number {
  const stylistAppointments = appointments.filter(
    (apt) =>
      apt.stylistId === stylistId &&
      apt.status === "completed" &&
      apt.date >= startDate &&
      apt.date <= endDate,
  );

  return stylistAppointments.reduce((sum, apt) => sum + apt.totalPrice, 0);
}
