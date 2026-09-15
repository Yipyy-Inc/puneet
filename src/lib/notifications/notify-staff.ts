import "server-only";

import {
  NOTIFICATION_KINDS,
  notificationRoleDefaultsSchema,
  SHIPPED_NOTIFICATION_ROLE_DEFAULTS,
  type NotificationKind,
  type NotificationKindSpec,
} from "@/lib/notifications/catalog";
import {
  staffNotificationEmail,
  type NotificationParams,
} from "@/lib/notifications/staff-email";
import { escapeHtml, renderEmail } from "@/lib/email/shell";
import { sendEmail } from "@/lib/messaging/send";
import { facilityStaffLinkOrigin } from "@/lib/public-origin";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Tell the facility's staff that something happened.
//
// The one way a staff notification is created. It asks `notify_staff` (service
// role only) to fan the event out — everyone with the kind's permission whose
// own switch, or their role's default, is on — and emails those who switched
// email on for the category and were newly notified, so a retried request
// never mails twice.
//
// BEST EFFORT, AND NEVER THROWS. It runs after the thing it reports has
// already happened: a booking request that was saved must not be reported to
// the customer as failed because the bell could not be rung. Failures are
// logged. Call it inside `after()` so nobody waits on the emails.
// ============================================================================

export interface NotifyStaffInput {
  facilityId: string;
  kind: NotificationKind;
  params?: NotificationParams;
  /** A path in the staff portal, e.g. /facility/dashboard/bookings/123. */
  link?: string | null;
  sourceId?: string | null;
  /** Identifies the event, so a retry notifies nobody twice. */
  dedupeKey: string;
  /** Whoever caused it; they are not told about their own action. */
  actorProfileId?: string | null;
  /** Address only these members — a decision back to whoever asked. */
  onlyMembershipIds?: string[];
  request: Request;
}

export async function notifyStaff(input: NotifyStaffInput): Promise<void> {
  try {
    if (!hasServiceRoleKey()) {
      console.warn("[notifications] not recorded: no service role key");
      return;
    }
    const admin = createAdminClient();
    const spec: NotificationKindSpec = NOTIFICATION_KINDS[input.kind];

    const [{ data: settingsRow }, { data: facilityRow }] = await Promise.all([
      admin
        .from("facility_settings")
        .select("value")
        .eq("facility_id", input.facilityId)
        .eq("domain", "notification_role_defaults")
        .maybeSingle(),
      admin
        .from("facilities")
        .select("name, slug")
        .eq("id", input.facilityId)
        .maybeSingle(),
    ]);
    const stored = notificationRoleDefaultsSchema.safeParse(
      (settingsRow as { value?: unknown } | null)?.value,
    );
    const roleDefaults = stored.success
      ? stored.data
      : SHIPPED_NOTIFICATION_ROLE_DEFAULTS;

    const params = Object.fromEntries(
      Object.entries(input.params ?? {}).filter(([, v]) => v !== undefined),
    );

    const fanOut = admin.rpc.bind(admin) as unknown as (
      fn: "notify_staff",
      args: Record<string, unknown>,
    ) => PromiseLike<{
      data:
        | {
            membership_id: string;
            email: string | null;
            full_name: string | null;
            created: boolean;
            send_email: boolean;
          }[]
        | null;
      error: { message: string } | null;
    }>;

    const { data, error } = await fanOut("notify_staff", {
      p_facility_id: input.facilityId,
      p_kind: input.kind,
      p_category: spec.category,
      p_permission: spec.permission,
      p_mandatory: spec.mandatory,
      p_urgent: spec.urgent,
      p_params: params,
      p_link: input.link ?? null,
      p_source_id: input.sourceId ?? null,
      p_dedupe_key: input.dedupeKey,
      p_role_defaults: roleDefaults.roles,
      p_actor_profile_id: input.actorProfileId ?? null,
      p_only_memberships: input.onlyMembershipIds ?? null,
    });
    if (error) {
      console.warn(
        `[notifications] ${input.kind} not recorded:`,
        error.message,
      );
      return;
    }

    const mail = (data ?? []).filter((row) => row.send_email && row.email);
    if (mail.length === 0) return;

    const facility = facilityRow as {
      name: string;
      slug: string | null;
    } | null;
    const origin = facilityStaffLinkOrigin(facility?.slug, input.request);
    const url = input.link ? `${origin}${input.link}` : null;
    const message = staffNotificationEmail({
      kind: input.kind,
      params,
      facilityName: facility?.name ?? "Yipyy",
      url,
    });
    const html = renderEmail({
      preheader: message.subject,
      heading: message.subject,
      paragraphs: message.text
        .split("\n\n")
        .map((p) => escapeHtml(p).replace(/\n/g, "<br>")),
      ...(url ? { cta: { label: "Open", url } } : {}),
      footer: facility?.name ?? "",
      origin,
    });

    const results = await Promise.allSettled(
      mail.map((row) =>
        sendEmail({
          to: row.email as string,
          subject: message.subject,
          text: message.text,
          html,
        }),
      ),
    );
    const notSent = results.filter(
      (r) => r.status === "rejected" || !r.value.sent,
    ).length;
    if (notSent > 0) {
      console.warn(
        `[notifications] ${input.kind}: ${notSent} of ${mail.length} emails not sent`,
      );
    }
  } catch (failure) {
    console.warn(`[notifications] ${input.kind} failed:`, failure);
  }
}
