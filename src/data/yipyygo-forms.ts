/**
 * YipyyGo Form Data Structures
 * 
 * Defines the data structures for YipyyGo pre-check-in forms
 */

import { getYipyyGoConfig } from "@/data/yipyygo-config";

// ============================================================================
// Form Data Types
// ============================================================================

export interface BelongingItem {
  id: string;
  type: "food" | "treats" | "bedding" | "toys" | "crate" | "leash_collar" | "medication_bag" | "other";
  quantity?: number;
  notes?: string;
  photoUrl?: string;
}

export interface FeedingInstruction {
  foodType: string;
  portionSize: string;
  portionUnit: "cups" | "grams" | "other";
  feedingSchedule: Array<{
    time: string; // HH:MM format
    amount: string;
  }>;
  prePortionedBagCount?: number;
  notes?: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "twice daily", "once daily"
  times: string[]; // Array of times in HH:MM format
  method: "pill_pocket" | "with_food" | "syringe" | "topical" | "other";
  methodNotes?: string;
  photoUrl?: string; // Photo of medication label
}

export interface BehaviorNotes {
  energyLevel: "low" | "medium" | "high" | "very_high";
  socialization: {
    withDogs: "friendly" | "selective" | "not_friendly" | "unknown";
    withHumans: "friendly" | "shy" | "fearful" | "unknown";
  };
  anxietyTriggers?: string[];
  specialNotes?: string;
}

export interface YipyyGoAddOn {
  id: string;
  name: string;
  description?: string;
  price: number;
  selected: boolean;
  quantity?: number;
}

export interface TipSelection {
  type: "percentage" | "custom";
  percentage?: number; // 10, 15, 20, etc.
  customAmount?: number;
  appliesTo: "stay_total" | "selected_services";
}

export interface YipyyGoFormData {
  bookingId: number | string;
  clientId: number;
  petId: number;
  petName: string;
  facilityId: number;
  
  // Form sections
  belongings: BelongingItem[];
  belongingsPhotoUrl?: string;
  
  feedingInstructions?: FeedingInstruction;
  
  medications: MedicationItem[];
  noMedications: boolean;
  
  behaviorNotes?: BehaviorNotes;
  
  addOns: YipyyGoAddOn[];
  
  tip?: TipSelection;
  
  // Metadata
  submittedAt?: string;
  submittedBy?: number; // Client ID
  isLocked: boolean; // Locked after deadline
  deadline: string; // ISO date string
  canEdit: boolean; // Based on deadline

  // Staff review (facility side)
  staffStatus?: "approved" | "needs_review" | "corrections_requested";
  reviewedAt?: string;
  reviewedBy?: number; // Staff user ID
  requestChangesMessage?: string; // Message sent to customer when requesting changes
  internalEditReason?: string; // Required when staff edits internally
  manuallyCompletedAt?: string; // When staff marked complete without customer submission
  manuallyCompletedBy?: number;

  /** QR Code Fast-Track Check-In: secure token (booking_id + pet_id + token, no PII) */
  qrCheckInToken?: string;
}

// ============================================================================
// Verification Code Types
// ============================================================================

export interface YipyyGoVerificationCode {
  code: string;
  bookingId: number | string;
  email?: string;
  phone?: string;
  expiresAt: string; // ISO date string
  attempts: number;
  maxAttempts: number;
}

// ============================================================================
// Mock Data – example pre-check forms for facility dashboard demo
// ============================================================================

