// ============================================================================
// Rendering a message template — {{variable}} substitution, with fallbacks.
//
// Moved here from `@/lib/template-variable-resolver`, which stays as a thin
// re-export plus its preview fixture. Two things were wrong with it living
// there, and both matter the moment an automation sends a real message rather
// than drawing a preview:
//
// ── 1. IT IMPORTED FIXTURES AT MODULE LEVEL ───────────────────────────────
//
// `import { clients } from "@/data/clients"` sat at the top of the file, for
// the benefit of `getMockPreviewData()` alone. Anything that rendered a
// template — including a server route about to email a customer — pulled the
// whole mock client and booking set into its bundle. This module imports
// nothing but types.
//
// ── 2. IT BUILT CUSTOMER-FACING LINKS ─────────────────────────────────────
//
// `portal_link` returned the literal "https://portal.yipyy.com", and
// `invoice_link` and `cancel_link` were built on it. That host is not where a
// facility's customers go: they go to `<slug>.yipyy.com`, and `<slug>` comes
// from the facility ROW. `bun run check:link-origin` exists because a facility
// owner was once emailed the wrong host — but it only walks
// `src/app/api/**/route.ts`, so a literal buried in a lib was invisible to it
// and would have gone out on every automation email.
//
// So this module builds no URLs at all. Links arrive on the context, resolved
// by the caller through `facilityCustomerLinkOrigin()` in `@/lib/public-origin`.
// A caller that supplies none gets the raw `{{portal_link}}` tag back, which is
// visibly broken — the point. A wrong link that works is worse than a tag that
// obviously did not render.
// ============================================================================

import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

// ── Data Context ────────────────────────────────────────────

export interface FacilityInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  checkinHours?: string;
}

export interface PaymentInfo {
  invoiceId: string;
  invoiceTotal: string;
  amountDue: string;
  amountPaid: string;
  paymentLink: string;
  receiptLink: string;
  dueDate: string;
}

export interface StaffInfo {
  assignedName?: string;
  groomerName?: string;
  trainerName?: string;
}

/**
 * Every customer-facing URL a template can reference, supplied by the caller.
 *
 * The caller builds these from `facilityCustomerLinkOrigin(slug)` — never from
 * a request header, and never from a literal in this file. See the header.
 */
export interface TemplateLinks {
  portal: string;
  bookingDetails: string;
  yipyyGo: string;
  invoice: string;
  cancel: string;
}

export interface VariableDataContext {
  customer?: Partial<Client>;
  pets?: Partial<Pet>[];
  booking?: Partial<Booking>;
  facility?: Partial<FacilityInfo>;
  staff?: StaffInfo;
  payment?: Partial<PaymentInfo>;
  links?: Partial<TemplateLinks>;
  /**
   * The facility's (or location's) IANA zone, for formatting dates and times.
   *
   * Omitted, dates format in the SERVER's zone — which is fine for a preview
   * drawn in the browser and wrong for a message sent from a container running
   * UTC. The send path passes it; see `@/lib/time/facility-time`.
   */
  timeZone?: string;
}

// ── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string | undefined, timeZone?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return "";
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }
  return timeStr;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWeightSize(weight: number | undefined): string {
  if (!weight) return "";
  // Thresholds from facilityConfig.petCategories.weightLimits
  if (weight <= 15) return "Small";
  if (weight <= 50) return "Medium";
  if (weight <= 100) return "Large";
  return "Extra Large";
}

// ── Variable Resolution ─────────────────────────────────────

