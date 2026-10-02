import { Sun, Bed, Scissors, GraduationCap, CheckCircle } from "lucide-react";

import { careSubSteps, type CareStepUses } from "@/lib/bookings/care-steps";

// No prices here. Each entry carried one — daycare 35, boarding 45, grooming
// 40, training 85 — and two service pickers rendered them as "From $45" at a
// facility whose own cheapest kennel was $38, or $125, or which had not
// priced boarding at all. A "from" price is read from the facility's own
// catalogue now (@/lib/api/service-from-prices); this list is seed copy for
// names, images and what a service includes.
export const SERVICE_CATEGORIES = [
  {
    id: "daycare",
    image: "/services/daycare.jpg",
    name: "Daycare",
    icon: Sun,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Full or half day supervised care in a safe, social environment.",
    included: [
      "Supervised play",
      "Indoor/outdoor access",
      "Feeding as needed",
      "Updates available",
    ],
  },
  {
    id: "boarding",
    image: "/services/boarding.jpg",
    name: "Boarding",
    icon: Bed,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Overnight stays with full care so your pet feels at home.",
    included: [
      "Comfy lodging",
      "Daily feeding",
      "Potty breaks",
      "Lots of attention",
    ],
  },
  {
    id: "grooming",
    image:
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=600&h=360&fit=crop",
    name: "Grooming",
    icon: Scissors,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Bath, grooming, and styling services by experienced staff.",
    included: ["Bath & dry", "Brush-out", "Nail trim", "Ear check"],
  },
  {
    id: "training",
    image:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=600&h=360&fit=crop",
    name: "Training",
    icon: GraduationCap,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Obedience and specialized training programs.",
    included: ["Certified trainers", "Structured sessions", "Take-home tips"],
  },
  {
    id: "evaluation",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=360&fit=crop",
    name: "Pet Evaluation",
    icon: CheckCircle,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Assessment to ensure your pet is ready for group services.",
    included: [
      "Temperament check",
      "Compatibility assessment",
      "Quick turnaround",
    ],
  },
];

/** Grooming packages for customer booking: duration, what's included, starting price */
export interface GroomingPackage {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  included: string[];
  image: string;
  /** 3–5 facility-uploaded photos for details view */
  images?: string[];
  /** Facility notes e.g. "Best for first-time groomers" */
  notes?: string;
}
export const GROOMING_PACKAGES: GroomingPackage[] = [
  {
    id: "bath_brush",
    name: "Bath & Brush",
    price: 40,
    durationMinutes: 45,
    included: ["Bath", "Brush-out", "Nail trim", "Ear check"],
    image: "/services/grooming-bath.jpg",
    notes: "Perfect for regular maintenance between full grooms.",
  },
  {
    id: "full_groom",
    name: "Full Groom",
    price: 65,
    durationMinutes: 90,
    included: [
      "Bath",
      "Haircut/style",
      "Nail trim",
      "Ear cleaning",
      "Brush-out",
    ],
    image: "/services/grooming-full.jpg",
    notes: "Our most popular package. Includes breed-appropriate styling.",
  },
  {
    id: "puppy_groom",
    name: "Puppy Groom",
    price: 35,
    durationMinutes: 30,
    included: ["Gentle bath", "Brush", "Nail trim", "Intro to grooming"],
    image: "/services/grooming-puppy.jpg",
    notes: "Best for first-time groomers. Gentle intro to the process.",
  },
  {
    id: "hand_stripping",
    name: "Hand Stripping",
    price: 95,
    durationMinutes: 120,
    included: ["Hand strip coat", "Bath", "Nail trim", "Ear cleaning"],
    image: "/services/grooming-strip.jpg",
    notes: "For wire-coated breeds. Requires extra time.",
  },
  {
    id: "deshedding",
    name: "De-shedding Treatment",
    price: 55,
    durationMinutes: 60,
    included: ["De-shed bath", "Brush-out", "Nail trim", "Ear check"],
    image: "/services/grooming-deshed.jpg",
    notes: "Ideal for heavy shedders. Reduces loose fur at home.",
  },
];

/**
 * A wizard step, named by CATALOGUE KEY rather than by prose.
 *
 * ── WHY THIS IS NOT `Step` FROM `ui/stepper` ───────────────────────────────
 *
 * That type's `title` is a DISPLAY string, and these seven tables held display
 * strings in English — the wizard's whole left rail, in a `.ts` file, which is
 * why `check:ui-french` never saw a word of it: its walk keeps only `.tsx`,
 * because a JSX text node cannot exist anywhere else. A French user reading
 * "Client & Pet · Choose service · Details · Confirm" beside a fully French
 * wizard body is what this cost, and it was found by opening the screen.
 *
 * Keys instead of prose makes the mistake unrepeatable here: `titleKey` cannot
 * be filled in with a sentence and still work.
 */
