import { Sun, Bed, Scissors, GraduationCap, CheckCircle } from "lucide-react";

export const SERVICE_CATEGORIES = [
  {
    id: "daycare",
    image: "/services/daycare.jpg",
    name: "Daycare",
    icon: Sun,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Full or half day supervised care in a safe, social environment.",
    basePrice: 35,
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
    basePrice: 45,
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
    basePrice: 40,
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
    basePrice: 85,
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
    basePrice: 0,
    included: [
      "Temperament check",
      "Compatibility assessment",
      "Quick turnaround",
    ],
  },
];

export const GROOMING_STYLES = [
  { id: "bath_brush", name: "Bath & Brush", price: 40 },
  { id: "full_groom", name: "Full Groom", price: 65 },
  { id: "puppy_groom", name: "Puppy Groom", price: 35 },
  { id: "hand_stripping", name: "Hand Stripping", price: 95 },
  { id: "deshedding", name: "De-shedding Treatment", price: 55 },
];

export const GROOMING_ADDONS = [
  {
    id: "nail_trim",
    name: "Nail Trim",
    price: 15,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Safe trim and file. Reduces scratching.",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=240&fit=crop",
  },
  {
    id: "teeth_brush",
    name: "Teeth Brushing",
    price: 10,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Gentle brush with pet-safe toothpaste.",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=240&fit=crop",
  },
  {
    id: "ear_clean",
    name: "Ear Cleaning",
    price: 12,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Ear check and gentle cleaning.",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=240&fit=crop",
  },
  {
    id: "flea_treatment",
    name: "Flea Treatment",
    price: 25,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Flea bath and treatment add-on.",
    image:
      "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=240&fit=crop",
  },
  {
    id: "medicated_bath",
    name: "Medicated Bath",
    price: 20,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Soothing bath for skin conditions.",
    image:
      "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=240&fit=crop",
  },
  {
    id: "paw_treatment",
    name: "Paw Pad Treatment",
    price: 15,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Moisturizing paw balm and massage.",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=240&fit=crop",
  },
];

export const TRAINING_TYPES = [
  { id: "basic_obedience", name: "Basic Obedience", price: 250, sessions: 6 },
  {
    id: "advanced_obedience",
    name: "Advanced Obedience",
    price: 350,
    sessions: 8,
  },
  { id: "private_session", name: "Private Session", price: 85, sessions: 1 },
  { id: "puppy_training", name: "Puppy Training", price: 200, sessions: 4 },
  {
    id: "behavior_modification",
    name: "Behavior Modification",
    price: 150,
    sessions: 1,
  },
  { id: "agility", name: "Agility Training", price: 300, sessions: 6 },
];

export const DAYCARE_TYPES = [
  { id: "full_day", name: "Full Day", price: 35, hours: "8+" },
  { id: "half_day", name: "Half Day", price: 22, hours: "up to 5" },
];

export const BOARDING_TYPES = [
  { id: "standard", name: "Standard Boarding", price: 45 },
  { id: "luxury", name: "Luxury Suite", price: 75 },
  { id: "vip", name: "VIP Suite", price: 100 },
];

