import type { TaskTemplate } from "@/types/task";

// ============================================================================
// Default task templates per built-in service module
// ============================================================================

export const defaultTaskTemplates: TaskTemplate[] = [
  // ── Boarding ──
  {
    id: "boarding-checkin-prep",
    moduleId: "boarding",
    name: "Check-in preparation",
    description: "Prepare kennel, print paperwork, review care instructions",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -15 },
    durationMinutes: 15,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "boarding-kennel-setup",
    moduleId: "boarding",
    name: "Set up kennel with bedding & supplies",
    category: "setup",
    timing: { type: "at_start" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "boarding-feeding",
    moduleId: "boarding",
    name: "Feeding",
    description: "Follow feeding instructions from care plan",
    category: "care",
    timing: { type: "custom_time" },
    durationMinutes: 15,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
    recurring: { frequency: "per_meal", times: ["08:00", "18:00"] },
  },
  {
    id: "boarding-medication",
    moduleId: "boarding",
    name: "Medication administration",
    description: "Administer medication per care plan — verify dosage",
    category: "care",
    timing: { type: "custom_time" },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: false, // only for pets with medication
  },
  {
    id: "boarding-daily-walk",
    moduleId: "boarding",
    name: "Daily walk",
    description: "30-minute supervised walk",
    category: "care",
    timing: { type: "custom_time" },
    durationMinutes: 30,
    assignTo: "any_available",
    isRequired: false,
    autoCreate: true,
    recurring: { frequency: "daily", times: ["07:00", "12:00", "18:00"] },
  },
  {
    id: "boarding-kennel-clean",
    moduleId: "boarding",
    name: "Kennel cleaning",
    category: "cleanup",
    timing: { type: "custom_time" },
    durationMinutes: 15,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
    recurring: { frequency: "daily", times: ["10:00"] },
  },
  {
    id: "boarding-checkout-prep",
    moduleId: "boarding",
    name: "Check-out preparation",
    description: "Bath if included, prepare belongings, final check",
    category: "cleanup",
    timing: { type: "before_start", offsetMinutes: -30 },
    durationMinutes: 30,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "boarding-deep-clean",
    moduleId: "boarding",
    name: "Kennel deep clean",
    category: "cleanup",
    timing: { type: "after_end", offsetMinutes: 15 },
    durationMinutes: 20,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
  },

  // ── Daycare ──
  {
    id: "daycare-morning-setup",
    moduleId: "daycare",
    name: "Morning setup",
    description: "Prepare play areas, check supplies, sanitize",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -30 },
    durationMinutes: 30,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "daycare-checkin-assessment",
    moduleId: "daycare",
    name: "Check-in & temperament assessment",
    category: "execution",
    timing: { type: "at_start" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "daycare-playgroup",
    moduleId: "daycare",
    name: "Playgroup supervision",
    category: "execution",
    timing: { type: "during" },
    durationMinutes: 60,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "daycare-feeding",
    moduleId: "daycare",
    name: "Midday feeding",
    category: "care",
    timing: { type: "custom_time", customTime: "12:00" },
    durationMinutes: 20,
    assignTo: "any_available",
    isRequired: false,
    autoCreate: true,
  },
  {
    id: "daycare-nap",
    moduleId: "daycare",
    name: "Afternoon nap supervision",
    category: "care",
    timing: { type: "custom_time", customTime: "13:00" },
    durationMinutes: 60,
    assignTo: "any_available",
    isRequired: false,
    autoCreate: true,
  },
  {
    id: "daycare-cleanup",
    moduleId: "daycare",
    name: "End-of-day cleanup",
    category: "cleanup",
    timing: { type: "after_end", offsetMinutes: 15 },
    durationMinutes: 30,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "daycare-report-card",
    moduleId: "daycare",
    name: "Report card completion",
    description: "Fill in daily report card with photos and notes",
    category: "execution",
    timing: { type: "at_end" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },

  // ── Grooming ──
  {
    id: "grooming-review-notes",
    moduleId: "grooming",
    name: "Review grooming notes",
    description: "Check client preferences, allergies, special instructions",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -10 },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "grooming-prep-station",
    moduleId: "grooming",
    name: "Prepare grooming station",
    description: "Set up tools, shampoo, clippers based on pet needs",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -5 },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "grooming-session",
    moduleId: "grooming",
    name: "Grooming session",
    category: "execution",
    timing: { type: "at_start" },
    durationMinutes: 60,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "grooming-cleanup",
    moduleId: "grooming",
    name: "Post-groom cleanup",
    category: "cleanup",
    timing: { type: "at_end" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "grooming-photo",
    moduleId: "grooming",
    name: "Photo for report card",
    description: "Take before/after photos for the owner",
    category: "execution",
    timing: { type: "at_end" },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },

  // ── Training ──
  {
    id: "training-prep-area",
    moduleId: "training",
    name: "Prepare training area",
    description: "Set up equipment, treats, barriers",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -15 },
    durationMinutes: 15,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "training-session",
    moduleId: "training",
    name: "Training session",
    category: "execution",
    timing: { type: "at_start" },
    durationMinutes: 60,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "training-notes",
    moduleId: "training",
    name: "Session notes & progress update",
    description: "Record what was covered, homework for owner",
    category: "execution",
    timing: { type: "at_end" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },
  {
    id: "training-cleanup",
    moduleId: "training",
    name: "Equipment cleanup",
    category: "cleanup",
    timing: { type: "after_end", offsetMinutes: 5 },
    durationMinutes: 10,
    assignTo: "any_available",
    isRequired: false,
    autoCreate: true,
  },

  // ── Yoda's Splash (Pool Session) ──
  {
    id: "yodas-splash-pool-prep",
    moduleId: "yodas-splash",
    name: "Prepare pool area",
    description: "Check water temperature, set up towels, safety equipment",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -15 },
    durationMinutes: 15,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "yodas-splash-safety-check",
    moduleId: "yodas-splash",
    name: "Safety briefing & waiver check",
    description: "Verify waiver signed, review pet health, check life jacket",
    category: "setup",
    timing: { type: "at_start" },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "yodas-splash-session",
    moduleId: "yodas-splash",
    name: "Supervise swim session",
    category: "execution",
    timing: { type: "at_start" },
    durationMinutes: 45,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "yodas-splash-dry",
    moduleId: "yodas-splash",
    name: "Dry & brush pet",
    description: "Towel dry, blow dry if needed, quick brush",
    category: "execution",
    timing: { type: "at_end" },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },
  {
    id: "yodas-splash-photo",
    moduleId: "yodas-splash",
    name: "Photo for report card",
    category: "execution",
    timing: { type: "at_end" },
    durationMinutes: 5,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },
  {
    id: "yodas-splash-cleanup",
    moduleId: "yodas-splash",
    name: "Pool area cleanup",
    description: "Clean pool deck, sanitize, restock towels",
    category: "cleanup",
    timing: { type: "after_end", offsetMinutes: 10 },
    durationMinutes: 15,
    assignTo: "any_available",
    isRequired: true,
    autoCreate: true,
  },

  // ── Paws Express (Transport) ──
  {
    id: "paws-express-vehicle-prep",
    moduleId: "paws-express",
    name: "Vehicle preparation",
    description: "Check vehicle, load crate, verify route & address",
    category: "setup",
    timing: { type: "before_start", offsetMinutes: -20 },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "paws-express-pickup",
    moduleId: "paws-express",
    name: "Pickup",
    description: "Drive to pickup location, collect pet, secure in vehicle",
    category: "transport",
    timing: { type: "at_start" },
    durationMinutes: 30,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "paws-express-dropoff",
    moduleId: "paws-express",
    name: "Drop-off",
    description: "Deliver pet to destination, confirm handoff",
    category: "transport",
    timing: { type: "at_end" },
    durationMinutes: 15,
    assignTo: "booking_staff",
    isRequired: true,
    autoCreate: true,
  },
  {
    id: "paws-express-vehicle-clean",
    moduleId: "paws-express",
    name: "Vehicle cleanup",
    description: "Clean crate, sanitize vehicle interior",
    category: "cleanup",
    timing: { type: "after_end", offsetMinutes: 5 },
    durationMinutes: 10,
    assignTo: "booking_staff",
    isRequired: false,
    autoCreate: true,
  },
];

