"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { KennelChangesField } from "@/components/bookings/modals/service-details/KennelChangesField";
import { Chip } from "@/components/ui/chip";
import { ChoicePill } from "@/components/ui/choice-pill";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { Photo } from "@/components/ui/photo";
import { Tick } from "@/components/ui/tick";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocationContext } from "@/hooks/use-location-context";
import { useRooms } from "@/hooks/use-rooms";
import { bookingQueries } from "@/lib/api/booking";
import { useBoardingMenu } from "@/lib/api/boarding-catalogue";
import type { KennelChange } from "@/lib/boarding/kennel-changes";
import {
  roomTypeCards,
  type RoomTypeCard,
} from "@/lib/bookings/wizard/room-type-cards";
import { getBoardingCategoryAvailability } from "@/lib/capacity-engine";
import {
  formatDateShort,
  formatList,
  formatMoney,
  formatWeightFromLb,
  formatWeightRangeFromLb,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { localToday } from "@/lib/vaccinations";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";

import type { ChosenBoardingService } from "@/lib/bookings/wizard/boarding-choice";

// ============================================================================
// Boarding's "Room type" screen (the client's mock, 2026-10-01): "Choose a
// room" — the facility's boarding services as cards, each with its photo,
// nightly price, size line and, for STAFF ONLY, how many are free for the
// stay. The client: "the rooms available … shows in the customer side,
// delete that — only the facility side needs to see how many rooms are left".
//
// Several pets: a tab per pet, each choosing its own room, and "share a
// room" puts them in one room of a type that holds more than one. Staff keep
// the lodging-type choice (a service booked into several) and kennel changes.
// ============================================================================

const NO_BOOKINGS: Booking[] = [];

export interface RoomChoice {
  /** Each pet's card, by pet id. */
  petServices: Record<number, string>;
  /** Each pet's boarding service, where its card is one. */
  petBoardingServices: Record<number, ChosenBoardingService>;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  share: boolean;
  /** The first pet's service: the booking's own. */
  boardingService: ChosenBoardingService | null;
}

export function RoomTypeStep({
  isCustomer,
  pets,
  start,
  end,
  value,
  onChange,
  kennelChanges,
  setKennelChanges,
}: {
  isCustomer: boolean;
  pets: readonly Pet[];
  start: Date | null;
  end: Date | null;
  value: RoomChoice;
  onChange: (next: RoomChoice) => void;
  /** Staff, new bookings only. */
  kennelChanges?: KennelChange[];
  setKennelChanges?: (changes: KennelChange[]) => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const { currentLocation } = useLocationContext();
  const locationId = currentLocation?.id ?? null;
  const petRefs = pets.map((p) => p.id).filter((id) => Number.isInteger(id));
  const { data: menu, isPending: menuPending } = useBoardingMenu({
    asCustomer: isCustomer,
    locationId,
    petRefs,
  });
  const { categories, rooms } = useRooms();
  const startDate = start ? localToday(start) : "";
  const endDate = end ? localToday(end) : "";
  // What is booked over the stay, for the counts — staff only: a customer
  // never reads other people's bookings, and is never shown a count.
  const { data: bookings = NO_BOOKINGS } = useQuery({
    ...bookingQueries.window({ from: startDate, to: endDate }),
    enabled: !isCustomer && Boolean(startDate && endDate),
  });

  const [activeId, setActiveId] = useState<number | null>(null);
  const active =
    pets.find((p) => p.id === activeId) ??
    pets.find((p) => !value.petServices[p.id]) ??
    pets[0] ??
    null;

  const boardingCategories = categories.filter((c) => c.service === "boarding");
  const boardingRooms = rooms.filter((r) =>
    boardingCategories.some((c) => c.id === r.categoryId),
  );
  const availability =
    startDate && endDate && !isCustomer
      ? getBoardingCategoryAvailability(
          startDate,
          endDate,
          boardingCategories,
          boardingRooms,
          bookings,
          active ?? undefined,
        ).map((a) => ({
          categoryId: a.category.id,
          totalActive: a.totalActive,
          availableUnits: a.availableUnits,
          eligible: a.eligible,
          eligibilityMessage: a.eligibilityMessage,
        }))
      : [];
  const cards = roomTypeCards({
    services: menu ?? [],
    categories,
    availability,
    pet: active,
    showCounts: !isCustomer,
  });
  const cardOf = (id: string | undefined) => cards.find((c) => c.id === id);
  const chosenOf = (
    card: RoomTypeCard | undefined,
  ): ChosenBoardingService | null => {
    if (!card || card.kind !== "service") return null;
    const row = (menu ?? []).find((s) => s.rowId === card.id);
    return row
      ? {
          rowId: row.rowId,
          name: row.name,
          price: row.price,
          unit: row.unit,
          lodgingTypeIds: row.lodgingTypeIds,
          defaultAddOns: row.defaultAddOns,
          additionalPetPrice: row.additionalPetPrice ?? null,
        }
      : null;
  };
  const lodgingFor = (card: RoomTypeCard, pet: Pet) => {
    const current = value.roomAssignments.find(
      (a) => a.petId === pet.id,
    )?.roomId;
    if (current && card.lodgingIds.includes(current)) return current;
    const free = availability.find(
      (a) =>
        card.lodgingIds.includes(a.categoryId) &&
        a.eligible &&
        a.availableUnits > 0,
    );
    return free?.categoryId ?? card.lodgingIds[0] ?? card.id;
  };

  const emit = (
    petServices: Record<number, string>,
    assignments: Array<{ petId: number; roomId: string }>,
    share: boolean,
  ) =>
    onChange({
      petServices,
      petBoardingServices: Object.fromEntries(
        Object.entries(petServices).flatMap(([petId, cardId]) => {
          const chosen = chosenOf(cardOf(cardId));
          return chosen ? [[Number(petId), chosen]] : [];
        }),
      ),
      roomAssignments: assignments,
      share,
      boardingService: chosenOf(cardOf(petServices[pets[0]?.id ?? -1])),
    });

  const pick = (card: RoomTypeCard) => {
    if (!active || card.blocked) return;
    const lodging = lodgingFor(card, active);
    let share = value.share;
    const services = { ...value.petServices };
    let assignments = value.roomAssignments.filter((a) =>
      pets.some((p) => p.id === a.petId),
    );
    if (share && card.shareable) {
      for (const pet of pets) services[pet.id] = card.id;
      assignments = pets.map((pet) => ({ petId: pet.id, roomId: lodging }));
    } else {
      services[active.id] = card.id;
      assignments = [
        ...assignments.filter((a) => a.petId !== active.id),
        { petId: active.id, roomId: lodging },
      ];
      if (share && !card.shareable) share = false;
    }
    emit(services, assignments, share);
    const next = pets.find((p) => !services[p.id]);
    setActiveId(next?.id ?? active.id);
  };

  const toggleShare = (on: boolean) => {
    if (!on) {
      emit(value.petServices, value.roomAssignments, false);
      return;
    }
    const card = cardOf(active ? value.petServices[active.id] : undefined);
    if (card && card.shareable && active) {
      const lodging = lodgingFor(card, active);
      const services: Record<number, string> = {};
      for (const pet of pets) services[pet.id] = card.id;
      emit(
        services,
        pets.map((pet) => ({ petId: pet.id, roomId: lodging })),
        true,
      );
    } else {
      emit({}, [], true);
    }
  };

  // "4 × 4 ft · pets up to 11.3 kg (25 lb)" — the facility's size words,
  // then what the lodging's rules let in.
  const sizeLineOf = (card: RoomTypeCard): string => {
    const { weight, species } = card.limits;
    const limit =
      weight.minLb !== undefined && weight.maxLb !== undefined
        ? fill(t("wizRoomPetsBetween"), {
            range: formatWeightRangeFromLb(weight.minLb, weight.maxLb, locale),
          })
        : weight.maxLb !== undefined
          ? fill(t("wizRoomPetsUpTo"), {
              weight: formatWeightFromLb(weight.maxLb, locale),
            })
          : weight.minLb !== undefined
            ? fill(t("wizRoomPetsFrom"), {
                weight: formatWeightFromLb(weight.minLb, locale),
              })
            : species
              ? null
              : t("wizRoomAllSizes");
    // The two species every facility has, in the reader's language ("Dogs
    // only", "Chiens seulement"); any other as the facility named it.
    const speciesWord = (name: string) =>
      /^(dogs?|chiens?)$/i.test(name.trim())
        ? t("wizSpeciesDogs")
        : /^(cats?|chats?)$/i.test(name.trim())
          ? t("wizSpeciesCats")
          : name;
    const kinds = species
      ? fill(t("wizRoomSpeciesOnly"), {
          species: formatList(species.map(speciesWord), locale),
        })
      : null;
    const line = [card.dimensions, kinds, limit].filter(Boolean).join(" · ");
    return line.charAt(0).toLocaleUpperCase(locale) + line.slice(1);
  };

  const multiPet = pets.length > 1;
  // Which cards a household may share, and what the second pet costs —
  // said only when every one of them charges the same.
  const shareable = cards.filter((c) => c.shareable && !c.blocked);
  const shareRates = [
    ...new Set(shareable.map((c) => `${c.additionalPetPrice}|${c.unit}`)),
  ];
  const shareRate =
    shareRates.length === 1 && shareable[0]?.additionalPetPrice != null
      ? shareable[0]
      : null;
  const shareHint = shareRate
    ? fill(
        t(
          shareRate.unit === "day"
            ? "wizShareRoomHintPriceDay"
            : "wizShareRoomHintPrice",
        ),
        {
          price: formatMoney(shareRate.additionalPetPrice ?? 0, locale, {
            whole: Number.isInteger(shareRate.additionalPetPrice),
          }),
          rooms: formatList(
            shareable.map((c) => c.name),
            locale,
          ),
        },
      )
    : fill(t("wizShareRoomHint"), {
        rooms: formatList(
          shareable.map((c) => c.name),
          locale,
        ),
      });
  const activeCard = cardOf(active ? value.petServices[active.id] : undefined);
  const activeLodging = active
    ? value.roomAssignments.find((a) => a.petId === active.id)?.roomId
    : undefined;
  const lodgingName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;
  const sole =
    new Set(value.roomAssignments.map((a) => a.roomId)).size === 1
      ? (value.roomAssignments[0]?.roomId ?? null)
      : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-body-ink text-[17px] font-semibold">
            {t("wizChooseRoom")}
          </h3>
          <p className="text-ink-tertiary text-[13.5px]">
            {start && end
              ? fill(t(multiPet ? "wizRoomsForStayEach" : "wizRoomsForStay"), {
                  from: formatDateShort(start, locale),
                  to: formatDateShort(end, locale),
                })
              : t("wizPickRoomType")}
          </p>
        </div>
        {multiPet && shareable.length > 0 ? (
          <label className="border-line bg-card flex cursor-pointer items-center gap-3 rounded-[16px] border px-3.5 py-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="text-body-ink text-[13.5px] font-semibold">
                {fill(t("wizShareRoom"), {
                  pets: pets.map((p) => p.name).join(" & "),
                })}
              </span>
              <span className="text-ink-tertiary text-[12px]">{shareHint}</span>
            </span>
            <Switch checked={value.share} onCheckedChange={toggleShare} />
          </label>
        ) : null}
      </div>

      {multiPet ? (
        <div
          role="radiogroup"
          aria-label={t("wizPetsLabel")}
          className="flex flex-wrap gap-2"
        >
          {pets.map((pet) => {
            const card = cardOf(value.petServices[pet.id]);
            return (
              <ChoicePill
                key={pet.id}
                type="radio"
                name="wizard-room-pet"
                value={String(pet.id)}
                checked={active?.id === pet.id}
                onChange={() => setActiveId(pet.id)}
                className="min-h-[42px] pr-4 pl-1.5 text-[14px] max-lg:min-h-[42px]"
              >
                <PetAvatar
                  name={pet.name}
                  src={pet.imageUrl}
                  size="mk-30"
                  surface="card"
                />
                <span>{pet.name}</span>
                <span className="text-[12.5px] font-normal opacity-80">
                  · {card ? card.name : t("wizNoRoomYet")}
                </span>
              </ChoicePill>
            );
          })}
        </div>
      ) : null}

      {cards.length === 0 && menuPending ? (
        // The menu is still on its way: the cards' shape, pulsing (§4 yy-skel),
        // never an empty space that reads as "nothing to book".
        <div
          aria-hidden
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3.5"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel flex flex-col overflow-hidden rounded-[22px] border-[1.5px]"
            >
              <span className="bg-surface-inset h-[150px]" />
              <span className="flex flex-col gap-2.5 px-[18px] py-4">
                <span className="bg-surface-inset h-4 w-2/5 rounded-full" />
                <span className="bg-surface-inset h-3 w-3/5 rounded-full" />
              </span>
            </div>
          ))}
        </div>
      ) : cards.length === 0 && menu ? (
        <div className="border-line-strong flex flex-col items-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center">
          <p className="text-body-ink text-[15px] font-semibold">
            {t("noRoomCategoriesSetUp")}
          </p>
          <p className="text-ink-tertiary text-[13.5px]">
            {t("addCategoriesInBoardingRooms")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3.5">
          {cards.map((card) => {
            const on = active
              ? value.petServices[active.id] === card.id
              : false;
            const disabled = !!card.blocked;
            const reason =
              card.blocked === "full"
                ? t("wizFullyBooked")
                : card.blocked === "rule"
                  ? (card.ruleMessage ??
                    fill(t("wizRoomTooSmall"), {
                      pet: active?.name ?? "",
                      weight: active?.weight
                        ? formatWeightFromLb(active.weight, locale)
                        : "",
                    }))
                  : card.blocked === "not-offered"
                    ? fill(t("wizRoomNotFor"), { pet: active?.name ?? "" })
                    : null;
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={on}
                aria-disabled={disabled || undefined}
                data-on={on}
                data-disabled={disabled || undefined}
                onClick={() => pick(card)}
                // The booking mock's room card (2026-10-02): a picked one is the
                // accent with its glow, one that does not suit the pet fades.
                className="mk-pick bg-card focus-visible:outline-primary relative flex min-w-0 flex-col overflow-hidden rounded-[22px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
              >
                <span className="relative block h-[150px]">
                  <Photo
                    src={card.imageUrl}
                    shape="band"
                    label={t("wizRoomPhoto")}
                    className="h-[150px]"
                  />
                  {card.price !== null ? (
                    <span className="absolute top-3 left-3 rounded-full bg-(--price-pill) px-2.5 py-[5px] text-[12.5px] font-semibold text-white tabular-nums">
                      {fill(
                        t(
                          card.unit === "day"
                            ? "wizPricePerDay"
                            : "wizPricePerNight",
                        ),
                        {
                          price: formatMoney(card.price, locale, {
                            whole: Number.isInteger(card.price),
                          }),
                        },
                      )}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-col gap-2 px-[18px] py-4">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body-ink text-[16.5px] font-semibold">
                      {card.name}
                    </span>
                    {card.free !== null &&
                    card.total !== null &&
                    card.blocked !== "full" ? (
                      <span
                        className={
                          card.free <= 2
                            ? "text-[12.5px] font-semibold whitespace-nowrap text-(--warm-ink)"
                            : "text-success text-[12.5px] font-semibold whitespace-nowrap"
                        }
                      >
                        {card.free === 1
                          ? t("wizLastOneLeft")
                          : fill(t("wizFreeOf"), {
                              free: card.free,
                              total: card.total,
                            })}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-ink-tertiary text-[13px]">
                    {sizeLineOf(card)}
                  </span>
                  {card.features.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {card.features.map((feature) => (
                        <Chip
                          key={feature}
                          tone="neutral"
                          size="sm"
                          className="bg-(--tag-bg) py-[3px] font-normal"
                        >
                          {feature}
                        </Chip>
                      ))}
                    </span>
                  ) : null}
                  {reason ? (
                    <span className="text-[12.5px] font-semibold text-(--warm-ink)">
                      {reason}
                    </span>
                  ) : null}
                </span>
                {on ? <Tick size={26} className="top-3 right-3" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {!isCustomer &&
      activeCard &&
      activeCard.lodgingIds.length > 1 &&
      active ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body-ink text-[13.5px] font-semibold">
            {t("wizLodgingType")}
          </span>
          <Select
            value={activeLodging ?? ""}
            onValueChange={(roomId) => {
              const targets = value.share ? pets : [active];
              emit(
                value.petServices,
                [
                  ...value.roomAssignments.filter(
                    (a) => !targets.some((p) => p.id === a.petId),
                  ),
                  ...targets.map((p) => ({ petId: p.id, roomId })),
                ],
                value.share,
              );
            }}
          >
            <SelectTrigger
              aria-label={t("wizLodgingType")}
              className="min-w-52"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeCard.lodgingIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {lodgingName(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!isCustomer && setKennelChanges && sole && startDate && endDate ? (
        <KennelChangesField
          startDate={startDate}
          endDate={endDate}
          first={sole}
          defaultType={rooms.find((r) => r.id === sole)?.categoryId ?? sole}
          labelOf={(id) =>
            categories.find((c) => c.id === id)?.name ??
            rooms.find((r) => r.id === id)?.name ??
            id
          }
          categories={boardingCategories}
          value={kennelChanges ?? []}
          onChange={setKennelChanges}
        />
      ) : null}

      {!isCustomer ? (
        <p className="text-ink-tertiary text-[12.5px]">
          {t("wizRoomsFromSettings")}
        </p>
      ) : null}
    </div>
  );
}
