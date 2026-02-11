/**
 * Grooming Post-Booking Workflow
 * 
 * Handles all actions that occur after a grooming booking is confirmed:
 * - Immediate notifications (client, groomer)
 * - Recurring appointment scheduling
 * - 24-hour reminders
 * - Day-of notifications and check-in
 */

export interface GroomingBookingData {
  id: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  petId: number;
  petName: string;
  serviceCategory: string;
  serviceVariant?: string;
  addOns: string[];
  groomerId?: string;
  groomerName?: string;
  groomerTier?: string;
  serviceLocation: "salon" | "mobile";
  address?: string;
  salonLocationId?: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number; // in minutes
  totalPrice: number;
  depositAmount: number;
  depositMethod: "full" | "deposit" | "hold" | "venue";
  recurringEnabled: boolean;
  recurringFrequency?: number; // weeks
  recurringEndAfter?: "occurrences" | "date" | "never";
  recurringOccurrences?: number;
  recurringEndDate?: Date;
  keepSameGroomer?: boolean;
  petBehaviorNotes?: string;
  specialInstructions?: string;
  lastVisitDate?: Date;
  petNotes?: string; // e.g., "Nervous with dryers"
}

export interface GroomerNotification {
  groomerId: string;
  groomerName: string;
  notificationType: "app" | "sms";
  message: string;
  bookingId: string;
}

export interface ClientConfirmation {
  bookingId: string;
  manageBookingLink: string;
  emailSent: boolean;
  smsSent: boolean;
  icsFileGenerated: boolean;
}

/**
 * Immediate post-booking actions
 */
export async function handleImmediatePostBookingActions(
  bookingData: GroomingBookingData
): Promise<{
  clientConfirmation: ClientConfirmation;
  groomerNotifications: GroomerNotification[];
  recurringBookings?: GroomingBookingData[];
}> {
  // 1. Send client confirmation with "Manage Booking" link
  const manageBookingLink = `/customer/bookings/${bookingData.id}`;
  const clientConfirmation = await sendClientConfirmation(bookingData, manageBookingLink);

  // 2. Send groomer notification
  const groomerNotifications = await sendGroomerNotification(bookingData);

  // 3. If recurring, schedule next 3 occurrences tentatively
  let recurringBookings: GroomingBookingData[] | undefined;
  if (bookingData.recurringEnabled && bookingData.recurringFrequency) {
    recurringBookings = await scheduleRecurringAppointments(bookingData, 3);
  }

  return {
    clientConfirmation,
    groomerNotifications,
    recurringBookings,
  };
}

/**
 * Send client confirmation email/SMS with "Manage Booking" link
 */
async function sendClientConfirmation(
  bookingData: GroomingBookingData,
  manageBookingLink: string
): Promise<ClientConfirmation> {
  // TODO: Replace with actual API calls
  // In production, this would:
  // 1. Send email with confirmation details and .ics file
  // 2. Send SMS with confirmation and link
  // 3. Generate .ics calendar file

  const confirmationEmail = {
    to: bookingData.clientEmail,
    subject: `Booking Confirmed - ${bookingData.petName}'s ${bookingData.serviceCategory}`,
    body: `
Hi ${bookingData.clientName},

Your grooming appointment has been confirmed!

Pet: ${bookingData.petName}
Service: ${bookingData.serviceCategory}${bookingData.serviceVariant ? ` (${bookingData.serviceVariant})` : ""}
Date: ${bookingData.appointmentDate.toLocaleDateString("en-US", { 
  weekday: "long", 
  month: "long", 
  day: "numeric", 
  year: "numeric" 
})}
Time: ${bookingData.appointmentTime}
Location: ${bookingData.serviceLocation === "mobile" ? `Mobile van at ${bookingData.address}` : "Salon"}
Duration: ${Math.floor(bookingData.duration / 60)} hours ${bookingData.duration % 60} minutes
Total: $${bookingData.totalPrice.toFixed(2)}

Manage your booking: ${manageBookingLink}

We look forward to seeing you!

Best regards,
${bookingData.serviceLocation === "salon" ? "The Grooming Team" : "Mobile Grooming Team"}
    `.trim(),
    attachments: [
      {
        filename: "appointment.ics",
        content: generateICSFile(bookingData),
      },
    ],
  };

  const confirmationSMS = {
    to: bookingData.clientPhone,
    message: `Hi ${bookingData.clientName}! Your grooming appointment for ${bookingData.petName} is confirmed for ${bookingData.appointmentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${bookingData.appointmentTime}. Manage booking: ${manageBookingLink}`,
  };

  // Simulate API calls
  await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 500)), // Email
    new Promise((resolve) => setTimeout(resolve, 500)), // SMS
  ]);

  return {
    bookingId: bookingData.id,
    manageBookingLink,
    emailSent: true,
    smsSent: true,
    icsFileGenerated: true,
  };
}

/**
 * Send groomer notification (app or SMS)
 */
