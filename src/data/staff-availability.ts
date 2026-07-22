// Shift Tasks - Tasks assigned to a shift (can be assigned to personnel or just to the shift itself)
import type {
  ShiftTask,
  ShiftSwapRequest,
  SickCallIn,
  StaffAvailability,
  TimeOffReason,
  TimeOffRequest,
  ShiftTemplate,
} from "@/types/staff";

export type {
  ShiftTask,
  ShiftSwapRequest,
  SickCallIn,
  StaffAvailability,
  TimeOffReason,
  TimeOffRequest,
  ShiftTemplate,
  ShiftTaskCategory,
  SwapRequestStatus,
  SickCoverageStatus,
  TimeOffRequestStatus,
} from "@/types/staff";

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
    completedByStaffId: "fs-daycare-01",
    completedByStaffName: "Sophie Gagnon",
    requiresPhoto: false,
    facility: "Yipyy",
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
    assignedToStaffId: "fs-daycare-01",
    assignedToStaffName: "Sophie Gagnon",
    status: "completed",
    completedAt: "2025-11-15T10:00:00",
    completedByStaffId: "fs-daycare-01",
    completedByStaffName: "Sophie Gagnon",
    requiresPhoto: true,
    photoUrl: "/uploads/cleaning-a-section.jpg",
    facility: "Yipyy",
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
    assignedToStaffId: "fs-mgr-01",
    assignedToStaffName: "Nathalie Côté",
    status: "completed",
    completedAt: "2025-11-15T08:45:00",
    completedByStaffId: "fs-mgr-01",
    completedByStaffName: "Nathalie Côté",
    requiresPhoto: true,
    photoUrl: "/uploads/bella-med.jpg",
    notes: "Bella took medication well with breakfast",
    facility: "Yipyy",
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
    facility: "Yipyy",
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
    facility: "Yipyy",
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
    assignedToStaffId: "fs-groom-02",
    assignedToStaffName: "Julien Roy",
    status: "pending",
    requiresPhoto: false,
    facility: "Yipyy",
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
    facility: "Yipyy",
  },
];

// Shift Swap Requests

export const shiftSwapRequests: ShiftSwapRequest[] = [
  {
    id: 1,
    requestingStaffId: "fs-groom-01",
    requestingStaffName: "Olivia Beaumont",
    requestingShiftId: 20,
    requestingShiftDate: "2025-11-15",
    requestingShiftTime: "09:00 - 17:00",
    targetStaffId: "fs-groom-02",
    targetStaffName: "Julien Roy",
    targetShiftId: 26,
    targetShiftDate: "2025-11-15",
    targetShiftTime: "08:00 - 16:00",
    reason: "Have a doctor's appointment in the afternoon",
    status: "approved",
    requestedAt: "2025-11-13T10:00:00",
    reviewedByStaffId: "fs-mgr-01",
    reviewedByStaffName: "Nathalie Côté",
    reviewedAt: "2025-11-13T14:30:00",
    reviewNotes: "Both parties agreed. Swap confirmed.",
    facility: "Yipyy",
  },
  {
    id: 2,
    requestingStaffId: "fs-daycare-01",
    requestingStaffName: "Sophie Gagnon",
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
    facility: "Yipyy",
  },
  {
    id: 3,
    requestingStaffId: "fs-train-01",
    requestingStaffName: "Marcus Bélanger",
    requestingShiftId: 36,
    requestingShiftDate: "2025-11-15",
    requestingShiftTime: "12:00 - 20:00",
    targetStaffId: "fs-sani-01",
    targetStaffName: "Philippe Dubois",
    targetShiftId: 34,
    targetShiftDate: "2025-11-15",
    targetShiftTime: "11:00 - 19:00",
    reason: "Need to leave an hour earlier",
    status: "denied",
    requestedAt: "2025-11-12T16:00:00",
    reviewedByStaffId: "fs-mgr-01",
    reviewedByStaffName: "Nathalie Côté",
    reviewedAt: "2025-11-13T08:00:00",
    reviewNotes:
      "Lisa is not available for the extra hour. Please find another arrangement.",
    facility: "Yipyy",
  },
];

// Sick Call-ins

export const sickCallIns: SickCallIn[] = [
  {
    id: 1,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
    shiftId: 35,
    shiftDate: "2025-11-17",
    shiftTime: "11:00 - 19:00",
    calledInAt: "2025-11-17T06:30:00",
    reason: "Stomach flu",
    expectedReturnDate: "2025-11-19",
    coverageStatus: "covered",
    coveredByStaffId: "fs-train-01",
    coveredByStaffName: "Marcus Bélanger",
    approvedByStaffId: "fs-mgr-01",
    approvedByStaffName: "Nathalie Côté",
    notes: "Tom volunteered to cover. Get well soon!",
    facility: "Yipyy",
  },
  {
    id: 2,
    staffId: "fs-groom-02",
    staffName: "Julien Roy",
    shiftId: 29,
    shiftDate: "2025-11-18",
    shiftTime: "08:00 - 16:00",
    calledInAt: "2025-11-18T05:45:00",
    reason: "Migraine",
    expectedReturnDate: "2025-11-19",
    coverageStatus: "needs_coverage",
    approvedByStaffId: "fs-owner-01",
    approvedByStaffName: "Émilie Laurent",
    facility: "Yipyy",
  },
];

// Staff Availability

