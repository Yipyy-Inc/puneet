import { sendEmail, type DeliveryResult } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  buildOwnerConfirmationEmail,
  buildStaffSubmissionEmail,
} from "@/lib/yipyy-go/emails";

// ============================================================================
// Sending what a submitted pre-arrival form sends.
//
// Both go through sendEmail(), which answers whether it sent and, if not, why.
//
// ── THE FACILITY'S NOTICE USES THE SERVICE ROLE ───────────────────────────
//
// The owner who submitted may not read the facility's staff addresses, and
// should not: yipyy_go_staff_recipients() is executable by the service role
// alone and lists the active owners and admins only while the form is sent.
// It runs in after(), so the owner is not kept waiting on N deliveries; a
// failure is logged, never thrown into a response already sent.
//
// ── THE OWNER'S CONFIRMATION CHECKS THEIR OPT-OUTS ────────────────────────
//
// It confirms something the owner did, so it is transactional: a marketing
// opt-out does not stop it, a withdrawal from all mail does (isSuppressed,
// which fails closed).
// ============================================================================

/** Staff emails are in English, as every other staff email in the product is;
 *  the facility has no language of its own to send in yet. */
export const STAFF_EMAIL_LOCALE = "en" as const;

export async function notifyStaffOfSubmission(input: {
  submissionId: string;
  facilityName: string;
  clientName: string;
  petName: string;
  serviceLabel: string;
  arrivalLabel: string;
  bookingUrl: string;
  origin: string;
}): Promise<void> {
  if (!hasServiceRoleKey()) {
    console.warn("[yipyy-go] staff notice not sent: no service role key");
    return;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("yipyy_go_staff_recipients", {
    p_submission_id: input.submissionId,
  });
  if (error) {
    console.warn("[yipyy-go] could not list who to notify:", error.message);
    return;
  }

  const recipients = (data ?? []) as {
    email: string;
    full_name: string | null;
  }[];
  if (recipients.length === 0) return;

  const email = buildStaffSubmissionEmail({
    facilityName: input.facilityName,
    clientName: input.clientName,
    petName: input.petName,
    serviceLabel: input.serviceLabel,
    arrivalLabel: input.arrivalLabel,
    bookingUrl: input.bookingUrl,
    origin: input.origin,
  });

  const results = await Promise.allSettled(
    recipients.map((recipient) => sendEmail({ to: recipient.email, ...email })),
  );
  const notSent = results.filter(
    (result) => result.status === "rejected" || !result.value.sent,
  ).length;
  if (notSent > 0) {
    console.warn(
      `[yipyy-go] staff notice: ${notSent} of ${recipients.length} not sent`,
    );
  }
}

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
