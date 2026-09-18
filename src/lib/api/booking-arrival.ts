"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  useBoardingCheckIn,
  useBoardingRevert,
  useBoardingStayUpdate,
} from "@/lib/api/boarding-attendance";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import {
  useDaycareCheckIn,
  useDaycareRevert,
  useDaycareVisitUpdate,
} from "@/lib/api/daycare-attendance";
import { useSetGroomingAppointmentStatus } from "@/lib/api/grooming-appointments";
import {
  useTrainingCheckIn,
  useTrainingRevert,
  useTrainingVisitUpdate,
} from "@/lib/api/training-attendance";
import { arrivalWriterFor } from "@/lib/bookings/arrival-writer";

// ============================================================================
// Checking a booking in and out, whatever its service — one hook for the
// booking page and the calendar, composed from the writes the day boards and
// the kiosk already use.
//
// The booking page and the calendar wrote `bookings.status` directly. That
// skipped the forms a facility requires before check-in (the attendance routes
// check them; the booking PATCH did not), never told the boards the dog had
// arrived, and on checkout never recorded a departure — so a kennel stayed
// held and the board kept saying "expected". These go through the service's
// own write instead, and the database mirrors it into the status
// (20260918151018), so one press moves both.
//
//   service     in                 out                undo in           undo out
//   daycare     POST attendance    PATCH checkOut     DELETE            PATCH reopen
//   boarding    record_arrival     PATCH checkOut     DELETE (revert)   PATCH reopen
//   training    POST attendance    PATCH checkOut     DELETE            PATCH reopen
//   grooming    status checked-in  status completed   status scheduled  status checked-in
//   other       status checked_in  status completed   status confirmed  status checked_in
//
// Errors are thrown as the routes gave them; `arrivalFailure()` words them.
// ============================================================================

export interface ArrivalBooking {
  id: number;
  service: string;
}

export function useBookingArrival() {
  const queryClient = useQueryClient();
  const daycareIn = useDaycareCheckIn();
  const daycareVisit = useDaycareVisitUpdate();
  const daycareRevert = useDaycareRevert();
  const boardingIn = useBoardingCheckIn();
  const boardingStay = useBoardingStayUpdate();
  const boardingRevert = useBoardingRevert();
  const trainingIn = useTrainingCheckIn();
  const trainingVisit = useTrainingVisitUpdate();
  const trainingRevert = useTrainingRevert();
  const grooming = useSetGroomingAppointmentStatus();
  const status = useUpdateBookingStatus();

  // The per-service hooks refresh their own boards; the booking itself moved
  // too (the mirror), and so did its history.
  const settle = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
    ]);
  };

  const checkIn = async (b: ArrivalBooking) => {
    const writer = arrivalWriterFor(b.service);
    if (writer === "daycare") await daycareIn.mutateAsync({ bookingRef: b.id });
    else if (writer === "boarding") await boardingIn.mutateAsync(b.id);
    else if (writer === "training")
      await trainingIn.mutateAsync({ bookingRef: b.id });
    else if (writer === "grooming")
      await grooming.mutateAsync({ id: String(b.id), status: "checked-in" });
    else await status.mutateAsync({ id: b.id, status: "checked_in" });
    await settle();
  };

  const checkOut = async (b: ArrivalBooking) => {
    const writer = arrivalWriterFor(b.service);
    if (writer === "daycare")
      await daycareVisit.mutateAsync({ bookingRef: b.id, checkOut: true });
    else if (writer === "boarding")
      await boardingStay.mutateAsync({ bookingRef: b.id, checkOut: true });
    else if (writer === "training")
      await trainingVisit.mutateAsync({ bookingRef: b.id, checkOut: true });
    else if (writer === "grooming")
      await grooming.mutateAsync({ id: String(b.id), status: "completed" });
    else await status.mutateAsync({ id: b.id, status: "completed" });
    await settle();
  };

  const undoCheckIn = async (b: ArrivalBooking) => {
    const writer = arrivalWriterFor(b.service);
    if (writer === "daycare") await daycareRevert.mutateAsync(b.id);
    else if (writer === "boarding") await boardingRevert.mutateAsync(b.id);
    else if (writer === "training") await trainingRevert.mutateAsync(b.id);
    else if (writer === "grooming")
      await grooming.mutateAsync({ id: String(b.id), status: "scheduled" });
    else await status.mutateAsync({ id: b.id, status: "confirmed" });
    await settle();
  };

  const reopen = async (b: ArrivalBooking) => {
    const writer = arrivalWriterFor(b.service);
    if (writer === "daycare")
      await daycareVisit.mutateAsync({ bookingRef: b.id, reopen: true });
    else if (writer === "boarding")
      await boardingStay.mutateAsync({ bookingRef: b.id, reopen: true });
    else if (writer === "training")
      await trainingVisit.mutateAsync({ bookingRef: b.id, reopen: true });
    else if (writer === "grooming")
      await grooming.mutateAsync({ id: String(b.id), status: "checked-in" });
    else await status.mutateAsync({ id: b.id, status: "checked_in" });
    await settle();
  };

  const pending =
    daycareIn.isPending ||
    daycareVisit.isPending ||
    daycareRevert.isPending ||
    boardingIn.isPending ||
    boardingStay.isPending ||
    boardingRevert.isPending ||
    trainingIn.isPending ||
    trainingVisit.isPending ||
    trainingRevert.isPending ||
    grooming.isPending ||
    status.isPending;

  return { checkIn, checkOut, undoCheckIn, reopen, pending };
}
