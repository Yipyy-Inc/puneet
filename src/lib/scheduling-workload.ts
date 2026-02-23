/**
 * Scheduling Workload Calculation
 * 
 * Calculates facility workload metrics (check-ins, check-outs, daycare attendance,
 * boarding occupancy, grooming appointments, evaluations) for any given date/time.
 * This helps managers schedule appropriate staff coverage.
 */

import { Booking } from "@/lib/types";
import { bookings } from "@/data/bookings";
import { daycareCheckIns, DaycareCheckIn } from "@/data/daycare";
import { boardingGuests, BoardingGuest } from "@/data/boarding";
import { groomingAppointments, GroomingAppointment } from "@/data/grooming";
import { TrainingSession } from "@/data/training";

export interface WorkloadMetrics {
  date: string;
  timeBlock?: string; // Optional: specific time block (e.g., "08:00-10:00")
  
  // Check-ins
  checkInsCount: number;
  checkInTimes: string[]; // Array of check-in times for this date
  
  // Check-outs
  checkOutsCount: number;
  checkOutTimes: string[]; // Array of check-out times for this date
  
  // Daycare
  daycareAttendance: number; // Current checked-in count
  daycareForecast: number; // Scheduled/confirmed for this date
  
  // Boarding
  boardingOccupancy: number; // Current guests
  boardingArrivals: number; // Arriving this date
  boardingDepartures: number; // Departing this date
  
  // Grooming
  groomingAppointmentsCount: number;
  groomingAppointments: GroomingAppointment[];
  
  // Evaluations
  evaluationsCount: number;
  
  // Training sessions
  trainingSessionsCount: number;
  
  // Busy meter (0-100, calculated based on all metrics)
  busyMeter: number;
}

export interface TimeBlockWorkload {
  timeBlock: string; // e.g., "08:00-10:00"
  checkIns: number;
  checkOuts: number;
  daycareCount: number;
  boardingCount: number;
  groomingCount: number;
  evaluations: number;
  trainingCount: number;
  busyMeter: number;
}

/**
 * Calculate workload metrics for a specific date
 */
