"use client";

import { Button } from "@/components/ui/button";
import { useMedicationPhotos } from "@/lib/api/booking-medication-photos";
import { formatTimeOfDay } from "@/lib/i18n/format";
import {
  describeMedication,
  formLabel,
  methodName,
} from "@/lib/medications/describe";
import { bookingStay } from "@/lib/medications/schedule";
import { useShellText } from "@/lib/shell/use-shell-text";

import { DetailsCard, DetailsCardHeader } from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// The Medications card, as the mock draws it: each medication's name, its dose
// and when, and how it is given — in the booking form's own words
// (`describeMedication`), so staff read what the owner wrote. A label photo
// the owner or staff took is one tap away. Giving a dose is the journal's job.
//
// "+ Add" opens the add form — a medication added here goes on the booking's
// own list, as it always did.
// ============================================================================

export function MedicationsCard({
  d,
  onAdd,
}: {
  d: BookingDetails;
  onAdd?: () => void;
}) {
  const { t, fill, locale } = d.text;
  const words = useShellText("booking");
  const booking = d.booking;
  const photos = useMedicationPhotos(booking?.id);
  if (!booking) return null;

  const meds = booking.medications ?? [];
  const stay = bookingStay(booking);
  const nameOf = (petId?: number) =>
    d.pets.find((p) => p.id === petId)?.name ?? null;
  // A signed URL lasts a minute: opening one asks for a fresh one.
  const openPhoto = async (medicationId: string) => {
    const fresh = await photos.refetch();
    const url = (fresh.data ?? []).find(
      (photo) => photo.medicationId === medicationId,
    )?.url;
    if (url) window.open(url, "_blank", "noopener");
  };
  const takesNone = d.pets.filter((p) => booking.noMedication?.includes(p.id));

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("medsTitle")} dot="meds">
        {onAdd ? (
          <Button variant="quiet" size="bd-34" onClick={onAdd}>
            {t("addPlus")}
          </Button>
        ) : null}
      </DetailsCardHeader>
      <div className="flex flex-col px-5 pt-1.5 pb-3.5">
        {meds.map((med) => {
          const lines = med.doseAmount
            ? describeMedication(
                { ...med, notes: "" },
                {
                  t: words,
                  locale,
                  stay,
                  settings: d.medicationInstructions,
                  priced: false,
                },
              )
            : null;
          const pet = d.pets.length > 1 ? nameOf(med.petId) : null;
          const form = med.form ? formLabel(words, med.form) : "";
          // A medication added before the Medications step, or from this
          // page's "+ Add": its own fields, worded the same way.
          const clock = (med.times ?? [])
            .map((time) => formatTimeOfDay(time, locale))
            .join(", ");
          const dose = lines
            ? [lines.dose, lines.schedule].filter(Boolean).join(" · ")
            : [med.amount, clock].filter(Boolean).join(" · ");
          const extra = lines
            ? [lines.method, ...lines.extras].filter(Boolean).join(" · ")
            : [
                med.givenWith
                  ? methodName(words, med.givenWith, med.methodLabel)
                  : null,
                med.notes,
              ]
                .filter(Boolean)
                .join(" · ");
          const photo = (photos.data ?? []).some(
            (p) => p.medicationId === med.id,
          );
          return (
            <div
              key={med.id}
              className="border-line-soft flex flex-col gap-1 border-b py-2.5"
            >
              <span className="text-[14px] font-semibold">
                {[pet, [med.name, med.strength].filter(Boolean).join(" "), form]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {dose ? (
                <span className="text-ink-secondary text-[13px]">{dose}</span>
              ) : null}
              {extra || photo ? (
                <span className="text-ink-tertiary text-[12px]">
                  {extra}
                  {photo ? (
                    <>
                      {extra ? " · " : ""}
                      <button
                        type="button"
                        className="text-primary hover:text-primary-hover font-semibold"
                        onClick={() => void openPhoto(med.id)}
                      >
                        {t("labelPhoto")}
                      </button>
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        })}
        {takesNone.map((pet) => (
          <span key={pet.id} className="text-ink-tertiary py-3 text-[14px]">
            {fill("takesNoMedication", { pet: pet.name })}
          </span>
        ))}
        {meds.length === 0 && takesNone.length === 0 ? (
          <span className="text-ink-disabled py-3 text-[14px]">
            {t("noMedsThisVisit")}
          </span>
        ) : null}
      </div>
    </DetailsCard>
  );
}
