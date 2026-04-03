// ── Departments, shifts, and staff schedule ───────────────────────────────────

export interface Department {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface StaffSkills {
  staffId: string;
  staffName: string;
  skills: string[];
  departmentId: string;
}

export interface StaffShiftEntry {
  staffId: string;
  staffName: string;
  day: string; // "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
  shiftId: string;
}

// ── Departments (configurable per facility) ──────────────────────────────────

export const departments: Department[] = [
  {
    id: "dept-boh",
    name: "Back of House",
    color: "blue",
    description: "Pet care, feeding, medication, walking",
  },
  {
    id: "dept-foh",
    name: "Front of House",
    color: "emerald",
    description: "Reception, check-in/out, customer service",
  },
  {
    id: "dept-groom",
    name: "Grooming / Bathing",
    color: "purple",
    description: "Groomers, bathers, nail trimmers",
  },
  {
    id: "dept-sanit",
    name: "Sanitation",
    color: "amber",
    description: "Cleaning, disinfection, laundry",
  },
  {
    id: "dept-train",
    name: "Training",
    color: "orange",
    description: "Obedience, agility, behavior",
  },
];

export const SKILL_OPTIONS = [
  { id: "feeding", label: "Feeding & treats" },
  { id: "medication", label: "Medication administration" },
  { id: "walking", label: "Walking / exercise" },
  { id: "nail_trim", label: "Nail trimming" },
  { id: "grooming_basic", label: "Grooming (basic)" },
  { id: "grooming_full", label: "Grooming (full)" },
  { id: "bathing", label: "Bathing" },
  { id: "pool_supervision", label: "Pool supervision" },
  { id: "massage", label: "Massage / therapy" },
  { id: "transport", label: "Transport / chauffeur" },
  { id: "training_basic", label: "Training (basic obedience)" },
  { id: "training_advanced", label: "Training (advanced)" },
];

export const shifts: ShiftDefinition[] = [
  {
    id: "morning",
    name: "Morning",
    startTime: "06:00",
    endTime: "14:00",
    color: "amber",
  },
  {
    id: "afternoon",
    name: "Afternoon",
    startTime: "14:00",
    endTime: "22:00",
    color: "orange",
  },
  {
    id: "night",
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    color: "blue",
  },
];

export const staffSkills: StaffSkills[] = [
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    departmentId: "dept-boh",
    skills: [
      "feeding",
      "medication",
      "walking",
      "pool_supervision",
      "transport",
      "training_basic",
    ],
  },
  {
    staffId: "staff-2",
    staffName: "Amy C.",
    departmentId: "dept-groom",
    skills: [
      "feeding",
      "medication",
      "nail_trim",
      "grooming_basic",
      "grooming_full",
      "bathing",
    ],
  },
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    departmentId: "dept-boh",
    skills: ["feeding", "walking", "pool_supervision", "transport"],
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    departmentId: "dept-foh",
    skills: ["feeding", "medication", "walking", "bathing"],
  },
  {
    staffId: "staff-5",
    staffName: "Sarah K.",
    departmentId: "dept-groom",
    skills: ["grooming_full", "nail_trim", "bathing", "massage"],
  },
];

export const staffSchedule: StaffShiftEntry[] = [
  // Jessica — Morning, Mon-Fri
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    day: "mon",
    shiftId: "morning",
  },
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    day: "tue",
    shiftId: "morning",
  },
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    day: "wed",
    shiftId: "morning",
  },
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    day: "thu",
    shiftId: "morning",
  },
  {
    staffId: "staff-1",
    staffName: "Jessica M.",
    day: "fri",
    shiftId: "morning",
  },
  // Amy — Morning, Mon-Tue, Thu-Sat
  { staffId: "staff-2", staffName: "Amy C.", day: "mon", shiftId: "morning" },
  { staffId: "staff-2", staffName: "Amy C.", day: "tue", shiftId: "morning" },
  { staffId: "staff-2", staffName: "Amy C.", day: "thu", shiftId: "morning" },
  { staffId: "staff-2", staffName: "Amy C.", day: "fri", shiftId: "morning" },
  { staffId: "staff-2", staffName: "Amy C.", day: "sat", shiftId: "morning" },
  // Marcus — Afternoon, Mon-Fri
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    day: "mon",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    day: "tue",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    day: "wed",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    day: "thu",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-3",
    staffName: "Marcus T.",
    day: "fri",
    shiftId: "afternoon",
  },
  // Sophie — Afternoon, Mon-Wed, Fri-Sun
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "mon",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "tue",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "wed",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "fri",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "sat",
    shiftId: "afternoon",
  },
  {
    staffId: "staff-4",
    staffName: "Sophie L.",
    day: "sun",
    shiftId: "afternoon",
  },
  // Sarah — Morning, Mon, Wed, Fri, Sat
  { staffId: "staff-5", staffName: "Sarah K.", day: "mon", shiftId: "morning" },
  { staffId: "staff-5", staffName: "Sarah K.", day: "wed", shiftId: "morning" },
  { staffId: "staff-5", staffName: "Sarah K.", day: "fri", shiftId: "morning" },
  { staffId: "staff-5", staffName: "Sarah K.", day: "sat", shiftId: "morning" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getShiftForTime(time: string): ShiftDefinition | null {
  const [h] = time.split(":").map(Number);
  return (
    shifts.find((s) => {
      const [sh] = s.startTime.split(":").map(Number);
      const [eh] = s.endTime.split(":").map(Number);
      if (sh < eh) return h >= sh && h < eh;
      return h >= sh || h < eh; // overnight shift
    }) ?? null
  );
}

export function getStaffOnShift(
  date: string,
  shiftId: string,
): StaffShiftEntry[] {
  const d = new Date(date + "T00:00:00");
  const day = DAYS[d.getDay()];
  return staffSchedule.filter((e) => e.day === day && e.shiftId === shiftId);
}

export function getStaffWithSkill(skill: string): StaffSkills[] {
  return staffSkills.filter((s) => s.skills.includes(skill));
}

export function getStaffOnShiftWithSkill(
  date: string,
  shiftId: string,
  skill: string,
): StaffShiftEntry[] {
  const onShift = getStaffOnShift(date, shiftId);
  const qualified = new Set(getStaffWithSkill(skill).map((s) => s.staffId));
  return onShift.filter((e) => qualified.has(e.staffId));
}

export function getStaffDepartment(staffId: string): Department | undefined {
  const staff = staffSkills.find((s) => s.staffId === staffId);
  if (!staff) return undefined;
  return departments.find((d) => d.id === staff.departmentId);
}

export function getStaffByDepartment(departmentId: string): StaffSkills[] {
  return staffSkills.filter((s) => s.departmentId === departmentId);
}
