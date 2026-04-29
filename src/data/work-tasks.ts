// ── Work Task Management ──────────────────────────────────────────────────────
// Staff-facing operational tasks (NOT pet care / daily care tasks).
// Three assignment models:
//   shift    – attached to a shift period; auto-assigned to whoever covers it
//   position – attached to a department/role; all staff in that role see them
//   standalone – one-off tasks assigned to a specific staff member

export type WorkTaskCategory =
  | "opening"
  | "closing"
  | "operations"
  | "cleaning"
  | "customer-service"
  | "admin"
  | "maintenance"
  | "safety"
  | "general";

export type WorkTaskPriority = "low" | "medium" | "high" | "urgent";

export type WorkTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

// ── Task Definition (library entry / template) ────────────────────────────────

export type WorkTaskDefinition = {
  id: string;
  title: string;
  description?: string;
  category: WorkTaskCategory;
  priority: WorkTaskPriority;
  estimatedMinutes: number;
  requiresPhoto: boolean;
  requiresSignoff: boolean;
  isActive: boolean;
  createdAt: string;
};

// ── Shift Task Group ──────────────────────────────────────────────────────────
// A named set of tasks that runs on a given shift.
// daysOfWeek = [] means every day.

export type ShiftTaskGroup = {
  id: string;
  name: string;
  description?: string;
  shiftId: string; // "morning" | "afternoon" | "night"
  shiftName: string;
  daysOfWeek: number[]; // 0=Sun … 6=Sat; empty = every day
  isRecurring: boolean;
  specificDate?: string; // ISO date for one-time groups
  taskIds: string[];
  isActive: boolean;
  createdAt: string;
};

// ── Position Task Group ───────────────────────────────────────────────────────
// A named set of tasks tied to a department/position.

export type PositionTaskGroup = {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  departmentName: string;
  taskIds: string[];
  isActive: boolean;
  createdAt: string;
};

// ── Standalone Task ───────────────────────────────────────────────────────────
// A one-off task assigned directly to a specific staff member.

export type StandaloneTask = {
  id: string;
  title: string;
  description?: string;
  category: WorkTaskCategory;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  assignedToId: string;
  assignedToName: string;
  dueDate: string;
  dueTime?: string;
  estimatedMinutes: number;
  requiresPhoto: boolean;
  requiresSignoff: boolean;
  notes?: string;
  completedAt?: string;
  completedByName?: string;
  createdAt: string;
};

// ── Task Library ──────────────────────────────────────────────────────────────