/** Customer-facing boarding room types: photo, inclusions, pet eligibility (type/size/weight), availability */
export interface CustomerBoardingRoomType {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  included: string[];
  allowedPetTypes: string[];
  minWeightLbs?: number;
  maxWeightLbs?: number;
  totalRooms: number;
  bookedRooms: number;
  /** 3–5 facility-uploaded photos for details view */
  images?: string[];
  /** Facility notes e.g. "Best for anxious dogs", "Includes webcam" */
  notes?: string;
}
export const CUSTOMER_BOARDING_ROOM_TYPES: CustomerBoardingRoomType[] = [
  {
    id: "standard",
    name: "Standard Room",
    price: 45,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Comfortable indoor kennel with bedding and a calm environment.",
    image: "/rooms/room-1.jpg",
    included: ["Bedding", "Daily feeding", "Potty breaks", "Basic care"],
    allowedPetTypes: ["Dog", "Cat"],
    minWeightLbs: undefined,
    maxWeightLbs: undefined,
    totalRooms: 10,
    bookedRooms: 7,
    images: ["/rooms/room-1.jpg"],
    notes: "Great for dogs who prefer a quiet, cozy space.",
  },
  {
    id: "deluxe",
    name: "Deluxe Suite",
    price: 75,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Spacious suite with play area and webcam so you can check in anytime.",
    image: "/rooms/room-2.jpg",
    included: [
      "Luxury bedding",
      "Play area",
      "Webcam access",
      "Daily feeding",
      "Extra playtime",
    ],
    allowedPetTypes: ["Dog", "Cat"],
    minWeightLbs: undefined,
    maxWeightLbs: undefined,
    totalRooms: 5,
    bookedRooms: 2,
    images: ["/rooms/room-2.jpg"],
    notes: "Includes webcam. Best for social pets who love extra play.",
  },
  {
    id: "vip",
    name: "VIP Suite",
    price: 120,
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Luxury suite with private outdoor access and premium amenities.",
    image: "/rooms/room-3.jpg",
    included: [
      "Premium bedding",
      "Private outdoor run",
      "Webcam",
      "Daily feeding",
      "One-on-one time",
    ],
    allowedPetTypes: ["Dog", "Cat"],
    minWeightLbs: 20,
    maxWeightLbs: undefined,
    totalRooms: 3,
    bookedRooms: 1,
    images: ["/rooms/room-3.jpg"],
    notes: "Private outdoor run. Ideal for larger or high-energy dogs.",
  },
];

/** Add-ons for customer booking: service-dependent, shown as cards with image, description, price, quantity, apply to all or specific pet */
export type CustomerAddonServiceType = "daycare" | "boarding";
export interface CustomerAddon {
  id: string;
  name: string;
  description: string;
  image: string;
  /** Which service types show this add-on */
  services: CustomerAddonServiceType[];
  hasUnits: boolean;
  pricePerUnit?: number;
  unit?: string;
  basePrice?: number;
  /** Optional "what's included" bullets */
  included?: string[];
}
export const CUSTOMER_ADDONS: CustomerAddon[] = [
  {
    id: "extended-walk",
    name: "Extended Walk",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Additional 30-minute walk session for your pet to burn extra energy and explore",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop",
    services: ["daycare", "boarding"],
    hasUnits: true,
    pricePerUnit: 15,
    unit: "walk",
  },
  {
    id: "playtime-plus",
    name: "Playtime Plus",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Extra supervised play session with interactive toys and games",
    image:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
    services: ["daycare", "boarding"],
    hasUnits: true,
    pricePerUnit: 12,
    unit: "session",
  },
  {
    id: "one-on-one",
    name: "One-on-One Attention",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Dedicated individual time with a staff member for personalized care",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop",
    services: ["daycare", "boarding"],
    hasUnits: true,
    pricePerUnit: 20,
    unit: "hour",
  },
  {
    id: "mini-training",
    name: "Mini Training Session",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description: "Quick 15-minute basic obedience training during their stay",
    image:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=300&fit=crop",
    services: ["daycare"],
    hasUnits: false,
    basePrice: 25,
  },
  {
    id: "spa-treatment",
    name: "Quick Spa Treatment",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Relaxing paw massage and aromatherapy session to help your pet unwind",
    image:
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=300&fit=crop",
    services: ["daycare", "boarding"],
    hasUnits: false,
    basePrice: 18,
  },
  {
    id: "treat-time",
    name: "Premium Treat Time",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Special gourmet treats and enrichment activities throughout the day",
    image:
      "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=400&h=300&fit=crop",
    services: ["daycare", "boarding"],
    hasUnits: false,
    basePrice: 10,
  },
  {
    id: "bath-groom",
    name: "Bath & Groom",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Full bathing and grooming service before checkout to keep your pet fresh",
    image:
      "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=300&fit=crop",
    services: ["boarding"],
    hasUnits: false,
    basePrice: 35,
  },
  {
    id: "video-call",
    name: "Daily Video Call",
    // french-ok: seed copy for a facility-authored catalogue — Postgres serves the real one
    description:
      "Scheduled daily video call to check in on your pet during their stay",
    image:
      "https://images.unsplash.com/photo-1587559070757-f72da2f829a8?w=400&h=300&fit=crop",
    services: ["boarding"],
    hasUnits: false,
    basePrice: 10,
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

export const DAYCARE_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDatesAndTimes" },
  { id: 1, titleKey: "subRoomAssignment", descriptionKey: "subAssignToRoom" },
  { id: 2, titleKey: "addOnsLabel", descriptionKey: "subAddOnServices" },
  { id: 3, titleKey: "feeding", descriptionKey: "subFeedingSchedule" },
  { id: 4, titleKey: "subMedication", descriptionKey: "subMedicationDetails" },
];

export const BOARDING_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDates" },
  { id: 1, titleKey: "subRoomType", descriptionKey: "subChooseRoom" },
  { id: 2, titleKey: "addOnsLabel", descriptionKey: "subAddOnServices" },
  { id: 3, titleKey: "feeding", descriptionKey: "subFeedingSchedule" },
  { id: 4, titleKey: "subMedication", descriptionKey: "subMedicationDetails" },
];

