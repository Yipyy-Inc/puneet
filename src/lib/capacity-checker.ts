/**
 * Capacity and availability checker for custom modules.
 * Validates slot availability, resource capacity, and waitlist position.
 */

import type { CustomServiceModule } from "@/types/facility";
import type { Booking } from "@/types/booking";
import { bookings } from "@/data/bookings";

export interface AvailabilityResult {
  available: boolean;
  spotsRemaining: number;
  totalSpots: number;
  availableResources: { id: string; name: string }[];
  waitlistPosition?: number;
  canWaitlist: boolean;
  nextAvailable?: { date: string; time: string; spots: number };
}

/**
 * Check if a slot has availability for a custom module.
 */
export function checkAvailability(
  svcModule: CustomServiceModule,
  requestedDate: string,
  requestedTime: string,
  existingBookings?: Booking[],
): AvailabilityResult {
  const cap = svcModule.capacity;
  if (!cap?.enabled) {
    return {
      available: true,
      spotsRemaining: 999,
      totalSpots: 999,
      availableResources: [],
      canWaitlist: false,
    };
  }

  const allBookings = existingBookings ?? bookings;
  const moduleSlug = svcModule.slug;
  const totalSpots = cap.maxPerSlot ?? 1;

  // Count bookings in this slot
  const slotBookings = allBookings.filter((b) => {
    if (b.service?.toLowerCase() !== moduleSlug.toLowerCase()) return false;
    if (b.status === "cancelled") return false;
    if (b.startDate !== requestedDate) return false;
    if (requestedTime && b.checkInTime) {
      // Check if times overlap within the slot duration
      const reqMins = timeToMinutes(requestedTime);
      const bookMins = timeToMinutes(b.checkInTime);
      const slotDur = cap.slotDurationMinutes ?? 60;
      return Math.abs(reqMins - bookMins) < slotDur;
    }
    return true;
  });

  const spotsUsed = slotBookings.length;
  const spotsRemaining = Math.max(0, totalSpots - spotsUsed);
  const available = spotsRemaining > 0;

  // Check resource availability
  const availableResources: { id: string; name: string }[] = [];
  if (cap.resources) {
    for (const res of cap.resources) {
      const resBookings = slotBookings.length; // simplified
      if (resBookings < res.maxConcurrent) {
        availableResources.push({ id: res.id, name: res.name });
      }
    }
  }

  // Waitlist info
  const canWaitlist = !available && (cap.waitlistEnabled ?? false);
  const waitlistPosition = canWaitlist ? spotsUsed - totalSpots + 1 : undefined;

  // Find next available slot
  let nextAvailable: AvailabilityResult["nextAvailable"];
  if (!available) {
    const slotDur = cap.slotDurationMinutes ?? 60;
    const currentMins = timeToMinutes(requestedTime || "09:00");
    // Check next slots today
    for (let mins = currentMins + slotDur; mins < 18 * 60; mins += slotDur) {
      const nextTime = minutesToTime(mins);
      const nextSlotBookings = allBookings.filter((b) => {
        if (b.service?.toLowerCase() !== moduleSlug.toLowerCase()) return false;
        if (b.status === "cancelled") return false;
        if (b.startDate !== requestedDate) return false;
        if (b.checkInTime) {
          const bookMins = timeToMinutes(b.checkInTime);
          return Math.abs(mins - bookMins) < slotDur;
        }
        return false;
      });
      if (nextSlotBookings.length < totalSpots) {
        nextAvailable = {
          date: requestedDate,
          time: nextTime,
          spots: totalSpots - nextSlotBookings.length,
        };
        break;
      }
    }
  }

  return {
    available,
    spotsRemaining,
    totalSpots,
    availableResources,
    waitlistPosition,
    canWaitlist,
    nextAvailable,
  };
}

/**
 * Get slot availability for an entire day (for calendar display).
 */
export function getDaySlotAvailability(
  svcModule: CustomServiceModule,
  date: string,
): { time: string; booked: number; total: number; available: boolean }[] {
  const cap = svcModule.capacity;
  if (!cap?.enabled) return [];

  const slotDur = cap.slotDurationMinutes ?? 60;
  const totalSpots = cap.maxPerSlot ?? 1;
  const slots: {
    time: string;
    booked: number;
    total: number;
    available: boolean;
  }[] = [];

  // Generate slots from 8am to 6pm
  for (let mins = 8 * 60; mins < 18 * 60; mins += slotDur) {
    const time = minutesToTime(mins);
    const result = checkAvailability(svcModule, date, time);
    slots.push({
      time,
      booked: totalSpots - result.spotsRemaining,
      total: totalSpots,
      available: result.available,
    });
  }

  return slots;
}

// Helpers
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
