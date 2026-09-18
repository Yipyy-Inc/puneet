"use client";

import { useState } from "react";

import { useBoardingCheckIn } from "@/lib/api/boarding-attendance";
import { useDaycareCheckIn } from "@/lib/api/daycare-attendance";
import { useSetGroomingAppointmentStatus } from "@/lib/api/grooming-appointments";
import type { YipyyGoDeskCheckBody } from "@/lib/api/mappers/yipyy-go";
import { useTrainingCheckIn } from "@/lib/api/training-attendance";
import { useRecordDeskCheck } from "@/lib/api/yipyy-go";
import { checkInWriterFor } from "@/lib/yipyy-go/check-in-writer";
import {
  arrivalFailure,
  type ArrivalFailure,
} from "@/lib/bookings/arrival-failure";

// ============================================================================
// Checking a booking in at the desk: the desk check first — every dog, what
// was confirmed, why a missing required form was waved through — then the
// arrival itself, through the write the booking’s service already has.
//
// Success is only what both answered. The page this replaces toasted “Check-in
// complete” over an audit array and a fixture task list, and wrote nothing.
// When the arrival is refused (a boarding guest with no kennel, a role that
// cannot check that service in) the desk check stays recorded and the dog
// stays expected: presence is the truth of arrival, and the desk says why.
// ============================================================================

/** The shared arrival failures (src/lib/bookings/arrival-failure.ts). */
export type KioskFailure = ArrivalFailure;

export function useKioskCheckIn(bookingRef: number, service: string) {
  const deskCheck = useRecordDeskCheck(bookingRef);
  const daycare = useDaycareCheckIn();
  const boarding = useBoardingCheckIn();
  const training = useTrainingCheckIn();
  const grooming = useSetGroomingAppointmentStatus();
  const [failure, setFailure] = useState<KioskFailure | null>(null);
  const [done, setDone] = useState(false);
  const writer = checkInWriterFor(service);

  const checkIn = async (
    pets: YipyyGoDeskCheckBody["pets"],
    source: YipyyGoDeskCheckBody["source"],
  ) => {
    setFailure(null);
    if (!writer) {
      setFailure("no_writer");
      return;
    }
    try {
      await deskCheck.mutateAsync({ source, pets });
      if (writer === "daycare") await daycare.mutateAsync({ bookingRef });
      else if (writer === "boarding") await boarding.mutateAsync(bookingRef);
      else if (writer === "training")
        await training.mutateAsync({ bookingRef });
      else
        await grooming.mutateAsync({
          id: String(bookingRef),
          status: "checked-in",
        });
      setDone(true);
    } catch (error) {
      setFailure(arrivalFailure(error));
    }
  };

  return {
    checkIn,
    failure,
    done,
    writer,
    pending:
      deskCheck.isPending ||
      daycare.isPending ||
      boarding.isPending ||
      training.isPending ||
      grooming.isPending,
  };
}
