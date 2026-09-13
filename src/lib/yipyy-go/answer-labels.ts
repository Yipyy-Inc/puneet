import type { BehaviorNotes, BelongingItem } from "@/types/yipyygo";

// ============================================================================
// The words for what an owner chose in the pre-arrival form, by the value the
// form stores.
//
// The VALUE is what reaches the facility, never the words, so an owner who
// taps "Orages" and one who taps "Thunderstorms" have given the team the same
// answer, and each person reading it sees it in their own language. The old
// behavior step stored the English label itself.
//
// Keys of the shell `yipyygo` catalogue. A value no table knows — a trigger
// the owner typed, an option added later — is shown as it was stored.
// ============================================================================

export const ENERGY_LEVEL_KEYS: Record<BehaviorNotes["energyLevel"], string> = {
  low: "energyLow",
  medium: "energyMedium",
  high: "energyHigh",
  very_high: "energyVeryHigh",
};

export const WITH_DOGS_KEYS: Record<
  BehaviorNotes["socialization"]["withDogs"],
  string
> = {
  friendly: "dogsFriendly",
  selective: "dogsSelective",
  not_friendly: "dogsNotFriendly",
  unknown: "notSure",
};

export const WITH_PEOPLE_KEYS: Record<
  BehaviorNotes["socialization"]["withHumans"],
  string
> = {
  friendly: "peopleFriendly",
  shy: "peopleShy",
  fearful: "peopleFearful",
  unknown: "notSure",
};

/** The triggers offered with one tap. One the owner types is kept as typed. */
export const ANXIETY_TRIGGER_KEYS: Record<string, string> = {
  thunderstorms: "triggerThunderstorms",
  loud_noises: "triggerLoudNoises",
  strangers: "triggerStrangers",
  other_dogs: "triggerOtherDogs",
  separation: "triggerSeparation",
  vet_visits: "triggerVetVisits",
  grooming: "triggerGrooming",
  car_rides: "triggerCarRides",
};

export const BELONGING_KEYS: Record<BelongingItem["type"], string> = {
  food: "belongFood",
  treats: "belongTreats",
  bedding: "belongBedding",
  toys: "belongToys",
  crate: "belongCrate",
  leash_collar: "belongLeashCollar",
  medication_bag: "belongMedicationBag",
  other: "other",
};

export const MED_FREQUENCY_KEYS: Record<string, string> = {
  once_daily: "freqOnceDaily",
  twice_daily: "freqTwiceDaily",
  every_8hrs: "freqEvery8Hours",
  every_other_day: "freqEveryOtherDay",
  specific_days: "freqSpecificDays",
  prn: "freqAsNeeded",
  other: "other",
};

export const FOOD_TYPE_KEYS: Record<string, string> = {
  kibble: "foodKibble",
  wet_food: "foodWet",
  raw: "foodRaw",
  supplement: "foodSupplement",
  toppers: "foodToppers",
  prescription: "foodPrescription",
  other: "other",
};

export const FOOD_UNIT_KEYS: Record<string, string> = {
  cups: "unitCup",
  tbsp: "unitTbsp",
  grams: "unitGrams",
  oz: "unitOz",
  scoop: "unitScoop",
  other: "other",
};

/** A stored value's words in the reader's language, or the value as stored. */
export function answerLabel(
  keys: Record<string, string>,
  value: string,
  t: (key: string) => string,
): string {
  // Own keys only: a trigger typed as `constructor` is words, not a lookup.
  const key = Object.prototype.hasOwnProperty.call(keys, value)
    ? keys[value]
    : undefined;
  return key ? t(key) : value;
}
