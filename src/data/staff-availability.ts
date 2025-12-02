// Shift Tasks - Tasks assigned to a shift (can be assigned to personnel or just to the shift itself)
export interface ShiftTask {
  id: number;
  shiftId?: number; // Optional - if assigned to a specific shift
  scheduleDate: string; // The date of the shift
  shiftStartTime?: string; // Optional shift time slot
  shiftEndTime?: string;
  taskName: string;
  description: string;
  category:
    | "feeding"
    | "cleaning"
    | "medication"
    | "exercise"
    | "grooming"
    | "admin"
    | "other";
  priority: "low" | "medium" | "high" | "urgent";
  assignedToStaffId?: number | null; // null = unassigned (anyone on shift can do it)
  assignedToStaffName?: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt?: string;
  completedByStaffId?: number;
  completedByStaffName?: string;
  notes?: string;
  requiresPhoto: boolean;
  photoUrl?: string;
  facility: string;
}

export const shiftTasks: ShiftTask[] = [
  {
    id: 1,
    scheduleDate: "2025-11-15",
    shiftStartTime: "06:00",
    shiftEndTime: "14:00",
    taskName: "Morning Feeding - All Kennels",
    description:
      "Feed all boarded pets according to their dietary requirements",
    category: "feeding",
    priority: "high",
    assignedToStaffId: null, // Anyone on shift
    assignedToStaffName: null,
    status: "completed",
    completedAt: "2025-11-15T07:30:00",
    completedByStaffId: 7,
    completedByStaffName: "David Wilson",
    requiresPhoto: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    scheduleDate: "2025-11-15",
    shiftStartTime: "06:00",
    shiftEndTime: "14:00",
    taskName: "Kennel Deep Clean - Section A",
    description: "Deep clean and sanitize kennels A1-A10",
    category: "cleaning",
    priority: "high",
    assignedToStaffId: 7,
    assignedToStaffName: "David Wilson",
    status: "completed",
    completedAt: "2025-11-15T10:00:00",
    completedByStaffId: 7,
    completedByStaffName: "David Wilson",
    requiresPhoto: true,
    photoUrl: "/uploads/cleaning-a-section.jpg",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    scheduleDate: "2025-11-15",
    shiftStartTime: "08:00",
    shiftEndTime: "16:00",
    taskName: "Medication - Bella (K-5)",
    description: "Administer heart medication to Bella - 1 tablet with food",
    category: "medication",
    priority: "urgent",
    assignedToStaffId: 2,
    assignedToStaffName: "Manager One",
    status: "completed",
    completedAt: "2025-11-15T08:45:00",
    completedByStaffId: 2,
    completedByStaffName: "Manager One",
    requiresPhoto: true,
    photoUrl: "/uploads/bella-med.jpg",
    notes: "Bella took medication well with breakfast",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    scheduleDate: "2025-11-15",
    shiftStartTime: "10:00",
    shiftEndTime: "18:00",
    taskName: "Afternoon Play Session",
    description: "Supervised group play for daycare dogs - Group B",
    category: "exercise",
    priority: "medium",
    assignedToStaffId: null,
    assignedToStaffName: null,
    status: "pending",
    requiresPhoto: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    scheduleDate: "2025-11-15",
    shiftStartTime: "14:00",
    shiftEndTime: "22:00",
    taskName: "Evening Feeding",
    description: "Feed all boarded pets their evening meal",
    category: "feeding",
    priority: "high",
    assignedToStaffId: null,
    assignedToStaffName: null,
    status: "pending",
    requiresPhoto: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    scheduleDate: "2025-11-16",
    shiftStartTime: "08:00",
    shiftEndTime: "16:00",
    taskName: "Inventory Check",
    description: "Check and document food and supply levels",
    category: "admin",
    priority: "low",
    assignedToStaffId: 6,
    assignedToStaffName: "Emily Davis",
    status: "pending",
    requiresPhoto: false,
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    scheduleDate: "2025-11-16",
    shiftStartTime: "08:00",
    shiftEndTime: "16:00",
    taskName: "Grooming - Max (K-3)",
    description: "Basic grooming - brush and nail trim for Max",
    category: "grooming",
    priority: "medium",
    assignedToStaffId: null,
    assignedToStaffName: null,
    status: "pending",
    requiresPhoto: true,
    facility: "Paws & Play Daycare",
  },
];

