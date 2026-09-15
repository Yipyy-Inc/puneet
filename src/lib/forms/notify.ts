import {
  buildCustomerFormConfirmation,
  buildStaffFormEmail,
} from "@/lib/forms/emails";
import { staffNoticeWanted } from "@/lib/forms/notice-rules";
import { sendEmail } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import {
  facilityCustomerLinkOrigin,
  facilityStaffLinkOrigin,
} from "@/lib/public-origin";
import { SETTING_DOMAINS } from "@/lib/settings/domains";
import type {
  FormNotifications,
  FormRedFlags,
} from "@/lib/settings/form-settings";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// What a submitted facility form sends, and the settings that decide it.
//
// ── READ WITH THE SERVICE ROLE ────────────────────────────────────────────
//
// The customer who submits cannot read the facility's settings, and should
// not. `form_notifications` and `form_red_flags` are read here by facility id,
// from the form's own row, and a stored value that no longer parses is the
// domain's fallback, as the settings API treats it.
//
// ── SENT AFTER THE ANSWER ─────────────────────────────────────────────────
//
// The submit route calls this in after(), so the customer is not kept waiting
// on deliveries. Nothing here throws: a failed send is logged.
// ============================================================================

export interface FormSettings {
  notifications: FormNotifications;
  redFlags: FormRedFlags;
}

export async function formSettingsFor(
  facilityId: string,
): Promise<FormSettings> {
  const fallback: FormSettings = {
    notifications: SETTING_DOMAINS.form_notifications.fallback,
    redFlags: SETTING_DOMAINS.form_red_flags.fallback,
  };
  if (!hasServiceRoleKey()) return fallback;

  const { data } = await createAdminClient()
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", facilityId)
    .in("domain", ["form_notifications", "form_red_flags"]);
  const rows = (data ?? []) as { domain: string; value: unknown }[];
  const stored = (domain: string) =>
    rows.find((row) => row.domain === domain)?.value;

  const notifications = SETTING_DOMAINS.form_notifications.schema.safeParse(
    stored("form_notifications"),
  );
  const redFlags = SETTING_DOMAINS.form_red_flags.schema.safeParse(
    stored("form_red_flags"),
  );
  return {
    notifications: notifications.success
      ? notifications.data
      : fallback.notifications,
    redFlags: redFlags.success ? redFlags.data : fallback.redFlags,
  };
}

export async function notifyFormSubmitted(input: {
  facilityId: string;
  formName: string;
  clientId: string | null;
  flags: string[];
  hasFiles: boolean;
  notifications: FormNotifications;
  request: Request;
}): Promise<void> {
  if (!hasServiceRoleKey()) {
    console.warn("[forms] submission notices not sent: no service role key");
    return;
  }
  const admin = createAdminClient();

  const { data: facilityRow } = await admin
    .from("facilities")
    .select("name, slug")
    .eq("id", input.facilityId)
    .maybeSingle();
  const facility = facilityRow as { name: string; slug: string | null } | null;
  const facilityName = facility?.name ?? "Your facility";

  const { data: clientRow } = input.clientId
    ? await admin
        .from("clients")
        .select("name, email, preferred_language")
        .eq("id", input.clientId)
        .maybeSingle()
    : { data: null };
  const client = clientRow as {
    name: string;
    email: string | null;
    preferred_language: string | null;
  } | null;

  const sends: Promise<void>[] = [];

  if (
    staffNoticeWanted(input.notifications, {
      flagged: input.flags.length > 0,
      hasFiles: input.hasFiles,
    })
  ) {
    sends.push(
      (async () => {
        const listRecipients = admin.rpc.bind(admin) as unknown as (
          fn: "facility_staff_recipients",
          args: { p_facility_id: string },
        ) => PromiseLike<{
          data: { email: string }[] | null;
          error: { message: string } | null;
        }>;
        const { data, error } = await listRecipients(
          "facility_staff_recipients",
          { p_facility_id: input.facilityId },
        );
        if (error) {
          console.warn("[forms] could not list who to notify:", error.message);
          return;
        }
        const recipients = data ?? [];
        if (recipients.length === 0) return;
        const origin = facilityStaffLinkOrigin(facility?.slug, input.request);
        const email = buildStaffFormEmail({
          facilityName,
          formName: input.formName,
          clientName: client?.name ?? null,
          flags: input.flags,
          hasFiles: input.hasFiles,
          inboxUrl: `${origin}/facility/dashboard/forms/submissions`,
          origin,
        });
        const results = await Promise.allSettled(
          recipients.map((r) => sendEmail({ to: r.email, ...email })),
        );
        const notSent = results.filter(
          (result) => result.status === "rejected" || !result.value.sent,
        ).length;
        if (notSent > 0) {
          console.warn(
            `[forms] staff notice: ${notSent} of ${recipients.length} not sent`,
          );
        }
      })(),
    );
  }

  const to = client?.email?.trim();
  if (input.notifications.customer.submissionConfirmed && to) {
    sends.push(
      (async () => {
        const check = await isSuppressed(admin, {
          facilityId: input.facilityId,
          channel: "email",
          address: to,
          isTransactional: true,
        });
        if (check.suppressed) return;
        const origin = facilityCustomerLinkOrigin(
          facility?.slug,
          input.request,
        );
        const email = buildCustomerFormConfirmation({
          formName: input.formName,
          facilityName,
          locale: client?.preferred_language?.startsWith("fr") ? "fr" : "en",
          documentsUrl: `${origin}/customer/documents`,
          origin,
        });
        const result = await sendEmail({ to, ...email });
        if (!result.sent) {
          console.warn("[forms] confirmation not sent:", result.detail);
        }
      })(),
    );
  }

  await Promise.allSettled(sends);
}