const mockYipyyGoForms: YipyyGoFormData[] = [
  // Submitted – pending staff review (shows in YipyyGo Pending widget)
  {
    bookingId: 3,
    clientId: 16,
    petId: 3,
    petName: "Max",
    facilityId: 11,
    belongings: [
      { id: "b1", type: "food", quantity: 2, notes: "Pre-portioned bags for 2 days" },
      { id: "b2", type: "bedding", notes: "Favorite blanket" },
      { id: "b3", type: "leash_collar" },
    ],
    feedingInstructions: {
      foodType: "Blue Buffalo Adult",
      portionSize: "1.5",
      portionUnit: "cups",
      feedingSchedule: [{ time: "08:00", amount: "3/4 cup" }, { time: "18:00", amount: "3/4 cup" }],
      notes: "Add warm water to soften",
    },
    medications: [],
    noMedications: true,
    behaviorNotes: {
      energyLevel: "high",
      socialization: { withDogs: "friendly", withHumans: "friendly" },
      specialNotes: "Loves fetch, can be vocal when excited",
    },
    addOns: [
      { id: "ao1", name: "Extra playtime", price: 10, selected: true, quantity: 1 },
      { id: "ao2", name: "Treat package", price: 5, selected: false },
    ],
    tip: { type: "percentage", percentage: 15, appliesTo: "stay_total" },
    isLocked: false,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canEdit: true,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    submittedBy: 16,
    qrCheckInToken: "qr_demo_3",
  },
  // Needs review – corrections requested (shows in YipyyGo Pending)
  {
    bookingId: 4,
    clientId: 28,
    petId: 13,
    petName: "Luna",
    facilityId: 11,
    belongings: [
      { id: "b1", type: "food", quantity: 1, notes: "Grain-free only" },
      { id: "b2", type: "medication_bag", notes: "Daily allergy pill" },
    ],
    feedingInstructions: {
      foodType: "Acana Grain-Free",
      portionSize: "1",
      portionUnit: "cups",
      feedingSchedule: [{ time: "07:30", amount: "1/2 cup" }, { time: "17:30", amount: "1/2 cup" }],
    },
    medications: [
      {
        id: "med1",
        name: "Apoquel",
        dosage: "16mg",
        frequency: "once daily",
        times: ["08:00"],
        method: "with_food",
        methodNotes: "Give with breakfast",
      },
    ],
    noMedications: false,
    behaviorNotes: {
      energyLevel: "medium",
      socialization: { withDogs: "selective", withHumans: "friendly" },
      specialNotes: "Allergic to chicken. Grain-free diet only.",
    },
    addOns: [
      { id: "ao1", name: "Extra playtime", price: 10, selected: true },
      { id: "ao2", name: "Ice cream treat", price: 3, selected: true },
    ],
    tip: { type: "custom", customAmount: 10, appliesTo: "stay_total" },
    isLocked: false,
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    canEdit: true,
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    submittedBy: 28,
    staffStatus: "corrections_requested",
    reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reviewedBy: 1,
    requestChangesMessage: "Please upload a photo of the Apoquel label and confirm the 16mg dosage.",
    qrCheckInToken: "qr_demo_4",
  },
  // Approved – already reviewed
  {
    bookingId: 5,
    clientId: 15,
    petId: 2,
    petName: "Whiskers",
    facilityId: 11,
    belongings: [
      { id: "b1", type: "food", quantity: 1 },
      { id: "b2", type: "toys", notes: "Favorite mouse toy" },
    ],
    feedingInstructions: {
      foodType: "Royal Canin Indoor",
      portionSize: "1/4",
      portionUnit: "cups",
      feedingSchedule: [{ time: "09:00", amount: "1/8 cup" }, { time: "18:00", amount: "1/8 cup" }],
    },
    medications: [],
    noMedications: true,
    behaviorNotes: {
      energyLevel: "low",
      socialization: { withDogs: "unknown", withHumans: "shy" },
      specialNotes: "Prefers quiet corners. Sensitive to loud noises.",
    },
    addOns: [],
    isLocked: false,
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    canEdit: true,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    submittedBy: 15,
    staffStatus: "approved",
    reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedBy: 1,
    qrCheckInToken: "qr_demo_5",
  },
  // Incomplete – form started but not submitted
  {
    bookingId: 6,
    clientId: 29,
    petId: 14,
    petName: "Riley",
    facilityId: 11,
    belongings: [{ id: "b1", type: "food", quantity: 2 }],
    feedingInstructions: {
      foodType: "Blue Buffalo",
      portionSize: "1.5",
      portionUnit: "cups",
      feedingSchedule: [{ time: "08:00", amount: "3/4 cup" }],
    },
    medications: [],
    noMedications: true,
    addOns: [{ id: "ao1", name: "Extra playtime", price: 10, selected: false }],
    isLocked: false,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canEdit: true,
    qrCheckInToken: "qr_demo_6",
  },
  // Sent – link sent, minimal/empty form (shows "Sent")
  {
    bookingId: 12,
    clientId: 15,
    petId: 1,
    petName: "Buddy",
    facilityId: 11,
    belongings: [],
    medications: [],
    noMedications: true,
    addOns: [
      { id: "ao1", name: "Nail Grinding", price: 15, selected: false },
      { id: "ao2", name: "Teeth Brushing", price: 10, selected: false },
    ],
    isLocked: false,
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    canEdit: true,
    qrCheckInToken: "qr_demo_12",
  },
];

