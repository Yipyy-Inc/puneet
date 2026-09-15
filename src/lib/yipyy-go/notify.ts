import { sendEmail, type DeliveryResult } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { buildOwnerConfirmationEmail } from "@/lib/yipyy-go/emails";

// ============================================================================
// The owner's confirmation for a submitted pre-arrival form, through
// sendEmail(), which answers whether it sent and, if not, why.
//
// The facility's notice is a staff notification now (the submit route calls
// lib/notifications/notify-staff.ts): whoever follows forms hears it, by email
// only if they switched email on.
//
// ── THE OWNER'S CONFIRMATION CHECKS THEIR OPT-OUTS ────────────────────────
//
// It confirms something the owner did, so it is transactional: a marketing
// opt-out does not stop it, a withdrawal from all mail does (isSuppressed,
// which fails closed).
// ============================================================================

export async function sendOwnerConfirmation(input: {
  facilityId: string;
  to: string;
  subject: string;
  message: string;
  petName: string;
  dateLabel: string;
  facilityName: string;
  bookingUrl: string;
  origin: string;
  locale: "en" | "fr";
}): Promise<DeliveryResult> {
  if (hasServiceRoleKey()) {
    const check = await isSuppressed(createAdminClient(), {
      facilityId: input.facilityId,
      channel: "email",
      address: input.to,
      isTransactional: true,
    });
    if (check.suppressed) {
      return { sent: false, detail: check.reason ?? "suppressed" };
    }
  }

  const email = buildOwnerConfirmationEmail({
    subject: input.subject,
    message: input.message,
    petName: input.petName,
    dateLabel: input.dateLabel,
    facilityName: input.facilityName,
    bookingUrl: input.bookingUrl,
    origin: input.origin,
    locale: input.locale,
  });
  return sendEmail({ to: input.to, ...email });
}