export const workTaskLibrary: WorkTaskDefinition[] = [
  // Opening
  {
    id: "wtl-001",
    title: "Turn on all computer systems and POS",
    description: "Boot workstations, launch POS software, verify network.",
    category: "opening",
    priority: "high",
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-002",
    title: "Check reservation system for today's bookings",
    description: "Review all check-ins, check-outs, and daycare arrivals expected.",
    category: "opening",
    priority: "high",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-003",
    title: "Safety walkthrough — all areas",
    description: "Walk entire facility. Check for hazards, unlocked areas, water spills.",
    category: "safety",
    priority: "urgent",
    estimatedMinutes: 20,
    requiresPhoto: true,
    requiresSignoff: true,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-004",
    title: "Set up and stock reception desk",
    description: "Ensure intake forms, pens, hand sanitiser, and treat jar are stocked.",
    category: "opening",
    priority: "medium",
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  // Closing
  {
    id: "wtl-005",
    title: "Process end-of-day payments and close registers",
    description: "Reconcile cash drawer, run credit batch, print summary receipt.",
    category: "closing",
    priority: "high",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: true,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-006",
    title: "Send daily summary report to manager",
    description: "Complete end-of-day report including incidents, revenue, and notes.",
    category: "closing",
    priority: "medium",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-007",
    title: "Lock all areas and set security alarm",
    description: "Check all exterior doors, gate locks, and arm the alarm system.",
    category: "closing",
    priority: "urgent",
    estimatedMinutes: 15,
    requiresPhoto: true,
    requiresSignoff: true,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  // Customer Service
  {
    id: "wtl-008",
    title: "Return all missed calls within 1 hour",
    description: "Check voicemail and missed calls log. Follow up with each caller.",
    category: "customer-service",
    priority: "high",
    estimatedMinutes: 30,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-009",
    title: "Respond to email and online inquiries",
    description: "Check shared inbox and online booking requests. Respond within 2 hours.",
    category: "customer-service",
    priority: "medium",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-010",
    title: "Confirm tomorrow's appointments",
    description: "Call or text all bookings for the following day as confirmation reminders.",
    category: "customer-service",
    priority: "medium",
    estimatedMinutes: 25,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  // Cleaning
  {
    id: "wtl-011",
    title: "Mop and sanitize lobby floor",
    description: "Use approved disinfectant solution. Place wet floor signs during drying.",
    category: "cleaning",
    priority: "medium",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-012",
    title: "Clean and restock client bathrooms",
    description: "Wipe surfaces, restock paper towels, soap, and toilet paper.",
    category: "cleaning",
    priority: "medium",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-013",
    title: "Take out trash and recycling",
    description: "Collect all bins and bring to dumpster area. Replace liners.",
    category: "cleaning",
    priority: "low",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  // Admin
  {
    id: "wtl-014",
    title: "Review and update staff attendance log",
    description: "Confirm all clock-ins match schedule. Flag any discrepancies for manager.",
    category: "admin",
    priority: "medium",
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-015",
    title: "Process incoming supply orders",
    description: "Check deliveries against purchase orders. Update inventory system.",
    category: "admin",
    priority: "medium",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-016",
    title: "Complete incident reports from previous shift",
    description: "Document any incidents in the system and notify relevant parties.",
    category: "admin",
    priority: "high",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: true,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  // Maintenance
  {
    id: "wtl-017",
    title: "Equipment function check",
    description: "Test grooming tables, dryers, washers, and kennels for proper operation.",
    category: "maintenance",
    priority: "medium",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-018",
    title: "Outdoor area safety inspection",
    description: "Check fencing, gates, ground surface, and shade structures.",
    category: "safety",
    priority: "high",
    estimatedMinutes: 15,
    requiresPhoto: true,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-019",
    title: "First aid kit inventory check",
    description: "Verify all first aid supplies are stocked and within expiry dates.",
    category: "safety",
    priority: "medium",
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: true,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-020",
    title: "Staff handoff briefing notes",
    description: "Write and post notes for the incoming shift about special cases, open issues.",
    category: "operations",
    priority: "medium",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-021",
    title: "Restock supply closet",
    description: "Refill cleaning products, gloves, and paper goods from back storage.",
    category: "operations",
    priority: "low",
    estimatedMinutes: 15,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-022",
    title: "Review and post next week's staff schedule",
    description: "Confirm no coverage gaps, post to schedule board and staff app.",
    category: "admin",
    priority: "high",
    estimatedMinutes: 30,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-023",
    title: "Client follow-up calls — recent services",
    description: "Call clients whose pets received services in the past 48 hours for satisfaction check.",
    category: "customer-service",
    priority: "low",
    estimatedMinutes: 30,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-024",
    title: "Deep clean grooming station",
    description: "Full disinfection of tables, tubs, tools, and dryers. Document in cleaning log.",
    category: "cleaning",
    priority: "high",
    estimatedMinutes: 45,
    requiresPhoto: true,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "wtl-025",
    title: "Update client records from today",
    description: "Add service notes, update contact details, flag any flags raised during visit.",
    category: "admin",
    priority: "medium",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
];

// ── Shift Task Groups ─────────────────────────────────────────────────────────

export const shiftTaskGroups: ShiftTaskGroup[] = [
  {
    id: "stg-001",
    name: "Morning Opening Checklist",
    description: "Essential tasks to open the facility safely and on time.",
    shiftId: "morning",
    shiftName: "Morning",
    daysOfWeek: [], // every day
    isRecurring: true,
    taskIds: ["wtl-001", "wtl-002", "wtl-003", "wtl-004"],
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "stg-002",
    name: "Evening Closing Checklist",
    description: "Lock-up, register close, and end-of-day reporting.",
    shiftId: "afternoon",
    shiftName: "Afternoon",
    daysOfWeek: [], // every day
    isRecurring: true,
    taskIds: ["wtl-005", "wtl-006", "wtl-007", "wtl-020"],
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "stg-003",
    name: "Weekend Deep Clean",
    description: "Extended cleaning tasks for Saturday and Sunday mornings.",
    shiftId: "morning",
    shiftName: "Morning",
    daysOfWeek: [0, 6], // Sun & Sat
    isRecurring: true,
    taskIds: ["wtl-011", "wtl-012", "wtl-013", "wtl-024"],
    isActive: true,
    createdAt: "2025-01-12T08:00:00Z",
  },
  {
    id: "stg-004",
    name: "Friday Afternoon Admin Block",
    description: "End-of-week admin wrap-up and next-week schedule review.",
    shiftId: "afternoon",
    shiftName: "Afternoon",
    daysOfWeek: [5], // Friday
    isRecurring: true,
    taskIds: ["wtl-014", "wtl-016", "wtl-022"],
    isActive: true,
    createdAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "stg-005",
    name: "Night Safety Round",
    description: "Final safety checks before overnight.",
    shiftId: "night",
    shiftName: "Night",
    daysOfWeek: [],
    isRecurring: true,
    taskIds: ["wtl-003", "wtl-007", "wtl-019"],
    isActive: true,
    createdAt: "2025-02-01T08:00:00Z",
  },
];

// ── Position Task Groups ──────────────────────────────────────────────────────

export const positionTaskGroups: PositionTaskGroup[] = [
  {
    id: "ptg-001",
    name: "Front of House Daily Tasks",
    description: "Core daily responsibilities for all reception / FOH staff.",
    departmentId: "dept-foh",
    departmentName: "Front of House",
    taskIds: ["wtl-008", "wtl-009", "wtl-010", "wtl-025"],
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "ptg-002",
    name: "Sanitation Team Tasks",
    description: "Recurring cleaning duties assigned to all sanitation staff.",
    departmentId: "dept-sanit",
    departmentName: "Sanitation",
    taskIds: ["wtl-011", "wtl-012", "wtl-013", "wtl-021"],
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "ptg-003",
    name: "Grooming Department Standards",
    description: "Post-service cleanup and equipment care for all groomers.",
    departmentId: "dept-groom",
    departmentName: "Grooming / Bathing",
    taskIds: ["wtl-017", "wtl-024"],
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z",
  },
];

// ── Standalone Tasks ──────────────────────────────────────────────────────────

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export const standaloneTasks: StandaloneTask[] = [
  {
    id: "sat-001",
    title: "Order replacement grooming clippers",
    description: "Two sets of Andis clippers from the approved supplier. Include blades.",
    category: "admin",
    priority: "high",
    status: "pending",
    assignedToId: "staff-006",
    assignedToName: "Manager One",
    dueDate: addDays(1),
    dueTime: "12:00",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    notes: "Budget approved. Use PO #2204.",
    createdAt: new Date(today.getTime() - 3600000).toISOString(),
  },
  {
    id: "sat-002",
    title: "Update client waiver forms to 2026 version",
    description: "Replace printed waiver stack at reception and update the digital form.",
    category: "admin",
    priority: "medium",
    status: "pending",
    assignedToId: "staff-004",
    assignedToName: "Sophie L.",
    dueDate: addDays(2),
    dueTime: "17:00",
    estimatedMinutes: 30,
    requiresPhoto: false,
    requiresSignoff: true,
    createdAt: new Date(today.getTime() - 7200000).toISOString(),
  },
  {
    id: "sat-003",
    title: "Fix broken latch on kennel C-7",
    description: "Latch is stiff and needs lubrication or replacement. Do not use until fixed.",
    category: "maintenance",
    priority: "urgent",
    status: "in_progress",
    assignedToId: "staff-003",
    assignedToName: "Marcus T.",
    dueDate: fmt(today),
    dueTime: "14:00",
    estimatedMinutes: 45,
    requiresPhoto: true,
    requiresSignoff: true,
    notes: "Replacement latches are in the supply closet, shelf 3.",
    createdAt: new Date(today.getTime() - 10800000).toISOString(),
  },
  {
    id: "sat-004",
    title: "Train Sophie on new booking software module",
    description: "Walkthrough of the new multi-location booking flow. Est. 1 hour.",
    category: "operations",
    priority: "medium",
    status: "pending",
    assignedToId: "staff-006",
    assignedToName: "Manager One",
    dueDate: addDays(3),
    dueTime: "10:00",
    estimatedMinutes: 60,
    requiresPhoto: false,
    requiresSignoff: false,
    createdAt: new Date(today.getTime() - 86400000).toISOString(),
  },
  {
    id: "sat-005",
    title: "Post Q2 staff performance reviews",
    description: "Upload completed review PDFs to each staff member's profile.",
    category: "admin",
    priority: "medium",
    status: "completed",
    assignedToId: "staff-007",
    assignedToName: "Admin User",
    dueDate: addDays(-1),
    dueTime: "16:00",
    estimatedMinutes: 30,
    requiresPhoto: false,
    requiresSignoff: false,
    completedAt: new Date(today.getTime() - 72000000).toISOString(),
    completedByName: "Admin User",
    createdAt: new Date(today.getTime() - 172800000).toISOString(),
  },
  {
    id: "sat-006",
    title: "Restock first aid supplies",
    description: "Check inventory against checklist and reorder anything below threshold.",
    category: "safety",
    priority: "high",
    status: "pending",
    assignedToId: "staff-001",
    assignedToName: "Jessica M.",
    dueDate: fmt(today),
    dueTime: "15:00",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: true,
    createdAt: new Date(today.getTime() - 43200000).toISOString(),
  },
];
