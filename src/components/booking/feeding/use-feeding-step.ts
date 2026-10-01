"use client";

import { useMemo, useState } from "react";

import {
  useCareFees,
  useFeedingInstructions,
} from "@/lib/api/facility-settings";
import { itemsForOtherPets } from "@/lib/bookings/care-pets";
import { houseFoodCharges, type HouseFoodCharge } from "@/lib/feeding/charges";
import {
  anotherFood,
  blankPlan,
  copyPlan,
  freeCustomTime,
  itemFromPlan,
  itemFromProfile,
  mergedMeal,
  newFoodId,
  newMealId,
  newPlanId,
  planFromItem,
  planProblem,
  withoutMeal,
  type FeedingPlan,
  type PlanFood,
  type PlanProblem,
} from "@/lib/feeding/plan";
import {
  feedingRows,
  isClock,
  packingList,
  planDays,
  totalMeals,
  type FeedingDayRow,
  type PackingRow,
} from "@/lib/feeding/schedule";
import type { MedStay } from "@/lib/medications/schedule";
import type { CareFees } from "@/lib/settings/care-fees";
import {
  houseFoodIncluded,
  mealRow,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { FeedingScheduleItem, SavedFeedingPlan } from "@/types/booking";

// ============================================================================
// The Feeding step's state, held where the booking form holds everything
// else: called ONCE in BookingModal, so the step in the main column and the
// stay-and-meals panel in the left rail read the same thing.
//
// ── A PLAN PER PET, BOOKED AS IT IS WRITTEN ───────────────────────────────
//
// The client's design has no Save button: a pet's plan is booked as it
// stands. So the hook keeps a raw plan for every pet somebody has touched —
// a half-typed time, a portion of 0 and all — and books each one as the
// record it becomes (`effectiveFeeding`). Next waits while one is incomplete.
//
// ── WHAT NOBODY TOUCHED IS BOOKED EXACTLY AS IT WAS ───────────────────────
//
// A pet's stored plan, or the plan on its profile, is SHOWN as a plan and
// booked as the record it already is, byte for byte — so opening an old
// booking and saving it changes nothing that was not changed, and an edit of
// a two-pet booking (the edit wizard loads the first pet only) keeps the
// other pet's plan.
// ============================================================================

export interface FeedingStepPet {
  id: number;
  name: string;
  /** From the pet's profile (`pets.details.feedingPlan`). */
  saved?: SavedFeedingPlan | null;
}

export interface FeedingStepInput {
  /** The booking's stored plans — what it was opened or resumed with. */
  feeding: FeedingScheduleItem[];
  pets: FeedingStepPet[];
  service: string;
  stay: MedStay;
  /** Start each pet from its profile. Off when editing or resuming. */
  fromProfiles: boolean;
  /** Staff may waive house food. */
  staff: boolean;
  /** Keep the plans of pets the form did not load — an edit. */
  keepOtherPets: boolean;
  /**
   * The facility made the step required for this service: every pet needs a
   * plan before the form goes on. Never for an estimate.
   */
  required: boolean;
}

type Patch<T> = Partial<T> | ((current: T) => Partial<T>);

export interface FeedingStepState {
  ready: boolean;
  settings: FeedingInstructions;
  fees: CareFees;
  service: string;
  stay: MedStay;
  staff: boolean;
  pets: { id: number; name: string; plan: FeedingPlan | null }[];
  activePetId: number | null;
  /** The pet being looked at's plan, or none. */
  plan: FeedingPlan | null;
  problem: PlanProblem | null;
  /** Its chosen dates are all outside this stay. */
  dateless: boolean;
  effectiveFeeding: FeedingScheduleItem[];
  canContinue: boolean;
  /** Every pet has a plan, where the step is required. */
  required: boolean;
  /** The pets with no plan yet. */
  unplanned: { id: number; name: string }[];
  /** Nothing more is asked of this step. */
  complete: boolean;
  panel: {
    petName: string;
    rows: FeedingDayRow[];
    packing: PackingRow[];
    totalMeals: number;
    addons: HouseFoodCharge[];
    addonTotal: number;
    /** House food comes with this service. */
    included: boolean;
  };
  selectPet: (petId: number) => void;
  addPlan: () => void;
  copyFrom: (petId: number) => void;
  removePlan: () => void;
  update: (patch: Patch<FeedingPlan>) => void;
  updateFood: (foodId: string, patch: Patch<PlanFood>) => void;
  addFood: () => void;
  removeFood: (foodId: string) => void;
  /** A meal time on or off — the vocabulary's, or one the facility added. */
  toggleSlot: (slot: string) => void;
  addCustomMeal: () => void;
  setMealTime: (mealId: string, time: string) => void;
  removeMeal: (mealId: string) => void;
  reset: () => void;
}

export function useFeedingStep(input: FeedingStepInput): FeedingStepState {
  const { feeding, pets, service, stay, staff } = input;
  const { instructions: settings, isPending } = useFeedingInstructions();
  const { fees } = useCareFees();
  const t = useShellText("booking");
  const locale = useShellLocale();

  const [chosenPetId, setChosenPetId] = useState<number | null>(null);
  const [plans, setPlans] = useState<Record<number, FeedingPlan | null>>({});

  const context = useMemo(() => ({ settings, stay }), [settings, stay]);
  const petIds = pets.map((pet) => pet.id);
  const firstPetId = pets[0]?.id ?? null;
  const activePetId =
    chosenPetId !== null && petIds.includes(chosenPetId)
      ? chosenPetId
      : firstPetId;

  // ── What each pet has before anybody touches it ─────────────────────────
  // A plan with no pet belongs to the first, as the old single-pet form wrote
  // it. A profile plan only on a new booking, and only with nothing stored.
  const untouched = useMemo(() => {
    const byPet = new Map<number, FeedingScheduleItem[]>();
    for (const pet of pets) {
      const stored = feeding.filter(
        (item) => (item.petId ?? firstPetId) === pet.id,
      );
      if (stored.length > 0) {
        byPet.set(pet.id, stored);
      } else if (input.fromProfiles && pet.saved) {
        byPet.set(pet.id, [itemFromProfile(pet.saved, pet.id, context)]);
      } else {
        byPet.set(pet.id, []);
      }
    }
    return byPet;
  }, [pets, feeding, firstPetId, input.fromProfiles, context]);

  /** The plan shown for a pet. */
  const shownPlan = (petId: number): FeedingPlan | null => {
    if (petId in plans) return plans[petId];
    const first = untouched.get(petId)?.[0];
    return first ? { ...planFromItem(first, context), petId } : null;
  };

  // ── What is booked ──────────────────────────────────────────────────────
  // In the stored order, so an untouched booking books exactly what it held.
  const words = { ...context, t, locale };
  const effectiveFeeding: FeedingScheduleItem[] = (() => {
    const out: FeedingScheduleItem[] = [];
    const placed = new Set<number>();
    const kept = input.keepOtherPets ? itemsForOtherPets(feeding, petIds) : [];
    for (const item of feeding) {
      if (kept.includes(item)) {
        out.push(item);
        continue;
      }
      const owner = item.petId ?? firstPetId;
      if (owner === null || !petIds.includes(owner)) continue;
      if (owner in plans) {
        if (placed.has(owner)) continue;
        placed.add(owner);
        const plan = plans[owner];
        if (plan) out.push(itemFromPlan(plan, words));
        continue;
      }
      out.push(item);
    }
    for (const pet of pets) {
      if (placed.has(pet.id)) continue;
      if (pet.id in plans) {
        const plan = plans[pet.id];
        if (plan && !feeding.some((i) => (i.petId ?? firstPetId) === pet.id)) {
          out.push(itemFromPlan(plan, words));
        }
        continue;
      }
      if (!feeding.some((i) => (i.petId ?? firstPetId) === pet.id)) {
        out.push(...(untouched.get(pet.id) ?? []));
      }
    }
    return out;
  })();

  const blocking = pets.some((pet) => {
    const plan = shownPlan(pet.id);
    if (!plan) return false;
    if (pet.id in plans) return planProblem(plan, context) !== null;
    // Untouched: only a plan whose chosen dates have all left the stay.
    return (
      plan.dayRule === "certain_dates" &&
      stay.days.length > 0 &&
      planDays(plan, stay).length === 0
    );
  });

  const unplanned = pets
    .filter((pet) => shownPlan(pet.id) === null)
    .map((pet) => ({ id: pet.id, name: pet.name }));

  const active = activePetId;
  const plan = active !== null ? shownPlan(active) : null;
  const addons = plan
    ? houseFoodCharges(
        {
          meals: plan.meals,
          days: planDays(plan, stay).length,
          foods: plan.foods,
          waivedFoods: plan.waivedFoods,
        },
        settings,
      )
    : [];

  // ── Writing ─────────────────────────────────────────────────────────────
  // From the plan as it stands, not as this render saw it: three taps on −
  // in one frame are three steps. The plan a first touch starts from is this
  // render's — derived, so the same in every render that could see it.
  const write = (
    petId: number | null,
    change: (current: FeedingPlan) => FeedingPlan,
  ) => {
    if (petId === null) return;
    const base = shownPlan(petId);
    setPlans((current) => {
      const from = petId in current ? current[petId] : base;
      if (!from) return current;
      return { ...current, [petId]: change(from) };
    });
  };
  const update = (patch: Patch<FeedingPlan>) =>
    write(active, (current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));

  return {
    ready: !isPending,
    settings,
    fees,
    service,
    stay,
    staff,
    pets: pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      plan: shownPlan(pet.id),
    })),
    activePetId: active,
    plan,
    problem: plan ? planProblem(plan, context) : null,
    dateless: Boolean(
      plan &&
      plan.dayRule === "certain_dates" &&
      stay.days.length > 0 &&
      planDays(plan, stay).length === 0,
    ),
    effectiveFeeding,
    canContinue: !blocking,
    required: input.required,
    unplanned,
    complete: !input.required || unplanned.length === 0,
    panel: {
      petName: pets.find((pet) => pet.id === active)?.name ?? "",
      rows: feedingRows(plan, stay),
      packing: plan ? packingList(plan, stay, settings.extraMeals) : [],
      totalMeals: plan ? totalMeals(plan, stay) : 0,
      addons,
      addonTotal: addons
        .filter((addon) => addon.offered && !addon.waived && !addon.included)
        .reduce((sum, addon) => sum + addon.amount, 0),
      included: houseFoodIncluded(settings),
    },
    selectPet: (petId) => setChosenPetId(petId),
    addPlan: () => {
      if (active === null) return;
      const fresh = blankPlan(
        { plan: newPlanId(), food: newFoodId(), meal: newMealId() },
        active,
        context,
      );
      setPlans((current) => ({ ...current, [active]: fresh }));
    },
    copyFrom: (petId) => {
      if (active === null) return;
      const source = shownPlan(petId);
      if (!source) return;
      const copy = copyPlan(source, active, {
        plan: newPlanId(),
        food: newFoodId,
        meal: newMealId,
      });
      setPlans((current) => ({ ...current, [active]: copy }));
    },
    removePlan: () => {
      if (active === null) return;
      setPlans((current) => ({ ...current, [active]: null }));
    },
    update,
    updateFood: (foodId, patch) =>
      write(active, (current) => ({
        ...current,
        foods: current.foods.map((food) =>
          food.id === foodId
            ? {
                ...food,
                ...(typeof patch === "function" ? patch(food) : patch),
              }
            : food,
        ),
      })),
    addFood: () => {
      const id = newFoodId();
      update((current) => ({
        foods: [...current.foods, anotherFood(id, settings)],
      }));
    },
    removeFood: (foodId) =>
      update((current) =>
        current.foods.length <= 1
          ? {}
          : {
              foods: current.foods.filter((food) => food.id !== foodId),
              waivedFoods: current.waivedFoods.filter((id) => id !== foodId),
            },
      ),
    toggleSlot: (slot) => {
      const spareId = newMealId();
      write(active, (current) => {
        const existing = current.meals.find((meal) => meal.slot === slot);
        if (existing) return withoutMeal(current, existing.id);
        const time = mealRow(settings, slot)?.time;
        if (!time) return current;
        const twin = current.meals.find((meal) => meal.time === time);
        if (twin) {
          return {
            ...current,
            meals: current.meals.map((meal) =>
              meal.id === twin.id ? { ...meal, slot } : meal,
            ),
          };
        }
        const id = current.meals.some((meal) => meal.id === slot)
          ? spareId
          : slot;
        return { ...current, meals: [...current.meals, { id, slot, time }] };
      });
    },
    addCustomMeal: () => {
      const id = newMealId();
      update((current) => ({
        meals: [...current.meals, { id, time: freeCustomTime(current.meals) }],
      }));
    },
    setMealTime: (mealId, time) =>
      write(active, (current) => {
        const twin = isClock(time)
          ? current.meals.find(
              (meal) => meal.id !== mealId && meal.time === time,
            )
          : undefined;
        if (twin) return mergedMeal(current, mealId, twin.id);
        return {
          ...current,
          meals: current.meals.map((meal) =>
            meal.id === mealId ? { ...meal, time } : meal,
          ),
        };
      }),
    removeMeal: (mealId) =>
      write(active, (current) => withoutMeal(current, mealId)),
    reset: () => {
      setPlans({});
      setChosenPetId(null);
    },
  };
}
