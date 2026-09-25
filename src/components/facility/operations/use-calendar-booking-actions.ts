"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { useBookingArrival } from "@/lib/api/booking-arrival";
import { bookingQueries } from "@/lib/api/booking";
import { balanceOf } from "@/lib/api/booking-money";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useBookingStatusRules } from "@/lib/api/facility-settings";
import { formatBookingRef } from "@/lib/booking-id";
import { arrivalFailure } from "@/lib/bookings/arrival-failure";
import { arrivalPermissionFor } from "@/lib/bookings/arrival-writer";
import {
  describeVaccineGaps,
  useVaccineGaps,
  type VaccineGap,
} from "@/lib/bookings/use-vaccine-gaps";
import { formatMoney } from "@/lib/i18n/format";
import { usePortalHref } from "@/lib/nav/use-portal-href";
import { autoTransitionTarget } from "@/lib/settings/booking-statuses";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// What the operations calendar does to a booking: the booking page's own
// flows, reached from the drawer.
//
// Every one of these was a stand-in. Check-in and check-out patched
// `bookings.status` directly, so required forms were skipped, a boarder got
// no kennel check and the day board never heard the dog arrived. "Reschedule"
// and "Create booking" opened the bookings list in a new tab with parameters
// it never read. "Cancel" took its reason from window.prompt and promised that
// "refund eligibility will be reviewed" — nothing reviewed it. "Rebook" and
// "Book again" opened the same list. They go through the booking page's writes
// now: useBookingArrival, the booking wizard, the edit dialog, and the cancel
// dialog with its refund.
// ============================================================================

interface Seed {
  date: string;
  time: string;
}

export interface CalendarVaccineAsk {
  bookingId: number;
  pet: string;
  gaps: VaccineGap[];
}

