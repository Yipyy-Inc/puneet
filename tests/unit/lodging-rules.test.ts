import { describe, expect, test } from "bun:test";

import { admittedSpecies, petMatchesRules } from "@/lib/capacity-engine";
import type { Pet } from "@/types/pet";
import type { RoomRule } from "@/types/rooms";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// Which pets a kennel class takes, from the three rules the database admits
// (20260925164457). The species cases are the ones that were wrong: a list
// was ignored, "Dogs & Cats" was stored as one string no pet ever equalled,
// and two species rules were read as "must be both".

const pet = (type: string, weight: number) => ({ type, weight }) as Pet;

const rule = (
  type: RoomRule["type"],
  value: RoomRule["value"],
  enabled = true,
): RoomRule => ({ id: `r-${type}`, type, value, clientMessage: "", enabled });

describe("which pets a kennel class takes", () => {
  test("a class with no rules takes every pet", () => {
    expect(petMatchesRules(pet("Rabbit", 3), [])).toBe(true);
    expect(admittedSpecies([])).toBeNull();
  });

  test("one species, compared without case", () => {
    const rules = [rule("pet_type", "dog")];
    expect(petMatchesRules(pet("Dog", 30), rules)).toBe(true);
    expect(petMatchesRules(pet("Cat", 9), rules)).toBe(false);
  });

  test("a list of species takes any of them", () => {
    const rules = [rule("pet_type", ["Dog", "Cat"])];
    expect(petMatchesRules(pet("cat", 9), rules)).toBe(true);
    expect(petMatchesRules(pet("Rabbit", 3), rules)).toBe(false);
  });

  test('the old "Dogs & Cats" string takes both, where it refused both', () => {
    const rules = [rule("pet_type", "dog,cat")];
    expect(admittedSpecies(rules)).toEqual(["dog", "cat"]);
    expect(petMatchesRules(pet("Dog", 30), rules)).toBe(true);
    expect(petMatchesRules(pet("Cat", 9), rules)).toBe(true);
  });

  test("two species rules take either, not only a pet that is both", () => {
    const rules = [rule("pet_type", "dog"), rule("pet_type", "cat")];
    expect(petMatchesRules(pet("Cat", 9), rules)).toBe(true);
  });

  test("a rule that is switched off decides nothing", () => {
    expect(
      petMatchesRules(pet("Cat", 9), [rule("pet_type", "dog", false)]),
    ).toBe(true);
    expect(
      petMatchesRules(pet("Dog", 90), [rule("max_weight", 20, false)]),
    ).toBe(true);
  });

  test("weight limits include their own number", () => {
    const rules = [rule("min_weight", 40), rule("max_weight", 80)];
    expect(petMatchesRules(pet("Dog", 40), rules)).toBe(true);
    expect(petMatchesRules(pet("Dog", 80), rules)).toBe(true);
    expect(petMatchesRules(pet("Dog", 39.5), rules)).toBe(false);
    expect(petMatchesRules(pet("Dog", 81), rules)).toBe(false);
  });
});