export interface WizardStepDef {
  id: string;
  titleKey: string;
  descriptionKey: string;
}

/** Same, for a sub-step — whose `id` is its position in the service's flow. */
export interface WizardSubStepDef {
  id: number;
  titleKey: string;
  descriptionKey: string;
}

export const STEPS: WizardStepDef[] = [
  {
    id: "client-pet",
    titleKey: "stepClientPet",
    descriptionKey: "stepClientPetHelp",
  },
  { id: "service", titleKey: "service", descriptionKey: "selectAService" },
  { id: "details", titleKey: "details", descriptionKey: "stepDetailsHelp" },
  { id: "confirm", titleKey: "stepConfirm", descriptionKey: "stepConfirmHelp" },
];

// Feeding (3) and Medication (4) are not in these lists: the facility decides
// per service whether they appear, so `detailSubSteps` adds them.
// The play area is not a screen any more (the client's mock, 2026-10-01): it
// is assigned as a customer's always was, and staff change it on Confirm.
export const DAYCARE_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDatesAndTimes" },
  { id: 2, titleKey: "addOnsLabel", descriptionKey: "subAddOnServices" },
];

export const BOARDING_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDates" },
  { id: 1, titleKey: "subRoomType", descriptionKey: "subChooseRoom" },
  { id: 2, titleKey: "addOnsLabel", descriptionKey: "subAddOnServices" },
];

// The client's evaluation mock (2026-10-02): Date & time, then — for a
// customer only — About your pet. No add-ons: the mock has none, and no
// facility had an add-on for evaluations when it went (id 1 is retired).
export const EVALUATION_INTAKE_SUB_STEP_ID = 2;
export const EVALUATION_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "wizEvSubDateTime", descriptionKey: "subDateAndSlot" },
];
const EVALUATION_INTAKE_SUB_STEP: WizardSubStepDef = {
  id: EVALUATION_INTAKE_SUB_STEP_ID,
  titleKey: "wizEvSubAboutPet",
  descriptionKey: "wizEvSubAboutPetHelp",
};

export const GROOMING_SUB_STEPS: WizardSubStepDef[] = [
  // The client's mock (2026-10-01): Package · Add-ons · Groomer & time.
  { id: 0, titleKey: "wizSubPackage", descriptionKey: "subChooseGrooming" },
  { id: 1, titleKey: "addOnsLabel", descriptionKey: "subOptionalExtras" },
  { id: 2, titleKey: "wizSubGroomerTime", descriptionKey: "subDateAndTime" },
];

export const CUSTOM_SERVICE_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDateAndTime" },
];

// Training (the client's mock, 2026-10-01): Program · Trainer & time ·
// Goals. "Trainer & time" is a class for a group program, a trainer's slot
// for a lesson or a consult.
export const TRAINING_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "wizSubProgram", descriptionKey: "wizChooseProgram" },
  { id: 1, titleKey: "wizSubTrainerTime", descriptionKey: "subDateAndTime" },
  { id: 2, titleKey: "wizSubGoals", descriptionKey: "wizWorkOn" },
];

/**
 * The Details screen's sub-steps for a service: its own, then Feeding and
 * Medication where the facility has them on for it (lib/bookings/care-steps).
 * A customer never sees Room Assignment (id 1): the facility assigns it.
 */
export function detailSubSteps(
  service: string,
  options: { customer: boolean; care: CareStepUses },
): WizardSubStepDef[] {
  const care = careSubSteps(options.care);
  if (service === "daycare" || service === "boarding") {
    // A customer chooses the room type too (the client's mock): what they
    // buy is the room, and its count of free units is never shown to them.
    const own = service === "daycare" ? DAYCARE_SUB_STEPS : BOARDING_SUB_STEPS;
    return [...own, ...care];
  }
  if (service === "grooming") return [...GROOMING_SUB_STEPS, ...care];
  if (service === "training") return [...TRAINING_SUB_STEPS, ...care];
  if (service === "evaluation") {
    return options.customer
      ? [...EVALUATION_SUB_STEPS, EVALUATION_INTAKE_SUB_STEP]
      : EVALUATION_SUB_STEPS;
  }
  if (service) return CUSTOM_SERVICE_SUB_STEPS;
  return [];
}
