// Section 17: Additional Features Data

// Grooming & Vet Appointment Reminders
export interface AppointmentReminder {
  id: string;
  petId: string;
  petName: string;
  ownerId: string;
  ownerName: string;
  appointmentType: "grooming" | "vet" | "vaccination" | "checkup";
  dueDate: string;
  reminderSent: boolean;
  lastReminderDate?: string;
  notes?: string;
  status: "pending" | "scheduled" | "completed" | "overdue";
}

export const appointmentReminders: AppointmentReminder[] = [
  {
    id: "rem-1",
    petId: "pet-1",
    petName: "Max",
    ownerId: "client-1",
    ownerName: "Sarah Johnson",
    appointmentType: "grooming",
    dueDate: "2024-03-15",
    reminderSent: false,
    status: "pending",
    notes: "Nail trim and bath needed",
  },
  {
    id: "rem-2",
    petId: "pet-2",
    petName: "Luna",
    ownerId: "client-2",
    ownerName: "Michael Chen",
    appointmentType: "vet",
    dueDate: "2024-03-10",
    reminderSent: true,
    lastReminderDate: "2024-03-03",
    status: "scheduled",
    notes: "Annual checkup",
  },
  {
    id: "rem-3",
    petId: "pet-3",
    petName: "Bella",
    ownerId: "client-3",
    ownerName: "Emma Wilson",
    appointmentType: "vaccination",
    dueDate: "2024-02-28",
    reminderSent: true,
    lastReminderDate: "2024-02-21",
    status: "overdue",
    notes: "Rabies booster due",
  },
  {
    id: "rem-4",
    petId: "pet-4",
    petName: "Charlie",
    ownerId: "client-4",
    ownerName: "David Martinez",
    appointmentType: "grooming",
    dueDate: "2024-03-20",
    reminderSent: false,
    status: "pending",
    notes: "Full grooming package",
  },
  {
    id: "rem-5",
    petId: "pet-5",
    petName: "Cooper",
    ownerId: "client-5",
    ownerName: "Lisa Anderson",
    appointmentType: "checkup",
    dueDate: "2024-03-25",
    reminderSent: false,
    status: "pending",
    notes: "Senior dog wellness check",
  },
];

// Live PetCam Integration
export interface PetCam {
  id: string;
  name: string;
  location: string;
  kennelIds: string[];
  streamUrl: string;
  thumbnailUrl: string;
  isOnline: boolean;
  resolution: string;
  hasAudio: boolean;
  hasPanTilt: boolean;
  hasNightVision: boolean;
  accessLevel: "public" | "customers_only" | "staff_only";
}

export const petCams: PetCam[] = [
  {
    id: "cam-1",
    name: "Daycare Play Area - Main",
    location: "Main Facility - Play Room 1",
    kennelIds: [],
    streamUrl: "https://demo.petcam.example/stream/cam1",
    thumbnailUrl: "/placeholder-petcam-1.jpg",
    isOnline: true,
    resolution: "1080p",
    hasAudio: true,
    hasPanTilt: true,
    hasNightVision: false,
    accessLevel: "customers_only",
  },
  {
    id: "cam-2",
    name: "Boarding Suite - Premium",
    location: "Main Facility - Suite Area",
    kennelIds: ["K-101", "K-102", "K-103"],
    streamUrl: "https://demo.petcam.example/stream/cam2",
    thumbnailUrl: "/placeholder-petcam-2.jpg",
    isOnline: true,
    resolution: "1080p",
    hasAudio: false,
    hasPanTilt: false,
    hasNightVision: true,
    accessLevel: "customers_only",
  },
  {
    id: "cam-3",
    name: "Outdoor Play Yard",
    location: "Main Facility - Outdoor Area",
    kennelIds: [],
    streamUrl: "https://demo.petcam.example/stream/cam3",
    thumbnailUrl: "/placeholder-petcam-3.jpg",
    isOnline: true,
    resolution: "720p",
    hasAudio: true,
    hasPanTilt: true,
    hasNightVision: false,
    accessLevel: "customers_only",
  },
  {
    id: "cam-4",
    name: "Kennel Block A",
    location: "Main Facility - Block A",
    kennelIds: ["K-1", "K-2", "K-3", "K-4", "K-5"],
    streamUrl: "https://demo.petcam.example/stream/cam4",
    thumbnailUrl: "/placeholder-petcam-4.jpg",
    isOnline: false,
    resolution: "1080p",
    hasAudio: false,
    hasPanTilt: false,
    hasNightVision: true,
    accessLevel: "staff_only",
  },
];

