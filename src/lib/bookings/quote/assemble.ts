import { resolveEffectivePricing } from "@/lib/api/grooming";
import { boardingPricing } from "@/lib/boarding-pricing";
import { type RateGap } from "@/lib/bookings/rate-gap";
import { houseFoodName } from "@/lib/feeding/labels";
import { computePackagePassDiscount } from "@/lib/grooming/package-pass";
import { formatMoney } from "@/lib/i18n/format";
import { stayUnits } from "@/lib/pricing/boarding-service-choice";
import { groomPrice } from "@/lib/bookings/wizard/groom-pricing";
import type { GroomingSizeTier } from "@/lib/grooming/size-tier";
import {
  careChargeLines,
  type CareChargeLine,
} from "@/lib/medications/charges";
import { providedLineName } from "@/lib/medications/describe";
import { fill as fillWords } from "@/lib/medications/dose";
import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import { splitBookingMoney } from "@/lib/pricing/booking-write-money";
import { computeBookingTotals } from "@/lib/service-areas";
import { isBuiltinService } from "@/lib/service-registry";
import { bookableLookup } from "@/lib/add-ons/bookable";
import type { Client } from "@/types/client";
import type { DaycareDateTime, ExtraService } from "@/types/booking";
import type { Pet } from "@/types/pet";

// ============================================================================
// THE QUOTE — what the booking wizard tells someone a booking costs, and what
// it sends as the booking's money. Moved here from the wizard's own memo
// (2026-10-01) so it is one pure function of what was chosen: the same body,
// the same arithmetic, every input named.
//
// Why pure: the quote is shown in four places (the footer, the rail, the
// confirm step's estimate card, the estimate the wizard can save) and decides
// what is written. A function of plain inputs can be pinned by tests across
// every service (tests/unit/booking-quote.test.ts) — a memo inside a 5,000-line
// component could only be pinned by clicking through it.
// ============================================================================

type PricingInput = Parameters<typeof applyDynamicPricingRules>[0];
type BoardingInput = Parameters<typeof boardingPricing>[0];
type CareInput = Parameters<typeof careChargeLines>[0];
type GroomingInput = Parameters<typeof resolveEffectivePricing>[0];
type Translate = (key: string) => string;

/** A line a training enrolment adds: one dog in one series. */
export interface QuoteTrainingLine {
  price: number;
  /** What the line is, for the estimate — the program or class. */
  label?: string;
  /** The dog it is for. */
  petName?: string;
  /** "3-session pack", "6 weeks", "1 h 30". */
  detail?: string;
}

/**
 * One line of the estimate, as the Confirm step lists it (the client's mock,
 * 2026-10-01): "Deluxe Suite · Bubu — 4 nights × $115.00 — $460.00". Built
 * where each amount is worked out, so the lines always add up to the
 * subtotal: a discount is a negative line, a free evaluation a zero one.
 */
export interface QuoteLine {
  key: string;
  label: string;
  /** "4 nights × $115.00", "Small · curly coat +$10". */
  detail?: string;
  amount: number;
}

