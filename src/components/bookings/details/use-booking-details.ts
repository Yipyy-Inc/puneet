"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import { useLocationContext } from "@/hooks/use-location-context";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useSettings } from "@/hooks/use-settings";
import { useBookingActions } from "@/components/bookings/booking-actions/use-booking-actions";
import { bookingQueries, useAssignedBookingRefs } from "@/lib/api/booking";
import { balanceOf } from "@/lib/api/booking-money";
import { useBookingTips } from "@/lib/api/booking-tips";
import { careLogQueries } from "@/lib/api/care-log";
import { useClientRecord } from "@/lib/api/client";
import { useClientEstimates } from "@/lib/api/estimates";
import {
  useBookingStatusRules,
  useDepositRules,
  useFacilitySettings,
  useFeedingInstructions,
  useMedicationInstructions,
} from "@/lib/api/facility-settings";
import { incidentQueries } from "@/lib/api/incidents";
import { useMembershipPlans, useMemberships } from "@/lib/api/memberships";
import { useClientStoreCredit } from "@/lib/api/store-credit";
import { useClientVaccinations } from "@/lib/api/vaccinations";
import { bookingValue } from "@/lib/bookings/booking-value";
import {
  detailTabs,
  petsLabel,
  serviceKind,
  stepState,
} from "@/lib/bookings/details/service-view";
import { useVaccineGaps } from "@/lib/bookings/use-vaccine-gaps";
import { getPendingCareItems } from "@/lib/care-completion";
import { bookingCareEntries } from "@/lib/daily-care/booking-care-entries";
import { useAssignedScope } from "@/lib/facility-permissions";
import { formatBookingRef } from "@/lib/booking-id";
import { formatMoney } from "@/lib/i18n/format";
import { memberDiscount } from "@/lib/memberships/figures";
import { usePortalHref } from "@/lib/nav/use-portal-href";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import {
  computeDepositAmount,
  findApplicableDepositRule,
} from "@/lib/settings/deposits";
import { taxableOwedForBooking } from "@/lib/payments/service-tax";
import { useFieldMask } from "@/lib/staff/mask";
import { wallClockParts } from "@/lib/time/facility-time";
import { useFacilityTimeZone } from "@/lib/api/facility-profile";
import { useServiceName } from "@/lib/staff/use-service-name";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Everything the booking page READS, in one place, in one order.
//
// Moved out of the 2,194-line page when it became the client's Booking_Details
// mocks (2026-10-03). The reads and their reasons are unchanged; each comment
// that explained one moved with it, shortened. Hooks only, called
// unconditionally, so the order never changes between the render where the
// booking is loading and the one where it has arrived.
// ============================================================================