export function calculateWorkloadForDate(
  date: string,
  facilityId?: number
): WorkloadMetrics {
  const dateStr = date.split("T")[0]; // Normalize to YYYY-MM-DD
  
  // Filter bookings for this date
  const dateBookings = bookings.filter((b) => {
    const bookingDate = b.startDate.split("T")[0];
    return bookingDate === dateStr && (!facilityId || b.facilityId === facilityId);
  });
  
  // Check-ins (bookings with check-in time on this date)
  const checkIns = dateBookings.filter((b) => {
    if (!b.checkInTime) return false;
    // Check if check-in is scheduled for this date
    return b.status === "confirmed" || b.status === "checked-in" || b.status === "completed";
  });
  
  // Check-outs (bookings with check-out time on this date)
  const checkOuts = dateBookings.filter((b) => {
    if (!b.checkOutTime) return false;
    return b.status === "confirmed" || b.status === "checked-in" || b.status === "completed";
  });
  
  // Daycare check-ins for this date
  const daycareForDate = daycareCheckIns.filter((dc) => {
    const checkInDate = dc.checkInTime.split("T")[0];
    return checkInDate === dateStr;
  });
  
  // Daycare currently checked in (status = "checked-in")
  const daycareCurrentlyIn = daycareForDate.filter((dc) => dc.status === "checked-in");
  
  // Daycare forecast (scheduled + confirmed)
  const daycareForecast = daycareForDate.filter(
    (dc) => dc.status === "scheduled" || dc.status === "checked-in"
  ).length;
  
  // Boarding guests
  const boardingForDate = boardingGuests.filter((bg) => {
    const checkInDate = bg.checkInDate.split("T")[0];
    const checkOutDate = bg.checkOutDate.split("T")[0];
    // Guest is present if check-in <= date <= check-out
    return checkInDate <= dateStr && checkOutDate >= dateStr;
  });
  
  // Boarding arrivals (check-in date = this date)
  const boardingArrivals = boardingGuests.filter((bg) => {
    const checkInDate = bg.checkInDate.split("T")[0];
    return checkInDate === dateStr && bg.status !== "cancelled";
  });
  
  // Boarding departures (check-out date = this date)
  const boardingDepartures = boardingGuests.filter((bg) => {
    const checkOutDate = bg.checkOutDate.split("T")[0];
    return checkOutDate === dateStr && bg.status !== "cancelled";
  });
  
  // Grooming appointments for this date
  const groomingForDate = groomingAppointments.filter((ga) => {
    const appointmentDate = ga.date.split("T")[0];
    return appointmentDate === dateStr;
  });
  
  // Evaluations (bookings with service = "evaluation")
  const evaluations = dateBookings.filter((b) => b.service === "evaluation");
  
  // Training sessions (would need to import from training data)
  // For now, we'll use a placeholder - in real implementation, filter training sessions by date
  const trainingSessionsCount = 0; // TODO: Integrate with training module
  
  // Calculate busy meter (0-100)
  // Weighted calculation based on different service types
  const busyMeter = calculateBusyMeter({
    checkIns: checkIns.length,
    checkOuts: checkOuts.length,
    daycare: daycareForecast,
    boarding: boardingForDate.length,
    grooming: groomingForDate.length,
    evaluations: evaluations.length,
    training: trainingSessionsCount,
  });
  
  return {
    date: dateStr,
    checkInsCount: checkIns.length,
    checkInTimes: checkIns
      .map((b) => b.checkInTime)
      .filter((t): t is string => !!t)
      .sort(),
    checkOutsCount: checkOuts.length,
    checkOutTimes: checkOuts
      .map((b) => b.checkOutTime)
      .filter((t): t is string => !!t)
      .sort(),
    daycareAttendance: daycareCurrentlyIn.length,
    daycareForecast,
    boardingOccupancy: boardingForDate.length,
    boardingArrivals: boardingArrivals.length,
    boardingDepartures: boardingDepartures.length,
    groomingAppointmentsCount: groomingForDate.length,
    groomingAppointments: groomingForDate,
    evaluationsCount: evaluations.length,
    trainingSessionsCount,
    busyMeter,
  };
}

/**
 * Calculate workload for a specific time block on a date
 */