export function useCalendarBookingActions(input: {
  bookings: readonly Booking[];
  clients: readonly Client[];
  vaccinations: readonly VaccinationRecord[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useFacilityRbac();
  const arrival = useBookingArrival();
  const updateStatus = useUpdateBookingStatus();
  const { rules: statusRules } = useBookingStatusRules();
  const { openBookingModal } = useBookingModal();
  const createBooking = useCreateBookingFromModal();
  const { profile } = useFacilityProfile();
  const vaccineGaps = useVaccineGaps(input.vaccinations);
  const { t, fill, locale } = useStaffText("bookingActions");
  const { fill: calFill } = useStaffText("opsCalendar");
  const { href } = usePortalHref();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [vaccineAsk, setVaccineAsk] = useState<CalendarVaccineAsk | null>(null);

  const find = (id: number) => input.bookings.find((b) => b.id === id);

  // ── A CLICK THAT DOES NOTHING IS THE WORST ANSWER ──────────────────────
  //
  // These began `if (!booking) return;`, and the calendar's loaded list does
  // not always hold the booking at the moment of the click: it refetches
  // after every write, and a window read that timed out answers nothing. So
  // checking a guest out closed the drawer with no departure and no word —
  // `operations-calendar` failed exactly so, twice, on 2026-09-24. The one
  // booking is asked for by ref when the list lacks it, and if that fails
  // too, staff are told nothing was changed.
  const resolve = async (id: number): Promise<Booking | undefined> => {
    const loaded = find(id);
    if (loaded) return loaded;
    try {
      return await queryClient.fetchQuery({
        ...bookingQueries.detail(id),
        staleTime: 0,
      });
    } catch {
      return undefined;
    }
  };
  const notLoaded = (id: number) =>
    toast.error(calFill("bookingNotLoaded", { ref: formatBookingRef(id) }));
  const clientOf = (booking: Booking) =>
    input.clients.find((c) => c.id === booking.clientId);
  const petsOf = (booking: Booking) => {
    const ids = Array.isArray(booking.petId) ? booking.petId : [booking.petId];
    const own = clientOf(booking)?.pets ?? [];
    return ids.flatMap((id) => own.filter((p) => p.id === id));
  };
  // The booking page's label: two names, or the first and a count.
  const petLabel = (booking: Booking) => {
    const pets = petsOf(booking);
    if (pets.length === 0) return formatBookingRef(booking.id);
    return pets.length <= 2
      ? pets.map((p) => p.name).join(" & ")
      : `${pets[0].name} +${pets.length - 1}`;
  };

  const problem = (error: unknown, pet: string) => {
    const failure = arrivalFailure(error);
    const key =
      failure === "needs_kennel"
        ? "failNeedsKennel"
        : failure === "not_allowed"
          ? "failNotAllowed"
          : failure === "cannot_now"
            ? "failCannotNow"
            : "failFailed";
    toast.error(fill(key, { pet }), {
      description: error instanceof Error ? error.message : undefined,
    });
  };

  const undoCheckIn = async (booking: Booking) => {
    const pet = petLabel(booking);
    try {
      await arrival.undoCheckIn(booking);
      toast.success(fill("checkInUndone", { pet }));
    } catch (error) {
      problem(error, pet);
    }
  };

  const arrive = async (booking: Booking) => {
    const pet = petLabel(booking);
    try {
      await arrival.checkIn(booking);
      toast.success(fill("checkedIn", { pet }), {
        action: { label: t("undo"), onClick: () => void undoCheckIn(booking) },
      });
    } catch (error) {
      problem(error, pet);
      return;
    }
    // The facility's own rule may take a check-in further — a groom straight
    // to in progress. The arrival is recorded either way.
    const target = autoTransitionTarget(statusRules, booking, "onCheckIn");
    if (target && target !== "checked_in") {
      await updateStatus
        .mutateAsync({ id: booking.id, status: target })
        .catch(() => undefined);
    }
  };

  const mayArrive = (booking: Booking) =>
    can(arrivalPermissionFor(booking.service));

  const checkIn = async (bookingId: number) => {
    const booking = await resolve(bookingId);
    if (!booking) {
      notLoaded(bookingId);
      return;
    }
    const pet = petLabel(booking);
    if (!mayArrive(booking)) {
      toast.error(t("failNotAllowed"));
      return;
    }
    const gaps = vaccineGaps(booking.service, petsOf(booking));
    if (gaps.length > 0) {
      setVaccineAsk({ bookingId, pet, gaps });
      return;
    }
    void arrive(booking);
  };

  const confirmVaccineAsk = async () => {
    const id = vaccineAsk?.bookingId;
    setVaccineAsk(null);
    if (id === undefined) return;
    const booking = await resolve(id);
    if (!booking) {
      notLoaded(id);
      return;
    }
    void arrive(booking);
  };

  // With money owed, checking out IS the till, and the till is the booking
  // page's: the calendar sends staff there rather than recording a departure
  // that leaves the balance behind without anybody deciding to.
  const checkOut = async (bookingId: number) => {
    const booking = await resolve(bookingId);
    if (!booking) {
      notLoaded(bookingId);
      return;
    }
    const pet = petLabel(booking);
    const owed = balanceOf(booking);
    if (owed > 0) {
      toast.info(
        calFill("checkoutOnBookingPage", {
          pet,
          amount: formatMoney(owed, locale),
        }),
      );
      // The booking page's own address, not the /bookings/[id] redirect: one
      // hop rather than two — and in this portal, because staff sent to the
      // admin's address were bounced to their schedule instead.
      router.push(
        href(
          `/facility/dashboard/clients/${booking.clientId}/bookings/${bookingId}`,
        ),
      );
      return;
    }
    if (!mayArrive(booking)) {
      toast.error(t("failNotAllowed"));
      return;
    }
    try {
      await arrival.checkOut(booking);
      toast.success(fill("checkedOut", { pet }));
    } catch (error) {
      problem(error, pet);
    }
  };

  const edit = (bookingId: number) => {
    if (!can("edit_bookings")) {
      toast.error(t("notAllowedEdit"));
      return;
    }
    const booking = find(bookingId);
    // The wizard edits a booking for its client; without the client there is
    // nothing to open it on.
    if (!booking || !clientOf(booking)) {
      toast.error(t("failFailed"));
      return;
    }
    setEditingId(bookingId);
  };

  const cancel = (bookingId: number) => {
    if (!can("cancel_bookings")) {
      toast.error(t("notAllowedCancel"));
      return;
    }
    setCancellingId(bookingId);
  };

  const facilityName = profile.businessName;

  // The wizard again, for the same pet, owner and service.
  const rebook = async (bookingId: number) => {
    const booking = await resolve(bookingId);
    if (!booking) {
      notLoaded(bookingId);
      return;
    }
    if (!can("create_bookings")) {
      toast.error(t("notAllowedCreate"));
      return;
    }
    const client = clientOf(booking);
    openBookingModal({
      clients: client ? [client] : [...input.clients],
      facilityName,
      preSelectedClientId: booking.clientId,
      preSelectedPetId: petsOf(booking)[0]?.id,
      preSelectedService: booking.service,
      onCreateBooking: createBooking,
    });
  };

  // A booking at the slot that was clicked.
  const create = (seed: Seed) => {
    if (!can("create_bookings")) {
      toast.error(t("notAllowedCreate"));
      return;
    }
    openBookingModal({
      clients: [...input.clients],
      facilityName,
      preSelectedStartDate: seed.date,
      preSelectedCheckInTime: seed.time,
      onCreateBooking: createBooking,
    });
  };

  const editing = editingId === null ? undefined : find(editingId);
  const cancelling = cancellingId === null ? undefined : find(cancellingId);

  return {
    canCreate: can("create_bookings"),
    canEdit: can("edit_bookings"),
    canCancel: can("cancel_bookings"),
    checkIn,
    checkOut: (bookingId: number) => void checkOut(bookingId),
    edit,
    cancel,
    rebook,
    create,
    dialogs: {
      editing: editing
        ? { booking: editing, client: clientOf(editing) }
        : undefined,
      closeEdit: () => setEditingId(null),
      cancelling: cancelling
        ? {
            booking: cancelling,
            clientName: clientOf(cancelling)?.name,
            petName: petLabel(cancelling),
          }
        : undefined,
      closeCancel: () => setCancellingId(null),
      vaccineAsk,
      vaccineGapText: vaccineAsk
        ? describeVaccineGaps(vaccineAsk.gaps, locale, (vaccines, pet) =>
            fill("vaccineGapPet", { vaccines, pet }),
          )
        : "",
      confirmVaccineAsk,
      closeVaccineAsk: () => setVaccineAsk(null),
    },
  };
}

export type CalendarBookingDialogState = ReturnType<
  typeof useCalendarBookingActions
>["dialogs"];