async function sendGroomerNotification(
  bookingData: GroomingBookingData
): Promise<GroomerNotification[]> {
  if (!bookingData.groomerId) {
    return []; // No specific groomer assigned
  }

  const lastVisitText = bookingData.lastVisitDate
    ? `Last visit: ${bookingData.lastVisitDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "First visit";

  const addOnsText = bookingData.addOns.length > 0
    ? ` + ${bookingData.addOns.join(", ")}`
    : "";

  const notesText = bookingData.petNotes
    ? ` Notes: ${bookingData.petNotes}`
    : "";

  const message = `New booking: ${bookingData.petName}, ${bookingData.serviceCategory}${addOnsText}, ${bookingData.appointmentTime} ${bookingData.appointmentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}. ${lastVisitText}.${notesText}`;

  // TODO: Replace with actual notification service
  // In production, this would send to groomer's app or SMS based on preferences

  const notification: GroomerNotification = {
    groomerId: bookingData.groomerId,
    groomerName: bookingData.groomerName || "Groomer",
    notificationType: "app", // Could be "sms" based on groomer preferences
    message,
    bookingId: bookingData.id,
  };

  await new Promise((resolve) => setTimeout(resolve, 300));

  return [notification];
}

/**
 * Schedule recurring appointments (tentatively)
 */
async function scheduleRecurringAppointments(
  bookingData: GroomingBookingData,
  count: number
): Promise<GroomingBookingData[]> {
  if (!bookingData.recurringFrequency) {
    return [];
  }

  const recurringBookings: GroomingBookingData[] = [];
  const frequencyWeeks = bookingData.recurringFrequency;

  for (let i = 1; i <= count; i++) {
    const nextDate = new Date(bookingData.appointmentDate);
    nextDate.setDate(nextDate.getDate() + frequencyWeeks * 7 * i);

    // Check if we should stop based on end conditions
    if (bookingData.recurringEndAfter === "occurrences" && bookingData.recurringOccurrences) {
      if (i >= bookingData.recurringOccurrences) {
        break;
      }
    } else if (bookingData.recurringEndAfter === "date" && bookingData.recurringEndDate) {
      if (nextDate > bookingData.recurringEndDate) {
        break;
      }
    }

    const recurringBooking: GroomingBookingData = {
      ...bookingData,
      id: `${bookingData.id}-recurring-${i}`,
      appointmentDate: nextDate,
      // Mark as tentative - will be confirmed 48 hours prior
      // status: "tentative",
    };

    recurringBookings.push(recurringBooking);
  }

  // TODO: Save recurring bookings to database
  await new Promise((resolve) => setTimeout(resolve, 500));

  return recurringBookings;
}

/**
 * Generate .ics calendar file content
 */
function generateICSFile(bookingData: GroomingBookingData): string {
  const startDateTime = new Date(bookingData.appointmentDate);
  const [hours, minutes] = bookingData.appointmentTime.split(":").map(Number);
  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + bookingData.duration);

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Grooming Booking//EN
BEGIN:VEVENT
UID:${bookingData.id}@grooming
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:${bookingData.petName} - ${bookingData.serviceCategory}
DESCRIPTION:${bookingData.serviceCategory}${bookingData.serviceVariant ? ` (${bookingData.serviceVariant})` : ""} for ${bookingData.petName}
LOCATION:${bookingData.serviceLocation === "mobile" ? bookingData.address : "Salon"}
END:VEVENT
END:VCALENDAR`;
}

/**
 * Schedule 24-hour reminder
 */
export async function schedule24HourReminder(bookingData: GroomingBookingData): Promise<void> {
  const reminderTime = new Date(bookingData.appointmentDate);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(9, 0, 0, 0); // 9 AM the day before

  // TODO: Schedule reminder job/cron
  // In production, this would be handled by a job scheduler

  const mobileArrivalText = bookingData.serviceLocation === "mobile"
    ? " Van will arrive between 8:45-9:15 AM."
    : "";

  const reminderMessage = `Hi ${bookingData.clientName}! Reminder: ${bookingData.petName}'s ${bookingData.serviceCategory} appointment is tomorrow at ${bookingData.appointmentTime}.${mobileArrivalText} Reply YES to confirm or RESCHEDULE to change.`;

  // TODO: Send SMS at scheduled time
  console.log(`Scheduled 24-hour reminder for ${reminderTime.toISOString()}:`, reminderMessage);
}

/**
 * Handle day-of check-in (Salon)
 */
export async function handleSalonCheckIn(
  bookingId: string,
  clientId: number
): Promise<void> {
  // TODO: Notify front desk
  // In production, this would send notification to facility staff

  const notification = {
    type: "check_in",
    bookingId,
    clientId,
    message: "I'm here",
    timestamp: new Date().toISOString(),
  };

  console.log("Salon check-in notification:", notification);
}

/**
 * Handle mobile groomer arrival notification
 */
export async function handleMobileGroomerArrival(
  bookingId: string,
  clientId: number,
  estimatedArrival: Date
): Promise<void> {
  // TODO: Send notification to client
  // Triggered when previous appointment is marked complete

  const notification = {
    type: "groomer_arrival",
    bookingId,
    clientId,
    message: "Groomer is 10 minutes away",
    estimatedArrival: estimatedArrival.toISOString(),
    timestamp: new Date().toISOString(),
  };

  console.log("Mobile groomer arrival notification:", notification);
}
