/**
 * URL builders for the entities surfaced inside Smart Insights drawer panels.
 * Centralized so every panel links to the canonical source route in the app.
 *
 * Wherever a panel renders a client, booking, staff member, voicemail, etc.,
 * it should wrap the reference in a `<Link>` whose href comes from here.
 */

import { settingsHref } from "@/lib/settings/nav";

export const insightLinks = {
  /** Client/customer detail page. Without an ID, falls back to the list. */
  client: (id?: string | number) =>
    id !== undefined && id !== null && String(id).length > 0
      ? `/facility/dashboard/clients/${id}`
      : `/facility/dashboard/clients`,

  /** Booking detail page. Without an ID, falls back to the list. */
  booking: (id?: string) =>
    id ? `/facility/dashboard/bookings/${id}` : `/facility/dashboard/bookings`,

  /** Staff management page (no per-staff detail route — staff selection happens in-page). */
  staff: (staffId?: string) =>
    staffId
      ? `/facility/dashboard/staff?staffId=${encodeURIComponent(staffId)}`
      : `/facility/dashboard/staff`,

  /** Staff scheduling — Schedule tab, optional date filter. */
  schedule: (dateIso?: string) =>
    dateIso
      ? `/facility/dashboard/services/scheduling?date=${dateIso}`
      : `/facility/dashboard/services/scheduling`,

  /** Inventory page, optional item ID query for highlight. */
  inventory: (itemId?: string) =>
    itemId
      ? `/facility/dashboard/inventory?itemId=${encodeURIComponent(itemId)}`
      : `/facility/dashboard/inventory`,

  /** Calling module — voicemail / call log. */
  calling: (tab?: "voicemail" | "missed") =>
    tab
      ? `/facility/dashboard/calling?tab=${tab}`
      : `/facility/dashboard/calling`,

  /** Messaging module — inbox / conversation. */
  messaging: (conversationId?: string) =>
    conversationId
      ? `/facility/dashboard/messaging?conversationId=${encodeURIComponent(conversationId)}`
      : `/facility/dashboard/messaging`,

  /** Marketing module — campaign list, optional campaign focus. */
  marketing: (campaignId?: string) =>
    campaignId
      ? `/facility/dashboard/marketing?campaignId=${encodeURIComponent(campaignId)}`
      : `/facility/dashboard/marketing`,

  /**
   * Every payment, whichever channel took it.
   *
   * This was `billing(invoiceId?)`, pointing at /facility/dashboard/billing —
   * a fixture screen that has been removed. The invoice form was doubly dead:
   * that page never read `?invoiceId`, so the deep link had no destination even
   * while the page existed, exactly as `calling(tab)` produced `?tab=voicemail`
   * for a page that ignored it. There is no invoices table, no route that makes
   * one, and nothing to link an invoice id TO — so the parameter is gone rather
   * than repointed.
   */
  payments: () => `/facility/dashboard/payments`,

  /** Reports & analytics. */
  reports: () => `/facility/dashboard/reports`,

  /** Service module rates / settings. */
  rates: (module: "daycare" | "boarding" | "grooming" | "training") =>
    `/facility/dashboard/services/${module}/rates`,

  /** Grooming module — tasks or stations sub-views. */
  grooming: (tab?: "tasks" | "stations" | "check-in") =>
    tab
      ? `/facility/dashboard/services/grooming?tab=${tab}`
      : `/facility/dashboard/services/grooming`,

  /** Cancellation & no-show policy settings.
   *
   *  The free-cancellation window lives on the Business section's booking
   *  rules card — DepositRulesSettings reads it from there rather than owning
   *  it. This used `?tab=cancellation-policy`, a parameter the settings page
   *  does not read and a section that does not exist, so it did nothing. */
  cancellationPolicy: () => settingsHref("business"),

  /** Onboarding sub-view for a specific staff member. */
  onboarding: (staffId?: string) =>
    staffId
      ? `/facility/dashboard/staff?staffId=${encodeURIComponent(staffId)}&tab=onboarding`
      : `/facility/dashboard/staff?tab=onboarding`,
};
