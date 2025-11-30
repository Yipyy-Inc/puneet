// Task Templates
export interface TaskTemplate {
  id: number;
  name: string;
  category: "boarding" | "daycare" | "cleaning" | "medication" | "grooming" | "general";
  description: string;
  estimatedMinutes: number;
  requiresPhoto: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  isActive: boolean;
}

export const taskTemplates: TaskTemplate[] = [
  {
    id: 1,
    name: "Morning Feeding",
    category: "boarding",
    description: "Feed all boarded pets according to their dietary requirements",
    estimatedMinutes: 30,
    requiresPhoto: false,
    priority: "high",
    isActive: true,
  },
  {
    id: 2,
    name: "Evening Feeding",
    category: "boarding",
    description: "Feed all boarded pets their evening meal",
    estimatedMinutes: 30,
    requiresPhoto: false,
    priority: "high",
    isActive: true,
  },
  {
    id: 3,
    name: "Medication Administration",
    category: "medication",
    description: "Administer prescribed medications to pets",
    estimatedMinutes: 15,
    requiresPhoto: true,
    priority: "urgent",
    isActive: true,
  },
  {
    id: 4,
    name: "Kennel Cleaning",
    category: "cleaning",
    description: "Clean and sanitize all kennels",
    estimatedMinutes: 45,
    requiresPhoto: true,
    priority: "high",
    isActive: true,
  },
  {
    id: 5,
    name: "Play Area Cleaning",
    category: "cleaning",
    description: "Clean and disinfect the play area",
    estimatedMinutes: 30,
    requiresPhoto: false,
    priority: "medium",
    isActive: true,
  },
  {
    id: 6,
    name: "Daycare Check-in",
    category: "daycare",
    description: "Check in arriving daycare pets and verify health status",
    estimatedMinutes: 10,
    requiresPhoto: false,
    priority: "high",
    isActive: true,
  },
  {
    id: 7,
    name: "Group Play Session",
    category: "daycare",
    description: "Supervised group play time for compatible pets",
    estimatedMinutes: 60,
    requiresPhoto: true,
    priority: "medium",
    isActive: true,
  },
  {
    id: 8,
    name: "Individual Walk",
    category: "boarding",
    description: "Take pet for individual walk/exercise",
    estimatedMinutes: 20,
    requiresPhoto: true,
    priority: "medium",
    isActive: true,
  },
  {
    id: 9,
    name: "Bathroom Break",
    category: "daycare",
    description: "Take pets out for bathroom breaks",
    estimatedMinutes: 15,
    requiresPhoto: false,
    priority: "high",
    isActive: true,
  },
  {
    id: 10,
    name: "Water Bowl Refill",
    category: "general",
    description: "Check and refill all water bowls",
    estimatedMinutes: 15,
    requiresPhoto: false,
    priority: "high",
    isActive: true,
  },
  {
    id: 11,
    name: "End of Day Cleaning",
    category: "cleaning",
    description: "Complete thorough end of day facility cleaning",
    estimatedMinutes: 60,
    requiresPhoto: true,
    priority: "high",
    isActive: true,
  },
  {
    id: 12,
    name: "Supply Inventory Check",
    category: "general",
    description: "Check and document supply levels",
    estimatedMinutes: 20,
    requiresPhoto: false,
    priority: "low",
    isActive: true,
  },
];

// Assigned Tasks
export interface StaffTask {
  id: number;
  templateId: number;
  templateName: string;
  category: TaskTemplate["category"];
  description: string;
  assignedTo: number; // staff ID
  assignedToName: string;
  shiftId?: number;
  petId?: number;
  petName?: string;
  priority: TaskTemplate["priority"];
  requiresPhoto: boolean;
  status: "pending" | "in_progress" | "completed" | "skipped";
  dueDate: string;
  dueTime?: string;
  repeatPattern?: "none" | "daily" | "weekly" | "weekdays" | "custom";
  customRepeatDays?: number[]; // 0-6 for Sunday-Saturday
  completedAt?: string;
  completedBy?: number;
  completedByName?: string;
  completedByInitials?: string;
  photoUrl?: string;
  notes?: string;
  facility: string;
}

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