// ============================================================================
// CRUD with localStorage persistence
// ============================================================================

const STORAGE_KEY = "yipyy_task_templates";

function loadCustomTemplates(): TaskTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: TaskTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

export function getAllTemplates(): TaskTemplate[] {
  return [...defaultTaskTemplates, ...loadCustomTemplates()];
}

export function getTemplatesForModule(moduleId: string): TaskTemplate[] {
  return getAllTemplates().filter((t) => t.moduleId === moduleId);
}

export function addTemplate(template: TaskTemplate) {
  const custom = loadCustomTemplates();
  custom.push(template);
  saveCustomTemplates(custom);
}

export function updateTemplate(id: string, updated: Partial<TaskTemplate>) {
  // Check custom first
  const custom = loadCustomTemplates();
  const idx = custom.findIndex((t) => t.id === id);
  if (idx >= 0) {
    custom[idx] = { ...custom[idx], ...updated };
    saveCustomTemplates(custom);
    return;
  }
  // It's a default template — clone to custom with overrides
  const def = defaultTaskTemplates.find((t) => t.id === id);
  if (def) {
    custom.push({ ...def, ...updated });
    saveCustomTemplates(custom);
  }
}

export function removeTemplate(id: string) {
  const custom = loadCustomTemplates();
  saveCustomTemplates(custom.filter((t) => t.id !== id));
}
