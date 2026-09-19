"use client";

import { useMemo } from "react";

import { formatCalendarDayLong } from "@/lib/i18n/format";
import type { NotificationCategory } from "@/lib/notifications/catalog";
import type { StaffNotification } from "@/lib/notifications/types";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A notification's words, in the viewer's language.
//
// Rows carry a KIND and its values (a client's name, a date), never a sentence:
// a notice written in English at 14:00 must read in French for the French
// member of staff who opens it at 15:00. Names are as typed; dates are
// formatted here. A line whose values are missing is left out rather than
// shown with a hole in it.
// ============================================================================

const DATE_KEYS = new Set(["date", "from", "to"]);
const HOLE = /\{[a-z]+\}/i;

/**
 * Values stored as codes, and the label each one reads as. Anything else is
 * shown as stored — a service a facility named itself has no code to look up.
 */
const LABELLED: Record<string, { prefix: string; codes: Set<string> }> = {
  severity: {
    prefix: "severity_",
    codes: new Set(["low", "medium", "high", "critical"]),
  },
  service: {
    prefix: "service_",
    codes: new Set(["boarding", "daycare", "grooming", "training"]),
  },
};

/** The sentence key for each kind's title, and the optional detail line. */
function keysFor(n: StaffNotification): { title: string; detail?: string } {
  const decision = n.params.decision === "approved" ? "approved" : "denied";
  switch (n.kind) {
    case "booking_request":
    case "booking_online":
    case "booking_cancelled":
    case "booking_customer_note":
    case "booking_change_requested":
      return { title: `kind_${n.kind}`, detail: "kind_booking_detail" };
    case "form_submitted":
    case "pre_arrival_submitted":
      return { title: `kind_${n.kind}`, detail: "kind_form_detail" };
    case "customer_arrived":
      // The same detail line as a booking: who, and for what. The urgency is
      // carried by the notice itself (catalog: urgent), not by the wording.
      return { title: "kind_customer_arrived", detail: "kind_booking_detail" };
    case "vaccination_uploaded":
      return {
        title: "kind_vaccination_uploaded",
        detail: "kind_vaccination_detail",
      };
    case "swap_requested":
      return { title: "kind_swap_requested", detail: "kind_date_detail" };
    case "time_off_requested":
      return { title: "kind_time_off_requested", detail: "kind_range_detail" };
    case "swap_decided":
      return {
        title: `kind_swap_decided_${decision}`,
        detail: "kind_date_detail",
      };
    case "time_off_decided":
      return {
        title: `kind_time_off_decided_${decision}`,
        detail: "kind_range_detail",
      };
    case "incident_reported":
      return {
        title: "kind_incident_reported",
        detail: "kind_incident_detail",
      };
    case "estimate_accepted":
    case "estimate_declined":
      return { title: `kind_${n.kind}` };
  }
}

export function useNotificationText() {
  const { t, locale } = useStaffText("notificationCentre");

  return useMemo(() => {
    const values = (n: StaffNotification): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const [key, raw] of Object.entries(n.params)) {
        const value = String(raw);
        const labelled = LABELLED[key];
        out[key] =
          DATE_KEYS.has(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? formatCalendarDayLong(value, locale)
            : labelled?.codes.has(value)
              ? t(`${labelled.prefix}${value}`)
              : value;
      }
      out.client ??= t("someone");
      out.staff ??= t("teamMember");
      return out;
    };

    const fill = (key: string, vals: Record<string, string>) =>
      Object.entries(vals).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, value),
        t(key),
      );

    return {
      t,
      locale,
      category: (c: NotificationCategory) => t(`cat_${c}`),
      title: (n: StaffNotification) => {
        const text = fill(keysFor(n).title, values(n));
        return text.replace(/\s*\{[a-z]+\}\s*/gi, " ").trim();
      },
      detail: (n: StaffNotification): string | null => {
        const key = keysFor(n).detail;
        if (!key) return null;
        const text = fill(key, values(n));
        return HOLE.test(text) ? null : text;
      },
    };
  }, [t, locale]);
}
