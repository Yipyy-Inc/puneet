"use client";

import { useMemo } from "react";

import { useFacilitySettings } from "@/lib/api/facility-settings";
import {
  feedingEntriesFromSchedule,
  medicationEntriesFromItems,
} from "@/lib/bookings/care-instructions";
import {
  journalDays,
  planDay,
  type JournalRow,
  type RoutineStep,
} from "@/lib/bookings/details/journal-plan";
import { bookingStay } from "@/lib/medications/schedule";

import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// The journal's days and what each one holds — the owner's meals and doses,
// the facility's routine, the booking's add-ons, and anything logged that no
// plan asked for. One place, so the tab's badge counts exactly the rows the
// journal lists ("not yet logged today", as the mock counts it).
// ============================================================================

const TYPE_KEY: Record<string, string> = {
  feeding: "journalTaskFeeding",
  medication: "journalTaskMedication",
  potty: "journalTaskPotty",
  walk: "journalTaskWalk",
  cleaning: "journalTaskCleaning",
  addon: "journalTaskAddon",
  other: "journalTaskOther",
};

export function useJournalPlan(d: BookingDetails) {
  const { settings } = useFacilitySettings();
  const { t } = d.text;
  const booking = d.booking;
  const isStay = d.kind === "boarding";
  const days = useMemo(
    () =>
      booking
        ? isStay
          ? journalDays(booking.startDate, booking.endDate ?? booking.startDate)
          : [booking.startDate]
        : [],
    [booking, isStay],
  );

  const rowsFor = (date: string): JournalRow[] => {
    if (!booking) return [];
    const stay = bookingStay(booking);
    const routine = (
      (settings.daily_care_config.value as { steps?: RoutineStep[] }).steps ??
      []
    ).map((s) => ({
      ...s,
      description: (s as { description?: string }).description,
    }));
    const first = date === booking.startDate;
    const last = date === (booking.endDate ?? booking.startDate);
    return planDay({
      bookingRef: booking.id,
      day: date,
      feeding: feedingEntriesFromSchedule(booking.feedingSchedule, date, stay),
      medication: medicationEntriesFromItems(booking.medications, date, stay),
      routine,
      addOns: d.lineItems
        .filter((line) => line.kind === "add_on")
        .map((line) => ({ id: line.id, name: line.name })),
      window: {
        from: first ? booking.checkInTime : undefined,
        to: last ? booking.checkOutTime : undefined,
      },
      log: d.careLog ?? [],
      labels: {
        addOn: t("addOn"),
        byType: (type) => t(TYPE_KEY[type] ?? "journalTaskOther"),
      },
    });
  };

  /** Today's rows with nothing logged — only while the pet is here. */
  const unloggedToday =
    d.departing && days.includes(d.logDay)
      ? rowsFor(d.logDay).filter((row) => !row.entry).length
      : 0;

  return { days, rowsFor, unloggedToday };
}
