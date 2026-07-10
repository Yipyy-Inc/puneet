import type { DailyCareStep, DailyCareTaskType } from "@/types/boarding";

// ============================================================================
// Built-in starter templates for the Daily Care schedule builder. A facility
// can apply one of these when setting up, then customize. Ids are regenerated
// on apply, so these fixed ids only identify the starter in the picker.
// ============================================================================

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  steps: DailyCareStep[];
};

// [name, time, taskType, extra?] — compact row form for the built-ins.
type Row =
  | [string, string, DailyCareTaskType]
  | [string, string, DailyCareTaskType, Partial<DailyCareStep>];

function buildTemplate(
  id: string,
  name: string,
  description: string,
  rows: Row[],
): StarterTemplate {
  return {
    id,
    name,
    description,
    steps: rows.map(([stepName, time, taskType, extra], i) => ({
      id: `${id}-${i}`,
      name: stepName,
      time,
      taskType,
      enabled: true,
      sortOrder: i,
      ...(extra ?? {}),
    })),
  };
}

export const BUILT_IN_TEMPLATES: StarterTemplate[] = [
  buildTemplate(
    "starter-standard",
    "Standard Boarding Day",
    "Full routine — potty rounds, three meal slots, meds, and cleaning.",
    [
      ["Morning Potty Round", "06:00", "potty"],
      ["Breakfast", "07:30", "feeding"],
      ["Morning Medications", "08:00", "medication"],
      ["Kennel Cleaning", "09:00", "kennel_clean"],
      ["Water Refill", "10:00", "water_refill"],
      ["Midday Potty Round", "12:00", "potty"],
      ["Afternoon Potty Round", "15:00", "potty"],
      ["Dinner", "18:00", "feeding"],
      ["Evening Medications", "18:30", "medication"],
      [
        "Evening Potty Round (Last Call)",
        "21:00",
        "potty",
        { requiresHeadCount: true },
      ],
    ],
  ),
  buildTemplate(
    "starter-minimal",
    "Minimal Day",
    "Just the essentials — potty rounds and two meals.",
    [
      ["Morning Potty Round", "07:00", "potty"],
      ["Breakfast", "08:00", "feeding"],
      ["Afternoon Potty Round", "14:00", "potty"],
      ["Dinner", "18:00", "feeding"],
      [
        "Evening Potty Round (Last Call)",
        "21:00",
        "potty",
        { requiresHeadCount: true },
      ],
    ],
  ),
  buildTemplate(
    "starter-medical",
    "Medical-Focused",
    "Extra medication touchpoints, scoped to dogs with medications.",
    [
      ["Morning Potty Round", "06:30", "potty"],
      ["Breakfast", "07:30", "feeding"],
      [
        "Morning Medications",
        "08:00",
        "medication",
        { appliesTo: { kind: "medications" } },
      ],
      [
        "Midday Medications",
        "12:00",
        "medication",
        { appliesTo: { kind: "medications" } },
      ],
      ["Afternoon Potty Round", "15:00", "potty"],
      ["Dinner", "18:00", "feeding"],
      [
        "Evening Medications",
        "18:30",
        "medication",
        { appliesTo: { kind: "medications" } },
      ],
      [
        "Evening Potty Round (Last Call)",
        "21:00",
        "potty",
        { requiresHeadCount: true },
      ],
    ],
  ),
];
