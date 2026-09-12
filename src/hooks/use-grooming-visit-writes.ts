"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import {
  useAddLineItems,
  type NewLineItem,
} from "@/lib/api/booking-line-items";
import { useGroomingAddOns } from "@/lib/api/grooming-catalogue";
import {
  useSaveAppointmentIntake,
  useUploadAppointmentPhoto,
} from "@/lib/api/grooming-appointments";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { GroomingAppointment } from "@/types/grooming";
import type { CheckInActionSummary } from "@/lib/grooming/check-in-actions";
import type { MarkReadyFinalCharge } from "@/components/facility/grooming/mark-ready-dialog";

// ============================================================================
// What a check-in and a mark-ready leave behind, written.
//
// Both dialogs collected more than the grooming board ever kept. The add-ons
// added at the door, the matting surcharge and the final charges were set on
// the appointment object in memory — priced from the fixture catalogue — and
// the photos were blob URLs; all of it was gone on reload, so the work was
// done and never charged, and the photos the dialog called "saved" were not.
//
// Three screens run these flows (the check-in board, the appointment panel
// and the appointment page), so the writes live here once:
//
//   charges  → booking line items, which the booking's amount due includes,
//              so the payment dialog and the booking checkout both charge them
//   photos   → the appointment's photo rows, uploaded to the private bucket
//   intake   → the intake record (check-in) or its session notes (ready)
//
// Each part is written on its own and a failure names the part, rather than
// the whole visit being reported as saved or as lost.
// ============================================================================

type IntakePatch =
  | CheckInActionSummary["intakePatch"]
  | { sessionNotes: string };

export function useGroomingVisitWrites() {
  const { mutateAsync: addLineItems } = useAddLineItems();
  const { mutateAsync: uploadPhoto } = useUploadAppointmentPhoto();
  const { mutateAsync: saveIntake } = useSaveAppointmentIntake();
  const { data: addOnCatalog } = useGroomingAddOns();
  const { t, fill } = useStaffText("groomingAppointment");

  const write = useCallback(
    async (input: {
      apt: GroomingAppointment;
      intake?: IntakePatch;
      lineItems: NewLineItem[];
      photos: File[];
      kind: "before" | "after";
    }): Promise<boolean> => {
      const failures: string[] = [];
      const attempt = (part: string, work: Promise<unknown>) =>
        work.catch((error: unknown) => {
          failures.push(
            `${part}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      await Promise.all([
        input.intake
          ? attempt(
              t("partNotes"),
              saveIntake({ appointmentId: input.apt.id, ...input.intake }),
            )
          : null,
        input.lineItems.length > 0
          ? attempt(
              t("partCharges"),
              addLineItems({
                bookingRef: Number(input.apt.id),
                items: input.lineItems,
              }),
            )
          : null,
        ...input.photos.map((file) =>
          attempt(
            t("partPhotos"),
            uploadPhoto({
              appointmentId: input.apt.id,
              kind: input.kind,
              file,
            }),
          ),
        ),
      ]);

      if (failures.length > 0) {
        toast.error(fill("notAllSaved", { pet: input.apt.petName }), {
          description: failures.join(" · "),
        });
        return false;
      }
      return true;
    },
    [addLineItems, uploadPhoto, saveIntake, t, fill],
  );

  /** The check-in's add-ons and surcharge as bill lines, priced as booked. */
  const checkIn = useCallback(
    (
      apt: GroomingAppointment,
      summary: CheckInActionSummary,
      photos: File[],
    ) => {
      const lineItems: NewLineItem[] = [];
      for (const name of summary.newlyAddedAddOns) {
        const addOn = addOnCatalog?.find((a) => a.name === name);
        // An add-on the catalogue does not price is not charged at a guess.
        if (addOn) {
          lineItems.push({
            kind: "item",
            name: addOn.name,
            unitPrice: addOn.price,
            sourceId: addOn.id,
          });
        }
      }
      if (summary.mattedSurcharge > 0) {
        lineItems.push({
          kind: "fee",
          name: t("mattingSurcharge"),
          unitPrice: summary.mattedSurcharge,
        });
      }
      return write({
        apt,
        intake: summary.intakePatch,
        lineItems,
        photos,
        kind: "before",
      });
    },
    [addOnCatalog, t, write],
  );

  /** Mark-ready's final charges, session notes and after-photos. */
  const markReady = useCallback(
    (
      apt: GroomingAppointment,
      result: {
        finalCharges: MarkReadyFinalCharge[];
        sessionNotes: string;
        afterPhotoFiles: File[];
      },
    ) =>
      write({
        apt,
        intake: result.sessionNotes
          ? { sessionNotes: result.sessionNotes }
          : undefined,
        lineItems: result.finalCharges.map((charge) => ({
          kind: "fee" as const,
          name: charge.label,
          unitPrice: charge.amount,
        })),
        photos: result.afterPhotoFiles,
        kind: "after",
      }),
    [write],
  );

  return { checkIn, markReady };
}
