/**
 * YipyyGo Form Data Structures
 * 
 * Defines the data structures for YipyyGo pre-check-in forms
 */

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
// Mock Data
// ============================================================================

const mockYipyyGoForms: YipyyGoFormData[] = [];

const mockVerificationCodes: YipyyGoVerificationCode[] = [];

// ============================================================================
// Utility Functions
// ============================================================================

export function getYipyyGoForm(bookingId: number | string): YipyyGoFormData | null {
  return mockYipyyGoForms.find((f) => f.bookingId === bookingId) || null;
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
