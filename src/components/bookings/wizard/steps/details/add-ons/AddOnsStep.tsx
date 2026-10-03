"use client";

import { Gift } from "lucide-react";

import { IncludedAddOns } from "@/components/bookings/modals/service-details/IncludedAddOns";
import { Badge } from "@/components/ui/badge";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { Photo } from "@/components/ui/photo";
import { useOfferedAddOns } from "@/lib/add-ons/use-offered-add-ons";
import { formatDuration, formatMoney } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { ExtraService } from "@/types/booking";
import type { Pet } from "@/types/pet";

// ============================================================================
// "Add-ons" (the client's mock, 2026-10-01): what the facility offers for
// this service and these pets, one row each — its picture, name, price, a
// line about it — and a quantity per pet. What the chosen boarding service
// adds by itself is listed above, read-only, at its price.
//
// No unit after the price: Yipyy's add-ons have one price and the booking
// says how many (the unit was dropped 2026-09-30).
// ============================================================================

const MAX_QUANTITY = 99;

// The booking mock's −/+ (2026-10-02): 28px circles, 36px on touch, faded
// when there is nothing to take away or no room to add.
const STEP_BUTTON =
  "border-line-strong bg-card text-body-ink focus-visible:outline-primary flex size-7 shrink-0 items-center justify-center rounded-full border text-[15px] leading-none disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:size-9";

