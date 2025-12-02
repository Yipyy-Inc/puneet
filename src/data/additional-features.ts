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

// Smart Insights (AI-Driven Analytics)
export interface SmartInsight {
  id: string;
  title: string;
  description: string;
  category: "revenue" | "operations" | "customers" | "staff" | "marketing";
  priority: "high" | "medium" | "low";
  impact: string;
  recommendation: string;
  dataPoints: { label: string; value: string | number }[];
  trend: "up" | "down" | "stable";
  generatedAt: string;
}

export const smartInsights: SmartInsight[] = [
  {
    id: "insight-1",
    title: "Peak Booking Hours Identified",
    description:
      "Your facility receives 65% of bookings between 9 AM - 12 PM on weekdays.",
    category: "operations",
    priority: "medium",
    impact: "Optimize staff scheduling during peak hours",
    recommendation:
      "Schedule 2 additional front desk staff between 9 AM - 12 PM on Mon-Wed.",
    dataPoints: [
      { label: "Peak Bookings", value: "65%" },
      { label: "Time Window", value: "9 AM - 12 PM" },
      { label: "Potential Revenue Increase", value: "$2,400/mo" },
    ],
    trend: "up",
    generatedAt: "2024-03-08T10:00:00Z",
  },
  {
    id: "insight-2",
    title: "Customer Churn Risk Detected",
    description:
      "12 high-value customers haven't booked in 45+ days. Average historical frequency: 2 weeks.",
    category: "customers",
    priority: "high",
    impact: "Risk of losing $8,500 in annual revenue",
    recommendation:
      "Send personalized re-engagement campaign with 15% discount for next booking.",
    dataPoints: [
      { label: "At-Risk Customers", value: 12 },
      { label: "Days Since Last Booking", value: "45+" },
      { label: "Revenue at Risk", value: "$8,500" },
    ],
    trend: "down",
    generatedAt: "2024-03-08T09:30:00Z",
  },
  {
    id: "insight-3",
    title: "Upsell Opportunity: Grooming Add-Ons",
    description:
      "78% of boarding customers add grooming when offered at check-in. Current offer rate: 42%.",
    category: "revenue",
    priority: "high",
    impact: "Potential monthly revenue increase of $3,200",
    recommendation:
      "Train staff to offer grooming add-on to all boarding customers at check-in.",
    dataPoints: [
      { label: "Conversion Rate", value: "78%" },
      { label: "Current Offer Rate", value: "42%" },
      { label: "Potential Revenue", value: "$3,200/mo" },
    ],
    trend: "up",
    generatedAt: "2024-03-07T15:00:00Z",
  },
  {
    id: "insight-4",
    title: "Staff Overtime Trending Up",
    description:
      "Staff overtime hours increased 35% this month. Labor cost exceeding budget by $1,800.",
    category: "staff",
    priority: "high",
    impact: "Increased labor costs affecting profitability",
    recommendation:
      "Review schedule efficiency and consider hiring part-time staff for peak periods.",
    dataPoints: [
      { label: "Overtime Increase", value: "35%" },
      { label: "Over Budget", value: "$1,800" },
      { label: "Avg OT Hours/Week", value: 18 },
    ],
    trend: "up",
    generatedAt: "2024-03-07T11:00:00Z",
  },
  {
    id: "insight-5",
    title: "Email Campaign Performance",
    description:
      "Your 'Spring Special' campaign has 42% open rate - 3x industry average (14%).",
    category: "marketing",
    priority: "medium",
    impact: "Highly engaged customer base",
    recommendation:
      "Replicate this campaign style for upcoming seasonal promotions.",
    dataPoints: [
      { label: "Open Rate", value: "42%" },
      { label: "Industry Average", value: "14%" },
      { label: "Conversions", value: 47 },
    ],
    trend: "up",
    generatedAt: "2024-03-06T14:00:00Z",
  },
  {
    id: "insight-6",
    title: "Optimal Pricing Identified",
    description:
      "Daycare bookings remain stable at current $45/day. Price elasticity testing suggests you can increase to $48 without volume drop.",
    category: "revenue",
    priority: "medium",
    impact: "Potential annual revenue increase of $15,600",
    recommendation: "Test $48 pricing for 30 days with existing customers.",
    dataPoints: [
      { label: "Current Price", value: "$45/day" },
      { label: "Recommended Price", value: "$48/day" },
      { label: "Annual Impact", value: "$15,600" },
    ],
    trend: "stable",
    generatedAt: "2024-03-05T10:00:00Z",
  },
];