export const staffTasks: StaffTask[] = [
  {
    id: 1,
    templateId: 1,
    templateName: "Morning Feeding",
    category: "boarding",
    description: "Feed all boarded pets according to their dietary requirements",
    assignedTo: 3,
    assignedToName: "Mike Chen",
    priority: "high",
    requiresPhoto: false,
    status: "completed",
    dueDate: today,
    dueTime: "08:00",
    repeatPattern: "daily",
    completedAt: `${today}T08:15:00`,
    completedBy: 3,
    completedByName: "Mike Chen",
    completedByInitials: "MC",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    templateId: 4,
    templateName: "Kennel Cleaning",
    category: "cleaning",
    description: "Clean and sanitize all kennels",
    assignedTo: 5,
    assignedToName: "Emily Davis",
    priority: "high",
    requiresPhoto: true,
    status: "in_progress",
    dueDate: today,
    dueTime: "09:00",
    repeatPattern: "daily",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    templateId: 3,
    templateName: "Medication Administration",
    category: "medication",
    description: "Administer morning medication to Buddy",
    assignedTo: 3,
    assignedToName: "Mike Chen",
    petId: 1,
    petName: "Buddy",
    priority: "urgent",
    requiresPhoto: true,
    status: "completed",
    dueDate: today,
    dueTime: "08:30",
    repeatPattern: "daily",
    completedAt: `${today}T08:25:00`,
    completedBy: 3,
    completedByName: "Mike Chen",
    completedByInitials: "MC",
    photoUrl: "/uploads/medication-proof-1.jpg",
    notes: "Gave 10mg medication with breakfast",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    templateId: 7,
    templateName: "Group Play Session",
    category: "daycare",
    description: "Supervised group play time for small dogs",
    assignedTo: 5,
    assignedToName: "Emily Davis",
    priority: "medium",
    requiresPhoto: true,
    status: "pending",
    dueDate: today,
    dueTime: "10:00",
    repeatPattern: "weekdays",
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    templateId: 8,
    templateName: "Individual Walk",
    category: "boarding",
    description: "Take Max for individual walk",
    assignedTo: 7,
    assignedToName: "David Wilson",
    petId: 2,
    petName: "Max",
    priority: "medium",
    requiresPhoto: true,
    status: "pending",
    dueDate: today,
    dueTime: "11:00",
    repeatPattern: "daily",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    templateId: 2,
    templateName: "Evening Feeding",
    category: "boarding",
    description: "Feed all boarded pets their evening meal",
    assignedTo: 9,
    assignedToName: "Tom Anderson",
    priority: "high",
    requiresPhoto: false,
    status: "pending",
    dueDate: today,
    dueTime: "17:00",
    repeatPattern: "daily",
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    templateId: 11,
    templateName: "End of Day Cleaning",
    category: "cleaning",
    description: "Complete thorough end of day facility cleaning",
    assignedTo: 8,
    assignedToName: "Lisa Rodriguez",
    priority: "high",
    requiresPhoto: true,
    status: "pending",
    dueDate: today,
    dueTime: "18:00",
    repeatPattern: "daily",
    facility: "Paws & Play Daycare",
  },
  {
    id: 8,
    templateId: 10,
    templateName: "Water Bowl Refill",
    category: "general",
    description: "Check and refill all water bowls",
    assignedTo: 3,
    assignedToName: "Mike Chen",
    priority: "high",
    requiresPhoto: false,
    status: "completed",
    dueDate: today,
    dueTime: "12:00",
    repeatPattern: "daily",
    completedAt: `${today}T11:50:00`,
    completedBy: 3,
    completedByName: "Mike Chen",
    completedByInitials: "MC",
    facility: "Paws & Play Daycare",
  },
  {
    id: 9,
    templateId: 9,
    templateName: "Bathroom Break",
    category: "daycare",
    description: "Take daycare pets out for bathroom breaks",
    assignedTo: 5,
    assignedToName: "Emily Davis",
    priority: "high",
    requiresPhoto: false,
    status: "pending",
    dueDate: today,
    dueTime: "14:00",
    repeatPattern: "weekdays",
    facility: "Paws & Play Daycare",
  },
  {
    id: 10,
    templateId: 12,
    templateName: "Supply Inventory Check",
    category: "general",
    description: "Check and document supply levels",
    assignedTo: 2,
    assignedToName: "Manager One",
    priority: "low",
    requiresPhoto: false,
    status: "pending",
    dueDate: tomorrow,
    dueTime: "09:00",
    repeatPattern: "weekly",
    facility: "Paws & Play Daycare",
  },
  // Yesterday's completed tasks for performance tracking
  {
    id: 11,
    templateId: 1,
    templateName: "Morning Feeding",
    category: "boarding",
    description: "Feed all boarded pets according to their dietary requirements",
    assignedTo: 3,
    assignedToName: "Mike Chen",
    priority: "high",
    requiresPhoto: false,
    status: "completed",
    dueDate: yesterday,
    dueTime: "08:00",
    repeatPattern: "daily",
    completedAt: `${yesterday}T08:10:00`,
    completedBy: 3,
    completedByName: "Mike Chen",
    completedByInitials: "MC",
    facility: "Paws & Play Daycare",
  },
  {
    id: 12,
    templateId: 4,
    templateName: "Kennel Cleaning",
    category: "cleaning",
    description: "Clean and sanitize all kennels",
    assignedTo: 5,
    assignedToName: "Emily Davis",
    priority: "high",
    requiresPhoto: true,
    status: "completed",
    dueDate: yesterday,
    dueTime: "09:00",
    repeatPattern: "daily",
    completedAt: `${yesterday}T09:45:00`,
    completedBy: 5,
    completedByName: "Emily Davis",
    completedByInitials: "ED",
    photoUrl: "/uploads/kennel-clean-1.jpg",
    facility: "Paws & Play Daycare",
  },
  {
    id: 13,
    templateId: 7,
    templateName: "Group Play Session",
    category: "daycare",
    description: "Supervised group play time for small dogs",
    assignedTo: 5,
    assignedToName: "Emily Davis",
    priority: "medium",
    requiresPhoto: true,
    status: "completed",
    dueDate: yesterday,
    dueTime: "10:00",
    repeatPattern: "weekdays",
    completedAt: `${yesterday}T11:05:00`,
    completedBy: 5,
    completedByName: "Emily Davis",
    completedByInitials: "ED",
    photoUrl: "/uploads/play-session-1.jpg",
    facility: "Paws & Play Daycare",
  },
  {
    id: 14,
    templateId: 2,
    templateName: "Evening Feeding",
    category: "boarding",
    description: "Feed all boarded pets their evening meal",
    assignedTo: 9,
    assignedToName: "Tom Anderson",
    priority: "high",
    requiresPhoto: false,
    status: "completed",
    dueDate: yesterday,
    dueTime: "17:00",
    repeatPattern: "daily",
    completedAt: `${yesterday}T17:20:00`,
    completedBy: 9,
    completedByName: "Tom Anderson",
    completedByInitials: "TA",
    facility: "Paws & Play Daycare",
  },
  {
    id: 15,
    templateId: 11,
    templateName: "End of Day Cleaning",
    category: "cleaning",
    description: "Complete thorough end of day facility cleaning",
    assignedTo: 8,
    assignedToName: "Lisa Rodriguez",
    priority: "high",
    requiresPhoto: true,
    status: "skipped",
    dueDate: yesterday,
    dueTime: "18:00",
    repeatPattern: "daily",
    notes: "Staff called in sick",
    facility: "Paws & Play Daycare",
  },
];

