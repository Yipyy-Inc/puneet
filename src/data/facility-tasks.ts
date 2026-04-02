/**
 * Mock task data for the Task Management Center.
 * In production, tasks are auto-generated from booking care instructions.
 */

export interface FacilityTask {
  id: string;
  bookingId: number;
  petId: number;
  petName: string;
  ownerName: string;
  name: string;
  description?: string;
  category: "feeding" | "medication" | "activity" | "care" | "cleanup";
  assignmentType: "specific_staff" | "shift" | "skill_based" | "unassigned";
  requiredSkill?: string;
  assignedToId?: string;
  assignedToName?: string;
  autoAssigned: boolean;
  scheduledDate: string;
  scheduledTime: string;
  shiftPeriod: "morning" | "afternoon" | "evening";
  status: "pending" | "completed" | "overdue" | "skipped";
  isOverdue: boolean;
  isCritical: boolean;
  completedAt?: string;
  completedByName?: string;
  feedback?: string;
  completionNotes?: string;
}

// Today's tasks for the facility
export const facilityTasks: FacilityTask[] = [
  // ── Morning tasks ──
  {
    id: "ft-001",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Feed Buddy — Breakfast",
    description: "1 cup Royal Canin, mix with warm water",
    category: "feeding",
    assignmentType: "shift",
    assignedToId: "staff-1",
    assignedToName: "Jessica M.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "08:00",
    shiftPeriod: "morning",
    status: "completed",
    isOverdue: false,
    isCritical: false,
    completedAt: "2026-04-02T08:05:00Z",
    completedByName: "Jessica M.",
    feedback: "Ate all (100%)",
  },
  {
    id: "ft-002",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Medication — Apoquel 16mg",
    description: "Give with food, not on empty stomach",
    category: "medication",
    assignmentType: "shift",
    assignedToId: "staff-1",
    assignedToName: "Jessica M.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "08:00",
    shiftPeriod: "morning",
    status: "completed",
    isOverdue: false,
    isCritical: true,
    completedAt: "2026-04-02T08:10:00Z",
    completedByName: "Jessica M.",
    feedback: "Given",
  },
  {
    id: "ft-003",
    bookingId: 17,
    petId: 22,
    petName: "Max",
    ownerName: "Bob Smith",
    name: "Feed Max — Breakfast",
    description: "1.5 cups Hills Science Diet",
    category: "feeding",
    assignmentType: "shift",
    assignedToId: "staff-2",
    assignedToName: "Amy C.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "08:00",
    shiftPeriod: "morning",
    status: "completed",
    isOverdue: false,
    isCritical: false,
    completedAt: "2026-04-02T08:20:00Z",
    completedByName: "Amy C.",
    feedback: "Ate some (50%)",
    completionNotes: "Only ate half, seemed off. Monitor throughout the day.",
  },
  {
    id: "ft-004",
    bookingId: 2,
    petId: 19,
    petName: "Bella",
    ownerName: "John Doe",
    name: "Nail Trim — Bella",
    category: "activity",
    assignmentType: "skill_based",
    requiredSkill: "nail_trim",
    assignedToId: "staff-2",
    assignedToName: "Amy C.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "09:00",
    shiftPeriod: "morning",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-005",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Massage Session — Buddy",
    description: "30-minute relaxation massage",
    category: "activity",
    assignmentType: "skill_based",
    requiredSkill: "massage",
    assignedToId: "staff-5",
    assignedToName: "Sarah K.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "10:00",
    shiftPeriod: "morning",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-006",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Eye Drops — Buddy",
    description: "2 drops per eye, hold gently, reward after",
    category: "medication",
    assignmentType: "shift",
    assignedToId: "staff-2",
    assignedToName: "Amy C.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "08:00",
    shiftPeriod: "morning",
    status: "overdue",
    isOverdue: true,
    isCritical: false,
  },

  // ── Afternoon tasks ──
  {
    id: "ft-007",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Treats — Buddy",
    description: "2 dental chews",
    category: "feeding",
    assignmentType: "shift",
    assignedToId: "staff-3",
    assignedToName: "Marcus T.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "14:00",
    shiftPeriod: "afternoon",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-008",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Feed Buddy — Dinner",
    description: "1 cup Royal Canin, add medication to food",
    category: "feeding",
    assignmentType: "shift",
    assignedToId: "staff-4",
    assignedToName: "Sophie L.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "18:00",
    shiftPeriod: "afternoon",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-009",
    bookingId: 17,
    petId: 22,
    petName: "Max",
    ownerName: "Bob Smith",
    name: "Feed Max — Dinner",
    description: "1.5 cups Hills Science Diet",
    category: "feeding",
    assignmentType: "shift",
    assignedToId: "staff-4",
    assignedToName: "Sophie L.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "18:00",
    shiftPeriod: "afternoon",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-010",
    bookingId: 1,
    petId: 1,
    petName: "Buddy",
    ownerName: "Alice Johnson",
    name: "Eye Drops — Buddy (PM)",
    description: "2 drops per eye, hold gently, reward after",
    category: "medication",
    assignmentType: "shift",
    assignedToId: "staff-4",
    assignedToName: "Sophie L.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "20:00",
    shiftPeriod: "afternoon",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
  {
    id: "ft-011",
    bookingId: 17,
    petId: 22,
    petName: "Max",
    ownerName: "Bob Smith",
    name: "Walking — Max",
    description: "30-minute walk around the block",
    category: "activity",
    assignmentType: "shift",
    assignedToId: "staff-3",
    assignedToName: "Marcus T.",
    autoAssigned: true,
    scheduledDate: "2026-04-02",
    scheduledTime: "15:00",
    shiftPeriod: "afternoon",
    status: "pending",
    isOverdue: false,
    isCritical: false,
  },
];

export function getTasksForDate(date: string): FacilityTask[] {
  return facilityTasks.filter((t) => t.scheduledDate === date);
}

export function getOverdueTasks(): FacilityTask[] {
  return facilityTasks.filter((t) => t.isOverdue);
}
