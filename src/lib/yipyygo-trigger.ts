/**
 * YipyyGo Triggering Logic
 * 
 * Handles when and how to trigger YipyyGo pre-check-in forms
 * based on booking confirmation and facility configuration.
 */

import type { Booking } from "@/lib/types";
import type {
  YipyyGoConfig,
  ServiceType,
  DeliveryChannel,
  TimingConfig,
} from "@/data/yipyygo-config";
import { getYipyyGoConfig } from "@/data/yipyygo-config";

// ============================================================================
// Types
// ============================================================================

export interface YipyyGoTriggerResult {
  shouldTrigger: boolean;
  reason?: string;
  sendImmediately: boolean;
  scheduledSendTime?: Date;
  message?: YipyyGoMessage;
}

export interface YipyyGoMessage {
  subject: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  summary: {
    petName: string;
    serviceType: string;
    date: string;
    time: string;
  };
  channels: DeliveryChannel[];
}

export interface BookingForYipyyGo {
  id: number | string;
  clientId: number;
  petId: number;
  petName: string;
  facilityId: number;
  service: string; // "daycare" | "boarding" | "grooming" | "training" | etc.
  startDate: string | Date;
  checkInTime?: string;
  status: string;
  createdAt?: string | Date;
}

// ============================================================================
// Main Trigger Function
// ============================================================================

/**
 * Check if YipyyGo should be triggered for a booking
 * Called when booking status changes to "confirmed"
 */
export function shouldTriggerYipyyGo(
  booking: BookingForYipyyGo,
  facilityId: number
): YipyyGoTriggerResult {
  // Get facility YipyyGo configuration
  const config = getYipyyGoConfig(facilityId);

  // Check if YipyyGo is enabled
  if (!config || !config.enabled) {
    return {
      shouldTrigger: false,
      reason: "YipyyGo is not enabled for this facility",
      sendImmediately: false,
    };
  }

  // Check if booking is confirmed
  if (booking.status !== "confirmed") {
    return {
      shouldTrigger: false,
      reason: "Booking is not confirmed",
      sendImmediately: false,
    };
  }

  // Check if service is eligible
  const serviceType = mapBookingServiceToYipyyGoService(booking.service);
  const serviceConfig = config.serviceConfigs.find(
    (sc) => sc.serviceType === serviceType
  );

  if (!serviceConfig || !serviceConfig.enabled) {
    return {
      shouldTrigger: false,
      reason: `YipyyGo is not enabled for ${serviceType} service`,
      sendImmediately: false,
    };
  }

  // Check if within sending window
  const checkInDate = new Date(booking.startDate);
  if (booking.checkInTime) {
    const [hours, minutes] = booking.checkInTime.split(":").map(Number);
    checkInDate.setHours(hours, minutes, 0, 0);
  }

  const now = new Date();
  const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check if booking was created last-minute (inside initial send window)
  const isLastMinute = hoursUntilCheckIn <= config.timing.initialSendTime;

  // Check if we're past the deadline (too late to send)
  if (hoursUntilCheckIn <= config.timing.deadline) {
    return {
      shouldTrigger: false,
      reason: `Check-in is within ${config.timing.deadline} hours - past deadline`,
      sendImmediately: false,
    };
  }

  // Determine send time
  const sendImmediately = isLastMinute;
  const scheduledSendTime = isLastMinute
    ? undefined
    : calculateScheduledSendTime(checkInDate, config.timing.initialSendTime);

  // Generate message
  const message = generateYipyyGoMessage(booking, config, serviceConfig.requirement);

  return {
    shouldTrigger: true,
    sendImmediately,
    scheduledSendTime,
    message,
  };
}

// ============================================================================
// Message Generation
// ============================================================================

/**
 * Generate YipyyGo message with CTA and summary
 */