// Staff Performance Metrics
export interface StaffPerformance {
  staffId: number;
  staffName: string;
  role: string;
  totalTasksAssigned: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksPending: number;
  completionRate: number;
  avgCompletionTimeMinutes: number;
  onTimeCompletions: number;
  lateCompletions: number;
  photoProofCompliance: number; // percentage
}

export const staffPerformance: StaffPerformance[] = [
  {
    staffId: 3,
    staffName: "Mike Chen",
    role: "Staff",
    totalTasksAssigned: 45,
    tasksCompleted: 42,
    tasksSkipped: 1,
    tasksPending: 2,
    completionRate: 93.3,
    avgCompletionTimeMinutes: 18,
    onTimeCompletions: 38,
    lateCompletions: 4,
    photoProofCompliance: 100,
  },
  {
    staffId: 5,
    staffName: "Emily Davis",
    role: "Staff",
    totalTasksAssigned: 38,
    tasksCompleted: 35,
    tasksSkipped: 0,
    tasksPending: 3,
    completionRate: 92.1,
    avgCompletionTimeMinutes: 25,
    onTimeCompletions: 32,
    lateCompletions: 3,
    photoProofCompliance: 95,
  },
  {
    staffId: 7,
    staffName: "David Wilson",
    role: "Staff",
    totalTasksAssigned: 30,
    tasksCompleted: 28,
    tasksSkipped: 1,
    tasksPending: 1,
    completionRate: 93.3,
    avgCompletionTimeMinutes: 22,
    onTimeCompletions: 26,
    lateCompletions: 2,
    photoProofCompliance: 88,
  },
  {
    staffId: 8,
    staffName: "Lisa Rodriguez",
    role: "Staff",
    totalTasksAssigned: 25,
    tasksCompleted: 20,
    tasksSkipped: 3,
    tasksPending: 2,
    completionRate: 80.0,
    avgCompletionTimeMinutes: 30,
    onTimeCompletions: 17,
    lateCompletions: 3,
    photoProofCompliance: 75,
  },
  {
    staffId: 9,
    staffName: "Tom Anderson",
    role: "Staff",
    totalTasksAssigned: 35,
    tasksCompleted: 34,
    tasksSkipped: 0,
    tasksPending: 1,
    completionRate: 97.1,
    avgCompletionTimeMinutes: 15,
    onTimeCompletions: 33,
    lateCompletions: 1,
    photoProofCompliance: 100,
  },
  {
    staffId: 2,
    staffName: "Manager One",
    role: "Manager",
    totalTasksAssigned: 12,
    tasksCompleted: 11,
    tasksSkipped: 0,
    tasksPending: 1,
    completionRate: 91.7,
    avgCompletionTimeMinutes: 20,
    onTimeCompletions: 10,
    lateCompletions: 1,
    photoProofCompliance: 100,
  },
];