export function resolveVariable(
  key: string,
  data: VariableDataContext,
): string | null {
  const { customer, pets, booking, facility, staff, payment, links, timeZone } =
    data;
  const primaryPet = pets?.[0];

  switch (key) {
    // Customer
    case "customer_first_name":
      return customer?.name?.split(" ")[0] ?? null;
    case "customer_last_name":
      return customer?.name?.split(" ").slice(1).join(" ") ?? null;
    case "customer_full_name":
      return customer?.name ?? null;
    case "customer_phone":
      return customer?.phone ?? null;
    case "customer_email":
      return customer?.email ?? null;
    case "customer_address": {
      const a = customer?.address;
      if (!a) return null;
      return `${a.street}, ${a.city}, ${a.state} ${a.zip}`;
    }
    case "customer_city":
      return customer?.address?.city ?? null;

    // Pet
    case "pet_name":
      return primaryPet?.name ?? null;
    case "pet_breed":
      return primaryPet?.breed ?? null;
    case "pet_size":
      return getWeightSize(primaryPet?.weight) || null;
    case "pet_age":
      return primaryPet?.age?.toString() ?? null;
    case "pet_gender":
      return null; // not in Pet type
    case "pet_names":
      return pets && pets.length > 0
        ? pets.map((p) => p.name).join(", ")
        : null;
    case "pet_count":
      return pets ? pets.length.toString() : null;

    // Booking
    case "booking_id":
      return booking?.id ? `BK-${booking.id}` : null;
    case "service_name":
      return booking?.service ? capitalize(booking.service) : null;
    case "service_category":
      return booking?.serviceType ? capitalize(booking.serviceType) : null;
    case "booking_date":
      return formatDate(booking?.startDate, timeZone) || null;
    case "booking_time":
      return formatTime(booking?.checkInTime) || null;
    case "booking_start_datetime": {
      const d = formatDate(booking?.startDate, timeZone);
      const t = formatTime(booking?.checkInTime);
      return d && t ? `${d} at ${t}` : d || null;
    }
    case "booking_end_datetime": {
      const d = formatDate(booking?.endDate, timeZone);
      const t = formatTime(booking?.checkOutTime);
      return d && t ? `${d} at ${t}` : d || null;
    }
    case "check_in_date":
      return formatDate(booking?.startDate, timeZone) || null;
    case "check_in_time":
      return formatTime(booking?.checkInTime) || null;
    case "check_out_date":
      return formatDate(booking?.endDate, timeZone) || null;
    case "check_out_time":
      return formatTime(booking?.checkOutTime) || null;
    case "booking_status":
      return booking?.status ? capitalize(booking.status) : null;
    case "booking_addons":
      return booking?.extraServices
        ? booking.extraServices
            .map((s) => (typeof s === "string" ? s : s.serviceId))
            .join(", ")
        : null;

    // Facility
    case "facility_name":
      return facility?.name ?? null;
    case "facility_phone":
      return facility?.phone ?? null;
    case "facility_email":
      return facility?.email ?? null;
    case "facility_address":
      return facility?.address ?? null;
    case "facility_website":
      return facility?.website ?? null;
    case "facility_checkin_hours":
      return facility?.checkinHours ?? null;

    // Staff
    case "assigned_staff_name":
      return staff?.assignedName ?? null;
    case "groomer_name":
      return staff?.groomerName ?? null;
    case "trainer_name":
      return staff?.trainerName ?? null;

    // Payment
    case "invoice_id":
      return payment?.invoiceId ?? null;
    case "invoice_total":
      return payment?.invoiceTotal ?? null;
    case "amount_due":
      return payment?.amountDue ?? null;
    case "amount_paid":
      return payment?.amountPaid ?? null;
    case "payment_link":
      return payment?.paymentLink ?? null;
    case "receipt_link":
      return payment?.receiptLink ?? null;
    case "due_date":
      return payment?.dueDate ?? null;

    // Links — supplied, never built. See the header.
    case "portal_link":
      return links?.portal ?? null;
    case "booking_details_link":
      return links?.bookingDetails ?? null;
    case "yipyygo_link":
      return links?.yipyyGo ?? null;
    case "invoice_link":
      return links?.invoice ?? null;
    case "cancel_link":
      return links?.cancel ?? null;

    default:
      return null;
  }
}

// ── Template Resolution ─────────────────────────────────────

export const VARIABLE_PATTERN = /\{\{([a-z_]+)(?:\|([^}]*))?\}\}/g;

/**
 * A tag `resolveTemplate` left behind because it had no value for it.
 *
 * Non-global, so it can be used with `.match()` to ask "is there one" without
 * carrying `lastIndex` between calls the way VARIABLE_PATTERN does.
 *
 * Exported because it is the check that decides whether a rendered message is
 * safe to send, and every sender has to make it. A copy per sender is a copy
 * that can be forgotten in the next one — and what gets sent then is an email
 * containing the literal text "{{check_in_date}}".
 */
export const UNRESOLVED_TAG = /\{\{[a-z_]+(\|[^}]*)?\}\}/;

export function resolveTemplate(
  template: string,
  data: VariableDataContext,
): string {
  return template.replace(VARIABLE_PATTERN, (match, key, fallback) => {
    const resolved = resolveVariable(key, data);
    if (resolved !== null) return resolved;
    if (fallback !== undefined) return fallback;
    return match; // leave raw tag if no data and no fallback
  });
}

/**
 * Every variable key a template mentions, in first-appearance order.
 *
 * This is why `message_templates` has no `variables[]` column: the list is a
 * projection of the body, and a stored copy is one more thing that can drift
 * from what the body actually says. The fixture it replaces drifted exactly
 * that way — seven rules naming templates that no longer existed.
 *
 * Pass subject and body together; a tag in the subject counts.
 */
export function templateVariableKeys(
  ...parts: (string | undefined | null)[]
): string[] {
  const keys: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    // `matchAll` rather than `exec` in a loop: VARIABLE_PATTERN is a shared
    // module-level regex with /g, so a bare exec loop leaks `lastIndex`
    // between callers and silently starts mid-string on the next one.
    for (const match of part.matchAll(VARIABLE_PATTERN)) {
      const key = match[1];
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}