const mockVerificationCodes: YipyyGoVerificationCode[] = [];

// ============================================================================
// Utility Functions
// ============================================================================

/** Display status for staff UI: Not Sent / Sent / Incomplete / Submitted / Approved / Needs Review / PreCheck Missing */
export type YipyyGoDisplayStatus =
  | "not_sent"
  | "sent"
  | "incomplete"
  | "submitted"
  | "approved"
  | "needs_review"
  | "precheck_missing";

export function getYipyyGoForm(bookingId: number | string, petId?: number): YipyyGoFormData | null {
  const list = mockYipyyGoForms.filter((f) => f.bookingId === bookingId);
  if (petId != null) {
    const byPet = list.find((f) => f.petId === petId);
    return byPet ?? list[0] ?? null;
  }
  return list[0] ?? null;
}

/** All forms for a booking (for multi-pet: one form per pet). */
export function getYipyyGoFormsByBooking(bookingId: number | string): YipyyGoFormData[] {
  return mockYipyyGoForms.filter((f) => f.bookingId === bookingId);
}

/** Derive display status for a booking (for staff lists and badges). Does not consider mandatory. */
export function getYipyyGoDisplayStatus(bookingId: number | string, _petId?: number): YipyyGoDisplayStatus {
  const form = getYipyyGoForm(bookingId, _petId);
  if (!form) return "not_sent";
  if (form.manuallyCompletedAt) return "approved";
  if (form.staffStatus === "approved") return "approved";
  if (form.staffStatus === "needs_review" || form.staffStatus === "corrections_requested")
    return "needs_review";
  if (form.submittedAt) return "submitted";
  const hasData =
    (form.belongings && form.belongings.length > 0) ||
    (form.feedingInstructions && (form.feedingInstructions.portionSize || form.feedingInstructions.foodType)) ||
    (form.medications && form.medications.length > 0) ||
    (form.behaviorNotes && form.behaviorNotes.energyLevel) ||
    (form.addOns && form.addOns.some((a) => a.selected));
  return hasData ? "incomplete" : "sent";
}

/**
 * Display status for a booking in facility context: when YipyyGo is mandatory and not submitted/approved,
 * returns "precheck_missing" so staff see "PreCheck Missing" and can complete manually or override.
 */
export function getYipyyGoDisplayStatusForBooking(
  bookingId: number | string,
  options: { facilityId: number; service?: string }
): YipyyGoDisplayStatus {
  const base = getYipyyGoDisplayStatus(bookingId);
  if (base === "approved") return base;
  const config = getYipyyGoConfig(options.facilityId);
  if (!config?.enabled || !options.service) return base;
  const svc = options.service.toLowerCase() as "daycare" | "boarding" | "grooming" | "training";
  const serviceConfig = config.serviceConfigs.find((s) => s.serviceType === svc);
  const isMandatory = serviceConfig?.enabled && serviceConfig?.requirement === "mandatory";
  if (isMandatory) return "precheck_missing";
  return base;
}

export function saveYipyyGoForm(formData: YipyyGoFormData): YipyyGoFormData {
  const index = mockYipyyGoForms.findIndex((f) => f.bookingId === formData.bookingId);
  const updated = {
    ...formData,
    submittedAt: formData.submittedAt || new Date().toISOString(),
  };
  
  if (index >= 0) {
    mockYipyyGoForms[index] = updated;
  } else {
    mockYipyyGoForms.push(updated);
  }
  
  return updated;
}

