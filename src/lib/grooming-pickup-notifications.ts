import { type GroomingAppointment } from "@/data/grooming";

interface GroomingSettings {
  autoReadyForPickupSMS?: boolean;
  autoReadyForPickupEmail?: boolean;
}

/**
 * Send pickup notifications when appointment is marked as "ready-for-pickup"
 */
export async function sendPickupNotifications(
  appointment: GroomingAppointment,
  settings: GroomingSettings
): Promise<{ smsSent: boolean; emailSent: boolean }> {
  const results = { smsSent: false, emailSent: false };

  // Check if notifications are enabled
  if (!settings.autoReadyForPickupSMS && !settings.autoReadyForPickupEmail) {
    return results;
  }

  // Prepare notification content
  const petName = appointment.petName;
  const ownerName = appointment.ownerName;
  const ownerPhone = appointment.ownerPhone;
  const ownerEmail = appointment.ownerEmail;
  const packageName = appointment.packageName;
  const date = new Date(appointment.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Send SMS if enabled
  if (settings.autoReadyForPickupSMS && ownerPhone) {
    try {
      const smsMessage = `Hi ${ownerName}! ${petName}'s ${packageName} is complete and ready for pickup. Please come by to collect your pet. Thank you!`;
      
      // TODO: Replace with actual SMS API call (e.g., Twilio)
      await sendSMS(ownerPhone, smsMessage);
      results.smsSent = true;
    } catch (error) {
      console.error("Failed to send pickup SMS:", error);
    }
  }

  // Send Email if enabled
  if (settings.autoReadyForPickupEmail && ownerEmail) {
    try {
      const emailSubject = `${petName}'s Grooming is Ready for Pickup!`;
      const emailBody = `
Hi ${ownerName},

Great news! ${petName}'s ${packageName} is complete and ready for pickup.

Appointment Details:
- Pet: ${petName}
- Service: ${packageName}
- Date: ${date}
- Stylist: ${appointment.stylistName}

Please come by to collect your pet at your earliest convenience.

Thank you for choosing our grooming services!

Best regards,
The Grooming Team
      `.trim();

      // TODO: Replace with actual Email API call
      await sendEmail(ownerEmail, emailSubject, emailBody);
      results.emailSent = true;
    } catch (error) {
      console.error("Failed to send pickup email:", error);
    }
  }

  return results;
}

/**
 * Send SMS notification (placeholder - replace with actual SMS service)
 */
async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  // TODO: Integrate with SMS provider (e.g., Twilio, AWS SNS)
  // Example:
  // await twilioClient.messages.create({
  //   to: phoneNumber,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   body: message,
  // });
  
  // For now, just log the SMS
  console.log(`[SMS] To: ${phoneNumber}, Message: ${message}`);
  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API call
}

/**
 * Send Email notification (placeholder - replace with actual Email service)
 */
async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // TODO: Integrate with Email provider (e.g., SendGrid, AWS SES, Nodemailer)
  // Example:
  // await emailClient.send({
  //   to,
  //   from: process.env.EMAIL_FROM,
  //   subject,
  //   text: body,
  // });
  
  // For now, just log the email
  console.log(`[Email] To: ${to}, Subject: ${subject}, Body: ${body}`);
  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API call
}