export function useBookingDetails(bookingId: number, urlClientId: number) {
  // Hide booking money from staff without view_booking_financials (Table 21);
  // without it the payment card and every amount are OMITTED, not greyed (3C).
  const fieldMask = useFieldMask();
  const canSeeBookingAmounts = fieldMask.canSee("booking_financials");
  const canSeeContact = fieldMask.canSee("client_contact");

  // Section 8B: a scoped viewer's own staff id when view_bookings is
  // assigned_only — a booking outside their set is a 403, never the record.
  const assignedStaffId = useAssignedScope("view_bookings");
  const { refs: assignedRefs, pending: assignedPending } =
    useAssignedBookingRefs(assignedStaffId);

  // The facility's own module configs and booking-flow rules.
  const settings = useSettings();

  // ONE booking, and its OWN client — the one the row names, not the URL.
  const bookingQuery = useQuery({
    ...bookingQueries.detail(bookingId),
    enabled: Number.isInteger(bookingId),
  });
  const booking = bookingQuery.data;
  const clientRecord = useClientRecord(booking?.clientId ?? urlClientId);
  const client = clientRecord.client;
  const clientId = booking?.clientId ?? urlClientId;

  // The required vaccines a check-in would wave through.
  const { vaccinations: clientVaccinations } = useClientVaccinations(clientId);
  const vaccineGaps = useVaccineGaps(clientVaccinations);

  // The booking's incidents, for the in-stay care still due at checkout.
  const { data: facilityIncidents } = useQuery(incidentQueries.all());
  // What was actually done, from `care_log_entries`.
  const { data: careLog } = useQuery({
    ...careLogQueries.forBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  // One instant for the life of the mount — a journal that rolled over at
  // midnight mid-shift would file the 00:05 dose against tomorrow — read on
  // the FACILITY's clock, as the server's care gate reads it: in UTC, an
  // evening in Montreal is already tomorrow, and an 8 p.m. dose was filed
  // against a day the gate never asks about.
  const [now] = useState(() => new Date().toISOString());
  const timeZone = useFacilityTimeZone();
  const logDay = wallClockParts(now, timeZone).date;

  const text = useStaffText("bookingDetail");
  const serviceName = useServiceName();
  // /employee renders this page too; its links stay in the portal it is in.
  const portal = usePortalHref();

  // The estimate this booking was converted from, among the client's own.
  const { estimates: clientEstimates } = useClientEstimates(clientId);
  const sourceEstimate = useMemo(
    () =>
      booking
        ? clientEstimates.find((e) => e.convertedBookingId === booking.id)
        : undefined,
    [booking, clientEstimates],
  );

  const loyalty = useActiveLoyaltyDiscount({
    clientRef: clientId,
    subtotal: booking ? bookingValue(booking) : 0,
    serviceType: booking?.service?.toLowerCase(),
  });
  const { data: clientMembershipRows } = useMemberships(clientId);
  const { data: membershipPlanRows } = useMembershipPlans();
  const { fill: fillJoin } = useStaffText("joinMembership");

  // The facility's own rules (`booking_status_rules`).
  const { rules: statusRules } = useBookingStatusRules();
  const { rules: depositRules, isPending: depositRulesPending } =
    useDepositRules();
  const { locations } = useLocationContext();

  // The ledger's tip figure, for the tip split and the payment card.
  const { data: tips } = useBookingTips(bookingId);

  // The client's own account credit — not the facility's whole ledger.
  const { data: clientCredit } = useClientStoreCredit(clientId);
  const storeCreditBalance =
    clientCredit?.accounts.find((a) => a.clientRef === clientId)?.balance ?? 0;

  // Where the Feeding and Medications steps appear, per service.
  const { instructions: feedingInstructions } = useFeedingInstructions();
  const { instructions: medicationInstructions } = useMedicationInstructions();
  const facilitySettings = useFacilitySettings();
  const taxConfig = facilitySettings.settings.tax_config.value as TaxConfig;

  // The bill's own lines. Same key as everything else that reads them, so
  // this is the cache, not a second request.
  const lineItemsQuery = useQuery({
    queryKey: ["bookings", booking?.id ?? bookingId, "line-items"],
    queryFn: async (): Promise<BookingLineItem[]> => {
      const response = await fetch(
        `/api/bookings/${booking?.id ?? bookingId}/line-items`,
      );
      if (!response.ok) throw new Error("Could not read the bill.");
      return (await response.json()) as BookingLineItem[];
    },
    enabled: Boolean(booking?.id ?? bookingId),
    staleTime: 30_000,
  });
  const lineItems = useMemo(
    () => lineItemsQuery.data ?? [],
    [lineItemsQuery.data],
  );

  const canTakePayment = usePermission("take_payment");
  const canEditBooking = usePermission("edit_bookings");

  const depositRule =
    booking && !depositRulesPending
      ? findApplicableDepositRule(
          booking.service,
          booking.invoice?.total ?? bookingValue(booking),
          depositRules,
        )
      : null;
  const actions = useBookingActions(booking, {
    depositRuleApplies: Boolean(depositRule),
    multiLocation: locations.length > 1,
  });

  // ── Derived ─────────────────────────────────────────────────────────────
  const pets = (() => {
    if (!client || !booking) return [];
    const ids = Array.isArray(booking.petId) ? booking.petId : [booking.petId];
    return ids
      .map((pid) => client.pets?.find((p) => p.id === pid))
      .filter(Boolean) as NonNullable<(typeof client.pets)[number]>[];
  })();
  const pet = pets[0] ?? null;
  const petLabel = petsLabel(pets.map((p) => p.name));
  const bookingRef = formatBookingRef(booking?.id ?? bookingId);
  const petName = petLabel ?? bookingRef;
  const kind = serviceKind(booking?.service);
  const step = booking ? stepState(kind, booking) : null;
  const tabs = detailTabs(kind);
  const serviceLabel = booking ? serviceName(booking.service) : "";

  // Which pricing rules have already charged this booking — `unique
  // (booking_id, fee_id)` refuses a second one anyway.
  const alreadyChargedFeeIds = new Set(
    lineItems.map((line) => line.feeId).filter((id): id is string => !!id),
  );

  // The member discount comes off the bill as a negative line, once.
  const membershipOffer = booking
    ? memberDiscount(
        clientMembershipRows ?? [],
        membershipPlanRows ?? [],
        String(booking.service ?? ""),
        bookingValue(booking),
        booking.startDate,
      )
    : null;
  const membershipLabel = membershipOffer
    ? fillJoin("discountLine", {
        plan: membershipOffer.planName,
        pct: membershipOffer.percent,
      })
    : "";
  const membershipDiscount =
    membershipOffer && !lineItems.some((line) => line.name === membershipLabel)
      ? {
          label: membershipLabel,
          amount: Math.min(
            membershipOffer.amount,
            Math.max(
              0,
              (booking?.amountDue ?? booking?.totalCost ?? 0) -
                (loyalty.discount?.amount ?? 0),
            ),
          ),
        }
      : null;

  // Today's meals and doses, and what is still unlogged — the same rows the
  // care gate reads (lib/daily-care/booking-care-entries.ts).
  const careEntries = booking
    ? bookingCareEntries(booking, careLog, logDay)
    : { feeding: [], medication: [] };
  const careStatus = getPendingCareItems(
    careEntries.feeding,
    careEntries.medication,
    (facilityIncidents ?? []).filter((i) => i.bookingId === booking?.id),
  );
  // A payment before arrival or after departure is not a departure.
  const departing = booking
    ? booking.presence === "on-site" ||
      ["checked_in", "in_progress", "ready"].includes(booking.status)
    : false;

  const owed = booking ? balanceOf(booking) : 0;
  const bookingTotalForDeposit = booking
    ? (booking.invoice?.total ?? bookingValue(booking))
    : 0;
  const ruleDepositAmount = depositRule
    ? computeDepositAmount(depositRule, bookingTotalForDeposit)
    : Math.round(bookingTotalForDeposit * 0.5 * 100) / 100;
  const ruleDepositLabel = depositRule
    ? depositRule.label
    : text.fill("halfOfTotal", {
        amount: formatMoney(bookingTotalForDeposit * 0.5, text.locale),
      });

  // The facility's tax on part of the supply — a deposit, a prepayment —
  // recorded with it, as the checkout does. Nothing where prices include it.
  const taxOnSupply = (amount: number) =>
    taxConfig.pricesIncludeTax
      ? 0
      : computeTax(
          // `booking` is still loading on the first render; an unknown
          // booking is taxed, which is the safe direction.
          taxableOwedForBooking(booking ?? {}, Math.round(amount * 100)),
          taxConfig,
        ).totalCents / 100;

  return {
    bookingId,
    booking,
    bookingQuery,
    client,
    clientRecord,
    clientId,
    pets,
    pet,
    petLabel,
    petName,
    bookingRef,
    kind,
    step,
    tabs,
    serviceLabel,
    sourceEstimate,
    settings,
    statusRules,
    depositRule,
    ruleDepositAmount,
    ruleDepositLabel,
    feedingInstructions,
    medicationInstructions,
    facilitySettings,
    taxConfig,
    taxOnSupply,
    lineItems,
    lineItemsPending: lineItemsQuery.isPending,
    alreadyChargedFeeIds,
    loyalty,
    membershipDiscount,
    tips,
    storeCreditBalance,
    careLog,
    logDay,
    now,
    timeZone,
    careEntries,
    careStatus,
    departing,
    owed,
    vaccineGaps,
    facilityIncidents,
    actions,
    locations,
    permissions: {
      canSeeBookingAmounts,
      canSeeContact,
      canTakePayment,
      canEditBooking,
    },
    fieldMask,
    assigned: { assignedStaffId, assignedRefs, assignedPending },
    text,
    portal,
  };
}

export type BookingDetails = ReturnType<typeof useBookingDetails>;