function generateYipyyGoMessage(
  booking: BookingForYipyyGo,
  config: YipyyGoConfig,
  requirement: "mandatory" | "optional"
): YipyyGoMessage {
  const checkInDate = new Date(booking.startDate);
  const dateStr = checkInDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeStr = booking.checkInTime || "TBD";

  // Generate form link (in production, this would be a unique tokenized link)
  const formLink = `/customer/bookings/${booking.id}/yipyygo-form`;

  const requirementText =
    requirement === "mandatory"
      ? "required"
      : "recommended";

  const subject = `Complete Your Pre-Check-In Form - ${booking.petName}'s ${formatServiceName(booking.service)}`;

  const body = `Hi there!

Your ${formatServiceName(booking.service)} booking for ${booking.petName} is confirmed!

📅 Date: ${dateStr}
⏰ Check-in Time: ${timeStr}

To fast-track your check-in process, please complete your YipyyGo pre-check-in form. This form is ${requirementText} and helps us prepare for ${booking.petName}'s visit.

The form includes:
• Pet information
• Care instructions
• Medications (if any)
• Feeding schedule
• Emergency contact details
• Special requests

Completing this form in advance will make your check-in quick and smooth!`;

  return {
    subject,
    body,
    ctaText: "Complete Your YipyyGo Form",
    ctaLink: formLink,
    summary: {
      petName: booking.petName,
      serviceType: formatServiceName(booking.service),
      date: dateStr,
      time: timeStr,
    },
    channels: config.timing.deliveryChannels,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map booking service string to YipyyGo service type
 */
function mapBookingServiceToYipyyGoService(
  service: string
): ServiceType | null {
  const serviceMap: Record<string, ServiceType> = {
    daycare: "daycare",
    boarding: "boarding",
    grooming: "grooming",
    training: "training",
  };

  return serviceMap[service.toLowerCase()] || null;
}

/**
 * Format service name for display
 */
function formatServiceName(service: string): string {
  const serviceNames: Record<string, string> = {
    daycare: "Daycare",
    boarding: "Boarding",
    grooming: "Grooming",
    training: "Training",
  };

  return (
    serviceNames[service.toLowerCase()] ||
    service.charAt(0).toUpperCase() + service.slice(1)
  );
}

/**
 * Calculate when to schedule the send (based on initial send time)
 */
function calculateScheduledSendTime(
  checkInDate: Date,
  initialSendTimeHours: number
): Date {
  const sendTime = new Date(checkInDate);
  sendTime.setHours(sendTime.getHours() - initialSendTimeHours);
  return sendTime;
}

/**
 * Check if a booking was created last-minute
 * (within the initial send time window)
 */
export function isLastMinuteBooking(
  booking: BookingForYipyyGo,
  initialSendTimeHours: number
): boolean {
  const checkInDate = new Date(booking.startDate);
  if (booking.checkInTime) {
    const [hours, minutes] = booking.checkInTime.split(":").map(Number);
    checkInDate.setHours(hours, minutes, 0, 0);
  }

  const now = new Date();
  const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilCheckIn <= initialSendTimeHours;
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Process booking confirmation and trigger YipyyGo if needed
 * This should be called when a booking status changes to "confirmed"
 */
export async function processBookingConfirmationForYipyyGo(
  booking: BookingForYipyyGo
): Promise<{
  triggered: boolean;
  sent: boolean;
  scheduled: boolean;
  message?: YipyyGoMessage;
}> {
  const triggerResult = shouldTriggerYipyyGo(booking, booking.facilityId);

  if (!triggerResult.shouldTrigger) {
    return {
      triggered: false,
      sent: false,
      scheduled: false,
    };
  }

  // If send immediately, send now
  if (triggerResult.sendImmediately && triggerResult.message) {
    await sendYipyyGoNotification(triggerResult.message, booking);
    return {
      triggered: true,
      sent: true,
      scheduled: false,
      message: triggerResult.message,
    };
  }

  // Otherwise, schedule for later
  if (triggerResult.scheduledSendTime && triggerResult.message) {
    await scheduleYipyyGoNotification(
      triggerResult.message,
      booking,
      triggerResult.scheduledSendTime
    );
    return {
      triggered: true,
      sent: false,
      scheduled: true,
      message: triggerResult.message,
    };
  }

  return {
    triggered: true,
    sent: false,
    scheduled: false,
    message: triggerResult.message,
  };
}

/**
 * Send YipyyGo notification immediately
 * In production, this would integrate with email/SMS/push services
 */
async function sendYipyyGoNotification(
  message: YipyyGoMessage,
  booking: BookingForYipyyGo
): Promise<void> {
  // TODO: Integrate with actual notification service
  // For now, this is a placeholder

  console.log("Sending YipyyGo notification:", {
    bookingId: booking.id,
    channels: message.channels,
    subject: message.subject,
  });

  // In production:
  // - Send email via email service
  // - Send SMS via SMS service
  // - Send push notification via push service
  // - Log in notification history
}

/**
 * Schedule YipyyGo notification for later
 * In production, this would use a job queue or scheduler
 */
async function scheduleYipyyGoNotification(
  message: YipyyGoMessage,
  booking: BookingForYipyyGo,
  sendTime: Date
): Promise<void> {
  // TODO: Integrate with job queue/scheduler
  // For now, this is a placeholder

  console.log("Scheduling YipyyGo notification:", {
    bookingId: booking.id,
    sendTime: sendTime.toISOString(),
    channels: message.channels,
  });

  // In production:
  // - Add to job queue (e.g., Bull, Agenda, etc.)
  // - Store in database with scheduled time
  // - Job will execute at sendTime and call sendYipyyGoNotification
}