export const staffAvailability: StaffAvailability[] = [
  // Admin User - Full availability weekdays
  {
    id: 1,
    staffId: "fs-owner-01",
    staffName: "Émilie Laurent",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 2,
    staffId: "fs-owner-01",
    staffName: "Émilie Laurent",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 3,
    staffId: "fs-owner-01",
    staffName: "Émilie Laurent",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 4,
    staffId: "fs-owner-01",
    staffName: "Émilie Laurent",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 5,
    staffId: "fs-owner-01",
    staffName: "Émilie Laurent",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // Manager One - Weekdays with some weekend availability
  {
    id: 6,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 1,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 7,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 2,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 8,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 3,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 9,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 4,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 10,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 5,
    startTime: "07:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 11,
    staffId: "fs-mgr-01",
    staffName: "Nathalie Côté",
    dayOfWeek: 6,
    startTime: "09:00",
    endTime: "14:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // Mike Chen - Flexible schedule
  {
    id: 12,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 1,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 13,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 2,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 14,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 3,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 15,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 4,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 16,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 5,
    startTime: "06:00",
    endTime: "15:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 17,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: "12:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // Emily Davis - Part-time
  {
    id: 18,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 19,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 20,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
    dayOfWeek: 3,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 21,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
    dayOfWeek: 5,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // David Wilson - Evening shifts
  {
    id: 22,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
    dayOfWeek: 1,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 23,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
    dayOfWeek: 2,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 24,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
    dayOfWeek: 3,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 25,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
    dayOfWeek: 4,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 26,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
    dayOfWeek: 5,
    startTime: "12:00",
    endTime: "20:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // Lisa Rodriguez - Weekend focused
  {
    id: 27,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
    dayOfWeek: 4,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 28,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
    dayOfWeek: 5,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 29,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 30,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: true,
    facility: "Yipyy",
  },

  // Tom Anderson - New employee, weekdays
  {
    id: 31,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 32,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 33,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 34,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
  {
    id: 35,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
    facility: "Yipyy",
  },
];

// Time-off Request Types (customizable by facility)

// Default time off reasons
export const defaultTimeOffReasons: Omit<TimeOffReason, "facility">[] = [
  {
    id: "vacation",
    name: "Vacation",
    isDefault: true,
    isActive: true,
    requiresApproval: true,
  },
  {
    id: "personal",
    name: "Personal day",
    isDefault: true,
    isActive: true,
    requiresApproval: true,
  },
  {
    id: "sick_planned",
    name: "Sick day (planned)",
    isDefault: true,
    isActive: true,
    requiresApproval: true,
  },
  {
    id: "sick_last_minute",
    name: "Sick day (same-day / last-minute)",
    isDefault: true,
    isActive: true,
    requiresApproval: true,
  },
];

// Time-off Requests

const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

export const timeOffRequests: TimeOffRequest[] = [
  {
    id: 1,
    staffId: "fs-board-01",
    staffName: "Dominic Levesque",
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
    reviewedBy: "fs-owner-01",
    reviewedByName: "Émilie Laurent",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Approved. Coverage arranged with Tom.",
    facility: "Yipyy",
  },
  {
    id: 2,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
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
    facility: "Yipyy",
  },
  {
    id: 3,
    staffId: "fs-daycare-01",
    staffName: "Sophie Gagnon",
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
    reviewedBy: "fs-mgr-01",
    reviewedByName: "Nathalie Côté",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Get well soon!",
    facility: "Yipyy",
  },
  {
    id: 4,
    staffId: "fs-train-01",
    staffName: "Marcus Bélanger",
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
    facility: "Yipyy",
  },
  {
    id: 5,
    staffId: "fs-sani-01",
    staffName: "Philippe Dubois",
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
    reviewedBy: "fs-owner-01",
    reviewedByName: "Émilie Laurent",
    reviewedAt: new Date(lastWeek.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes: "Our condolences. Take the time you need.",
    facility: "Yipyy",
  },
  {
    id: 6,
    staffId: "fs-groom-01",
    staffName: "Olivia Beaumont",
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
    reviewedBy: "fs-mgr-01",
    reviewedByName: "Nathalie Côté",
    reviewedAt: new Date(lastWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reviewNotes:
      "Sorry, we have too many staff off during this period. Please choose different dates.",
    facility: "Yipyy",
  },
];

// Shift Templates for quick scheduling

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: 1,
    name: "Morning Opening",
    startTime: "06:00",
    endTime: "14:00",
    roles: ["Staff", "Manager"],
    color: "#3b82f6",
    facility: "Yipyy",
  },
  {
    id: 2,
    name: "Day Shift",
    startTime: "08:00",
    endTime: "16:00",
    roles: ["Staff", "Manager", "Admin"],
    color: "#22c55e",
    facility: "Yipyy",
  },
  {
    id: 3,
    name: "Mid-Day",
    startTime: "10:00",
    endTime: "18:00",
    roles: ["Staff"],
    color: "#eab308",
    facility: "Yipyy",
  },
  {
    id: 4,
    name: "Evening Closing",
    startTime: "14:00",
    endTime: "22:00",
    roles: ["Staff", "Manager"],
    color: "#a855f7",
    facility: "Yipyy",
  },
  {
    id: 5,
    name: "Weekend Short",
    startTime: "09:00",
    endTime: "14:00",
    roles: ["Staff", "Manager"],
    color: "#f97316",
    facility: "Yipyy",
  },
  {
    id: 6,
    name: "Weekend Full",
    startTime: "08:00",
    endTime: "18:00",
    roles: ["Staff"],
    color: "#ec4899",
    facility: "Yipyy",
  },
];

// Staff Hourly Rates (for cost vs labour reports)
// Helper functions
export const getPendingSwapRequests = () =>
  shiftSwapRequests.filter((r) => r.status === "pending");

export const getSickCallInsNeedingCoverage = () =>
  sickCallIns.filter((s) => s.coverageStatus === "needs_coverage");