/** Staff actions: update form with review result */
export function updateYipyyGoStaffStatus(
  bookingId: number | string,
  update: {
    staffStatus: "approved" | "needs_review" | "corrections_requested";
    reviewedBy?: number;
    requestChangesMessage?: string;
    internalEditReason?: string;
  }
): YipyyGoFormData | null {
  const form = getYipyyGoForm(bookingId);
  if (!form) return null;
  const updated: YipyyGoFormData = {
    ...form,
    staffStatus: update.staffStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy: update.reviewedBy,
    requestChangesMessage: update.requestChangesMessage,
    internalEditReason: update.internalEditReason,
  };
  return saveYipyyGoForm(updated);
}

/** Staff marks form as manually completed (customer didn't submit) */
export function setYipyyGoManuallyCompleted(
  bookingId: number | string,
  completedBy: number
): YipyyGoFormData | null {
  const form = getYipyyGoForm(bookingId);
  if (!form) return null;
  const updated: YipyyGoFormData = {
    ...form,
    manuallyCompletedAt: new Date().toISOString(),
    manuallyCompletedBy: completedBy,
    staffStatus: "approved",
    reviewedAt: new Date().toISOString(),
    reviewedBy: completedBy,
  };
  return saveYipyyGoForm(updated);
}

/** Create a stub form when staff marks "manually completed" and no form existed (logged for audit). */
export function createStubYipyyGoFormManuallyCompleted(params: {
  bookingId: number | string;
  facilityId: number;
  completedBy: number;
  clientId?: number;
  petId?: number;
  petName?: string;
}): YipyyGoFormData {
  const now = new Date().toISOString();
  const stub: YipyyGoFormData = {
    bookingId: params.bookingId,
    clientId: params.clientId ?? 0,
    petId: params.petId ?? 0,
    petName: params.petName ?? "—",
    facilityId: params.facilityId,
    belongings: [],
    medications: [],
    noMedications: true,
    addOns: [],
    isLocked: false,
    deadline: now,
    canEdit: false,
    manuallyCompletedAt: now,
    manuallyCompletedBy: params.completedBy,
    staffStatus: "approved",
    reviewedAt: now,
    reviewedBy: params.completedBy,
  };
  mockYipyyGoForms.push(stub);
  return stub;
}

export function generateVerificationCode(
  bookingId: number | string,
  email?: string,
  phone?: string
): YipyyGoVerificationCode {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  const verificationCode: YipyyGoVerificationCode = {
    code,
    bookingId,
    email,
    phone,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    attempts: 0,
    maxAttempts: 5,
  };
  
  mockVerificationCodes.push(verificationCode);
  
  // In production, send code via email/SMS
  console.log(`Verification code for booking ${bookingId}: ${code}`);
  
  return verificationCode;
}

export function verifyCode(
  code: string,
  bookingId: number | string
): { valid: boolean; error?: string } {
  const verification = mockVerificationCodes.find(
    (v) => v.bookingId === bookingId && v.code === code
  );
  
  if (!verification) {
    return { valid: false, error: "Invalid code" };
  }
  
  if (new Date(verification.expiresAt) < new Date()) {
    return { valid: false, error: "Code has expired" };
  }
  
  if (verification.attempts >= verification.maxAttempts) {
    return { valid: false, error: "Too many attempts. Please request a new code." };
  }
  
  verification.attempts++;
  
  return { valid: true };
}

export function checkFormDeadline(deadline: string): {
  isPastDeadline: boolean;
  canEdit: boolean;
  timeRemaining?: string;
} {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isPastDeadline = now >= deadlineDate;
  
  if (isPastDeadline) {
    return {
      isPastDeadline: true,
      canEdit: false,
    };
  }
  
  // Calculate time remaining
  const diff = deadlineDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    isPastDeadline: false,
    canEdit: true,
    timeRemaining: `${hours}h ${minutes}m`,
  };
}
