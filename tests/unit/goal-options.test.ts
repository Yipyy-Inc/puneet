import { describe, expect, test } from "bun:test";

import { cleanGoalOptions } from "@/lib/training/goal-options";

// Settings › Training's goals, as the booking wizard's Goals step offers them.
describe("the facility's training goals", () => {
  test("saved clean: trimmed, no blank line, one of each whatever its case", () => {
    expect(
      cleanGoalOptions([
        "  Loose-leash walking ",
        "",
        "recall",
        "Recall",
        "   ",
        "Agility basics",
      ]),
    ).toEqual(["Loose-leash walking", "recall", "Agility basics"]);
  });

  test("none of its own is the shipped eight", () => {
    expect(cleanGoalOptions(undefined)).toBeUndefined();
    expect(cleanGoalOptions(["", "  "])).toBeUndefined();
  });

  test("at most twenty, each at most 80 characters", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Goal ${i}`);
    expect(cleanGoalOptions(many)).toHaveLength(20);
    expect(cleanGoalOptions(["x".repeat(120)])![0]).toHaveLength(80);
  });
});