// Staff Documents
export interface StaffDocument {
  id: number;
  staffId: number;
  staffName: string;
  name: string;
  type: "certification" | "license" | "training" | "contract" | "id" | "other";
  fileUrl: string;
  uploadedAt: string;
  expiresAt?: string;
  isExpired?: boolean;
  facility: string;
}

export const staffDocuments: StaffDocument[] = [
  {
    id: 1,
    staffId: 1,
    staffName: "Admin User",
    name: "Pet First Aid Certification",
    type: "certification",
    fileUrl: "/documents/cert-first-aid-1.pdf",
    uploadedAt: "2025-01-20",
    expiresAt: "2027-01-20",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 1,
    staffName: "Admin User",
    name: "Professional Pet Care License",
    type: "license",
    fileUrl: "/documents/license-1.pdf",
    uploadedAt: "2025-01-15",
    expiresAt: "2026-01-15",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    staffId: 2,
    staffName: "Manager One",
    name: "Management Training Certificate",
    type: "training",
    fileUrl: "/documents/training-mgmt-2.pdf",
    uploadedAt: "2025-06-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 3,
    staffName: "Mike Chen",
    name: "Pet CPR Certification",
    type: "certification",
    fileUrl: "/documents/cert-cpr-3.pdf",
    uploadedAt: "2025-03-25",
    expiresAt: "2027-03-25",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 3,
    staffName: "Mike Chen",
    name: "Grooming Basics Training",
    type: "training",
    fileUrl: "/documents/training-groom-3.pdf",
    uploadedAt: "2025-04-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    staffId: 4,
    staffName: "Sarah Johnson",
    name: "Senior Pet Care Certification",
    type: "certification",
    fileUrl: "/documents/cert-senior-4.pdf",
    uploadedAt: "2025-02-20",
    expiresAt: "2027-02-20",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    staffId: 5,
    staffName: "Emily Davis",
    name: "Cat Behavior Specialist",
    type: "certification",
    fileUrl: "/documents/cert-cat-5.pdf",
    uploadedAt: "2025-08-01",
    expiresAt: "2027-08-01",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 8,
    staffId: 5,
    staffName: "Emily Davis",
    name: "Employment Contract",
    type: "contract",
    fileUrl: "/documents/contract-5.pdf",
    uploadedAt: "2025-07-22",
    facility: "Paws & Play Daycare",
  },
  {
    id: 9,
    staffId: 7,
    staffName: "David Wilson",
    name: "Medication Administration Training",
    type: "training",
    fileUrl: "/documents/training-med-7.pdf",
    uploadedAt: "2025-09-10",
    facility: "Paws & Play Daycare",
  },
  {
    id: 10,
    staffId: 9,
    staffName: "Tom Anderson",
    name: "Pet First Aid Certification",
    type: "certification",
    fileUrl: "/documents/cert-first-aid-9.pdf",
    uploadedAt: "2025-11-05",
    expiresAt: "2027-11-05",
    isExpired: false,
    facility: "Paws & Play Daycare",
  },
];

// Staff Certifications (simplified view)
export interface StaffCertification {
  id: number;
  staffId: number;
  name: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  status: "valid" | "expiring_soon" | "expired";
}

export const staffCertifications: StaffCertification[] = [
  {
    id: 1,
    staffId: 1,
    name: "Pet First Aid",
    issuedBy: "American Red Cross",
    issuedAt: "2025-01-20",
    expiresAt: "2027-01-20",
    status: "valid",
  },
  {
    id: 2,
    staffId: 1,
    name: "Professional Pet Care License",
    issuedBy: "State Board",
    issuedAt: "2025-01-15",
    expiresAt: "2026-01-15",
    status: "expiring_soon",
  },
  {
    id: 3,
    staffId: 3,
    name: "Pet CPR",
    issuedBy: "Pet Tech",
    issuedAt: "2025-03-25",
    expiresAt: "2027-03-25",
    status: "valid",
  },
  {
    id: 4,
    staffId: 4,
    name: "Senior Pet Care",
    issuedBy: "NAPPS",
    issuedAt: "2025-02-20",
    expiresAt: "2027-02-20",
    status: "valid",
  },
  {
    id: 5,
    staffId: 5,
    name: "Cat Behavior Specialist",
    issuedBy: "IAABC",
    issuedAt: "2025-08-01",
    expiresAt: "2027-08-01",
    status: "valid",
  },
  {
    id: 6,
    staffId: 9,
    name: "Pet First Aid",
    issuedBy: "American Red Cross",
    issuedAt: "2025-11-05",
    expiresAt: "2027-11-05",
    status: "valid",
  },
];