/** An add-on of a groom, as the offer lists it. */
export interface QuoteGroomingAddOn {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface QuoteInput {
  t: Translate;
  locale: Parameters<typeof formatMoney>[1];
  selectedService: string;
  /** The grooming package chosen (grooming), by id. */
  serviceType: string;
  // ── dates and times ──
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  boardingNights: number;
  daycareSelectedDates: Date[];
  daycareDateTimes: DaycareDateTime[];
  // ── who ──
  selectedClient: Client | undefined;
  selectedPets: Pet[];
  pricingPets: PricingInput["pets"];
  pricingSelectedPetIds: number[];
  isNewCustomer: boolean;
  newPetIds: number[];
  isEstimateMode: boolean;
  isGuestEstimate: boolean;
  // ── what ──
  daycareService: { price: number; name?: string } | null;
  boardingService: {
    price: number;
    unit: "night" | "day";
    name: string;
    /** Each pet after the first in one shared room; null = free. */
    additionalPetPrice?: number | null;
  } | null;
  /**
   * Boarding: each pet's own service, from the Room type step (2026-10-01).
   * Given, every pet is its own room unless `boardingShare` puts the pets of
   * one room type in one room; absent, the stay prices as it always has.
   */
  boardingPetServices?: Record<
    number,
    {
      price: number;
      unit: "night" | "day";
      name: string;
      /** Each pet after the first in one shared room; null = free. */
      additionalPetPrice?: number | null;
    }
  >;
  boardingShare?: boolean;
  roomCategories: BoardingInput["categories"];
  facilityRooms: BoardingInput["rooms"];
  roomAssignments: BoardingInput["roomAssignments"];
  locationId: BoardingInput["locationId"];
  groomingMenu: GroomingInput["package"][];
  /** Grooming: each pet's package by pet id (the Package step); absent
   *  pets take `serviceType`. */
  groomingPetPackages?: Record<number, string>;
  /** Grooming: pets staff marked matted — the surcharge and its minutes. */
  groomingMatted?: Record<number, boolean>;
  /** The facility's size bands, the ones `create_booking` prices by. */
  groomingSizeTiers?: GroomingSizeTier[];
  groomingPetPricingOverrides: GroomingInput["petPricingOverrides"];
  groomingAddOnCatalog: QuoteGroomingAddOn[];
  groomingSelectedAddOnIds: string[];
  groomingIsMobile: boolean;
  groomingTravelZones: Parameters<typeof computeBookingTotals>[0]["zones"];
  facilityBasePostal: Parameters<
    typeof computeBookingTotals
  >[0]["basePostalCode"];
  trainingLines: QuoteTrainingLine[];
  evaluation: { price: number; internalName?: string | null };
  includesEvaluation: boolean;
  /** A custom module's base price, by slug; undefined when it is not one. */
  customBasePrice: (slug: string) => number | undefined;
  /** A custom module's name, by slug, for its estimate line. */
  customName?: (slug: string) => string | undefined;
  // ── extras ──
  pricingRules: PricingInput["rules"];
  extraServices: ExtraService[];
  /** What the chosen service attaches by itself: boarding's by the length
   *  of the stay, a groom's by its package's rules for each pet. */
  defaultLines: ExtraService[];
  addOnsCatalog: PricingInput["addOnsCatalog"];
  roomCategoryOf: PricingInput["roomCategoryOf"];
  careFees: CareInput["fees"];
  medicationSettings: CareInput["settings"];
  feedingSettings: CareInput["feedingSettings"];
  careStay: CareInput["parts"][number]["stay"];
  medications: CareInput["parts"][number]["medications"];
  feeding: CareInput["parts"][number]["feeding"];
  redeemedPackageId: string | null;
  /** The estimate's combined tax rate; only an estimate shows tax here. */
  estimateTaxRate: number;
}

export interface Quote {
  basePrice: number;
  rateGap: RateGap;
  addOnsTotal: number;
  adjustments: NonNullable<
    ReturnType<typeof applyDynamicPricingRules>["adjustments"]
  >;
  discount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  serviceChargeTotal: number;
  serviceTotal: number;
  effectiveExtraServices: ExtraService[];
  medicationFeeTotal: number;
  feedingFeeTotal: number;
  evaluationFeeTotal: number;
  groomingAddOnsTotal: number;
  serviceFeeItems: Array<{ label: string; amount: number }>;
  groomingPriceBreakdown: Array<{ petName: string; lines: string[] }>;
  /** Every line of the estimate, adding up to `subtotal`. */
  lines: QuoteLine[];
}

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** The service's own price, before rules, add-ons and care — and any gap. */
function servicePrice(input: QuoteInput): {
  basePrice: number;
  rateGap: RateGap;
  groomingPriceBreakdown: Quote["groomingPriceBreakdown"];
  lines: QuoteLine[];
} {
  const { t, locale, selectedService } = input;
  const groomingPriceBreakdown: Quote["groomingPriceBreakdown"] = [];
  const lines: QuoteLine[] = [];
  const money = (amount: number) => formatMoney(amount, locale);
  const petNames = input.selectedPets.map((pet) => pet.name).join(", ");
  const withPets = (label: string, names = petNames) =>
    names ? `${label} · ${names}` : label;

  if (selectedService === "daycare") {
    // The service the facility picked, at this branch's price. No choice is a
    // rate GAP (the wizard refuses and disables Create) — never a zero, which
    // would be a free day nobody agreed to.
    if (!input.daycareService) {
      return {
        basePrice: 0,
        rateGap: { kind: "daycare" },
        groomingPriceBreakdown,
        lines,
      };
    }
    // EACH DOG is a day of daycare (2026-10-01). This priced the day once
    // whoever came, so two dogs cost what one did — and the server, which
    // re-prices a customer's request, did the same.
    const days = input.daycareSelectedDates.length;
    const dogs = Math.max(1, input.pricingSelectedPetIds.length);
    const perDog = input.daycareService.price * days;
    const amount = perDog * dogs;
    const name = input.daycareService.name ?? t("wizKindDaycare");
    const detail = fillWords(
      t(days === 1 ? "wizLineDaysOne" : "wizLineDaysOther"),
      { count: days, price: money(input.daycareService.price) },
    );
    if (days > 0 && input.selectedPets.length > 0) {
      for (const pet of input.selectedPets) {
        lines.push({
          key: `daycare:${pet.id}`,
          label: `${name} · ${pet.name}`,
          detail,
          amount: perDog,
        });
      }
    } else if (days > 0) {
      lines.push({ key: "daycare", label: name, detail, amount });
    }
    return { basePrice: amount, rateGap: null, groomingPriceBreakdown, lines };
  }

  if (selectedService === "boarding") {
    // ── EACH PET'S ROOM (the client's mock, 2026-10-01) ─────────────────
    // A room per pet, at the service that pet was given — unless the pets
    // share, when the pets of one room type are one room at its rate.
    //
    // What an assignment names decides what a "room" is. A KENNEL (a unit —
    // an edit, a booking opened from the board) is one room whoever is in it,
    // because it is one room. A ROOM TYPE (the wizard's cards) becomes a
    // kennel when the booking is saved — one per pet, or one for the
    // household when they share (`roomsForAssignments`), so it is quoted
    // that way. Quoting a type once for two pets charged one room for the
    // two kennels the booking then held.
    const isKennel = (roomId: string) =>
      input.facilityRooms.some((room) => room.id === roomId);
    const units = new Map<
      string,
      {
        roomId: string;
        petIds: number[];
        service: QuoteInput["boardingService"];
      }
    >();
    for (const assignment of input.roomAssignments) {
      const service =
        input.boardingPetServices?.[assignment.petId] ?? input.boardingService;
      const key = isKennel(assignment.roomId)
        ? assignment.roomId
        : input.boardingShare
          ? `${assignment.roomId}|${service?.name ?? ""}`
          : `${assignment.roomId}|${assignment.petId}`;
      const unit = units.get(key);
      if (unit) unit.petIds.push(assignment.petId);
      else
        units.set(key, {
          roomId: assignment.roomId,
          petIds: [assignment.petId],
          service,
        });
    }
    // A line per pet, as the client's mock writes them: the room's first pet
    // at the room's rate, each pet sharing it after that as "Shared · …" at
    // the service's second-pet rate — "Free" where the facility charges the
    // room once (`additionalPetPrice` null, what a shared room always cost).
    let basePrice = 0;
    const unpriced = new Set<string>();
    const nameOf = (id: number) =>
      input.selectedPets.find((p) => p.id === id)?.name ?? "";
    const stayDetail = (unit: "night" | "day", count: number, price: number) =>
      count > 0
        ? fillWords(
            t(
              unit === "night"
                ? count === 1
                  ? "wizLineNightsOne"
                  : "wizLineNightsOther"
                : count === 1
                  ? "wizLineDaysOne"
                  : "wizLineDaysOther",
            ),
            { count, price: money(price) },
          )
        : undefined;
    for (const [key, unit] of units) {
      const room = boardingPricing({
        categories: input.roomCategories,
        rooms: input.facilityRooms,
        roomAssignments: [{ petId: unit.petIds[0]!, roomId: unit.roomId }],
        nights: input.boardingNights,
        locationId: input.locationId,
        service: unit.service
          ? {
              price: unit.service.price,
              unit: unit.service.unit,
              name: unit.service.name,
            }
          : null,
      });
      room.unpricedClasses.forEach((name) => unpriced.add(name));
      basePrice += room.total;
      const roomName =
        unit.service?.name ??
        input.roomCategories.find((c) => c.id === unit.roomId)?.name ??
        input.facilityRooms.find((r) => r.id === unit.roomId)?.name ??
        t("wizKindBoarding");
      const count = stayUnits(room.unit, input.boardingNights);
      const [first, ...sharing] = unit.petIds;
      lines.push({
        key: `boarding:${key}`,
        label: withPets(roomName, nameOf(first!)),
        detail:
          room.perUnit > 0
            ? stayDetail(room.unit, count, room.perUnit)
            : undefined,
        amount: room.total,
      });
      const extra = unit.service?.additionalPetPrice ?? null;
      for (const petId of sharing) {
        const amount = extra !== null && extra > 0 ? extra * count : 0;
        basePrice += amount;
        lines.push({
          key: `boarding:${key}:${petId}`,
          label: withPets(
            fillWords(t("wizLineShared"), { room: roomName }),
            nameOf(petId),
          ),
          detail: amount > 0 ? stayDetail(room.unit, count, extra!) : undefined,
          amount,
        });
      }
    }
    return {
      basePrice,
      rateGap:
        unpriced.size > 0 ? { kind: "boarding", classes: [...unpriced] } : null,
      groomingPriceBreakdown,
      lines,
    };
  }

  if (selectedService === "grooming") {
    // Each pet, its own package (the client's mock, 2026-10-01), through
    // `groomPrice` — the facility's size, the rate engine, matting — so the
    // estimate is the Package step's cards added up.
    const packageOf = (petId: number) => {
      // A map given is the whole answer; none is the old one package.
      const id = input.groomingPetPackages
        ? input.groomingPetPackages[petId]
        : input.serviceType;
      return id ? input.groomingMenu.find((p) => p.id === id) : undefined;
    };
    const priced = input.selectedPets.filter((pet) => packageOf(pet.id));
    if (priced.length === 0) {
      // No package yet: nothing to price. The step cannot be completed
      // without one, so this is a transient zero, not a charge.
      return { basePrice: 0, rateGap: null, groomingPriceBreakdown, lines };
    }
    // The sign is ours ("on top of the base"), the money is Intl's.
    const fmtDelta = (d: number) =>
      `${d > 0 ? "+" : "-"}${formatMoney(Math.abs(d), locale)}`;
    const tiers = input.groomingSizeTiers ?? [];
    const SIZE_WORDS: Record<string, string> = {
      small: t("wizSize_small"),
      medium: t("wizSize_medium"),
      large: t("wizSize_large"),
      giant: t("wizSize_giant"),
    };
    const COAT_WORDS: Record<string, string> = {
      short: t("wizCoat_short"),
      medium: t("wizCoat_medium"),
      long: t("wizCoat_long"),
      wire: t("wizCoat_wire"),
      curly: t("wizCoat_curly"),
      double: t("wizCoat_double"),
      hairless: t("wizCoat_hairless"),
      matted: t("wizCoat_matted"),
    };
    const sizeWord = (size: string) =>
      tiers.find((tier) => tier.id === size)?.label || SIZE_WORDS[size] || size;
    const coatWord = (coat: string) =>
      (COAT_WORDS[coat] ?? coat).toLocaleLowerCase(locale);
    const basePrice = priced.reduce((sum, pet) => {
      const pkg = packageOf(pet.id)!;
      const groom = groomPrice({
        pet,
        pkg,
        tiers,
        matted: input.groomingMatted?.[pet.id] === true,
        overrides: input.groomingPetPricingOverrides,
      });
      const why: string[] = [];
      if (groom.source === "pet-custom") {
        why.push(t("savedPricingFor").replace("{pet}", pet.name));
      } else if (groom.source === "breed-override") {
        why.push(t("breedPricing").replace("{breed}", pet.breed ?? ""));
      } else if (groom.source === "stylist-specific") {
        why.push(t("stylistPricing"));
      } else {
        if (groom.size) why.push(sizeWord(groom.size));
        if (groom.coat?.delta) {
          why.push(
            fillWords(t("wizCoatLine"), {
              coat: coatWord(groom.coat.coatType),
              delta: fmtDelta(groom.coat.delta),
            }),
          );
        }
        if (groom.age?.delta) {
          why.push(`${groom.age.label} ${fmtDelta(groom.age.delta)}`);
        }
      }
      if (groom.tier?.delta) {
        why.push(
          t("groomerTier")
            .replace("{tier}", groom.tier.tier)
            .replace("{delta}", fmtDelta(groom.tier.delta)),
        );
      }
      if (groom.matting?.amount) {
        why.push(
          fillWords(t("wizMattingLine"), {
            delta: fmtDelta(groom.matting.amount),
          }),
        );
      }
      if (why.length > 0) {
        groomingPriceBreakdown.push({ petName: pet.name, lines: why });
      }
      lines.push({
        key: `grooming:${pet.id}`,
        label: `${pkg.name} · ${pet.name}`,
        detail: why.length > 0 ? why.join(" · ") : undefined,
        amount: groom.price,
      });
      return sum + groom.price;
    }, 0);
    return { basePrice, rateGap: null, groomingPriceBreakdown, lines };
  }

  if (selectedService === "training") {
    // One line per enrolled dog. No class chosen yet is a gap, not a price.
    if (input.trainingLines.length === 0) {
      return {
        basePrice: 0,
        rateGap: { kind: "training" },
        groomingPriceBreakdown,
        lines,
      };
    }
    input.trainingLines.forEach((line, index) => {
      lines.push({
        key: `training:${index}`,
        label: withPets(line.label ?? t("wizKindTraining"), line.petName ?? ""),
        ...(line.detail ? { detail: line.detail } : {}),
        amount: line.price,
      });
    });
    return {
      basePrice: input.trainingLines.reduce((sum, li) => sum + li.price, 0),
      rateGap: null,
      groomingPriceBreakdown,
      lines,
    };
  }

  if (selectedService === "evaluation") {
    lines.push({
      key: "evaluation",
      label: withPets(input.evaluation.internalName ?? t("evaluation")),
      amount: input.evaluation.price,
    });
    return {
      basePrice: input.evaluation.price,
      rateGap: null,
      groomingPriceBreakdown,
      lines,
    };
  }

  if (selectedService && !isBuiltinService(selectedService)) {
    const price = input.customBasePrice(selectedService) ?? 0;
    lines.push({
      key: `custom:${selectedService}`,
      label: withPets(
        input.customName?.(selectedService) ?? t("wizKindCustom"),
      ),
      amount: price,
    });
    return { basePrice: price, rateGap: null, groomingPriceBreakdown, lines };
  }

  return { basePrice: 0, rateGap: null, groomingPriceBreakdown, lines };
}

export function assembleQuote(input: QuoteInput): Quote {
  const { t, locale, selectedService } = input;
  const {
    basePrice,
    rateGap,
    groomingPriceBreakdown,
    lines: serviceLines,
  } = servicePrice(input);

  // The SERVICE's length, which the facility's duration rules were written
  // against: the appointment's add-on minutes come back off, so a 15-minute
  // add-on cannot tip a groom into a "long appointment" surcharge.
  const groomingDurationMinutes =
    selectedService === "grooming"
      ? (() => {
          const checkIn = new Date(`2000-01-01T${input.checkInTime}`);
          const checkOut = new Date(`2000-01-01T${input.checkOutTime}`);
          const addOnMinutes = input.groomingAddOnCatalog
            .filter((ao) => input.groomingSelectedAddOnIds.includes(ao.id))
            .reduce((sum, ao) => sum + ao.duration, 0);
          const diff =
            Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)) -
            addOnMinutes;
          return Number.isFinite(diff) && diff > 0 ? diff : undefined;
        })()
      : undefined;

  const daycareServiceDates =
    input.daycareDateTimes.length > 0
      ? input.daycareDateTimes.map((entry) => entry.date)
      : input.daycareSelectedDates.map((date) => formatDateOnly(date));

  const client = input.selectedClient;
  const pricingComputation = applyDynamicPricingRules({
    rules: input.pricingRules,
    serviceId: selectedService,
    basePrice,
    existingExtraServices:
      input.defaultLines.length > 0
        ? [...input.extraServices, ...input.defaultLines]
        : input.extraServices,
    selectedPetIds: input.pricingSelectedPetIds,
    // A custom fee narrowed to some branches is not charged at the others.
    locationId: input.locationId,
    isNewCustomer: input.isNewCustomer,
    newPetIds: input.newPetIds,
    customer:
      client && !(input.isEstimateMode && input.isGuestEstimate)
        ? {
            status: client.status,
            membershipPlan: client.membership?.plan,
            membershipStatus: client.membership?.status,
            storeCreditBalance: client.storeCredit?.balance,
            hasPackageCredits: (client.packages ?? []).some(
              (pkg) => pkg.remainingCredits > 0,
            ),
          }
        : undefined,
    pets: input.pricingPets,
    addOnsCatalog: input.addOnsCatalog,
    roomAssignments: input.roomAssignments,
    roomCategoryOf: input.roomCategoryOf,
    boardingNights: input.boardingNights,
    sessionUnits:
      selectedService === "daycare"
        ? input.daycareSelectedDates.length
        : selectedService === "boarding"
          ? input.boardingNights
          : 1,
    serviceStartDate:
      selectedService === "daycare"
        ? daycareServiceDates[0]
        : selectedService === "boarding" && input.boardingRangeStart
          ? formatDateOnly(input.boardingRangeStart)
          : input.startDate || undefined,
    serviceEndDate:
      selectedService === "daycare"
        ? daycareServiceDates[daycareServiceDates.length - 1]
        : selectedService === "boarding" && input.boardingRangeEnd
          ? formatDateOnly(input.boardingRangeEnd)
          : input.endDate || input.startDate || undefined,
    serviceDates:
      selectedService === "daycare" && daycareServiceDates.length > 0
        ? daycareServiceDates
        : undefined,
    groomingDurationMinutes,
    appointmentTime:
      selectedService === "grooming" ? input.checkInTime : undefined,
    scheduledCheckInTime: input.checkInTime,
    scheduledCheckOutTime: input.checkOutTime,
    actualCheckInTime: input.checkInTime,
    actualCheckOutTime: input.checkOutTime,
  });

  // Medications and meals are lines on the bill (2026-10-01), worked out by
  // the function the server writes them with — so quote and bill agree.
  const careLines: CareChargeLine[] = careChargeLines({
    fees: input.careFees,
    settings: input.medicationSettings,
    feedingSettings: input.feedingSettings,
    service: selectedService,
    parts: [
      {
        stay: input.careStay,
        medications: input.medications,
        feeding: input.feeding,
      },
    ],
  }).flat();
  const serviceFeeItems: Quote["serviceFeeItems"] = [];
  let medicationFeeTotal = 0;
  let feedingFeeTotal = 0;
  for (const line of careLines) {
    if (line.kind === "meals" || line.kind === "house_food") {
      feedingFeeTotal += line.amount;
    } else {
      medicationFeeTotal += line.amount;
    }
    serviceFeeItems.push({
      label:
        line.kind === "medication_fee"
          ? t("feeMedicationAdmin")
          : line.kind === "injection_fee"
            ? t("feeInjection")
            : line.kind === "meals"
              ? t("feeDaycareFeeding")
              : fillWords(t("medsLineDetail"), {
                  name:
                    line.kind === "house_food"
                      ? houseFoodName(t, {
                          id: line.houseFoodId,
                          name: line.label,
                        })
                      : providedLineName(t, line.method ?? "", line.label),
                  quantity: line.quantity,
                  price: formatMoney(line.unitPrice, locale),
                }),
      amount: line.amount,
    });
  }

  // Evaluation fee — charged per pet that still needs an evaluation.
  let evaluationFeeTotal = 0;
  if (input.includesEvaluation && input.evaluation.price > 0) {
    const petsNeedingEval = input.pricingPets.filter((pet) => {
      const p = pet as {
        evaluations?: Array<{ status: string; isExpired?: boolean }>;
      };
      return !p.evaluations?.some(
        (e) => e.status === "passed" && e.isExpired !== true,
      );
    });
    const evalCount = Math.max(petsNeedingEval.length, 1);
    evaluationFeeTotal = input.evaluation.price * evalCount;
    serviceFeeItems.push({
      label: t("evaluationFee")
        .replace("{name}", input.evaluation.internalName ?? t("evaluation"))
        .replace("{count}", String(evalCount)),
      amount: evaluationFeeTotal,
    });
  }

  // The groom's add-ons, at the facility's prices, one line each.
  let groomingAddOnsTotal = 0;
  if (selectedService === "grooming") {
    for (const id of input.groomingSelectedAddOnIds) {
      const addOn = input.groomingAddOnCatalog.find((a) => a.id === id);
      if (!addOn) continue;
      groomingAddOnsTotal += addOn.price;
      serviceFeeItems.push({ label: addOn.name, amount: addOn.price });
    }
  }

  let subtotal =
    groomingAddOnsTotal +
    pricingComputation.total +
    medicationFeeTotal +
    feedingFeeTotal +
    evaluationFeeTotal;

  const adjustments = [...(pricingComputation.adjustments || [])];

  // The package pass travels as `discount` and nothing else at booking time,
  // so it is kept apart from the evaluator's own total until
  // `splitBookingMoney` adds it.
  let packagePassDiscount = 0;

  // Travel zone surcharge for a mobile groom, from the van's home base to the
  // client's postal code.
  const clientZip = client?.address?.zip;
  if (
    selectedService === "grooming" &&
    input.groomingIsMobile &&
    clientZip &&
    input.groomingTravelZones.length > 0
  ) {
    const zoneBreakdown = computeBookingTotals({
      serviceSubtotal: basePrice,
      addOnTotal: pricingComputation.addOnsTotal,
      isMobile: true,
      basePostalCode: input.facilityBasePostal,
      clientPostalCode: clientZip,
      zones: input.groomingTravelZones,
      zipTaxRates: [],
    });
    if (zoneBreakdown.zoneSurcharge > 0 && zoneBreakdown.zone) {
      subtotal += zoneBreakdown.zoneSurcharge;
      adjustments.push({
        id: "travel_zone",
        label: t("travelSurcharge").replace("{zone}", zoneBreakdown.zone.label),
        amount: zoneBreakdown.zoneSurcharge,
        source: "travel_zone",
      });
    }
  }

  if (input.redeemedPackageId) {
    // The same helper as the at-pickup payment, so the two cannot differ.
    const passDiscount = computePackagePassDiscount({ baseService: basePrice });
    subtotal -= passDiscount;
    packagePassDiscount = passDiscount;
    adjustments.push({
      id: "package_redemption",
      label: t("packagePassApplied"),
      amount: -passDiscount,
      source: "package_redemption",
    });
    subtotal = Math.max(0, subtotal);
  }

  // No tax in a booking's price: tax is charged at payment, from the
  // facility's tax settings. Only an estimate, which quotes what the client
  // will pay, adds it here.
  const taxRate = input.isEstimateMode ? input.estimateTaxRate : 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  // A service charge, the add-ons and the care charges are lines the server
  // writes, so they come out of `total_cost` (see booking-write-money.ts).
  const { discount, serviceChargeTotal, serviceTotal } = splitBookingMoney({
    adjustments,
    discountTotal: pricingComputation.discountTotal,
    packagePassDiscount,
    addOnsTotal: pricingComputation.addOnsTotal + groomingAddOnsTotal,
    careChargesTotal: medicationFeeTotal + feedingFeeTotal,
    total,
  });

  // ── THE ESTIMATE'S LINES ─────────────────────────────────────────────
  // The service, then each add-on per pet, then care, evaluation and the
  // groom's extras, then every rule — in the order a receipt reads. The
  // add-ons are priced by the lookup the total was (computeAddOnsTotal).
  const addOnsByRef = bookableLookup(input.addOnsCatalog);
  const addOnLines: QuoteLine[] = [];
  for (const line of pricingComputation.extraServices) {
    const unit = addOnsByRef.get(line.serviceId);
    if (!unit || line.quantity <= 0) continue;
    const price = Math.max(0, unit.price);
    const pet = input.selectedPets.find((p) => p.id === line.petId);
    const name = unit.name ?? line.serviceId;
    addOnLines.push({
      key: `add-on:${line.serviceId}:${line.petId}`,
      label: pet ? `${name} · ${pet.name}` : name,
      detail: fillWords(t("wizLineQty"), {
        count: line.quantity,
        price: formatMoney(price, locale),
      }),
      amount: price * line.quantity,
    });
  }
  const lines: QuoteLine[] = [
    ...serviceLines,
    ...addOnLines,
    ...serviceFeeItems.map((item, index) => ({
      key: `fee:${index}`,
      label: item.label,
      amount: item.amount,
    })),
    ...adjustments
      .filter((adjustment) => adjustment.amount !== 0)
      .map((adjustment, index) => ({
        key: `rule:${adjustment.id}:${index}`,
        label: adjustment.label,
        amount: adjustment.amount,
      })),
  ];

  return {
    basePrice,
    rateGap,
    addOnsTotal: pricingComputation.addOnsTotal,
    adjustments,
    discount,
    subtotal,
    taxRate,
    taxAmount,
    total,
    serviceChargeTotal,
    serviceTotal,
    effectiveExtraServices: pricingComputation.extraServices,
    medicationFeeTotal,
    feedingFeeTotal,
    evaluationFeeTotal,
    groomingAddOnsTotal,
    serviceFeeItems,
    groomingPriceBreakdown,
    lines,
  };
}
