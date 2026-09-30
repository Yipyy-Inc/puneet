// Prices are additions to the base price

export interface CoatMultiplier {
  id: string;
  coatType: string;
  multiplier: number;
  description: string;
}

export interface BreedOverride {
  id: string;
  breed: string;
  priceModifier: number;
  type: "percentage" | "fixed-add" | "fixed-price";
}

export const coatMultipliers: CoatMultiplier[] = [
  {
    id: "cm_short",
    coatType: "Short",
    multiplier: 1.0,
    description: "Standard coat",
  },
  {
    id: "cm_double",
    coatType: "Double",
    multiplier: 1.15,
    description: "Requires extra deshedding time",
  },
  {
    id: "cm_curly",
    coatType: "Curly / Wavy",
    multiplier: 1.25,
    description: "Doodles, Poodles - needs extra brushing",
  },
  {
    id: "cm_long",
    coatType: "Long",
    multiplier: 1.1,
    description: "Additional drying and brushing time",
  },
  {
    id: "cm_wire",
    coatType: "Wire",
    multiplier: 1.2,
    description: "Hand stripping or special clippers needed",
  },
];

export const breedOverrides: BreedOverride[] = [
  {
    id: "br_poodlestd",
    breed: "Poodle (Standard)",
    priceModifier: 20,
    type: "fixed-add",
  },
  {
    id: "br_doodle",
    breed: "Doodle (Any)",
    priceModifier: 1.25,
    type: "percentage",
  },
  { id: "br_samoyed", breed: "Samoyed", priceModifier: 25, type: "fixed-add" },
];