export function calculateWorkloadForTimeBlock(
  date: string,
  timeBlock: string, // e.g., "08:00-10:00"
  facilityId?: number
): TimeBlockWorkload {
  const [startTime, endTime] = timeBlock.split("-");
  if (!startTime || !endTime) {
    throw new Error("Invalid time block format. Expected 'HH:MM-HH:MM'");
  }
  
  const dateStr = date.split("T")[0];
  const metrics = calculateWorkloadForDate(dateStr, facilityId);
  
  // Filter check-ins within this time block
  const checkInsInBlock = metrics.checkInTimes.filter((time) => {
    return time >= startTime && time < endTime;
  });
  
  // Filter check-outs within this time block
  const checkOutsInBlock = metrics.checkOutTimes.filter((time) => {
    return time >= startTime && time < endTime;
  });
  
  // Daycare count during this time block (checked in and not checked out yet)
  const daycareInBlock = daycareCheckIns.filter((dc) => {
    const checkInDate = dc.checkInTime.split("T")[0];
    if (checkInDate !== dateStr) return false;
    
    const checkInTime = dc.checkInTime.split("T")[1]?.split(":")[0] + ":" + dc.checkInTime.split("T")[1]?.split(":")[1];
    if (!checkInTime) return false;
    
    // Check if pet is checked in before or during this block
    if (checkInTime > endTime) return false;
    
    // Check if pet is checked out before this block starts
    if (dc.checkOutTime) {
      const checkOutTime = dc.checkOutTime.split("T")[1]?.split(":")[0] + ":" + dc.checkOutTime.split("T")[1]?.split(":")[1];
      if (checkOutTime && checkOutTime < startTime) return false;
    }
    
    return dc.status === "checked-in" || (dc.status === "scheduled" && checkInTime <= endTime);
  });
  
  // Boarding count (guests present during this time block)
  const boardingInBlock = metrics.boardingOccupancy; // All guests present on this date
  
  // Grooming appointments in this time block
  const groomingInBlock = metrics.groomingAppointments.filter((ga) => {
    const aptStart = ga.startTime;
    const aptEnd = ga.endTime;
    // Check if appointment overlaps with time block
    return aptStart < endTime && aptEnd > startTime;
  });
  
  // Evaluations in this time block (from bookings)
  const evaluationsInBlock = bookings.filter((b) => {
    if (b.service !== "evaluation") return false;
    const bookingDate = b.startDate.split("T")[0];
    if (bookingDate !== dateStr) return false;
    if (!b.checkInTime) return false;
    return b.checkInTime >= startTime && b.checkInTime < endTime;
  });
  
  // Training sessions in this time block
  const trainingInBlock = 0; // TODO: Integrate with training module
  
  const busyMeter = calculateBusyMeter({
    checkIns: checkInsInBlock.length,
    checkOuts: checkOutsInBlock.length,
    daycare: daycareInBlock.length,
    boarding: boardingInBlock,
    grooming: groomingInBlock.length,
    evaluations: evaluationsInBlock.length,
    training: trainingInBlock,
  });
  
  return {
    timeBlock,
    checkIns: checkInsInBlock.length,
    checkOuts: checkOutsInBlock.length,
    daycareCount: daycareInBlock.length,
    boardingCount: boardingInBlock,
    groomingCount: groomingInBlock.length,
    evaluations: evaluationsInBlock.length,
    trainingCount: trainingInBlock,
    busyMeter,
  };
}

/**
 * Calculate busy meter (0-100) based on workload metrics
 * This is a simple weighted calculation - facilities can customize this
 */
function calculateBusyMeter(metrics: {
  checkIns: number;
  checkOuts: number;
  daycare: number;
  boarding: number;
  grooming: number;
  evaluations: number;
  training: number;
}): number {
  // Weight different activities
  // These weights can be customized per facility
  const weights = {
    checkIns: 3, // Each check-in adds 3 points
    checkOuts: 2, // Each check-out adds 2 points
    daycare: 1, // Each daycare pet adds 1 point
    boarding: 2, // Each boarding guest adds 2 points
    grooming: 4, // Each grooming appointment adds 4 points
    evaluations: 5, // Each evaluation adds 5 points (more time-consuming)
    training: 3, // Each training session adds 3 points
  };
  
  const totalPoints =
    metrics.checkIns * weights.checkIns +
    metrics.checkOuts * weights.checkOuts +
    metrics.daycare * weights.daycare +
    metrics.boarding * weights.boarding +
    metrics.grooming * weights.grooming +
    metrics.evaluations * weights.evaluations +
    metrics.training * weights.training;
  
  // Normalize to 0-100 scale
  // Assuming max capacity: 20 check-ins, 20 check-outs, 50 daycare, 30 boarding, 10 grooming, 5 evaluations, 5 training
  const maxPoints = 20 * weights.checkIns + 20 * weights.checkOuts + 50 * weights.daycare + 30 * weights.boarding + 10 * weights.grooming + 5 * weights.evaluations + 5 * weights.training;
  
  const busyMeter = Math.min(100, Math.round((totalPoints / maxPoints) * 100));
  return busyMeter;
}

/**
 * Get workload metrics for a range of dates
 */
export function calculateWorkloadForDateRange(
  startDate: string,
  endDate: string,
  facilityId?: number
): WorkloadMetrics[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const results: WorkloadMetrics[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    results.push(calculateWorkloadForDate(dateStr, facilityId));
  }
  
  return results;
}
