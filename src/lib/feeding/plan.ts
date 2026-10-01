import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { parseAmount, round2, type Translate } from "@/lib/medications/dose";
import { hasCheckoutDay, type MedStay } from "@/lib/medications/schedule";
import {
  houseFoodFor,
  mealSlotTime,
  offeredMealSlots,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import type { MedDayRule } from "@/types/base";
import type {
  FeedingFood,
  FeedingOccasion,
  FeedingScheduleItem,
  MealComponent,
  SavedFeedingPlan,
} from "@/types/booking";

import { foodTypeLabel, mealSlotLabel } from "./labels";
import { isClock, planDays, servedMealIds, sortedMeals } from "./schedule";
import {
  CUSTOM_MEAL_DEFAULT,
  FEEDING_DAY_RULES,
  FOOD,
  feedUnitFromStored,
  foodTypeFromStored,
  isEatingHabit,
  isFeedingStyle,
  isFeedUnit,
  isFoodPack,
  isFoodPrep,
  isFoodType,
  isMealSlot,
  isSkipAction,
  isTreatsChoice,
  MEAL_SLOTS,
  SKIP_ACTIONS,
  STARTING_MEALS,
  startingAmount,
  styleFromStored,
  type EatingHabit,
  type FeedingStyle,
  type FeedUnit,
  type FoodPack,
  type FoodPrep,
  type FoodType,
  type MealSlot,
  type SkipAction,
  type TreatsChoice,
} from "./vocabulary";

// ============================================================================
// A pet's feeding plan while it is being written — the Feeding step's own
// model — and the booking record it becomes.
//
// The record keeps every field the older screens read (`occasions` with their
// foods as components, `source`, `frequency`, `allergies`) beside the step's
// own (`foods`, `dayRule`, `styles`…), so the booking page, the daily care
// board and a kennel card read a new plan as they read an old one. And an old
// row reads as a plan: its meals keep their ids and times — the care log keys
// a meal on its id — its foods become foods, and what the step does not ask is
// carried through untouched.
// ============================================================================

export interface PlanMeal {
  /** A meal time's own id (`breakfast`), `custom-<uuid>`, or an older row's. */
  id: string;
  /** Picked as one of the meal times. */
  slot?: MealSlot;
  /** `HH:MM`; blank while a custom time is being typed. */
  time: string;
}

export interface PlanFood {
  id: string;
  source: "own" | "house";
  /** The kind of food the owner picked; kept while a house food is chosen. */
  type: FoodType;
  brand: string;
  houseFoodId: string;
  /** A stored house food's name, for one the facility no longer lists. */
  houseFoodName: string;
  unit: FeedUnit;
  customUnit: string;
  amount: number;
  /** The meals it is served at; `null` is every meal. */
  servedAt: string[] | null;
  prep: FoodPrep[];
  pack: FoodPack;
}

export interface FeedingPlan {
  /** The id the plan is booked under; kept across edits. */
  id: string;
  petId?: number;
  profileId?: string;
  meals: PlanMeal[];
  dayRule: MedDayRule;
  certainDays: string[];
  foods: PlanFood[];
  styles: FeedingStyle[];
  habits: EatingHabit[];
  skip: SkipAction;
  treats: TreatsChoice;
  allergies: string[];
  notes: string;
  saveToProfile: boolean;
  /** Foods (by id) whose house-food charge staff waived. */
  waivedFoods: string[];
  /** What an older record says that the step does not ask, kept as it was. */
  carry: Partial<FeedingScheduleItem>;
}

export interface PlanContext {
  settings: FeedingInstructions;
  stay: MedStay;
}

export const newPlanId = () => `feed-${crypto.randomUUID()}`;
export const newFoodId = () => `food-${crypto.randomUUID()}`;
export const newMealId = () => `custom-${crypto.randomUUID()}`;

/**
 * The day choices this stay offers, in the design's order. An overnight stay
 * offers what the facility chose; a daycare booking has no checkout day, so
 * it offers every booked day and, if the facility allows it, certain dates.
 */
export function offeredFeedingDayRules(
  settings: Pick<FeedingInstructions, "dayRules">,
  stay: MedStay,
): MedDayRule[] {
  if (!hasCheckoutDay(stay)) {
    return settings.dayRules.includes("certain_dates")
      ? ["every_day", "certain_dates"]
      : ["every_day"];
  }
  return FEEDING_DAY_RULES.filter((rule) => settings.dayRules.includes(rule));
}

/** The kind of food a new food starts as: dry kibble, where offered. */
function startingType(
  settings: Pick<FeedingInstructions, "foodTypes">,
  preferred: FoodType,
): FoodType {
  return settings.foodTypes.includes(preferred)
    ? preferred
    : (settings.foodTypes[0] ?? preferred);
}

/** A plan's first food: dry kibble, a cup, pre-portioned. */
export function startingFood(
  id: string,
  settings: Pick<FeedingInstructions, "foodTypes">,
): PlanFood {
  const type = startingType(settings, "kibble");
  const unit = FOOD[type].units[0];
  return {
    id,
    source: "own",
    type,
    brand: "",
    houseFoodId: "",
    houseFoodName: "",
    unit,
    customUnit: "",
    amount: startingAmount(unit),
    servedAt: null,
    prep: [],
    pack: "pre_portioned",
  };
}

/** "+ Add another food": a topper, a tablespoon, in its own container. */
export function anotherFood(
  id: string,
  settings: Pick<FeedingInstructions, "foodTypes">,
): PlanFood {
  const type = startingType(settings, "topper");
  const unit = type === "topper" ? "tbsp" : FOOD[type].units[0];
  return {
    ...startingFood(id, settings),
    type,
    unit,
    amount: startingAmount(unit),
    pack: "original_bag",
  };
}

/** A new plan for `petId`, as the design starts one. */
export function blankPlan(
  ids: { plan: string; food: string; meal: string },
  petId: number | undefined,
  { settings, stay }: PlanContext,
): FeedingPlan {
  const slots = offeredMealSlots(settings);
  const starting = slots.filter((slot) => STARTING_MEALS.includes(slot.id));
  const meals: PlanMeal[] = (
    starting.length > 0 ? starting : slots.slice(0, 1)
  ).map((slot) => ({ id: slot.id, slot: slot.id, time: slot.time }));
  if (meals.length === 0 && settings.customTimes) {
    meals.push({ id: ids.meal, time: CUSTOM_MEAL_DEFAULT });
  }
  return {
    id: ids.plan,
    petId,
    meals,
    dayRule: offeredFeedingDayRules(settings, stay)[0] ?? "every_day",
    certainDays: [...stay.days],
    foods: [startingFood(ids.food, settings)],
    styles: [],
    habits: [],
    skip: SKIP_ACTIONS[0],
    treats: "house",
    allergies: [],
    notes: "",
    saveToProfile: settings.show.saveToProfile,
    waivedFoods: [],
    carry: {},
  };
}

/** Another pet's plan, for this one: new ids, and nothing staff granted. */
export function copyPlan(
  source: FeedingPlan,
  petId: number,
  ids: { plan: string; food: () => string; meal: () => string },
): FeedingPlan {
  const mealIds = new Map<string, string>();
  const meals = source.meals.map((meal) => {
    const id = meal.slot ?? ids.meal();
    mealIds.set(meal.id, id);
    return { ...meal, id };
  });
  const foods = source.foods.map((food) => ({
    ...food,
    id: ids.food(),
    servedAt: food.servedAt
      ? food.servedAt.map((id) => mealIds.get(id) ?? id)
      : null,
    prep: [...food.prep],
  }));
  return {
    ...source,
    id: ids.plan,
    petId,
    profileId: undefined,
    meals,
    certainDays: [...source.certainDays],
    foods,
    styles: [...source.styles],
    habits: [...source.habits],
    allergies: [...source.allergies],
    waivedFoods: [],
    carry: { ...source.carry },
  };
}

// ── READING A RECORD ───────────────────────────────────────────────────────

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

/** A stored list worth carrying — an empty one says nothing. */
const nonEmpty = <T>(value: T[] | undefined): T[] | undefined =>
  Array.isArray(value) && value.length > 0 ? value : undefined;

/** The step's food from its stored record. */
function foodFromRecord(
  food: FeedingFood,
  alias: (mealId: string) => string,
  settings: Pick<FeedingInstructions, "houseFoods">,
): PlanFood {
  const source = food.source === "house" ? "house" : "own";
  const type: FoodType = isFoodType(food.type) ? food.type : "other";
  const house =
    source === "house" ? houseFoodFor(settings, food.houseFoodId) : undefined;
  const unit: FeedUnit = isFeedUnit(food.unit)
    ? food.unit
    : (house?.unit ?? FOOD[type].units[0]);
  const servedAt = strings(food.servedAt).map(alias);
  return {
    id: food.id,
    source,
    type,
    brand: food.brand ?? "",
    houseFoodId: food.houseFoodId ?? "",
    houseFoodName: food.houseFoodName ?? "",
    unit,
    customUnit: food.customUnit ?? "",
    amount:
      typeof food.amount === "number" && food.amount > 0
        ? food.amount
        : startingAmount(unit),
    servedAt: servedAt.length > 0 ? servedAt : null,
    prep: strings(food.prep).filter(isFoodPrep),
    pack: isFoodPack(food.pack) ? food.pack : "pre_portioned",
  };
}

/**
 * The foods of a row written before the step had foods: each meal's
 * components, the same food at several meals made one food served at those
 * meals. The old form kept its food-type WORD in a component's name ("Wet
 * food"); a name that is not one is the brand.
 */
function foodsFromComponents(
  occasions: FeedingOccasion[],
  alias: (mealId: string) => string,
  mealIds: string[],
  facilityProvides: boolean,
): PlanFood[] {
  const groups = new Map<string, { food: PlanFood; at: Set<string> }>();
  const used = new Set<string>();
  for (const occasion of occasions) {
    const mealId = alias(occasion.id);
    const components: MealComponent[] = Array.isArray(occasion.components)
      ? occasion.components
      : [];
    for (const component of components) {
      if (!component || typeof component !== "object") continue;
      const name = typeof component.name === "string" ? component.name : "";
      const { type, nameIsType } = foodTypeFromStored(component.type, name);
      const unit = feedUnitFromStored(component.unit);
      const amount =
        parseAmount(String(component.amount ?? "")) ?? startingAmount(unit);
      const brand = nameIsType ? "" : name.trim();
      const key = [type, brand.toLowerCase(), unit, amount].join("|");
      const existing = groups.get(key);
      if (existing) {
        existing.at.add(mealId);
        continue;
      }
      let id =
        typeof component.id === "string" && component.id
          ? component.id
          : `food-${groups.size + 1}`;
      while (used.has(id)) id = `${id}-${groups.size + 1}`;
      used.add(id);
      groups.set(key, {
        food: {
          id,
          source: facilityProvides ? "house" : "own",
          type,
          brand: facilityProvides ? "" : brand,
          houseFoodId: "",
          houseFoodName: facilityProvides ? brand : "",
          unit,
          customUnit: "",
          amount,
          servedAt: null,
          prep: [],
          // The row never said how it was packed: the bag it came in.
          pack: "original_bag",
        },
        at: new Set([mealId]),
      });
    }
  }
  return [...groups.values()].map(({ food, at }) => ({
    ...food,
    servedAt: mealIds.every((id) => at.has(id)) ? null : [...at],
  }));
}

/**
 * A booked plan — the step's own, or an older row — back as a plan. Meals keep
 * their ids and times: one at a meal time's time is that meal time, any other
 * is a custom time, never moved to the nearest slot. Two meals at one time are
 * one meal.
 */
export function planFromItem(
  item: FeedingScheduleItem,
  { settings, stay }: PlanContext,
): FeedingPlan {
  const occasions: FeedingOccasion[] = Array.isArray(item.occasions)
    ? item.occasions.filter(
        (occasion): occasion is FeedingOccasion =>
          Boolean(occasion) && typeof occasion.id === "string",
      )
    : [];

  const meals: PlanMeal[] = [];
  const aliases = new Map<string, string>();
  for (const occasion of occasions) {
    const time = typeof occasion.time === "string" ? occasion.time : "";
    const twin = meals.find((meal) => meal.time === time);
    if (twin) {
      aliases.set(occasion.id, twin.id);
      continue;
    }
    const stored = isMealSlot(occasion.slot) ? occasion.slot : undefined;
    const slot = stored
      ? mealSlotTime(settings, stored) === time
        ? stored
        : undefined
      : MEAL_SLOTS.find((candidate) =>
          settings.meals.some(
            (m) => m.id === candidate && m.enabled && m.time === time,
          ),
        );
    meals.push(
      slot ? { id: occasion.id, slot, time } : { id: occasion.id, time },
    );
  }
  const alias = (id: string) => aliases.get(id) ?? id;

  const recordFoods = Array.isArray(item.foods)
    ? item.foods.filter(
        (food): food is FeedingFood =>
          Boolean(food) && typeof food.id === "string",
      )
    : [];
  const foods =
    recordFoods.length > 0
      ? recordFoods.map((food) => foodFromRecord(food, alias, settings))
      : foodsFromComponents(
          occasions,
          alias,
          meals.map((meal) => meal.id),
          item.source === "facility_provides",
        );

  const legacyStyle = Array.isArray(item.styles)
    ? null
    : styleFromStored(item.feedingInstruction);
  const styles = Array.isArray(item.styles)
    ? strings(item.styles).filter(isFeedingStyle)
    : legacyStyle
      ? [legacyStyle]
      : [];

  const dayRule: MedDayRule =
    item.dayRule === "except_checkout" ||
    item.dayRule === "every_day" ||
    item.dayRule === "certain_dates"
      ? item.dayRule
      : "every_day";

  return {
    id: item.id,
    petId: item.petId,
    profileId: item.profileId,
    meals,
    dayRule,
    certainDays:
      dayRule === "certain_dates"
        ? strings(item.specificDays).filter((day) => stay.days.includes(day))
        : [...stay.days],
    foods,
    styles,
    habits: strings(item.habits).filter(isEatingHabit),
    skip: isSkipAction(item.skipMeal) ? item.skipMeal : SKIP_ACTIONS[0],
    treats: isTreatsChoice(item.treats) ? item.treats : "house",
    allergies: strings(item.allergies),
    notes: typeof item.notes === "string" ? item.notes : "",
    saveToProfile: item.saveToProfile === true,
    waivedFoods: strings(item.waivedFoods),
    carry: stripUndefined({
      prepNotes: item.prepNotes,
      refusalNotes: item.refusalNotes,
      ifRefuses: nonEmpty(item.ifRefuses),
      prepInstructions: nonEmpty(item.prepInstructions),
      feedingUnit: item.feedingUnit,
      frequencyDays: nonEmpty(item.frequencyDays),
      // The old form's one instruction, unless it is now a style.
      feedingInstruction: legacyStyle ? undefined : item.feedingInstruction,
    }),
  };
}

// ── WRITING A RECORD ───────────────────────────────────────────────────────

const LEGACY_TYPE: Partial<Record<FoodType, MealComponent["type"]>> = {
  kibble: "kibble",
  wet: "wet_food",
  raw: "raw",
  patties: "raw",
  prescription: "prescription",
  topper: "toppers",
};

const LEGACY_UNIT: Partial<Record<FeedUnit, MealComponent["unit"]>> = {
  cup: "cups",
  scoop: "scoop",
  g: "grams",
  oz: "oz",
  tbsp: "tbsp",
};

/** What a food is called on a record: the house food, the brand, the kind. */
function recordName(
  food: PlanFood,
  settings: Pick<FeedingInstructions, "houseFoods">,
  t: Translate,
): string {
  if (food.source === "house") {
    return (
      houseFoodFor(settings, food.houseFoodId)?.name ?? food.houseFoodName ?? ""
    );
  }
  return food.brand.trim() || foodTypeLabel(t, food.type);
}

/** The booking record a plan becomes. A part the facility hides stores nothing. */
export function itemFromPlan(
  plan: FeedingPlan,
  context: PlanContext & { t: Translate; locale: AppLocale },
): FeedingScheduleItem {
  const { settings, t, locale } = context;
  const show = settings.show;
  const meals = sortedMeals(plan.meals);
  const houseIds = plan.foods
    .filter((food) => food.source === "house")
    .map((food) => food.id);
  const source =
    houseIds.length === 0
      ? "parent_brings"
      : houseIds.length === plan.foods.length
        ? "facility_provides"
        : "mix";

  const occasions: FeedingOccasion[] = meals.map((meal) => ({
    id: meal.id,
    label: meal.slot
      ? mealSlotLabel(t, meal.slot)
      : formatTimeOfDay(meal.time, locale),
    time: meal.time,
    ...(meal.slot ? { slot: meal.slot } : {}),
    components: plan.foods
      .filter((food) => servedMealIds(food, meals).includes(meal.id))
      .map((food) => ({
        id: food.id,
        type: LEGACY_TYPE[food.type] ?? "other",
        name: recordName(food, settings, t),
        amount: String(round2(food.amount)),
        unit: LEGACY_UNIT[food.unit] ?? "other",
      })),
  }));

  const foods: FeedingFood[] = plan.foods.map((food) => {
    const house =
      food.source === "house"
        ? houseFoodFor(settings, food.houseFoodId)
        : undefined;
    const served = servedMealIds(food, meals);
    return stripUndefined({
      id: food.id,
      source: food.source,
      type: food.type,
      brand:
        food.source === "own" && show.brand
          ? food.brand.trim() || undefined
          : undefined,
      houseFoodId:
        food.source === "house" ? food.houseFoodId || undefined : undefined,
      houseFoodName:
        food.source === "house"
          ? (house?.name ?? (food.houseFoodName || undefined))
          : undefined,
      unit: food.unit,
      customUnit:
        food.unit === "custom"
          ? food.customUnit.trim() || undefined
          : undefined,
      amount: round2(food.amount),
      servedAt:
        food.servedAt && served.length < meals.length ? served : undefined,
      prep: show.prep && food.prep.length > 0 ? [...food.prep] : undefined,
      pack: food.source === "own" && show.packing ? food.pack : undefined,
    }) as FeedingFood;
  });

  const waived = plan.waivedFoods.filter((id) => houseIds.includes(id));
  const carry = stripUndefined(plan.carry);

  return stripUndefined({
    ...carry,
    id: plan.id,
    petId: plan.petId,
    profileId: plan.profileId,
    occasions,
    source,
    prepInstructions: carry.prepInstructions ?? [],
    ifRefuses: carry.ifRefuses ?? [],
    frequency: plan.dayRule === "certain_dates" ? "specific_days" : "daily",
    dayRule: plan.dayRule,
    specificDays:
      plan.dayRule === "certain_dates"
        ? [...plan.certainDays].sort()
        : undefined,
    foods,
    styles: show.styles && plan.styles.length > 0 ? plan.styles : undefined,
    habits: show.habits && plan.habits.length > 0 ? plan.habits : undefined,
    skipMeal: show.skip ? plan.skip : undefined,
    treats: show.treats ? plan.treats : undefined,
    allergies: show.allergies
      ? plan.allergies.map((a) => a.trim()).filter(Boolean)
      : [],
    notes: show.notes ? plan.notes.trim() : "",
    waivedFoods: waived.length > 0 ? waived : undefined,
    saveToProfile: show.saveToProfile ? plan.saveToProfile : undefined,
  }) as FeedingScheduleItem;
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

/** What stops the plan being booked, or `null`. */
export type PlanProblem = "meals" | "time" | "days" | "amount";

export function planProblem(
  plan: FeedingPlan,
  { stay }: Pick<PlanContext, "stay">,
): PlanProblem | null {
  if (plan.meals.some((meal) => !isClock(meal.time))) return "time";
  if (plan.meals.length === 0) return "meals";
  if (stay.days.length > 0 && planDays(plan, stay).length === 0) return "days";
  if (plan.foods.some((food) => !(food.amount > 0))) return "amount";
  return null;
}

// ── THE PET'S PROFILE ──────────────────────────────────────────────────────

/** What is kept on the pet's profile from a booked plan. */
export function profileEntryOf(
  item: FeedingScheduleItem,
  profileId: string,
): SavedFeedingPlan {
  const {
    id: _id,
    petId: _petId,
    dayRule: _dayRule,
    specificDays: _specificDays,
    waivedFoods: _waivedFoods,
    saveToProfile: _saveToProfile,
    profileId: _profileId,
    ...kept
  } = item;
  return {
    ...stripUndefined(kept),
    frequency: "daily",
    profileId,
  } as SavedFeedingPlan;
}

/**
 * A profile plan as a new booking's, on this stay. The id derives from the
 * profile entry, so the plan keeps one id while the booking form shows it,
 * before anybody has touched it.
 */
export function itemFromProfile(
  saved: SavedFeedingPlan,
  petId: number,
  { settings, stay }: PlanContext,
  id = `feed-${saved.profileId}`,
): FeedingScheduleItem {
  const rule = offeredFeedingDayRules(settings, stay)[0] ?? "every_day";
  return {
    ...saved,
    id,
    petId,
    profileId: saved.profileId,
    dayRule: rule,
    specificDays: rule === "certain_dates" ? [...stay.days] : undefined,
    frequency: rule === "certain_dates" ? "specific_days" : "daily",
    saveToProfile: true,
  };
}

/**
 * The pet's profile plan after a booking: the plan saved "for future visits"
 * replaces it; one that came from the profile and was unticked takes it off
 * (`null`); anything else leaves it as it was (`undefined`).
 */
export function feedingProfileAfterBooking(
  current: SavedFeedingPlan | null | undefined,
  booked: FeedingScheduleItem | undefined,
  newProfileId: () => string = () => `pfeed-${crypto.randomUUID()}`,
): SavedFeedingPlan | null | undefined {
  if (!booked) return undefined;
  if (booked.saveToProfile) {
    const profileId = booked.profileId ?? current?.profileId ?? newProfileId();
    const entry = profileEntryOf(booked, profileId);
    return current && JSON.stringify(current) === JSON.stringify(entry)
      ? undefined
      : entry;
  }
  if (booked.profileId && current?.profileId === booked.profileId) return null;
  return undefined;
}

// ── EDITING A PLAN ─────────────────────────────────────────────────────────
//
// Each of these is pure: ids are made by the caller, in its event handler,
// never inside a state updater (React runs those twice in development).

/** Another kind of food: its first unit, its starting amount, no preparation. */
export function withFoodType(food: PlanFood, type: FoodType): PlanFood {
  if (food.type === type) return food;
  const unit = FOOD[type].units[0];
  return { ...food, type, unit, amount: startingAmount(unit), prep: [] };
}

/** Another unit: its starting amount. */
export function withFoodUnit(food: PlanFood, unit: FeedUnit): PlanFood {
  if (food.unit === unit) return food;
  return { ...food, unit, amount: startingAmount(unit) };
}

/** The facility's food instead: this house food, its unit, one portion. */
export function asHouseFood(
  food: PlanFood,
  house: { id: string; name: string; unit: FeedUnit },
): PlanFood {
  return {
    ...food,
    source: "house",
    houseFoodId: house.id,
    houseFoodName: house.name,
    unit: house.unit,
    amount: 1,
  };
}

/** Another house food: its unit, the same portion. */
export function withHouseFood(
  food: PlanFood,
  house: { id: string; name: string; unit: FeedUnit },
): PlanFood {
  return {
    ...food,
    houseFoodId: house.id,
    houseFoodName: house.name,
    unit: house.unit,
  };
}

/** The owner's food again: its kind's first unit, the same portion. */
export function asOwnFood(food: PlanFood): PlanFood {
  return { ...food, source: "own", unit: FOOD[food.type].units[0] };
}

/**
 * "Served at" a meal, toggled. From every meal, a tap means only that meal;
 * the last one taken off means every meal again — the design's rule.
 */
export function toggledServedAt(
  food: PlanFood,
  mealId: string,
): string[] | null {
  const current = food.servedAt ?? [];
  const next = current.includes(mealId)
    ? current.filter((id) => id !== mealId)
    : [...current, mealId];
  return next.length > 0 ? next : null;
}

/** The plan without a meal, and no food left served at it. */
export function withoutMeal(plan: FeedingPlan, mealId: string): FeedingPlan {
  return {
    ...plan,
    meals: plan.meals.filter((meal) => meal.id !== mealId),
    foods: plan.foods.map((food) => {
      if (!food.servedAt) return food;
      const kept = food.servedAt.filter((id) => id !== mealId);
      return { ...food, servedAt: kept.length > 0 ? kept : null };
    }),
  };
}

/** One meal folded into another at the same time, its foods with it. */
export function mergedMeal(
  plan: FeedingPlan,
  fromId: string,
  intoId: string,
): FeedingPlan {
  return {
    ...plan,
    meals: plan.meals.filter((meal) => meal.id !== fromId),
    foods: plan.foods.map((food) =>
      food.servedAt
        ? {
            ...food,
            servedAt: [
              ...new Set(
                food.servedAt.map((id) => (id === fromId ? intoId : id)),
              ),
            ],
          }
        : food,
    ),
  };
}

/** The time "+ Custom time" starts at: 3:00 PM, or the next free half hour. */
export function freeCustomTime(meals: readonly { time: string }[]): string {
  const taken = new Set(meals.map((meal) => meal.time));
  let minutes = 15 * 60;
  for (let tries = 0; tries < 48; tries += 1) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60,
    ).padStart(2, "0")}`;
    if (!taken.has(time)) return time;
    minutes = (minutes + 30) % (24 * 60);
  }
  return CUSTOM_MEAL_DEFAULT;
}
