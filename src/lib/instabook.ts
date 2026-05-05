import type { Client, CustomerSettings } from "@/types/client";
import type { Membership, MembershipPlan } from "@/data/services-pricing";
import type { BookingRequestService } from "@/types/booking";

export type InstabookSource = "customer-setting" | "membership";

export interface InstabookEligibility {
  eligible: boolean;
  source?: InstabookSource;
  membershipPlanName?: string;
}

function instabookFlagFor(
  service: BookingRequestService,
  settings: CustomerSettings | undefined,
): boolean {
  if (!settings) return false;
  if (service === "daycare") return settings.instabookDaycare;
  if (service === "boarding") return settings.instabookBoarding;
  if (service === "grooming") return settings.instabookGrooming;
  return false;
}

/**
 * Decides whether a customer's booking should bypass the booking-requests
 * queue and be confirmed instantly. Two paths grant instabook:
 *   1. The per-customer `customerSettings.instabook<Service>` flag.
 *   2. An active membership whose plan lists the service in `instabookServices`.
 */
export function resolveInstabookEligibility({
  client,
  service,
  customerMemberships,
  membershipPlans,
}: {
  client: Pick<Client, "customerSettings"> | undefined;
  service: BookingRequestService;
  customerMemberships: Membership[];
  membershipPlans: MembershipPlan[];
}): InstabookEligibility {
  if (instabookFlagFor(service, client?.customerSettings)) {
    return { eligible: true, source: "customer-setting" };
  }

  const activeMembership = customerMemberships.find((m) => m.status === "active");
  if (activeMembership) {
    const plan = membershipPlans.find((p) => p.id === activeMembership.planId);
    const instabookServices = plan?.instabookServices;
    if (
      instabookServices?.includes(service as (typeof instabookServices)[number])
    ) {
      return {
        eligible: true,
        source: "membership",
        membershipPlanName: plan?.name ?? activeMembership.planName,
      };
    }
  }

  return { eligible: false };
}
