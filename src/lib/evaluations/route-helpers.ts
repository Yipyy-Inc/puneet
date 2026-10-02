import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import {
  deliverEvaluationCard,
  type CardDelivery,
} from "@/lib/evaluations/deliver-card";
import { facilityCustomerLinkOrigin } from "@/lib/public-origin";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// What finishing and sending share: which channels a card can go out on, and
// telling the owner once it has.
// ============================================================================

/**
 * The channels a card goes out on besides the portal: each one Setup turned
 * on, that the client has an address for — and, when a reviewer chose, only
 * the ones they kept ("Send by").
 */
export function cardChannels(
  detail: EvaluationDetail,
  chosen?: readonly string[],
): Array<"email" | "sms"> {
  const possible: Array<"email" | "sms"> = [];
  if (detail.delivery.notifyViaEmail && detail.client.hasEmail) {
    possible.push("email");
  }
  if (detail.delivery.notifyViaSMS && detail.client.hasPhone) {
    possible.push("sms");
  }
  return chosen ? possible.filter((c) => chosen.includes(c)) : possible;
}

/** Email and text the owner, through the server's own client. */
export async function tellOwner(
  supabase: SupabaseClient,
  request: Request,
  evaluationId: string,
  facilityId: string | null,
): Promise<CardDelivery[]> {
  if (!hasServiceRoleKey()) return [];
  const admin = createAdminClient();
  const { data: facility } = facilityId
    ? await supabase
        .from("facilities")
        .select("slug")
        .eq("id", facilityId)
        .maybeSingle()
    : { data: null };
  return deliverEvaluationCard(admin, {
    evaluationId,
    customerOrigin: facilityCustomerLinkOrigin(
      (facility as { slug: string | null } | null)?.slug,
      request,
    ),
  });
}