// Mobile App White-Label Settings
export interface MobileAppSettings {
  appName: string;
  appIcon: string;
  splashScreen: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  iosAppId?: string;
  androidPackageName?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  enablePushNotifications: boolean;
  enableInAppMessaging: boolean;
  enableLiveCamera: boolean;
  enableBookingFlow: boolean;
  enableLoyaltyProgram: boolean;
  customDomain?: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
}

export const mobileAppSettings: MobileAppSettings = {
  appName: "PawCare",
  appIcon: "/app-icon.png",
  splashScreen: "/splash-screen.png",
  primaryColor: "#3B82F6",
  secondaryColor: "#8B5CF6",
  accentColor: "#10B981",
  logoUrl: "/colored-logo.png",
  iosAppId: "com.pawcare.facility",
  androidPackageName: "com.pawcare.facility",
  appStoreUrl: "https://apps.apple.com/app/pawcare",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.pawcare.facility",
  enablePushNotifications: true,
  enableInAppMessaging: true,
  enableLiveCamera: true,
  enableBookingFlow: true,
  enableLoyaltyProgram: true,
  customDomain: "app.pawcare.com",
  termsOfServiceUrl: "https://pawcare.com/terms",
  privacyPolicyUrl: "https://pawcare.com/privacy",
};

// Digital Waivers & E-Signatures
export type WaiverServiceTag =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "vet"
  | "retail"
  | "general";

export type WaiverBlockKind =
  | "heading"
  | "subheading"
  | "paragraph"
  | "bullet"
  | "spacer";

export type WaiverBlockColor =
  | "default"
  | "muted"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "blue"
  | "purple";

export interface WaiverBlock {
  id: string;
  kind: WaiverBlockKind;
  text: string;
  color?: WaiverBlockColor;
  bold?: boolean;
  italic?: boolean;
}