// Shift Swap Requests
export interface ShiftSwapRequest {
  id: number;
  requestingStaffId: number;
  requestingStaffName: string;
  requestingShiftId: number;
  requestingShiftDate: string;
  requestingShiftTime: string; // e.g., "08:00 - 16:00"
  targetStaffId?: number; // Optional - if requesting swap with specific person
  targetStaffName?: string;
  targetShiftId?: number;
  targetShiftDate?: string;
  targetShiftTime?: string;
  reason: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  requestedAt: string;
  reviewedByStaffId?: number;
  reviewedByStaffName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  facility: string;
}

export const shiftSwapRequests: ShiftSwapRequest[] = [
  {
    id: 1,
    requestingStaffId: 5,
    requestingStaffName: "Mike Chen",
    requestingShiftId: 20,
    requestingShiftDate: "2025-11-15",
    requestingShiftTime: "09:00 - 17:00",
    targetStaffId: 6,
    targetStaffName: "Emily Davis",
    targetShiftId: 26,
    targetShiftDate: "2025-11-15",
    targetShiftTime: "08:00 - 16:00",
    reason: "Have a doctor's appointment in the afternoon",
    status: "approved",
    requestedAt: "2025-11-13T10:00:00",
    reviewedByStaffId: 2,
    reviewedByStaffName: "Manager One",
    reviewedAt: "2025-11-13T14:30:00",
    reviewNotes: "Both parties agreed. Swap confirmed.",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    requestingStaffId: 7,
    requestingStaffName: "David Wilson",
    requestingShiftId: 31,
    requestingShiftDate: "2025-11-16",
    requestingShiftTime: "14:00 - 22:00",
    targetStaffId: undefined,
    targetStaffName: undefined,
    targetShiftId: undefined,
    targetShiftDate: "2025-11-17",
    targetShiftTime: undefined,
    reason: "Family event on Saturday evening",
    status: "pending",
    requestedAt: "2025-11-14T09:00:00",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    requestingStaffId: 9,
    requestingStaffName: "Tom Anderson",
    requestingShiftId: 36,
    requestingShiftDate: "2025-11-15",
    requestingShiftTime: "12:00 - 20:00",
    targetStaffId: 8,
    targetStaffName: "Lisa Rodriguez",
    targetShiftId: 34,
    targetShiftDate: "2025-11-15",
    targetShiftTime: "11:00 - 19:00",
    reason: "Need to leave an hour earlier",
    status: "denied",
    requestedAt: "2025-11-12T16:00:00",
    reviewedByStaffId: 2,
    reviewedByStaffName: "Manager One",
    reviewedAt: "2025-11-13T08:00:00",
    reviewNotes:
      "Lisa is not available for the extra hour. Please find another arrangement.",
    facility: "Paws & Play Daycare",
  },
];

// Sick Call-ins
export interface SickCallIn {
  id: number;
  staffId: number;
  staffName: string;
  shiftId: number;
  shiftDate: string;
  shiftTime: string;
  calledInAt: string;
  reason: string;
  expectedReturnDate?: string;
  coverageStatus: "needs_coverage" | "covered" | "cancelled_shift";
  coveredByStaffId?: number;
  coveredByStaffName?: string;
  approvedByStaffId?: number;
  approvedByStaffName?: string;
  notes?: string;
  facility: string;
}

export const sickCallIns: SickCallIn[] = [
  {
    id: 1,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    shiftId: 35,
    shiftDate: "2025-11-17",
    shiftTime: "11:00 - 19:00",
    calledInAt: "2025-11-17T06:30:00",
    reason: "Stomach flu",
    expectedReturnDate: "2025-11-19",
    coverageStatus: "covered",
    coveredByStaffId: 9,
    coveredByStaffName: "Tom Anderson",
    approvedByStaffId: 2,
    approvedByStaffName: "Manager One",
    notes: "Tom volunteered to cover. Get well soon!",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 6,
    staffName: "Emily Davis",
    shiftId: 29,
    shiftDate: "2025-11-18",
    shiftTime: "08:00 - 16:00",
    calledInAt: "2025-11-18T05:45:00",
    reason: "Migraine",
    expectedReturnDate: "2025-11-19",
    coverageStatus: "needs_coverage",
    approvedByStaffId: 1,
    approvedByStaffName: "Admin User",
    facility: "Paws & Play Daycare",
  },
];