// Digital Waivers & E-Signatures
export interface DigitalWaiver {
  id: string;
  name: string;
  type: "boarding" | "daycare" | "grooming" | "training" | "general";
  content: string;
  version: string;
  isActive: boolean;
  requiresSignature: boolean;
  requiresWitness: boolean;
  expiryDays?: number;
  createdAt: string;
  updatedAt: string;
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
    content: `**Boarding Liability Waiver**

I, the undersigned, hereby acknowledge that I am the owner or authorized agent of the pet(s) listed below and have authority to execute this agreement.

**Terms & Conditions:**
1. I understand that my pet will be housed with other animals and that despite reasonable care and supervision, there are inherent risks.
2. I agree to hold PawCare harmless from any illness, injury, or loss that may occur during boarding.
3. I certify that my pet is current on all required vaccinations.
4. I authorize emergency veterinary care if needed, with costs to be borne by me.
5. I understand that photos/videos of my pet may be taken for operational purposes and shared on social media unless I opt out.

**Payment Terms:**
Full payment is due at pick-up. A 50% deposit is required for bookings over 7 days.`,
    version: "2.1",
    isActive: true,
    requiresSignature: true,
    requiresWitness: false,
    expiryDays: 365,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-02-20T14:30:00Z",
  },
  {
    id: "waiver-2",
    name: "Daycare General Waiver",
    type: "daycare",
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
    requiresWitness: false,
    expiryDays: 180,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-03-01T11:00:00Z",
  },
  {
    id: "waiver-3",
    name: "Grooming Consent Form",
    type: "grooming",
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
    requiresWitness: false,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-15T09:00:00Z",
  },
  {
    id: "waiver-4",
    name: "General Terms of Service",
    type: "general",
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

// AI Checkout Recommendations
export interface AIRecommendation {
  id: string;
  type: "upsell" | "cross_sell" | "package_upgrade" | "loyalty_reward";
  title: string;
  description: string;
  originalService: string;
  recommendedItem: {
    id: string;
    name: string;
    price: number;
    discount?: number;
  };
  confidence: number; // 0-100
  reason: string;
  estimatedValue: number;
}

interface CustomerHistory {
  totalVisits?: number;
  lastServices?: string[];
  preferredServices?: string[];
}

export const generateAIRecommendations = (
  bookingServices: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customerHistory?: CustomerHistory,
): AIRecommendation[] => {
  const recommendations: AIRecommendation[] = [];

  // Example logic
  if (bookingServices.includes("boarding")) {
    recommendations.push({
      id: "rec-1",
      type: "cross_sell",
      title: "Add Nail Trim Service",
      description:
        "Keep your pup looking their best! 85% of boarding customers add this service.",
      originalService: "boarding",
      recommendedItem: {
        id: "service-nail-trim",
        name: "Nail Trim & Filing",
        price: 15,
        discount: 10,
      },
      confidence: 85,
      reason: "High conversion rate for boarding customers",
      estimatedValue: 15,
    });

    recommendations.push({
      id: "rec-2",
      type: "upsell",
      title: "Upgrade to Luxury Suite",
      description:
        "Give your dog extra space and comfort with a suite upgrade - includes webcam access!",
      originalService: "boarding",
      recommendedItem: {
        id: "suite-luxury",
        name: "Luxury Suite Upgrade",
        price: 30,
      },
      confidence: 72,
      reason: "Customer has premium service history",
      estimatedValue: 30,
    });
  }

  if (bookingServices.includes("daycare")) {
    recommendations.push({
      id: "rec-3",
      type: "package_upgrade",
      title: "Save with 10-Day Package",
      description:
        "Book 10 days of daycare and save $45 compared to daily rates.",
      originalService: "daycare",
      recommendedItem: {
        id: "package-daycare-10",
        name: "10-Day Daycare Package",
        price: 405,
        discount: 45,
      },
      confidence: 68,
      reason: "Customer visits 2-3 times per week regularly",
      estimatedValue: 405,
    });
  }

  if (bookingServices.includes("grooming")) {
    recommendations.push({
      id: "rec-4",
      type: "cross_sell",
      title: "Add Teeth Cleaning",
      description:
        "Professional dental cleaning promotes overall health and fresh breath.",
      originalService: "grooming",
      recommendedItem: {
        id: "service-teeth-cleaning",
        name: "Dental Cleaning",
        price: 35,
      },
      confidence: 64,
      reason: "Popular add-on for full grooming appointments",
      estimatedValue: 35,
    });
  }

  return recommendations;
};

// Staff Conflict Detection
export interface StaffConflict {
  id: string;
  staffId: string;
  staffName: string;
  conflictType:
    | "double_booking"
    | "overtime"
    | "insufficient_break"
    | "skill_mismatch"
    | "time_off_overlap";
  severity: "critical" | "warning" | "info";
  date: string;
  timeSlot: string;
  conflictingBookings?: {
    bookingId: string;
    serviceName: string;
    startTime: string;
    endTime: string;
  }[];
  description: string;
  recommendation: string;
  canAutoResolve: boolean;
}

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