export function AddOnsStep({
  careType,
  serviceRowId,
  kindLabel,
  pets,
  value,
  onChange,
  included,
  maxQuantity = MAX_QUANTITY,
  hint,
}: {
  /** The add-on rules' service type: "boarding", "daycare". */
  careType: string;
  /** The chosen service's row uuid — what an add-on is offered for. */
  serviceRowId: string | null;
  /** "boarding", in words, for the line under the heading. */
  kindLabel: string;
  pets: readonly Pet[];
  value: readonly ExtraService[];
  onChange: (lines: ExtraService[]) => void;
  /** What the chosen service attaches by itself (boarding, a groom). */
  included?: { lines: readonly ExtraService[]; serviceName: string };
  /** Grooming: one of each per pet — the mock's + stops at 1. */
  maxQuantity?: number;
  /** The line under the heading, where the service has its own. */
  hint?: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const offered = useOfferedAddOns({ careType, serviceId: serviceRowId, pets });

  const quantityOf = (ref: string, petId: number) =>
    value.find((line) => line.serviceId === ref && line.petId === petId)
      ?.quantity ?? 0;
  const setQuantity = (ref: string, petId: number, quantity: number) => {
    const rest = value.filter(
      (line) => !(line.serviceId === ref && line.petId === petId),
    );
    onChange(
      quantity > 0 ? [...rest, { serviceId: ref, petId, quantity }] : rest,
    );
  };

  return (
    <div className="flex max-w-[1000px] flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-body-ink text-[17px] font-semibold">
          {t("addOnsLabel")}
        </h3>
        <p className="text-ink-tertiary text-[13.5px]">
          {hint ?? fill(t("wizAddOnsHint"), { kind: kindLabel.toLowerCase() })}
        </p>
      </div>

      {included && included.lines.length > 0 ? (
        <IncludedAddOns
          lines={included.lines}
          serviceName={included.serviceName}
          pets={pets}
        />
      ) : null}

      {offered.length === 0 ? (
        <p className="border-line-strong text-ink-secondary rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center text-[13.5px]">
          {t("wizNoAddOns")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {offered.map((addOn) => {
            // A line at no quantity is one the booking carries free (an
            // estimate converted with it, say): it is said, not counted.
            const free = value.some(
              (line) => line.serviceId === addOn.ref && line.quantity === 0,
            );
            return (
              <li
                key={addOn.ref}
                className="border-line bg-card flex flex-wrap items-center gap-4 rounded-[20px] border px-[18px] py-3.5"
              >
                <Photo
                  src={addOn.imageUrl}
                  shape="tile"
                  className="size-13 shrink-0 rounded-[14px]"
                />
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-body-ink text-[15px] font-semibold">
                      {addOn.name}
                    </span>
                    <span className="text-acc-deep text-[13.5px] font-semibold tabular-nums">
                      {formatMoney(addOn.price, locale, {
                        whole: Number.isInteger(addOn.price),
                      })}
                    </span>
                    {/* A groom's add-on lengthens the appointment (the
                        mock's "+15 min"); elsewhere minutes say nothing. */}
                    {careType === "grooming" && addOn.durationMin > 0 ? (
                      <span className="text-ink-tertiary text-[12px]">
                        +
                        {addOn.durationMin < 60
                          ? fill(t("wizMinutes"), { count: addOn.durationMin })
                          : formatDuration(addOn.durationMin, locale)}
                      </span>
                    ) : null}
                  </span>
                  {addOn.description ? (
                    <span className="text-ink-tertiary text-[13px]">
                      {addOn.description}
                    </span>
                  ) : null}
                </span>
                {free ? (
                  <Badge variant="confirmed">
                    <Gift aria-hidden />
                    {t("includedFree")}
                  </Badge>
                ) : (
                  <span className="flex flex-wrap gap-2">
                    {pets.map((pet) => {
                      const quantity = quantityOf(addOn.ref, pet.id);
                      // One each, and the package already gives this pet
                      // one: said, not offered again.
                      if (
                        maxQuantity === 1 &&
                        included?.lines.some(
                          (line) =>
                            line.petId === pet.id &&
                            (line.serviceId === addOn.ref ||
                              line.serviceId === addOn.rowId),
                        )
                      ) {
                        return (
                          <span
                            key={pet.id}
                            className="border-line flex items-center gap-2 rounded-full border bg-(--stepper-bg) px-1.5 py-[5px] pr-2.5"
                          >
                            <PetAvatar
                              name={pet.name}
                              src={pet.imageUrl}
                              size="mk-26"
                              surface="muted"
                            />
                            <span className="text-body-ink pr-1 text-[13px] font-medium">
                              {pet.name}
                            </span>
                            <Badge variant="confirmed">
                              <Gift aria-hidden />
                              {t("wizIncluded")}
                            </Badge>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={pet.id}
                          className="border-line flex items-center gap-2 rounded-full border bg-(--stepper-bg) px-1.5 py-[5px]"
                        >
                          <PetAvatar
                            name={pet.name}
                            src={pet.imageUrl}
                            size="mk-26"
                            surface="muted"
                          />
                          <span className="text-body-ink pr-1 text-[13px] font-medium">
                            {pet.name}
                          </span>
                          <button
                            type="button"
                            className={STEP_BUTTON}
                            disabled={quantity === 0}
                            aria-label={fill(t("wizAddOnLess"), {
                              name: addOn.name,
                              pet: pet.name,
                            })}
                            onClick={() =>
                              setQuantity(addOn.ref, pet.id, quantity - 1)
                            }
                          >
                            <span aria-hidden>−</span>
                          </button>
                          <output
                            aria-live="polite"
                            className={
                              quantity > 0
                                ? "text-body-ink min-w-4 text-center text-[14px] font-semibold tabular-nums"
                                : "text-ink-disabled min-w-4 text-center text-[14px] font-semibold tabular-nums"
                            }
                          >
                            {quantity}
                          </output>
                          <button
                            type="button"
                            className={STEP_BUTTON}
                            disabled={quantity >= maxQuantity}
                            aria-label={fill(t("wizAddOnMore"), {
                              name: addOn.name,
                              pet: pet.name,
                            })}
                            onClick={() =>
                              setQuantity(addOn.ref, pet.id, quantity + 1)
                            }
                          >
                            <span aria-hidden>+</span>
                          </button>
                        </span>
                      );
                    })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