export const EVALUATION_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDateAndSlot" },
  { id: 1, titleKey: "addOnsLabel", descriptionKey: "subOptionalExtras" },
];

export const GROOMING_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "service", descriptionKey: "subChooseGrooming" },
  { id: 1, titleKey: "addOnsLabel", descriptionKey: "subOptionalExtras" },
  { id: 2, titleKey: "schedule", descriptionKey: "subDateAndTime" },
];

export const CUSTOM_SERVICE_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "schedule", descriptionKey: "subDateAndTime" },
];

// Training sessions run at a fixed scheduled time on a fixed day — the
// owner is enrolling in a series, not picking arrival/departure windows.
// Keep the sub-step label specific so the sidebar makes the purpose clear.
export const TRAINING_SUB_STEPS: WizardSubStepDef[] = [
  { id: 0, titleKey: "subSelectSeries", descriptionKey: "subPickAClass" },
];

// ── Per-service accent colors ────────────────────────────────────────────────
// Used throughout the booking flow for consistent service-branded styling.
export const SERVICE_ACCENTS: Record<
  string,
  {
    bg: string;
    icon: string;
    price: string;
    ring: string;
    border: string;
    progressBar: string;
    stepBg: string;
    stepText: string;
    badgeBg: string;
    badgeText: string;
    btnBg: string;
    btnHover: string;
    subStepBg: string;
    subStepText: string;
    subStepBorder: string;
  }
