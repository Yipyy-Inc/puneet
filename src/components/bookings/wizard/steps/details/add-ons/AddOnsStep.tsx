"use client";

import { Gift, Minus, Plus, Sparkles } from "lucide-react";

import { IncludedAddOns } from "@/components/bookings/modals/service-details/IncludedAddOns";
import { Badge } from "@/components/ui/badge";
import { PetAvatar } from "@/components/ui/pet-avatar";
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

const STEP_BUTTON =
  "border-line bg-card text-body-ink hover:border-line-strong focus-visible:outline-primary flex size-10 shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-ink-disabled disabled:hover:border-line focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:size-12";

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
        <h3 className="text-section text-body-ink">{t("addOnsLabel")}</h3>
        <p className="text-meta text-ink-tertiary">
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
        <p className="border-line-strong text-meta text-ink-secondary rounded-2xl border border-dashed px-6 py-8 text-center">
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
                className="border-line bg-card flex flex-wrap items-center gap-4 rounded-2xl border px-[18px] py-3.5"
              >
                <span
                  aria-hidden
                  className="bg-surface-inset text-ink-tertiary flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                >
                  {addOn.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a facility's own picture may live on any host
                    <img
                      src={addOn.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Sparkles className="size-5" />
                  )}
                </span>
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-body-strong text-body-ink">
                      {addOn.name}
                    </span>
                    <span className="text-meta text-body-ink font-semibold tabular-nums">
                      {formatMoney(addOn.price, locale, {
                        whole: Number.isInteger(addOn.price),
                      })}
                    </span>
                    {/* A groom's add-on lengthens the appointment (the
                        mock's "+15 min"); elsewhere minutes say nothing. */}
                    {careType === "grooming" && addOn.durationMin > 0 ? (
                      <span className="text-meta text-ink-tertiary">
                        +{formatDuration(addOn.durationMin, locale)}
                      </span>
                    ) : null}
                  </span>
                  {addOn.description ? (
                    <span className="text-meta text-ink-tertiary">
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
                            className="border-line bg-background flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1.5"
                          >
                            <PetAvatar
                              name={pet.name}
                              src={pet.imageUrl}
                              size="sm"
                            />
                            <span className="text-meta text-body-ink pr-1 font-medium">
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
                          className="border-line bg-background flex items-center gap-1.5 rounded-full border py-0.5 pr-0.5 pl-1.5"
                        >
                          <PetAvatar
                            name={pet.name}
                            src={pet.imageUrl}
                            size="sm"
                          />
                          <span className="text-meta text-body-ink pr-1 font-medium">
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
                            <Minus aria-hidden className="size-4" />
                          </button>
                          <output
                            aria-live="polite"
                            className={
                              quantity > 0
                                ? "text-body-strong text-body-ink min-w-4 text-center tabular-nums"
                                : "text-body-strong text-ink-tertiary min-w-4 text-center tabular-nums"
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
                            <Plus aria-hidden className="size-4" />
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