// Staff Availability
export interface StaffAvailability {
  id: number;
  staffId: number;
  staffName: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  facility: string;
}

export const staffAvailability: StaffAvailability[] = [
  // Admin User - Full availability weekdays
  {
    id: 1,
    staffId: 1,
    staffName: "Admin User",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 1,
    staffName: "Admin User",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    staffId: 1,
    staffName: "Admin User",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 1,
    staffName: "Admin User",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 1,
    staffName: "Admin User",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // Manager One - Weekdays with some weekend availability
  {
    id: 6,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 1,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 2,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 8,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 3,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 9,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 4,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 10,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 5,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 11,
    staffId: 2,
    staffName: "Manager One",
    dayOfWeek: 6,
    startTime: "09:00",
    endTime: "14:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // Mike Chen - Flexible schedule
  {
    id: 12,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 1,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 13,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 2,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 14,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 3,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 15,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 4,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 16,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 5,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 17,
    staffId: 3,
    staffName: "Mike Chen",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: "12:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // Emily Davis - Part-time
  {
    id: 18,
    staffId: 5,
    staffName: "Emily Davis",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 19,
    staffId: 5,
    staffName: "Emily Davis",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 20,
    staffId: 5,
    staffName: "Emily Davis",
    dayOfWeek: 3,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 21,
    staffId: 5,
    staffName: "Emily Davis",
    dayOfWeek: 5,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // David Wilson - Evening shifts
  {
    id: 22,
    staffId: 7,
    staffName: "David Wilson",
    dayOfWeek: 1,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 23,
    staffId: 7,
    staffName: "David Wilson",
    dayOfWeek: 2,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 24,
    staffId: 7,
    staffName: "David Wilson",
    dayOfWeek: 3,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 25,
    staffId: 7,
    staffName: "David Wilson",
    dayOfWeek: 4,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 26,
    staffId: 7,
    staffName: "David Wilson",
    dayOfWeek: 5,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // Lisa Rodriguez - Weekend focused
  {
    id: 27,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    dayOfWeek: 4,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 28,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    dayOfWeek: 5,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 29,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 30,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },

  // Tom Anderson - New employee, weekdays
  {
    id: 31,
    staffId: 9,
    staffName: "Tom Anderson",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 32,
    staffId: 9,
    staffName: "Tom Anderson",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 33,
    staffId: 9,
    staffName: "Tom Anderson",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 34,
    staffId: 9,
    staffName: "Tom Anderson",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
  {
    id: 35,
    staffId: 9,
    staffName: "Tom Anderson",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Paws & Play Daycare",
  },
];

// Time-off Requests
export interface TimeOffRequest {
  id: number;
  staffId: number;
  staffName: string;
  type: "vacation" | "sick" | "personal" | "bereavement" | "other";
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  facility: string;
}

const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

export const timeOffRequests: TimeOffRequest[] = [
  {
    id: 1,
    staffId: 3,
    staffName: "Mike Chen",
    type: "vacation",
    startDate: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(nextMonth.getTime() + 12 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Family vacation to Hawaii",
    status: "approved",
    requestedAt: lastWeek.toISOString().split("T")[0],
    reviewedBy: 1,
    reviewedByName: "Admin User",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Approved. Coverage arranged with Tom.",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 5,
    staffName: "Emily Davis",
    type: "personal",
    startDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Doctor's appointment",
    status: "pending",
    requestedAt: today.toISOString().split("T")[0],
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    staffId: 7,
    staffName: "David Wilson",
    type: "sick",
    startDate: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(lastWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Flu symptoms",
    status: "approved",
    requestedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewedBy: 2,
    reviewedByName: "Manager One",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Get well soon!",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 9,
    staffName: "Tom Anderson",
    type: "vacation",
    startDate: new Date(nextMonth.getTime() + 20 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(nextMonth.getTime() + 25 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Wedding anniversary trip",
    status: "pending",
    requestedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    type: "bereavement",
    startDate: new Date(lastWeek.getTime() - 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(lastWeek.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Family emergency",
    status: "approved",
    requestedAt: new Date(lastWeek.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewedBy: 1,
    reviewedByName: "Admin User",
    reviewedAt: new Date(lastWeek.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Our condolences. Take the time you need.",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    staffId: 5,
    staffName: "Emily Davis",
    type: "vacation",
    startDate: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(nextMonth.getTime() + 18 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reason: "Long weekend getaway",
    status: "denied",
    requestedAt: new Date(lastWeek.getTime() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewedBy: 2,
    reviewedByName: "Manager One",
    reviewedAt: new Date(lastWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes:
      "Sorry, we have too many staff off during this period. Please choose different dates.",
    facility: "Paws & Play Daycare",
  },
];

// Shift Templates for quick scheduling
export interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  roles: string[];
  color: string;
  facility: string;
}

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: 1,
    name: "Morning Opening",
    startTime: "06:00",
    endTime: "14:00",
    roles: ["Staff", "Manager"],
    color: "#3b82f6",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    name: "Day Shift",
    startTime: "08:00",
    endTime: "16:00",
    roles: ["Staff", "Manager", "Admin"],
    color: "#22c55e",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    name: "Mid-Day",
    startTime: "10:00",
    endTime: "18:00",
    roles: ["Staff"],
    color: "#eab308",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    name: "Evening Closing",
    startTime: "14:00",
    endTime: "22:00",
    roles: ["Staff", "Manager"],
    color: "#a855f7",
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    name: "Weekend Short",
    startTime: "09:00",
    endTime: "14:00",
    roles: ["Staff", "Manager"],
    color: "#f97316",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    name: "Weekend Full",
    startTime: "08:00",
    endTime: "18:00",
    roles: ["Staff"],
    color: "#ec4899",
    facility: "Paws & Play Daycare",
  },
];

// Staff Hourly Rates (for cost vs labour reports)
export interface StaffRate {
  id: number;
  staffId: number;
  staffName: string;
  role: string;
  hourlyRate: number;
  overtimeRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  facility: string;
}

export const staffRates: StaffRate[] = [
  {
    id: 1,
    staffId: 1,
    staffName: "Admin User",
    role: "Admin",
    hourlyRate: 35.0,
    overtimeRate: 52.5,
    effectiveFrom: "2025-01-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 2,
    staffName: "Manager One",
    role: "Manager",
    hourlyRate: 28.0,
    overtimeRate: 42.0,
    effectiveFrom: "2025-06-10",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    staffId: 3,
    staffName: "Mike Chen",
    role: "Staff",
    hourlyRate: 18.0,
    overtimeRate: 27.0,
    effectiveFrom: "2025-04-10",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 4,
    staffName: "Sarah Johnson",
    role: "Manager",
    hourlyRate: 30.0,
    overtimeRate: 45.0,
    effectiveFrom: "2025-02-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 5,
    staffName: "Emily Davis",
    role: "Staff",
    hourlyRate: 17.5,
    overtimeRate: 26.25,
    effectiveFrom: "2025-07-22",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    staffId: 7,
    staffName: "David Wilson",
    role: "Staff",
    hourlyRate: 18.5,
    overtimeRate: 27.75,
    effectiveFrom: "2025-09-05",
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    role: "Staff",
    hourlyRate: 19.0,
    overtimeRate: 28.5,
    effectiveFrom: "2025-01-30",
    facility: "Paws & Play Daycare",
  },
  {
    id: 8,
    staffId: 9,
    staffName: "Tom Anderson",
    role: "Staff",
    hourlyRate: 16.5,
    overtimeRate: 24.75,
    effectiveFrom: "2025-11-01",
    facility: "Paws & Play Daycare",
  },
];

// Helper functions
export const getShiftTasksForDate = (date: string) =>
  shiftTasks.filter((t) => t.scheduleDate === date);

export const getShiftTasksForShift = (
  date: string,
  startTime: string,
  endTime: string,
) =>
  shiftTasks.filter(
    (t) =>
      t.scheduleDate === date &&
      t.shiftStartTime === startTime &&
      t.shiftEndTime === endTime,
  );

export const getPendingSwapRequests = () =>
  shiftSwapRequests.filter((r) => r.status === "pending");

export const getSickCallInsNeedingCoverage = () =>
  sickCallIns.filter((s) => s.coverageStatus === "needs_coverage");

export const getShiftTaskStats = (date: string) => {
  const tasks = getShiftTasksForDate(date);
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    skipped: tasks.filter((t) => t.status === "skipped").length,
  };
};