export interface DigitalWaiver {
  id: string;
  name: string;
  /** Primary service tag (legacy, kept for backwards-compat). */
  type: WaiverServiceTag;
  /** All service tags this waiver applies to. Falls back to `[type]` when absent. */
  services?: WaiverServiceTag[];
  /** Legacy plain-text content (rendered when `blocks` is empty). */
  content: string;
  /** Structured rich content. Preferred over `content` when present. */
  blocks?: WaiverBlock[];
  version: string;
  isActive: boolean;
  requiresSignature: boolean;
  /** When true, customers must draw/type a signature (SignaturePad).
   *  When false, a checkbox agreement is sufficient. */
  requireDigitalSignature: boolean;
  requiresWitness: boolean;
  expiryDays?: number;
  /** Category this waiver belongs to. When unset, the manager auto-buckets
   *  by the first matching service category. */
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Reusable preset that can be applied to create a new waiver. */
export interface WaiverTemplate {
  id: string;
  name: string;
  description?: string;
  type: WaiverServiceTag;
  services?: WaiverServiceTag[];
  content: string;
  blocks?: WaiverBlock[];
  // Default settings inherited when applied to a new waiver:
  requiresSignature: boolean;
  requireDigitalSignature: boolean;
  requiresWitness: boolean;
  expiryDays?: number;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

/** A grouping bucket for waivers and templates.
 *  Service categories are derived at runtime from the facility's services
 *  and not stored. Custom categories are persisted. */
export interface WaiverCategory {
  id: string;
  name: string;
  kind: "service" | "custom";
  /** When kind === "service", the matching service tag. */
  serviceTag?: WaiverServiceTag;
  createdAt: string;
}

export interface WaiverSignature {
  id: string;
  waiverId: string;
  waiverName: string;
  clientId: string;
  clientName: string;
  petId?: string;
  petName?: string;
  signatureData: string; // Base64 encoded signature image
  signedAt: string;
  ipAddress: string;
  witnessName?: string;
  witnessSignature?: string;
  status: "valid" | "expired" | "revoked";
  expiresAt?: string;
}

export const digitalWaivers: DigitalWaiver[] = [
  {
    id: "waiver-1",
    name: "Boarding Liability Waiver",
    type: "boarding",
    services: ["boarding"],
    blocks: [
      {
        id: "b1-h",
        kind: "heading",
        text: "Boarding Liability Waiver",
        color: "blue",
        bold: true,
      },
      {
        id: "b1-p1",
        kind: "paragraph",
        text: "I, {{customerName}}, hereby acknowledge that I am the owner or authorized agent of {{petName}} and have authority to execute this agreement with {{facilityName}}.",
      },
      {
        id: "b1-sh1",
        kind: "subheading",
        text: "Terms & Conditions",
        color: "blue",
        bold: true,
      },
      {
        id: "b1-l1",
        kind: "bullet",
        text: "I understand that my pet will be housed with other animals and that despite reasonable care and supervision, there are inherent risks.",
      },
      {
        id: "b1-l2",
        kind: "bullet",
        text: "I agree to hold {{facilityName}} harmless from any illness, injury, or loss that may occur during boarding.",
      },
      {
        id: "b1-l3",
        kind: "bullet",
        text: "I certify that my pet is current on all required vaccinations.",
      },
      {
        id: "b1-l4",
        kind: "bullet",
        text: "I authorize emergency veterinary care if needed, with costs to be borne by me.",
        color: "red",
      },
      {
        id: "b1-l5",
        kind: "bullet",
        text: "I understand that photos/videos of my pet may be taken for operational purposes and shared on social media unless I opt out.",
      },
      {
        id: "b1-sh2",
        kind: "subheading",
        text: "Payment Terms",
        color: "blue",
        bold: true,
      },
      {
        id: "b1-p2",
        kind: "paragraph",
        text: "Full payment is due at pick-up. A 50% deposit is required for bookings over 7 days. Signed on {{date}}.",
        italic: true,
        color: "muted",
      },
    ],
    content: `**Boarding Liability Waiver**\n\nI, the undersigned, hereby acknowledge that I am the owner or authorized agent of the pet(s) listed below.`,
    version: "2.1",
    isActive: true,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    expiryDays: 365,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-02-20T14:30:00Z",
  },
  {
    id: "waiver-2",
    name: "Daycare General Waiver",
    type: "daycare",
    services: ["daycare"],
    content: `**Daycare General Waiver**

By signing below, I agree to the following:

1. My pet is in good health and has not been ill with a communicable condition in the last 30 days.
2. My pet is current on Rabies, DHPP, and Bordetella vaccinations.
3. I understand that daycare involves group play with other dogs and inherent risks exist.
4. I authorize staff to use their discretion in handling my pet and administering first aid if needed.
5. I will pick up my pet by the designated time or incur late fees ($20 per 15 minutes after 7 PM).

**Behavior Agreement:**
If my pet displays aggressive behavior, I understand they may be removed from group play and placed in a separate area. Repeat incidents may result in suspension from daycare services.`,
    version: "1.5",
    isActive: true,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    expiryDays: 180,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-03-01T11:00:00Z",
  },
  {
    id: "waiver-3",
    name: "Grooming Consent Form",
    type: "grooming",
    services: ["grooming"],
    content: `**Grooming Consent Form**

I give permission for PawCare to groom my pet as discussed.

**Services Requested:** [To be specified at booking]

**Acknowledgments:**
1. I understand that grooming may reveal pre-existing skin conditions or other health issues.
2. I acknowledge that matted coats may require shaving and additional fees.
3. I accept that some pets may experience minor skin irritation from grooming products.
4. I will inform staff of any known behavioral issues or sensitivities.
5. I understand that photos may be taken before/after for quality control.

**Medical Authorization:**
If my pet experiences a medical emergency during grooming, I authorize immediate veterinary care at my expense.`,
    version: "1.3",
    isActive: true,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-15T09:00:00Z",
  },
  {
    id: "waiver-4",
    name: "General Terms of Service",
    type: "general",
    services: ["general", "boarding", "daycare", "grooming", "training"],
    content: `**General Terms of Service**

Welcome to PawCare! These terms govern your use of our services.

**Account & Booking:**
- You must provide accurate contact and pet information.
- Cancellations require 48 hours notice or incur a 50% fee.
- Deposits are non-refundable but transferable to future bookings.

**Health & Vaccination:**
- All pets must be current on required vaccinations (Rabies, DHPP, Bordetella).
- Pets showing signs of illness will not be accepted for service.

**Liability:**
- PawCare is not liable for pre-existing conditions, illness, injury, or escape due to pet behavior.
- Owners are liable for any damage or injury caused by their pet.

**Payment:**
- Payment is due at time of service unless otherwise arranged.
- Late pick-up fees: $20 per 15 minutes after closing time.

**Privacy:**
- We collect and store pet and owner information securely. See our Privacy Policy for details.

By using our services, you agree to these terms.`,
    version: "3.0",
    isActive: true,
    requiresSignature: true,
    requireDigitalSignature: false,
    requiresWitness: false,
    expiryDays: 730,
    createdAt: "2023-12-01T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
];

export const waiverSignatures: WaiverSignature[] = [
  {
    id: "sig-1",
    waiverId: "waiver-1",
    waiverName: "Boarding Liability Waiver",
    clientId: "client-1",
    clientName: "Sarah Johnson",
    petId: "pet-1",
    petName: "Max",
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2024-02-15T14:30:00Z",
    ipAddress: "192.168.1.100",
    status: "valid",
    expiresAt: "2025-02-15T14:30:00Z",
  },
  {
    id: "sig-2",
    waiverId: "waiver-2",
    waiverName: "Daycare General Waiver",
    clientId: "client-2",
    clientName: "Michael Chen",
    petId: "pet-2",
    petName: "Luna",
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2024-03-01T10:15:00Z",
    ipAddress: "192.168.1.101",
    status: "valid",
    expiresAt: "2024-08-28T10:15:00Z",
  },
  {
    id: "sig-3",
    waiverId: "waiver-3",
    waiverName: "Grooming Consent Form",
    clientId: "client-3",
    clientName: "Emma Wilson",
    petId: "pet-3",
    petName: "Bella",
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2024-03-05T09:45:00Z",
    ipAddress: "192.168.1.102",
    status: "valid",
  },
  {
    id: "sig-4",
    waiverId: "waiver-1",
    waiverName: "Boarding Liability Waiver",
    clientId: "client-4",
    clientName: "David Martinez",
    petId: "pet-4",
    petName: "Charlie",
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2023-12-15T16:00:00Z",
    ipAddress: "192.168.1.103",
    status: "expired",
    expiresAt: "2024-12-15T16:00:00Z",
  },
];

export const customWaiverCategories: WaiverCategory[] = [
  {
    id: "cat-senior",
    name: "Senior Pet Waivers",
    kind: "custom",
    createdAt: "2024-02-01T10:00:00Z",
  },
];

export const waiverTemplates: WaiverTemplate[] = [
  {
    id: "tpl-boarding-starter",
    name: "Boarding Liability Starter",
    description:
      "Standard liability waiver covering inherent risks, vaccinations, and emergency vet authorization.",
    type: "boarding",
    services: ["boarding"],
    content: `**Boarding Liability Waiver**

I, {{customerName}}, acknowledge that I am the owner of {{petName}} and authorize {{facilityName}} to provide boarding services on {{date}}.

**Terms & Conditions**

- I understand my pet will be housed with other animals.
- I certify my pet is current on all required vaccinations.
- I authorize emergency veterinary care at my expense.
- I agree to pay any late pick-up fees as posted.

**Acknowledgement**

By signing below, I confirm I have read and agree to these terms.`,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    expiryDays: 365,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "tpl-daycare-starter",
    name: "Daycare General Starter",
    description:
      "Group play consent + behavior agreement + late pick-up policy.",
    type: "daycare",
    services: ["daycare"],
    content: `**Daycare General Waiver**

I, {{customerName}}, agree to the terms below for {{petName}} at {{facilityName}}.

- My pet is in good health and current on Rabies, DHPP, and Bordetella.
- I understand daycare involves group play and inherent risks.
- I authorize staff to administer first aid if needed.
- I will pick up my pet by the designated time or accept late fees.

**Behavior Agreement**

If my pet displays aggressive behavior, they may be removed from group play. Repeat incidents may result in suspension from daycare services.`,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    expiryDays: 180,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-10T09:00:00Z",
  },
  {
    id: "tpl-grooming-starter",
    name: "Grooming Consent Starter",
    description:
      "Consent for grooming services including matted-coat policy and emergency authorization.",
    type: "grooming",
    services: ["grooming"],
    content: `**Grooming Consent Form**

I, {{customerName}}, give permission to {{facilityName}} to groom {{petName}} as discussed.

**Acknowledgements**

- I understand grooming may reveal pre-existing skin conditions.
- I acknowledge that matted coats may require shaving and additional fees.
- I will inform staff of any known behavioural issues or sensitivities.

**Medical Authorization**

If my pet experiences a medical emergency during grooming, I authorize immediate veterinary care at my expense.`,
    requiresSignature: true,
    requireDigitalSignature: true,
    requiresWitness: false,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "tpl-general-tos",
    name: "General Terms of Service",
    description: "Catch-all terms covering booking, payment, and liability.",
    type: "general",
    services: ["general"],
    content: `**General Terms of Service**

Welcome to {{facilityName}}. By using our services, you agree to these terms.

**Account & Booking**

- You must provide accurate contact and pet information.
- Cancellations require 48 hours notice or incur a 50% fee.

**Health & Vaccination**

- All pets must be current on required vaccinations.
- Pets showing signs of illness will not be accepted for service.

**Liability**

- {{facilityName}} is not liable for pre-existing conditions or escape due to pet behaviour.
- Owners are liable for any damage or injury caused by their pet.`,
    requiresSignature: true,
    requireDigitalSignature: false,
    requiresWitness: false,
    expiryDays: 730,
    createdAt: "2023-12-01T10:00:00Z",
    updatedAt: "2023-12-01T10:00:00Z",
  },
];

// Staff Conflict Detection
import type { StaffConflict } from "@/types/staff";
export type { StaffConflict, ConflictingBooking } from "@/types/staff";

export const staffConflicts: StaffConflict[] = [
  {
    id: "conflict-1",
    staffId: "staff-2",
    staffName: "Emily Rodriguez",
    conflictType: "double_booking",
    severity: "critical",
    date: "2024-03-15",
    timeSlot: "2:00 PM - 3:30 PM",
    conflictingBookings: [
      {
        bookingId: "BK-12345",
        serviceName: "Dog Grooming - Full Service",
        startTime: "2:00 PM",
        endTime: "3:30 PM",
      },
      {
        bookingId: "BK-12346",
        serviceName: "Dog Grooming - Bath & Brush",
        startTime: "2:30 PM",
        endTime: "3:30 PM",
      },
    ],
    description:
      "Emily is scheduled for two overlapping grooming appointments.",
    recommendation:
      "Reassign BK-12346 to Sarah Johnson or reschedule to 3:30 PM.",
    canAutoResolve: false,
  },
  {
    id: "conflict-2",
    staffId: "staff-4",
    staffName: "Tom Wilson",
    conflictType: "overtime",
    severity: "warning",
    date: "2024-03-16",
    timeSlot: "6:00 PM - 8:00 PM",
    description:
      "Tom's schedule would result in 42 hours this week, exceeding the 40-hour limit.",
    recommendation: "Reduce shift by 2 hours or approve overtime in advance.",
    canAutoResolve: false,
  },
  {
    id: "conflict-3",
    staffId: "staff-3",
    staffName: "Marcus Thompson",
    conflictType: "insufficient_break",
    severity: "warning",
    date: "2024-03-14",
    timeSlot: "11:00 AM - 5:00 PM",
    description:
      "Marcus has no scheduled break during a 6-hour shift (required: 30 min).",
    recommendation:
      "Add 30-minute break at 2:00 PM or adjust appointment times.",
    canAutoResolve: true,
  },
  {
    id: "conflict-4",
    staffId: "staff-5",
    staffName: "Olivia Davis",
    conflictType: "time_off_overlap",
    severity: "critical",
    date: "2024-03-20",
    timeSlot: "9:00 AM - 5:00 PM",
    description:
      "Olivia is scheduled for shifts during approved time-off period (March 20-22).",
    recommendation:
      "Remove all shifts for March 20-22 and reassign appointments.",
    canAutoResolve: false,
  },
  {
    id: "conflict-5",
    staffId: "staff-6",
    staffName: "Jake Miller",
    conflictType: "skill_mismatch",
    severity: "info",
    date: "2024-03-18",
    timeSlot: "10:00 AM - 11:30 AM",
    conflictingBookings: [
      {
        bookingId: "BK-12350",
        serviceName: "Advanced Obedience Training",
        startTime: "10:00 AM",
        endTime: "11:30 AM",
      },
    ],
    description:
      "Jake is assigned to advanced training but only has basic trainer certification.",
    recommendation:
      "Reassign to certified advanced trainer or upgrade Jake's certification.",
    canAutoResolve: false,
  },
];
