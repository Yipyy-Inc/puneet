import {
  buildCustomerChangesRequested,
  buildCustomerFormConfirmation,
} from "@/lib/forms/emails";
import { staffNoticeWanted } from "@/lib/forms/notice-rules";
import { sendEmail } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { notifyStaff } from "@/lib/notifications/notify-staff";
import { facilityCustomerLinkOrigin } from "@/lib/public-origin";
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
  /** The submission, so a retried request notifies nobody twice. */
  submissionId: string;
  /** Whoever filed it; staff filing on a customer's behalf are not told. */
  actorProfileId: string | null;
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
    // The facility's switches still decide WHETHER staff hear (a flagged
    // answer, an attachment, every submission). WHO hears is the notification
    // fan-out now: everyone who follows forms and may see clients, in the bell,
    // and by email for those who switched email on — not every owner and admin
    // by email regardless.
    sends.push(
      notifyStaff({
        facilityId: input.facilityId,
        kind: "form_submitted",
        params: {
          form: input.formName,
          client: client?.name ?? undefined,
        },
        link: "/facility/dashboard/forms/submissions",
        sourceId: input.submissionId,
        dedupeKey: `form_submitted:${input.submissionId}`,
        actorProfileId: input.actorProfileId,
        request: input.request,
      }),
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

/**
 * Staff sent a submission back for changes: tell the customer, with the note,
 * when the facility's `formRejectedNeedsCorrection` is on. Transactional, so a
 * marketing opt-out does not stop it and a withdrawal from all mail does.
 */
export async function notifyChangesRequested(input: {
  facilityId: string;
  formId: string | null;
  clientId: string | null;
  note: string;
  request: Request;
}): Promise<void> {
  if (!hasServiceRoleKey() || !input.clientId) return;
  const settings = await formSettingsFor(input.facilityId);
  if (!settings.notifications.customer.formRejectedNeedsCorrection) return;

  const admin = createAdminClient();
  const [facilityResult, clientResult, formResult] = await Promise.all([
    admin
      .from("facilities")
      .select("name, slug")
      .eq("id", input.facilityId)
      .maybeSingle(),
    admin
      .from("clients")
      .select("email, preferred_language")
      .eq("id", input.clientId)
      .maybeSingle(),
    input.formId
      ? admin
          .from("forms")
          .select("name, slug")
          .eq("id", input.formId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const facility = facilityResult.data as {
    name: string;
    slug: string | null;
  } | null;
  const client = clientResult.data as {
    email: string | null;
    preferred_language: string | null;
  } | null;
  const form = formResult.data as { name: string; slug: string } | null;

  const to = client?.email?.trim();
  if (!to) return;
  const check = await isSuppressed(admin, {
    facilityId: input.facilityId,
    channel: "email",
    address: to,
    isTransactional: true,
  });
  if (check.suppressed) return;

  const origin = facilityCustomerLinkOrigin(facility?.slug, input.request);
  const email = buildCustomerChangesRequested({
    formName: form?.name ?? "your form",
    facilityName: facility?.name ?? "Your facility",
    note: input.note,
    locale: client?.preferred_language?.startsWith("fr") ? "fr" : "en",
    formUrl: form?.slug
      ? `${origin}/forms/${encodeURIComponent(form.slug)}`
      : `${origin}/customer/documents`,
    origin,
  });
  const result = await sendEmail({ to, ...email });
  if (!result.sent) {
    console.warn("[forms] changes-requested notice not sent:", result.detail);
  }
}