> = {
  daycare: {
    bg: "bg-amber-50",
    icon: "text-amber-500",
    price: "text-amber-600",
    ring: "ring-amber-400",
    border: "border-amber-400",
    progressBar: "bg-amber-500",
    stepBg: "bg-amber-500",
    stepText: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    btnBg: "bg-amber-500 hover:bg-amber-600",
    btnHover: "hover:bg-amber-50",
    subStepBg: "bg-amber-500/15",
    subStepText: "text-amber-700",
    subStepBorder: "border-amber-400/30",
  },
  boarding: {
    bg: "bg-indigo-50",
    icon: "text-indigo-500",
    price: "text-indigo-600",
    ring: "ring-indigo-400",
    border: "border-indigo-400",
    progressBar: "bg-indigo-500",
    stepBg: "bg-indigo-500",
    stepText: "text-indigo-600",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-700",
    btnBg: "bg-indigo-500 hover:bg-indigo-600",
    btnHover: "hover:bg-indigo-50",
    subStepBg: "bg-indigo-500/15",
    subStepText: "text-indigo-700",
    subStepBorder: "border-indigo-400/30",
  },
  grooming: {
    bg: "bg-pink-50",
    icon: "text-pink-500",
    price: "text-pink-600",
    ring: "ring-pink-400",
    border: "border-pink-400",
    progressBar: "bg-pink-500",
    stepBg: "bg-pink-500",
    stepText: "text-pink-600",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-700",
    btnBg: "bg-pink-500 hover:bg-pink-600",
    btnHover: "hover:bg-pink-50",
    subStepBg: "bg-pink-500/15",
    subStepText: "text-pink-700",
    subStepBorder: "border-pink-400/30",
  },
  training: {
    bg: "bg-sky-50",
    icon: "text-sky-500",
    price: "text-sky-600",
    ring: "ring-sky-400",
    border: "border-sky-400",
    progressBar: "bg-sky-500",
    stepBg: "bg-sky-500",
    stepText: "text-sky-600",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
    btnBg: "bg-sky-500 hover:bg-sky-600",
    btnHover: "hover:bg-sky-50",
    subStepBg: "bg-sky-500/15",
    subStepText: "text-sky-700",
    subStepBorder: "border-sky-400/30",
  },
  retail: {
    bg: "bg-emerald-50",
    icon: "text-emerald-500",
    price: "text-emerald-600",
    ring: "ring-emerald-400",
    border: "border-emerald-400",
    progressBar: "bg-emerald-500",
    stepBg: "bg-emerald-500",
    stepText: "text-emerald-600",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    btnBg: "bg-emerald-500 hover:bg-emerald-600",
    btnHover: "hover:bg-emerald-50",
    subStepBg: "bg-emerald-500/15",
    subStepText: "text-emerald-700",
    subStepBorder: "border-emerald-400/30",
  },
  evaluation: {
    bg: "bg-violet-50",
    icon: "text-violet-500",
    price: "text-violet-600",
    ring: "ring-violet-400",
    border: "border-violet-400",
    progressBar: "bg-violet-500",
    stepBg: "bg-violet-500",
    stepText: "text-violet-600",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    btnBg: "bg-violet-500 hover:bg-violet-600",
    btnHover: "hover:bg-violet-50",
    subStepBg: "bg-violet-500/15",
    subStepText: "text-violet-700",
    subStepBorder: "border-violet-400/30",
  },
  vet: {
    bg: "bg-rose-50",
    icon: "text-rose-500",
    price: "text-rose-600",
    ring: "ring-rose-400",
    border: "border-rose-400",
    progressBar: "bg-rose-500",
    stepBg: "bg-rose-500",
    stepText: "text-rose-600",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    btnBg: "bg-rose-500 hover:bg-rose-600",
    btnHover: "hover:bg-rose-50",
    subStepBg: "bg-rose-500/15",
    subStepText: "text-rose-700",
    subStepBorder: "border-rose-400/30",
  },
  store: {
    bg: "bg-teal-50",
    icon: "text-teal-500",
    price: "text-teal-600",
    ring: "ring-teal-400",
    border: "border-teal-400",
    progressBar: "bg-teal-500",
    stepBg: "bg-teal-500",
    stepText: "text-teal-600",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
    btnBg: "bg-teal-500 hover:bg-teal-600",
    btnHover: "hover:bg-teal-50",
    subStepBg: "bg-teal-500/15",
    subStepText: "text-teal-700",
    subStepBorder: "border-teal-400/30",
  },
};

const DEFAULT_ACCENT = SERVICE_ACCENTS.daycare;

export function getServiceAccent(serviceId: string) {
  return SERVICE_ACCENTS[serviceId] ?? DEFAULT_ACCENT;
}
