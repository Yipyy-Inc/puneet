"use client";

import type { BookingActionHandlers } from "@/components/bookings/booking-actions/BookingActionBar";
import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { YipyyGoBookingCard } from "@/components/yipyygo/staff/yipyy-go-booking-card";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { careStepUse } from "@/lib/settings/care-setup";

import type { BookingDetails } from "../use-booking-details";
import type { DetailDialog } from "../use-booking-handlers";
import type { ServiceFacts } from "../use-service-facts";
import { BeforeAfterCard } from "./before-after-card";
import { BelongingsCard } from "./belongings-card";
import { FeedingCard } from "./feeding-card";
import { GroomPrefsCard } from "./groom-prefs-card";
import { GroomServicesCard } from "./groom-services-card";
import { LessonPackCard } from "./lesson-pack-card";
import { MedicationsCard } from "./medications-card";
import { PetCard } from "./pet-card";
import { SessionsCard } from "./sessions-card";
import { SkillsCard } from "./skills-card";
import { VisitCard } from "./visit-card";

// ============================================================================
// The Overview tab, by service, as the mocks lay it out:
//
//   every service   the details card beside the Pet card
//   stay / day      Feeding plan beside Medications, then Belongings
//   groom           Services, then Groom preferences beside Before & after
//   lesson          Skills progress, then Sessions
//
// Two-up rows wrap to one column at the mock's own 300px minimum. A booking
// with pre-arrival forms keeps their card, under the service's own.
// ============================================================================

const TWO_UP =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-4";

export function OverviewTab({
  d,
  facts,
  handlers,
  openDialog,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  handlers: BookingActionHandlers;
  openDialog: (name: DetailDialog) => void;
}) {
  const { openBookingModal } = useBookingModal();
  const createBooking = useCreateBookingFromModal();
  const { profile: facilityProfile } = useFacilityProfile();
  const booking = d.booking;
  const client = d.client;
  if (!booking || !client) return null;

  const isCancelled = booking.status === "cancelled";
  // Feeding and medications show where the facility's own settings put the
  // steps for this service — or where the booking holds a plan anyway: it
  // was booked with it.
  const feedingShown =
    careStepUse(d.feedingInstructions, booking.service) !== "disabled" ||
    (booking.feedingSchedule?.length ?? 0) > 0;
  const medsShown =
    careStepUse(d.medicationInstructions, booking.service) !== "disabled" ||
    (booking.medications?.length ?? 0) > 0;
  const canEdit = d.actions.some((a) => a.id === "edit");
  const reschedule = canEdit ? handlers.edit : undefined;

  return (
    <>
      <div className={TWO_UP}>
        <VisitCard
          d={d}
          facts={facts}
          openDialog={openDialog}
          onReschedule={reschedule}
        />
        <PetCard d={d} />
      </div>

      {(d.kind === "boarding" || d.kind === "daycare") && !isCancelled ? (
        <>
          {feedingShown || medsShown ? (
            <div className={TWO_UP}>
              {feedingShown ? (
                <FeedingCard
                  d={d}
                  onEdit={canEdit ? handlers.edit : undefined}
                />
              ) : null}
              {medsShown ? (
                <MedicationsCard
                  d={d}
                  onAdd={
                    d.permissions.canEditBooking
                      ? () => openDialog("addMedication")
                      : undefined
                  }
                />
              ) : null}
            </div>
          ) : null}
          <BelongingsCard d={d} />
        </>
      ) : null}

      {d.kind === "grooming" ? (
        <>
          <GroomServicesCard d={d} facts={facts} />
          <div className={TWO_UP}>
            <GroomPrefsCard d={d} onEdit={() => openDialog("groomPrefs")} />
            <BeforeAfterCard d={d} facts={facts} />
          </div>
        </>
      ) : null}

      {d.kind === "training" && !isCancelled ? (
        <>
          <SkillsCard d={d} facts={facts} />
          <SessionsCard d={d} facts={facts} />
          <LessonPackCard
            d={d}
            onBookNext={(programId) =>
              openBookingModal({
                clients: [client],
                facilityId: booking.facilityId,
                facilityName: facilityProfile.businessName,
                preSelectedClientId: client.id,
                preSelectedPetId: d.pet?.id,
                preSelectedService: "training",
                preSelectedProgramId: programId,
                lockService: true,
                onCreateBooking: createBooking,
              })
            }
          />
        </>
      ) : null}

      {booking.yipyyGo?.requirement ? (
        <YipyyGoBookingCard bookingRef={booking.id} />
      ) : null}
    </>
  );
}
