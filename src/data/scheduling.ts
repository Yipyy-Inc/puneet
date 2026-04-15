import type {
  Department,
  Position,
  ScheduleEmployee,
  ScheduleShift,
  SchedulePeriod,
  ScheduleTemplate,
  EnhancedTimeOffRequest,
  EnhancedShiftSwap,
  EmployeeWarning,
  OnboardingTask,
  EmployeeDocument,
  EmployeeAvailability,
  EmployeeDocumentTemplate,
  EmployeeDocumentSubmission,
  ShiftOpportunity,
  ShiftOpportunityNotificationSettings,
  Skill,
  AvailabilityChangeRequest,
  TimeClockEntry,
  CompanyProfile,
  NotificationPreferences,
  BroadcastMessage,
} from "@/types/scheduling";

// ============================================================================
// Skills / Certifications
// ============================================================================

export const skillsCatalog: Skill[] = [
  {
    id: "opener",
    name: "Opener",
    category: "qualification",
    description: "Trained on opening procedures (keys, alarm, register).",
    expires: false,
  },
  {
    id: "closer",
    name: "Closer",
    category: "qualification",
    description: "Trained on closing procedures and cash-out.",
    expires: false,
  },
  {
    id: "med-cert",
    name: "Medication Administration",
    category: "certification",
    description: "Certified to administer medication to boarded pets.",
    expires: true,
    renewalDays: 365,
  },
  {
    id: "cpr",
    name: "Pet First Aid / CPR",
    category: "certification",
    description: "Pet first-aid and CPR certification.",
    expires: true,
    renewalDays: 730,
  },
  {
    id: "grooming-cert",
    name: "Certified Groomer",
    category: "certification",
    description: "Formal grooming certification.",
    expires: false,
  },
  {
    id: "training-cert",
    name: "Dog Training",
    category: "certification",
    description: "Certified dog trainer.",
    expires: false,
  },
  {
    id: "food-safe",
    name: "Food Handler",
    category: "certification",
    description: "Food-safety / food-handler certification.",
    expires: true,
    renewalDays: 1825,
  },
  {
    id: "barista-trained",
    name: "Barista Trained",
    category: "training",
    description: "Completed in-house barista training.",
    expires: false,
  },
  {
    id: "senior-staff",
    name: "Senior Staff",
    category: "qualification",
    description: "Trusted senior staff — can run a shift alone.",
    expires: false,
  },
];

// ============================================================================
// Departments
// ============================================================================

export const departments: Department[] = [
  {
    id: "dept-1",
    name: "Doggieville MTL",
    facilityId: 1,
    color: "#6366f1",
    description: "Main daycare and boarding facility",
    employeeIds: ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5", "emp-6"],
    isActive: true,
    createdAt: "2025-01-15",
  },
  {
    id: "dept-2",
    name: "Ruby Cafe MTL",
    facilityId: 1,
    color: "#ec4899",
    description: "Pet-friendly cafe and grooming lounge",
    employeeIds: ["emp-7", "emp-8", "emp-9", "emp-10"],
    isActive: true,
    createdAt: "2025-02-01",
  },
  {
    id: "dept-3",
    name: "Doggieville Laval",
    facilityId: 1,
    color: "#10b981",
    description: "Laval branch - daycare and training",
    employeeIds: ["emp-11", "emp-12", "emp-13"],
    isActive: true,
    createdAt: "2025-03-15",
  },
];

// ============================================================================
// Positions
// ============================================================================

export const positions: Position[] = [
  {
    id: "pos-1",
    name: "Receptionist",
    departmentId: "dept-1",
    hourlyRate: 18.5,
    payType: "hourly",
    color: "#818cf8",
    description: "Front desk operations",
    isActive: true,
  },
  {
    id: "pos-2",
    name: "Kennel Tech",
    departmentId: "dept-1",
    hourlyRate: 17.0,
    payType: "hourly",
    color: "#34d399",
    description: "Kennel operations and pet care",
    isActive: true,
  },
  {
    id: "pos-3",
    name: "Groomer",
    departmentId: "dept-1",
    hourlyRate: 22.0,
    payType: "hourly",
    color: "#f472b6",
    description: "Professional pet grooming",
    isActive: true,
  },
  {
    id: "pos-4",
    name: "Manager",
    departmentId: "dept-1",
    salary: 55000,
    payType: "salary",
    color: "#fbbf24",
    description: "Facility management",
    isActive: true,
  },
  {
    id: "pos-5",
    name: "Supervisor",
    departmentId: "dept-1",
    hourlyRate: 21.0,
    payType: "hourly",
    color: "#f97316",
    description: "Team supervision",
    isActive: true,
  },
  {
    id: "pos-6",
    name: "BOH (Back of House)",
    departmentId: "dept-1",
    hourlyRate: 16.5,
    payType: "hourly",
    color: "#a78bfa",
    description: "Back of house operations, cleaning, prep",
    isActive: true,
  },
  {
    id: "pos-7",
    name: "Trainer",
    departmentId: "dept-1",
    hourlyRate: 24.0,
    payType: "hourly",
    color: "#2dd4bf",
    description: "Dog training and behavior",
    isActive: true,
  },
  {
    id: "pos-8",
    name: "Barista",
    departmentId: "dept-2",
    hourlyRate: 16.0,
    payType: "hourly",
    color: "#fb923c",
    description: "Cafe service",
    isActive: true,
  },
  {
    id: "pos-9",
    name: "Cafe Manager",
    departmentId: "dept-2",
    salary: 48000,
    payType: "salary",
    color: "#fbbf24",
    description: "Cafe operations management",
    isActive: true,
  },
  {
    id: "pos-10",
    name: "Groomer",
    departmentId: "dept-2",
    hourlyRate: 22.0,
    payType: "hourly",
    color: "#f472b6",
    description: "Grooming at Ruby Cafe",
    isActive: true,
  },
  {
    id: "pos-11",
    name: "Kennel Tech",
    departmentId: "dept-3",
    hourlyRate: 17.0,
    payType: "hourly",
    color: "#34d399",
    description: "Kennel operations - Laval",
    isActive: true,
  },
  {
    id: "pos-12",
    name: "Trainer",
    departmentId: "dept-3",
    hourlyRate: 24.0,
    payType: "hourly",
    color: "#2dd4bf",
    description: "Training - Laval",
    isActive: true,
  },
];

// ============================================================================
// Employees
// ============================================================================

export const scheduleEmployees: ScheduleEmployee[] = [
  {
    id: "emp-1",
    name: "Sarah Johnson",
    email: "sarah@doggieville.com",
    phone: "+1-514-555-0101",
    avatar: "https://i.pravatar.cc/80?u=sarah-johnson-emp1",
    initials: "SJ",
    departmentIds: ["dept-1"],
    positionIds: ["pos-4", "pos-1"],
    primaryPositionId: "pos-4",
    hireDate: "2024-03-15",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Manager",
    skills: ["opener", "closer", "senior-staff", "med-cert", "cpr"],
  },
  {
    id: "emp-2",
    name: "Mike Chen",
    email: "mike@doggieville.com",
    phone: "+1-514-555-0102",
    avatar: "https://i.pravatar.cc/80?u=mike-chen-emp2",
    initials: "MC",
    departmentIds: ["dept-1"],
    positionIds: ["pos-1", "pos-2"],
    primaryPositionId: "pos-1",
    hireDate: "2024-06-01",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Staff",
    skills: ["opener", "closer", "cpr"],
  },
  {
    id: "emp-3",
    name: "Emily Davis",
    email: "emily@doggieville.com",
    phone: "+1-514-555-0103",
    avatar: "https://i.pravatar.cc/80?u=emily-davis-emp3",
    initials: "ED",
    departmentIds: ["dept-1"],
    positionIds: ["pos-3", "pos-6"],
    primaryPositionId: "pos-3",
    hireDate: "2024-07-15",
    status: "active",
    maxHoursPerWeek: 35,
    employmentType: "full_time",
    role: "Staff",
    skills: ["grooming-cert", "med-cert"],
  },
  {
    id: "emp-4",
    name: "David Wilson",
    email: "david@doggieville.com",
    phone: "+1-514-555-0104",
    avatar: "https://i.pravatar.cc/80?u=david-wilson-emp4",
    initials: "DW",
    departmentIds: ["dept-1"],
    positionIds: ["pos-2", "pos-6"],
    primaryPositionId: "pos-2",
    hireDate: "2024-09-01",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Staff",
  },
  {
    id: "emp-5",
    name: "Lisa Rodriguez",
    email: "lisa@doggieville.com",
    phone: "+1-514-555-0105",
    avatar: "https://i.pravatar.cc/80?u=lisa-rodriguez-emp5",
    initials: "LR",
    departmentIds: ["dept-1"],
    positionIds: ["pos-5", "pos-2", "pos-1"],
    primaryPositionId: "pos-5",
    hireDate: "2024-04-20",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Supervisor",
    skills: ["opener", "closer", "senior-staff", "med-cert", "cpr"],
  },
  {
    id: "emp-6",
    name: "Tom Anderson",
    email: "tom@doggieville.com",
    phone: "+1-514-555-0106",
    avatar: "https://i.pravatar.cc/80?u=tom-anderson-emp6",
    initials: "TA",
    departmentIds: ["dept-1"],
    positionIds: ["pos-7", "pos-2"],
    primaryPositionId: "pos-7",
    hireDate: "2025-01-10",
    status: "active",
    maxHoursPerWeek: 30,
    employmentType: "part_time",
    role: "Staff",
    skills: ["training-cert", "cpr"],
  },
  {
    id: "emp-7",
    name: "Sophie Martin",
    email: "sophie@rubycafe.com",
    phone: "+1-514-555-0201",
    avatar: "https://i.pravatar.cc/80?u=sophie-martin-emp7",
    initials: "SM",
    departmentIds: ["dept-2"],
    positionIds: ["pos-9"],
    primaryPositionId: "pos-9",
    hireDate: "2025-02-01",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Manager",
    skills: [
      "opener",
      "closer",
      "senior-staff",
      "food-safe",
      "barista-trained",
    ],
  },
  {
    id: "emp-8",
    name: "Alex Tremblay",
    email: "alex@rubycafe.com",
    phone: "+1-514-555-0202",
    avatar: "https://i.pravatar.cc/80?u=alex-tremblay-emp8",
    initials: "AT",
    departmentIds: ["dept-2"],
    positionIds: ["pos-8", "pos-10"],
    primaryPositionId: "pos-8",
    hireDate: "2025-02-15",
    status: "active",
    maxHoursPerWeek: 35,
    employmentType: "full_time",
    role: "Staff",
    skills: ["food-safe", "barista-trained", "grooming-cert"],
  },
  {
    id: "emp-9",
    name: "Marie Dubois",
    email: "marie@rubycafe.com",
    phone: "+1-514-555-0203",
    avatar: "https://i.pravatar.cc/80?u=marie-dubois-emp9",
    initials: "MD",
    departmentIds: ["dept-2"],
    positionIds: ["pos-10"],
    primaryPositionId: "pos-10",
    hireDate: "2025-03-01",
    status: "active",
    maxHoursPerWeek: 30,
    employmentType: "part_time",
    role: "Staff",
  },
  {
    id: "emp-10",
    name: "James Park",
    email: "james@rubycafe.com",
    phone: "+1-514-555-0204",
    avatar: "https://i.pravatar.cc/80?u=james-park-emp10",
    initials: "JP",
    departmentIds: ["dept-2"],
    positionIds: ["pos-8"],
    primaryPositionId: "pos-8",
    hireDate: "2025-04-01",
    status: "onboarding",
    maxHoursPerWeek: 25,
    employmentType: "part_time",
    role: "Staff",
  },
  {
    id: "emp-11",
    name: "Nadia Lavoie",
    email: "nadia@doggieville.com",
    phone: "+1-450-555-0301",
    avatar: "https://i.pravatar.cc/80?u=nadia-lavoie-emp11",
    initials: "NL",
    departmentIds: ["dept-3"],
    positionIds: ["pos-11"],
    primaryPositionId: "pos-11",
    hireDate: "2025-03-20",
    status: "active",
    maxHoursPerWeek: 40,
    employmentType: "full_time",
    role: "Staff",
  },
  {
    id: "emp-12",
    name: "Omar Hassan",
    email: "omar@doggieville.com",
    phone: "+1-450-555-0302",
    avatar: "https://i.pravatar.cc/80?u=omar-hassan-emp12",
    initials: "OH",
    departmentIds: ["dept-3"],
    positionIds: ["pos-12", "pos-11"],
    primaryPositionId: "pos-12",
    hireDate: "2025-04-05",
    status: "active",
    maxHoursPerWeek: 35,
    employmentType: "full_time",
    role: "Staff",
  },
  {
    id: "emp-13",
    name: "Chloe Gagnon",
    email: "chloe@doggieville.com",
    phone: "+1-450-555-0303",
    avatar: "https://i.pravatar.cc/80?u=chloe-gagnon-emp13",
    initials: "CG",
    departmentIds: ["dept-3"],
    positionIds: ["pos-11"],
    primaryPositionId: "pos-11",
    hireDate: "2025-05-01",
    status: "onboarding",
    maxHoursPerWeek: 25,
    employmentType: "part_time",
    role: "Staff",
  },
];

// ============================================================================
// Helper: Generate shifts for current period
// ============================================================================

function generateWeekShifts(
  weekStartDate: string,
  departmentId: string,
): ScheduleShift[] {
  const shifts: ScheduleShift[] = [];
  const start = new Date(weekStartDate);
  const deptEmployees = scheduleEmployees.filter((e) =>
    e.departmentIds.includes(departmentId),
  );

  const shiftPatterns: Record<
    string,
    { days: number[]; start: string; end: string; posId: string }[]
  > = {
    "emp-1": [
      { days: [1, 2, 3, 4, 5], start: "08:00", end: "16:30", posId: "pos-4" },
    ],
    "emp-2": [
      { days: [1, 2, 3], start: "07:00", end: "15:00", posId: "pos-1" },
      { days: [4, 5], start: "07:00", end: "15:00", posId: "pos-2" },
    ],
    "emp-3": [
      { days: [1, 2, 3, 4], start: "09:00", end: "17:00", posId: "pos-3" },
      { days: [5], start: "09:00", end: "17:00", posId: "pos-6" },
    ],
    "emp-4": [
      {
        days: [1, 2, 3, 4, 5],
        start: "06:30",
        end: "14:30",
        posId: "pos-2",
      },
    ],
    "emp-5": [
      { days: [1, 2, 3], start: "08:00", end: "16:00", posId: "pos-5" },
      { days: [5, 6], start: "10:00", end: "18:00", posId: "pos-2" },
    ],
    "emp-6": [
      { days: [2, 4, 6], start: "10:00", end: "16:00", posId: "pos-7" },
    ],
    "emp-7": [
      { days: [1, 2, 3, 4, 5], start: "08:00", end: "16:30", posId: "pos-9" },
    ],
    "emp-8": [
      { days: [1, 2, 3], start: "07:00", end: "15:00", posId: "pos-8" },
      { days: [4, 5], start: "12:00", end: "18:00", posId: "pos-10" },
    ],
    "emp-9": [
      { days: [1, 3, 5], start: "09:00", end: "17:00", posId: "pos-10" },
    ],
    "emp-10": [{ days: [2, 4], start: "10:00", end: "16:00", posId: "pos-8" }],
    "emp-11": [
      {
        days: [1, 2, 3, 4, 5],
        start: "07:00",
        end: "15:00",
        posId: "pos-11",
      },
    ],
    "emp-12": [
      { days: [1, 3, 5], start: "09:00", end: "17:00", posId: "pos-12" },
      { days: [2, 4], start: "09:00", end: "17:00", posId: "pos-11" },
    ],
    "emp-13": [
      { days: [1, 3, 5], start: "10:00", end: "16:00", posId: "pos-11" },
    ],
  };

  let shiftIndex = 0;
  for (const emp of deptEmployees) {
    const patterns = shiftPatterns[emp.id] || [];
    for (const pattern of patterns) {
      for (const dayOffset of pattern.days) {
        const shiftDate = new Date(start);
        shiftDate.setDate(start.getDate() + dayOffset);
        const dateStr = shiftDate.toISOString().split("T")[0];

        shifts.push({
          id: `shift-${departmentId}-${emp.id}-${dateStr}-${shiftIndex++}`,
          employeeId: emp.id,
          departmentId,
          positionId: pattern.posId,
          date: dateStr,
          startTime: pattern.start,
          endTime: pattern.end,
          breakMinutes: 30,
          status: "published",
        });
      }
    }
  }

  return shifts;
}

// Generate 4 weeks of shifts for each department
function generateAllShifts(): ScheduleShift[] {
  const allShifts: ScheduleShift[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  for (let weekOffset = -1; weekOffset < 3; weekOffset++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset + weekOffset * 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    for (const dept of departments) {
      const weekShifts = generateWeekShifts(weekStartStr, dept.id);
      // Current week is published, future weeks are drafts
      if (weekOffset > 0) {
        weekShifts.forEach((s) => (s.status = "draft"));
      }
      allShifts.push(...weekShifts);
    }
  }

  return allShifts;
}

export const scheduleShifts: ScheduleShift[] = generateAllShifts();

// ============================================================================
// Time Clock Entries (mock attendance for past shifts)
// ============================================================================

/**
 * Generate plausible time-clock entries for shifts that fall before "today",
 * mixing on-time, late, early-leave, and a no-show for realistic variance.
 */
function generateTimeClockEntries(): TimeClockEntry[] {
  const entries: TimeClockEntry[] = [];
  const todayStr = new Date().toISOString().split("T")[0];
  const pastShifts = scheduleShifts
    .filter(
      (s) => s.date < todayStr && s.employeeId && s.status !== "cancelled",
    )
    .slice(0, 80); // cap to keep mock data reasonable

  pastShifts.forEach((shift, idx) => {
    // Variance pattern by index — gives a deterministic mix.
    const variance = idx % 7;
    if (variance === 5 && shift.id.endsWith("0")) {
      // No-show (no entry)
      return;
    }

    const [sh, sm] = shift.startTime.split(":").map(Number);
    const [eh, em] = shift.endTime.split(":").map(Number);

    // Late by N minutes for variance 1, early arrival for variance 2,
    // early departure for variance 3, stayed late for variance 4, on-time otherwise.
    let inOffsetMin = 0;
    let outOffsetMin = 0;
    if (variance === 1) inOffsetMin = 12;
    if (variance === 2) inOffsetMin = -8;
    if (variance === 3) outOffsetMin = -25;
    if (variance === 4) outOffsetMin = 35;

    const clockedIn = new Date(`${shift.date}T${shift.startTime}:00`);
    clockedIn.setMinutes(clockedIn.getMinutes() + inOffsetMin);

    const clockedOut = new Date(`${shift.date}T${shift.endTime}:00`);
    clockedOut.setMinutes(clockedOut.getMinutes() + outOffsetMin);

    const actualMinutes = Math.max(
      0,
      Math.round(
        (clockedOut.getTime() - clockedIn.getTime()) / 60_000 -
          shift.breakMinutes,
      ),
    );

    entries.push({
      id: `tc-${shift.id}`,
      shiftId: shift.id,
      employeeId: shift.employeeId!,
      date: shift.date,
      clockedInAt: clockedIn.toISOString(),
      clockedOutAt: clockedOut.toISOString(),
      actualMinutes,
      status: "clocked_out",
    });
  });

  return entries;
}

export const timeClockEntries: TimeClockEntry[] = generateTimeClockEntries();

// ============================================================================
// Company Profile
// ============================================================================

export const companyProfile: CompanyProfile = {
  id: "company-1",
  name: "Doggieville",
  legalName: "Doggieville Pet Services Inc.",
  industry: "Pet care · daycare · boarding · grooming",
  taxId: "QC-DOG-2025",
  contactEmail: "hello@doggieville.com",
  contactPhone: "+1-514-555-0100",
  website: "https://doggieville.com",
  defaultTimezone: "America/Toronto",
  weekStartsOn: 1, // Monday
  payPeriod: "biweekly",
  locations: [
    {
      id: "loc-1",
      name: "Doggieville MTL",
      address: "1234 Rue Saint-Denis",
      city: "Montréal",
      region: "QC",
      postalCode: "H2X 3J7",
      country: "Canada",
      phone: "+1-514-555-0101",
      timezone: "America/Toronto",
      operatingHours: [
        { dayOfWeek: 0, isOpen: true, openTime: "08:00", closeTime: "18:00" },
        { dayOfWeek: 1, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 2, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 3, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 4, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 5, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 6, isOpen: true, openTime: "08:00", closeTime: "18:00" },
      ],
      isPrimary: true,
    },
    {
      id: "loc-2",
      name: "Ruby Cafe MTL",
      address: "789 Boulevard Saint-Laurent",
      city: "Montréal",
      region: "QC",
      postalCode: "H2X 2T1",
      country: "Canada",
      phone: "+1-514-555-0201",
      timezone: "America/Toronto",
      operatingHours: [
        { dayOfWeek: 0, isOpen: true, openTime: "09:00", closeTime: "17:00" },
        { dayOfWeek: 1, isOpen: false },
        { dayOfWeek: 2, isOpen: true, openTime: "07:00", closeTime: "17:00" },
        { dayOfWeek: 3, isOpen: true, openTime: "07:00", closeTime: "17:00" },
        { dayOfWeek: 4, isOpen: true, openTime: "07:00", closeTime: "17:00" },
        { dayOfWeek: 5, isOpen: true, openTime: "07:00", closeTime: "20:00" },
        { dayOfWeek: 6, isOpen: true, openTime: "08:00", closeTime: "20:00" },
      ],
      isPrimary: false,
    },
    {
      id: "loc-3",
      name: "Doggieville Laval",
      address: "456 Boulevard Le Carrefour",
      city: "Laval",
      region: "QC",
      postalCode: "H7T 1A5",
      country: "Canada",
      phone: "+1-450-555-0301",
      timezone: "America/Toronto",
      operatingHours: [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 2, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 3, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 4, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 5, isOpen: true, openTime: "07:00", closeTime: "19:00" },
        { dayOfWeek: 6, isOpen: true, openTime: "08:00", closeTime: "17:00" },
      ],
      isPrimary: false,
    },
  ],
  updatedAt: "2026-04-01",
};

// ============================================================================
// Notification Preferences
// ============================================================================

export const notificationPreferences: NotificationPreferences = {
  facilityId: 1,
  rules: [
    {
      event: "schedule_published",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: true },
      audience: "all",
    },
    {
      event: "shift_changed",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: true },
      audience: "involved",
    },
    {
      event: "shift_assigned",
      enabled: true,
      channels: { inApp: true, email: false, sms: false, push: true },
      audience: "involved",
    },
    {
      event: "shift_cancelled",
      enabled: true,
      channels: { inApp: true, email: true, sms: true, push: true },
      audience: "involved",
    },
    {
      event: "shift_reminder",
      enabled: true,
      channels: { inApp: true, email: false, sms: false, push: true },
      audience: "involved",
      leadTimeMinutes: 60,
    },
    {
      event: "swap_requested",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: true },
      audience: "managers",
    },
    {
      event: "swap_decision",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: true },
      audience: "involved",
    },
    {
      event: "timeoff_decision",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: true },
      audience: "involved",
    },
    {
      event: "availability_decision",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: false },
      audience: "involved",
    },
    {
      event: "open_shift_posted",
      enabled: true,
      channels: { inApp: true, email: false, sms: true, push: true },
      audience: "all",
    },
    {
      event: "open_shift_claimed",
      enabled: true,
      channels: { inApp: true, email: true, sms: false, push: false },
      audience: "managers",
    },
    {
      event: "attendance_late",
      enabled: true,
      channels: { inApp: true, email: false, sms: false, push: true },
      audience: "managers",
    },
    {
      event: "attendance_no_show",
      enabled: true,
      channels: { inApp: true, email: true, sms: true, push: true },
      audience: "managers",
    },
  ],
  quietHoursStart: "21:00",
  quietHoursEnd: "07:00",
  updatedAt: "2026-04-01",
};

// ============================================================================
// Broadcast Messages (sent log)
// ============================================================================

export const broadcastMessages: BroadcastMessage[] = [
  {
    id: "bc-1",
    subject: "Snowstorm tomorrow — please confirm shifts",
    body: "Heavy snow expected starting 5am. Please confirm you can make it in. Reply YES if covered, NO if you can't.",
    audience: "all_staff",
    channels: { inApp: true, email: true, sms: true, push: true },
    sentBy: "emp-1",
    sentByName: "Sarah Johnson",
    sentAt: "2026-04-12T18:30:00Z",
    recipientCount: 13,
  },
  {
    id: "bc-2",
    subject: "Welcome new hire — James Park",
    body: "James is joining the cafe team this week. Please introduce yourselves on his first shift Friday.",
    audience: "department",
    audienceTargetId: "dept-2",
    channels: { inApp: true, email: true, sms: false, push: false },
    sentBy: "emp-7",
    sentByName: "Sophie Martin",
    sentAt: "2026-04-08T14:00:00Z",
    recipientCount: 4,
  },
  {
    id: "bc-3",
    subject: "Reminder: complete CPR refresher by month-end",
    body: "All certified animal-care staff need to complete the CPR refresher module before April 30.",
    audience: "department",
    audienceTargetId: "dept-1",
    channels: { inApp: true, email: true, sms: false, push: true },
    sentBy: "emp-1",
    sentByName: "Sarah Johnson",
    sentAt: "2026-04-05T10:15:00Z",
    recipientCount: 6,
  },
];

// ============================================================================
// Schedule Periods
// ============================================================================

const today = new Date();
const dayOfWeek = today.getDay();
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const thisMonday = new Date(today);
thisMonday.setDate(today.getDate() + mondayOffset);
const thisSunday = new Date(thisMonday);
thisSunday.setDate(thisMonday.getDate() + 6);
const nextMonday = new Date(thisMonday);
nextMonday.setDate(thisMonday.getDate() + 7);
const nextSunday = new Date(nextMonday);
nextSunday.setDate(nextMonday.getDate() + 6);

export const schedulePeriods: SchedulePeriod[] = [
  {
    id: "period-1",
    departmentId: "dept-1",
    name: "Current Week",
    startDate: thisMonday.toISOString().split("T")[0],
    endDate: thisSunday.toISOString().split("T")[0],
    status: "published",
    publishedAt: new Date(thisMonday.getTime() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    publishedBy: "emp-1",
    createdAt: new Date(thisMonday.getTime() - 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    createdBy: "emp-1",
  },
  {
    id: "period-2",
    departmentId: "dept-1",
    name: "Next Week",
    startDate: nextMonday.toISOString().split("T")[0],
    endDate: nextSunday.toISOString().split("T")[0],
    status: "draft",
    createdAt: today.toISOString().split("T")[0],
    createdBy: "emp-1",
  },
];

// ============================================================================
// Schedule Templates
// ============================================================================

export const scheduleTemplates: ScheduleTemplate[] = [
  {
    id: "tmpl-1",
    name: "Regular Week",
    departmentId: "dept-1",
    description: "Standard weekday schedule with full coverage",
    shifts: [
      {
        dayOfWeek: 1,
        employeeId: "emp-1",
        positionId: "pos-4",
        startTime: "08:00",
        endTime: "16:30",
        breakMinutes: 30,
      },
      {
        dayOfWeek: 1,
        employeeId: "emp-2",
        positionId: "pos-1",
        startTime: "07:00",
        endTime: "15:00",
        breakMinutes: 30,
      },
      {
        dayOfWeek: 1,
        employeeId: "emp-4",
        positionId: "pos-2",
        startTime: "06:30",
        endTime: "14:30",
        breakMinutes: 30,
      },
    ],
    createdAt: "2025-06-01",
    createdBy: "emp-1",
  },
  {
    id: "tmpl-2",
    name: "Holiday Schedule",
    departmentId: "dept-1",
    description: "Reduced hours for holiday periods",
    shifts: [
      {
        dayOfWeek: 1,
        employeeId: "emp-1",
        positionId: "pos-4",
        startTime: "09:00",
        endTime: "14:00",
        breakMinutes: 0,
      },
      {
        dayOfWeek: 1,
        employeeId: "emp-5",
        positionId: "pos-5",
        startTime: "09:00",
        endTime: "14:00",
        breakMinutes: 0,
      },
    ],
    createdAt: "2025-11-20",
    createdBy: "emp-1",
  },
  {
    id: "tmpl-3",
    name: "Summer Schedule",
    departmentId: "dept-1",
    description: "Extended hours for summer season with extra coverage",
    shifts: [
      {
        dayOfWeek: 1,
        employeeId: "emp-1",
        positionId: "pos-4",
        startTime: "07:00",
        endTime: "17:00",
        breakMinutes: 60,
      },
      {
        dayOfWeek: 1,
        employeeId: "emp-2",
        positionId: "pos-1",
        startTime: "06:00",
        endTime: "14:00",
        breakMinutes: 30,
      },
      {
        dayOfWeek: 6,
        employeeId: "emp-5",
        positionId: "pos-5",
        startTime: "08:00",
        endTime: "16:00",
        breakMinutes: 30,
      },
    ],
    createdAt: "2025-05-15",
    createdBy: "emp-1",
  },
];

// ============================================================================
// Time Off Requests
// ============================================================================

export const enhancedTimeOffRequests: EnhancedTimeOffRequest[] = [
  {
    id: "to-1",
    employeeId: "emp-3",
    employeeName: "Emily Davis",
    type: "vacation",
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })(),
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 18);
      return d.toISOString().split("T")[0];
    })(),
    reason: "Family vacation to Florida",
    status: "approved",
    requestedAt: "2026-03-20",
    reviewedBy: "emp-1",
    reviewedByName: "Sarah Johnson",
    reviewedAt: "2026-03-21",
    departmentId: "dept-1",
  },
  {
    id: "to-2",
    employeeId: "emp-4",
    employeeName: "David Wilson",
    type: "sick_leave",
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split("T")[0];
    })(),
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split("T")[0];
    })(),
    reason: "Dental surgery recovery",
    status: "pending",
    requestedAt: "2026-04-10",
    departmentId: "dept-1",
  },
  {
    id: "to-3",
    employeeId: "emp-8",
    employeeName: "Alex Tremblay",
    type: "personal",
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    })(),
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    })(),
    reason: "Moving to new apartment",
    status: "pending",
    requestedAt: "2026-04-08",
    departmentId: "dept-2",
  },
  {
    id: "to-4",
    employeeId: "emp-2",
    employeeName: "Mike Chen",
    type: "vacation",
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 10);
      return d.toISOString().split("T")[0];
    })(),
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    })(),
    reason: "Spring break trip",
    status: "approved",
    requestedAt: "2026-03-15",
    reviewedBy: "emp-1",
    reviewedByName: "Sarah Johnson",
    reviewedAt: "2026-03-16",
    departmentId: "dept-1",
  },
];

// ============================================================================
// Shift Swap Requests
// ============================================================================

export const enhancedShiftSwaps: EnhancedShiftSwap[] = [
  {
    id: "swap-1",
    requestingEmployeeId: "emp-2",
    requestingEmployeeName: "Mike Chen",
    requestingShiftId: "shift-dept-1-emp-2-2026-04-15-0",
    requestingShiftDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split("T")[0];
    })(),
    requestingShiftTime: "07:00 - 15:00",
    targetEmployeeId: "emp-5",
    targetEmployeeName: "Lisa Rodriguez",
    targetShiftId: "shift-dept-1-emp-5-2026-04-15-0",
    targetShiftDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split("T")[0];
    })(),
    targetShiftTime: "08:00 - 16:00",
    reason: "Doctor appointment in the morning",
    status: "pending",
    requestedAt: "2026-04-11",
    departmentId: "dept-1",
  },
  {
    id: "swap-2",
    requestingEmployeeId: "emp-8",
    requestingEmployeeName: "Alex Tremblay",
    requestingShiftId: "shift-dept-2-emp-8-2026-04-16-0",
    requestingShiftDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split("T")[0];
    })(),
    requestingShiftTime: "07:00 - 15:00",
    targetEmployeeId: "emp-9",
    targetEmployeeName: "Marie Dubois",
    targetShiftId: "shift-dept-2-emp-9-2026-04-16-0",
    targetShiftDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split("T")[0];
    })(),
    targetShiftTime: "09:00 - 17:00",
    reason: "Need to pick up my child from school",
    status: "pending",
    requestedAt: "2026-04-12",
    departmentId: "dept-2",
  },
  {
    id: "swap-3",
    requestingEmployeeId: "emp-3",
    requestingEmployeeName: "Emily Davis",
    requestingShiftId: "shift-dept-1-emp-3-2026-04-18-0",
    requestingShiftDate: "2026-04-18",
    requestingShiftTime: "08:00 - 16:00",
    targetEmployeeId: "emp-4",
    targetEmployeeName: "David Wilson",
    targetShiftId: "shift-dept-1-emp-4-2026-04-20-0",
    targetShiftDate: "2026-04-20",
    targetShiftTime: "08:00 - 16:00",
    reason: "Family event on Saturday — can take David's Monday.",
    status: "pending",
    requestedAt: "2026-04-13",
    departmentId: "dept-1",
  },
  {
    id: "swap-4",
    requestingEmployeeId: "emp-6",
    requestingEmployeeName: "Tom Anderson",
    requestingShiftId: "shift-dept-1-emp-6-2026-04-22-0",
    requestingShiftDate: "2026-04-22",
    requestingShiftTime: "14:00 - 22:00",
    targetEmployeeId: "emp-2",
    targetEmployeeName: "Mike Chen",
    targetShiftId: "shift-dept-1-emp-2-2026-04-24-0",
    targetShiftDate: "2026-04-24",
    targetShiftTime: "14:00 - 22:00",
    reason: "Training workshop Wednesday evening.",
    status: "pending",
    requestedAt: "2026-04-14",
    departmentId: "dept-1",
  },
  {
    id: "swap-5",
    requestingEmployeeId: "emp-11",
    requestingEmployeeName: "Nadia Lavoie",
    requestingShiftId: "shift-dept-3-emp-11-2026-04-17-0",
    requestingShiftDate: "2026-04-17",
    requestingShiftTime: "09:00 - 17:00",
    targetEmployeeId: "emp-12",
    targetEmployeeName: "Omar Hassan",
    targetShiftId: "shift-dept-3-emp-12-2026-04-19-0",
    targetShiftDate: "2026-04-19",
    targetShiftTime: "09:00 - 17:00",
    reason: "Medical follow-up appointment.",
    status: "approved",
    requestedAt: "2026-04-08",
    reviewedBy: "emp-1",
    reviewedAt: "2026-04-09",
    reviewNotes: "Approved — both confirmed with supervisor.",
    departmentId: "dept-3",
  },
  {
    id: "swap-6",
    requestingEmployeeId: "emp-9",
    requestingEmployeeName: "Marie Dubois",
    requestingShiftId: "shift-dept-2-emp-9-2026-04-19-0",
    requestingShiftDate: "2026-04-19",
    requestingShiftTime: "12:00 - 20:00",
    targetEmployeeId: "emp-7",
    targetEmployeeName: "Sophie Martin",
    targetShiftId: "shift-dept-2-emp-7-2026-04-21-0",
    targetShiftDate: "2026-04-21",
    targetShiftTime: "12:00 - 20:00",
    reason: "Concert tickets for Saturday.",
    status: "approved",
    requestedAt: "2026-04-05",
    reviewedBy: "emp-7",
    reviewedAt: "2026-04-06",
    reviewNotes: "Have fun!",
    departmentId: "dept-2",
  },
  {
    id: "swap-7",
    requestingEmployeeId: "emp-10",
    requestingEmployeeName: "James Park",
    requestingShiftId: "shift-dept-2-emp-10-2026-04-14-0",
    requestingShiftDate: "2026-04-14",
    requestingShiftTime: "16:00 - 21:00",
    targetEmployeeId: "emp-8",
    targetEmployeeName: "Alex Tremblay",
    targetShiftId: "shift-dept-2-emp-8-2026-04-15-0",
    targetShiftDate: "2026-04-15",
    targetShiftTime: "16:00 - 21:00",
    reason: "School group project meeting.",
    status: "denied",
    requestedAt: "2026-04-02",
    reviewedBy: "emp-7",
    reviewedAt: "2026-04-03",
    reviewNotes: "Alex already has a long stretch that week — can't stack another.",
    departmentId: "dept-2",
  },
  {
    id: "swap-8",
    requestingEmployeeId: "emp-13",
    requestingEmployeeName: "Chloe Gagnon",
    requestingShiftId: "shift-dept-3-emp-13-2026-04-16-0",
    requestingShiftDate: "2026-04-16",
    requestingShiftTime: "13:00 - 19:00",
    targetEmployeeId: "emp-11",
    targetEmployeeName: "Nadia Lavoie",
    targetShiftId: "shift-dept-3-emp-11-2026-04-18-0",
    targetShiftDate: "2026-04-18",
    targetShiftTime: "13:00 - 19:00",
    reason: "Helping parents move on Thursday.",
    status: "pending",
    requestedAt: "2026-04-13",
    departmentId: "dept-3",
  },
  {
    id: "swap-9",
    requestingEmployeeId: "emp-5",
    requestingEmployeeName: "Lisa Rodriguez",
    requestingShiftId: "shift-dept-1-emp-5-2026-04-25-0",
    requestingShiftDate: "2026-04-25",
    requestingShiftTime: "09:00 - 17:00",
    targetEmployeeId: "emp-3",
    targetEmployeeName: "Emily Davis",
    targetShiftId: "shift-dept-1-emp-3-2026-04-26-0",
    targetShiftDate: "2026-04-26",
    targetShiftTime: "09:00 - 17:00",
    reason: "Back-to-back closing then opening — need more rest.",
    status: "denied",
    requestedAt: "2026-04-10",
    reviewedBy: "emp-1",
    reviewedAt: "2026-04-11",
    reviewNotes: "Emily's already at max hours for the week.",
    departmentId: "dept-1",
  },
];

// ============================================================================
// Employee Warnings
// ============================================================================

export const employeeWarnings: EmployeeWarning[] = [
  {
    id: "warn-1",
    employeeId: "emp-4",
    employeeName: "David Wilson",
    type: "verbal",
    reason: "Tardiness",
    description: "Arrived 30+ minutes late on 3 separate occasions in March",
    managerNotes:
      "Discussed importance of punctuality. Employee acknowledged and committed to improvement.",
    issuedBy: "emp-1",
    issuedByName: "Sarah Johnson",
    issuedAt: "2026-03-28",
    acknowledgedAt: "2026-03-28",
    status: "acknowledged",
    departmentId: "dept-1",
  },
  {
    id: "warn-2",
    employeeId: "emp-6",
    employeeName: "Tom Anderson",
    type: "written",
    reason: "Policy violation",
    description:
      "Failed to follow proper pet handling protocol during group play session",
    managerNotes:
      "Issued written warning after verbal warning was given on March 10. Employee must complete refresher training.",
    issuedBy: "emp-1",
    issuedByName: "Sarah Johnson",
    issuedAt: "2026-04-02",
    witnessName: "Lisa Rodriguez",
    status: "issued",
    departmentId: "dept-1",
  },
];

// ============================================================================
// Onboarding Tasks
// ============================================================================

export const onboardingTasks: OnboardingTask[] = [
  {
    id: "onb-1",
    employeeId: "emp-10",
    title: "Complete Personal Information Form",
    description:
      "Fill out all personal details, emergency contacts, and tax information",
    type: "form",
    status: "completed",
    dueDate: "2026-04-05",
    completedAt: "2026-04-03",
    requiresSignature: false,
  },
  {
    id: "onb-2",
    employeeId: "emp-10",
    title: "Sign Employment Agreement",
    description: "Review and sign the employment contract",
    type: "agreement",
    status: "completed",
    dueDate: "2026-04-05",
    completedAt: "2026-04-04",
    requiresSignature: true,
    signedAt: "2026-04-04",
  },
  {
    id: "onb-3",
    employeeId: "emp-10",
    title: "Review Company Policies",
    description:
      "Read through employee handbook, code of conduct, and safety protocols",
    type: "policy",
    status: "in_progress",
    dueDate: "2026-04-12",
    requiresSignature: true,
  },
  {
    id: "onb-4",
    employeeId: "emp-10",
    title: "Food Safety Certification",
    description: "Complete online food safety course and submit certificate",
    type: "training",
    status: "pending",
    dueDate: "2026-04-20",
    requiresSignature: false,
  },
  {
    id: "onb-5",
    employeeId: "emp-10",
    title: "Submit Government ID",
    description: "Upload a copy of valid government-issued photo ID",
    type: "document",
    status: "pending",
    dueDate: "2026-04-15",
    requiresSignature: false,
  },
  {
    id: "onb-6",
    employeeId: "emp-13",
    title: "Complete Personal Information Form",
    description: "Fill out all personal details, emergency contacts",
    type: "form",
    status: "completed",
    dueDate: "2026-05-05",
    completedAt: "2026-05-02",
    requiresSignature: false,
  },
  {
    id: "onb-7",
    employeeId: "emp-13",
    title: "Sign Employment Agreement",
    description: "Review and sign the employment contract",
    type: "agreement",
    status: "pending",
    dueDate: "2026-05-05",
    requiresSignature: true,
  },
  {
    id: "onb-8",
    employeeId: "emp-13",
    title: "Pet First Aid Training",
    description: "Complete pet first aid certification course",
    type: "training",
    status: "pending",
    dueDate: "2026-05-15",
    requiresSignature: false,
  },
  {
    id: "onb-9",
    employeeId: "emp-13",
    title: "Review Safety Protocols",
    description: "Read and acknowledge facility safety procedures",
    type: "policy",
    status: "pending",
    dueDate: "2026-05-10",
    requiresSignature: true,
  },
  // ── Nadia Lavoie (emp-11) — nearly complete ─────────────────────────
  {
    id: "onb-10",
    employeeId: "emp-11",
    title: "Complete Personal Information Form",
    description: "Fill out personal details and emergency contacts",
    type: "form",
    status: "completed",
    dueDate: "2026-03-25",
    completedAt: "2026-03-22",
    requiresSignature: false,
  },
  {
    id: "onb-11",
    employeeId: "emp-11",
    title: "Sign Employment Agreement",
    description: "Review and sign the employment contract",
    type: "agreement",
    status: "completed",
    dueDate: "2026-03-25",
    completedAt: "2026-03-23",
    requiresSignature: true,
    signedAt: "2026-03-23",
  },
  {
    id: "onb-12",
    employeeId: "emp-11",
    title: "Confidentiality Agreement (NDA)",
    description: "Sign the client confidentiality agreement",
    type: "agreement",
    status: "completed",
    dueDate: "2026-03-30",
    completedAt: "2026-03-26",
    requiresSignature: true,
    signedAt: "2026-03-26",
  },
  {
    id: "onb-13",
    employeeId: "emp-11",
    title: "Uniform Fitting",
    description: "Schedule and complete uniform fitting",
    type: "custom",
    status: "pending",
    dueDate: "2026-04-25",
    requiresSignature: false,
  },
  // ── Omar Hassan (emp-12) — just starting, mostly pending ────────────
  {
    id: "onb-14",
    employeeId: "emp-12",
    title: "Complete Personal Information Form",
    description: "Fill out personal details, tax info, and banking",
    type: "form",
    status: "in_progress",
    dueDate: "2026-04-20",
    requiresSignature: false,
  },
  {
    id: "onb-15",
    employeeId: "emp-12",
    title: "Sign Employment Agreement",
    description: "Review and sign the employment contract",
    type: "agreement",
    status: "pending",
    dueDate: "2026-04-20",
    requiresSignature: true,
  },
  {
    id: "onb-16",
    employeeId: "emp-12",
    title: "Submit Government ID",
    description: "Upload a copy of valid photo ID",
    type: "document",
    status: "pending",
    dueDate: "2026-04-22",
    requiresSignature: false,
  },
  {
    id: "onb-17",
    employeeId: "emp-12",
    title: "Pet Handling Training",
    description: "Complete introductory pet handling safety module",
    type: "training",
    status: "pending",
    dueDate: "2026-05-01",
    requiresSignature: false,
  },
  // ── Alex Tremblay (emp-8) — overdue refresher ──────────────────────
  {
    id: "onb-18",
    employeeId: "emp-8",
    title: "Annual Food Safety Refresher",
    description: "Complete yearly food safety recertification",
    type: "training",
    status: "overdue",
    dueDate: "2026-03-31",
    requiresSignature: false,
  },
  {
    id: "onb-19",
    employeeId: "emp-8",
    title: "Updated Policy Acknowledgement",
    description: "Review and acknowledge updated handbook (v2.3)",
    type: "policy",
    status: "pending",
    dueDate: "2026-04-15",
    requiresSignature: true,
  },
  // ── David Wilson (emp-4) — fully complete ──────────────────────────
  {
    id: "onb-20",
    employeeId: "emp-4",
    title: "Complete Personal Information Form",
    description: "Fill out personal details and emergency contacts",
    type: "form",
    status: "completed",
    dueDate: "2024-09-05",
    completedAt: "2024-09-02",
    requiresSignature: false,
  },
  {
    id: "onb-21",
    employeeId: "emp-4",
    title: "Sign Employment Agreement",
    description: "Review and sign the employment contract",
    type: "agreement",
    status: "completed",
    dueDate: "2024-09-05",
    completedAt: "2024-09-03",
    requiresSignature: true,
    signedAt: "2024-09-03",
  },
  {
    id: "onb-22",
    employeeId: "emp-4",
    title: "Safety Training",
    description: "Complete facility safety training module",
    type: "training",
    status: "completed",
    dueDate: "2024-09-15",
    completedAt: "2024-09-10",
    requiresSignature: false,
  },
  // ── Mike Chen (emp-2) — mid-progress refresher ─────────────────────
  {
    id: "onb-23",
    employeeId: "emp-2",
    title: "CPR Recertification",
    description: "Renew pet CPR certification (biannual)",
    type: "training",
    status: "in_progress",
    dueDate: "2026-05-01",
    requiresSignature: false,
  },
  {
    id: "onb-24",
    employeeId: "emp-2",
    title: "Review Updated Handbook",
    description: "Read and acknowledge handbook v2.3",
    type: "policy",
    status: "completed",
    dueDate: "2026-04-01",
    completedAt: "2026-03-28",
    requiresSignature: true,
    signedAt: "2026-03-28",
  },
  {
    id: "onb-25",
    employeeId: "emp-2",
    title: "Direct Deposit Update",
    description: "Update banking information for payroll",
    type: "form",
    status: "pending",
    dueDate: "2026-04-30",
    requiresSignature: false,
  },
];

// ============================================================================
// Employee Documents
// ============================================================================

export const employeeDocuments: EmployeeDocument[] = [
  {
    id: "doc-1",
    employeeId: "emp-2",
    employeeName: "Mike Chen",
    name: "Work Permit",
    type: "work_permit",
    fileUrl: "/documents/emp-2/work-permit.pdf",
    uploadedAt: "2024-06-01",
    expiresAt: "2027-06-01",
    visibleToEmployee: true,
    departmentId: "dept-1",
  },
  {
    id: "doc-2",
    employeeId: "emp-3",
    employeeName: "Emily Davis",
    name: "Grooming Certification",
    type: "certification",
    fileUrl: "/documents/emp-3/grooming-cert.pdf",
    uploadedAt: "2024-07-15",
    expiresAt: "2026-07-15",
    visibleToEmployee: true,
    departmentId: "dept-1",
  },
  {
    id: "doc-3",
    employeeId: "emp-1",
    employeeName: "Sarah Johnson",
    name: "Employment Contract",
    type: "contract",
    fileUrl: "/documents/emp-1/contract.pdf",
    uploadedAt: "2024-03-15",
    visibleToEmployee: false,
    departmentId: "dept-1",
  },
  {
    id: "doc-4",
    employeeId: "emp-6",
    employeeName: "Tom Anderson",
    name: "Dog Trainer Certification",
    type: "certification",
    fileUrl: "/documents/emp-6/trainer-cert.pdf",
    uploadedAt: "2025-01-10",
    expiresAt: "2027-01-10",
    visibleToEmployee: true,
    departmentId: "dept-1",
  },
];

// ============================================================================
// Employee Availability
// ============================================================================

export const employeeAvailabilities: EmployeeAvailability[] = [
  {
    employeeId: "emp-1",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "18:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "07:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "07:00", endTime: "18:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    updatedAt: "2026-03-01",
  },
  {
    employeeId: "emp-2",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "06:00", endTime: "16:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "06:00", endTime: "16:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "06:00", endTime: "16:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "06:00", endTime: "16:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "06:00", endTime: "16:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "08:00", endTime: "14:00" },
    ],
    updatedAt: "2026-03-15",
  },
  {
    employeeId: "emp-3",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    updatedAt: "2026-02-20",
  },
  {
    employeeId: "emp-4",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "06:00", endTime: "15:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    updatedAt: "2026-03-10",
  },
  {
    employeeId: "emp-5",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 4, isAvailable: false },
      { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "19:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "19:00" },
    ],
    updatedAt: "2026-03-05",
  },
  {
    employeeId: "emp-6",
    weeklyAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: false },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "17:00" },
    ],
    updatedAt: "2026-03-20",
  },
];

// ============================================================================
// Availability Change Requests
// ============================================================================

export const availabilityChangeRequests: AvailabilityChangeRequest[] = [
  {
    id: "ac-1",
    employeeId: "emp-3",
    employeeName: "Emily Davis",
    departmentId: "dept-1",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: false, notes: "School schedule change" },
      { dayOfWeek: 3, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: false, notes: "School schedule change" },
      { dayOfWeek: 5, isAvailable: true, startTime: "08:00", endTime: "18:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "08:00", endTime: "16:00" },
    ],
    effectiveFrom: "2026-05-01",
    reason: "Starting a new program at school. Need Tue/Thu off going forward.",
    status: "pending",
    requestedAt: "2026-04-12",
  },
  {
    id: "ac-2",
    employeeId: "emp-6",
    employeeName: "Tom Anderson",
    departmentId: "dept-1",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: false },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "17:00" },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "10:00", endTime: "16:00" },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: false },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "10:00", endTime: "16:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "17:00" },
    ],
    effectiveFrom: "2026-04-20",
    reason: "Available for additional weekend shifts.",
    status: "pending",
    requestedAt: "2026-04-10",
  },
  {
    id: "ac-3",
    employeeId: "emp-9",
    employeeName: "Marie Dubois",
    departmentId: "dept-2",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "13:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "13:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "13:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "07:00", endTime: "13:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "07:00", endTime: "13:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    effectiveFrom: "2026-04-01",
    reason: "Reducing daily hours, adding Friday.",
    status: "approved",
    requestedAt: "2026-03-15",
    reviewedBy: "emp-7",
    reviewedByName: "Sophie Martin",
    reviewedAt: "2026-03-18",
    reviewNotes: "Approved — please update shift bids accordingly.",
  },
  {
    id: "ac-4",
    employeeId: "emp-5",
    employeeName: "Lisa Rodriguez",
    departmentId: "dept-1",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "06:00", endTime: "14:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "06:00", endTime: "14:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "06:00", endTime: "14:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "06:00", endTime: "14:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "06:00", endTime: "14:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    effectiveFrom: "2026-05-05",
    reason: "Switching to morning shifts to manage family commitments.",
    status: "pending",
    requestedAt: "2026-04-13",
  },
  {
    id: "ac-5",
    employeeId: "emp-2",
    employeeName: "Mike Chen",
    departmentId: "dept-1",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: false },
      { dayOfWeek: 3, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 2, isAvailable: false },
      { dayOfWeek: 3, isAvailable: true, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    effectiveFrom: "2026-04-25",
    reason: "Night class enrolled — need later start times.",
    status: "pending",
    requestedAt: "2026-04-11",
  },
  {
    id: "ac-6",
    employeeId: "emp-4",
    employeeName: "David Wilson",
    departmentId: "dept-1",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: true, startTime: "08:00", endTime: "16:00" },
    ],
    effectiveFrom: "2026-05-10",
    reason: "Swapping weekday off for weekend coverage.",
    status: "pending",
    requestedAt: "2026-04-14",
  },
  {
    id: "ac-7",
    employeeId: "emp-7",
    employeeName: "Sophie Martin",
    departmentId: "dept-2",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "09:00", endTime: "15:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "07:00", endTime: "15:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "15:00" },
    ],
    effectiveFrom: "2026-04-27",
    reason: "Picking up weekend brunch shifts.",
    status: "pending",
    requestedAt: "2026-04-09",
  },
  {
    id: "ac-8",
    employeeId: "emp-8",
    employeeName: "Alex Tremblay",
    departmentId: "dept-2",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "08:00", endTime: "14:00" },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: true, startTime: "08:00", endTime: "14:00" },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "08:00", endTime: "14:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "08:00", endTime: "14:00" },
    ],
    effectiveFrom: "2026-04-05",
    reason: "Increasing to full availability.",
    status: "approved",
    requestedAt: "2026-03-25",
    reviewedBy: "emp-7",
    reviewedByName: "Sophie Martin",
    reviewedAt: "2026-03-28",
    reviewNotes: "Great — welcome to the full roster.",
  },
  {
    id: "ac-9",
    employeeId: "emp-10",
    employeeName: "James Park",
    departmentId: "dept-2",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "16:00", endTime: "21:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "16:00", endTime: "21:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "16:00", endTime: "21:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "16:00", endTime: "21:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "16:00", endTime: "21:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: false },
      { dayOfWeek: 3, isAvailable: true, startTime: "18:00", endTime: "21:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "18:00", endTime: "21:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    effectiveFrom: "2026-03-20",
    reason: "Reducing shifts during exam period.",
    status: "denied",
    requestedAt: "2026-03-05",
    reviewedBy: "emp-7",
    reviewedByName: "Sophie Martin",
    reviewedAt: "2026-03-07",
    reviewNotes: "Too much of a cut during onboarding — let's revisit after May.",
  },
  {
    id: "ac-10",
    employeeId: "emp-11",
    employeeName: "Nadia Lavoie",
    departmentId: "dept-3",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: false, notes: "Volunteering mid-week" },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "10:00", endTime: "16:00" },
    ],
    effectiveFrom: "2026-05-15",
    reason: "Volunteering on Wednesdays, available Saturdays instead.",
    status: "pending",
    requestedAt: "2026-04-14",
  },
  {
    id: "ac-11",
    employeeId: "emp-12",
    employeeName: "Omar Hassan",
    departmentId: "dept-3",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: true, startTime: "11:00", endTime: "17:00" },
      { dayOfWeek: 2, isAvailable: true, startTime: "11:00", endTime: "17:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "11:00", endTime: "17:00" },
      { dayOfWeek: 4, isAvailable: false },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: false },
    ],
    effectiveFrom: "2026-04-01",
    reason: "Cutting back due to second job.",
    status: "denied",
    requestedAt: "2026-03-18",
    reviewedBy: "emp-1",
    reviewedByName: "Sarah Johnson",
    reviewedAt: "2026-03-22",
    reviewNotes: "Cannot cover the gap this quarter. Please resubmit in July.",
  },
  {
    id: "ac-12",
    employeeId: "emp-13",
    employeeName: "Chloe Gagnon",
    departmentId: "dept-3",
    currentAvailability: [
      { dayOfWeek: 0, isAvailable: false },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 5, isAvailable: false },
      { dayOfWeek: 6, isAvailable: true, startTime: "10:00", endTime: "18:00" },
    ],
    proposedAvailability: [
      { dayOfWeek: 0, isAvailable: true, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 1, isAvailable: false },
      { dayOfWeek: 2, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 3, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 4, isAvailable: true, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 5, isAvailable: true, startTime: "15:00", endTime: "21:00" },
      { dayOfWeek: 6, isAvailable: true, startTime: "10:00", endTime: "18:00" },
    ],
    effectiveFrom: "2026-04-10",
    reason: "Adding Friday evenings and Sunday daytime.",
    status: "approved",
    requestedAt: "2026-03-30",
    reviewedBy: "emp-1",
    reviewedByName: "Sarah Johnson",
    reviewedAt: "2026-04-02",
    reviewNotes: "Great, we need the extra hands on weekends.",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getEmployeeById(id: string): ScheduleEmployee | undefined {
  return scheduleEmployees.find((e) => e.id === id);
}

export function getPositionById(id: string): Position | undefined {
  return positions.find((p) => p.id === id);
}

export function getDepartmentById(id: string): Department | undefined {
  return departments.find((d) => d.id === id);
}

export function getShiftsForDepartment(
  departmentId: string,
  startDate: string,
  endDate: string,
): ScheduleShift[] {
  return scheduleShifts.filter(
    (s) =>
      s.departmentId === departmentId &&
      s.date >= startDate &&
      s.date <= endDate,
  );
}

export function getShiftsForEmployee(
  employeeId: string,
  startDate: string,
  endDate: string,
): ScheduleShift[] {
  return scheduleShifts.filter(
    (s) =>
      s.employeeId === employeeId && s.date >= startDate && s.date <= endDate,
  );
}

export function getEmployeeScheduledHours(
  employeeId: string,
  startDate: string,
  endDate: string,
): number {
  const shifts = getShiftsForEmployee(employeeId, startDate, endDate);
  return shifts.reduce((total, shift) => {
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const hours =
      endH - startH + (endM - startM) / 60 - shift.breakMinutes / 60;
    return total + hours;
  }, 0);
}

export function getDepartmentEmployees(
  departmentId: string,
): ScheduleEmployee[] {
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept) return [];
  return scheduleEmployees.filter((e) =>
    e.departmentIds.includes(departmentId),
  );
}

export function getPositionsForDepartment(departmentId: string): Position[] {
  return positions.filter((p) => p.departmentId === departmentId);
}

export function calculateLaborCost(
  departmentId: string,
  startDate: string,
  endDate: string,
): {
  totalCost: number;
  byPosition: Record<string, number>;
  byEmployee: Record<string, number>;
} {
  const shifts = getShiftsForDepartment(departmentId, startDate, endDate);
  const byPosition: Record<string, number> = {};
  const byEmployee: Record<string, number> = {};
  let totalCost = 0;

  for (const shift of shifts) {
    const position = getPositionById(shift.positionId);
    if (!position) continue;

    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const hours =
      endH - startH + (endM - startM) / 60 - shift.breakMinutes / 60;

    let cost = 0;
    if (position.payType === "hourly" && position.hourlyRate) {
      cost = hours * position.hourlyRate;
    } else if (position.payType === "salary" && position.salary) {
      cost = (position.salary / 52 / 40) * hours; // Convert salary to hourly equiv
    }

    totalCost += cost;
    byPosition[shift.positionId] = (byPosition[shift.positionId] || 0) + cost;
    if (shift.employeeId) {
      byEmployee[shift.employeeId] = (byEmployee[shift.employeeId] || 0) + cost;
    }
  }

  return { totalCost, byPosition, byEmployee };
}

// ============================================================================
// Employee Document Templates
// ============================================================================

export const employeeDocumentTemplates: EmployeeDocumentTemplate[] = [
  {
    id: "tmpl-1",
    facilityId: 1,
    title: "Employment Agreement",
    type: "employment_agreement",
    description:
      "Standard employment contract covering terms, compensation, and responsibilities",
    content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of the date of signing between Doggieville MTL ("Employer") and the employee named below ("Employee").

1. POSITION AND DUTIES
Employee agrees to perform the duties associated with the position as assigned by Employer. Employee shall devote their full working time and attention to Employer's business.

2. COMPENSATION
Employee shall receive compensation as agreed upon during the hiring process. Payment will be made bi-weekly via direct deposit or cheque.

3. HOURS OF WORK
Work hours shall be as scheduled by management. Overtime may be required and will be compensated in accordance with applicable law.

4. CONFIDENTIALITY
Employee agrees to maintain confidentiality of all proprietary business information, client data, and trade secrets both during and after employment.

5. CODE OF CONDUCT
Employee agrees to uphold the highest standards of professionalism and animal care, adhering to all company policies as outlined in the Employee Handbook.

6. TERMINATION
Either party may terminate this agreement with appropriate notice as outlined in provincial employment law.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the Province of Quebec, Canada.

By signing below, Employee acknowledges they have read, understood, and agree to the terms of this Employment Agreement.`,
    fields: [
      {
        id: "full_name",
        label: "Full Legal Name",
        type: "text",
        placeholder: "As it appears on your ID",
        required: true,
      },
      {
        id: "address",
        label: "Home Address",
        type: "address",
        placeholder: "Street, City, Province, Postal Code",
        required: true,
      },
      {
        id: "phone",
        label: "Phone Number",
        type: "phone",
        placeholder: "(514) 000-0000",
        required: true,
      },
      {
        id: "email",
        label: "Email Address",
        type: "email",
        placeholder: "your@email.com",
        required: true,
      },
      {
        id: "sin",
        label: "Social Insurance Number (SIN)",
        type: "sin_ssn",
        placeholder: "XXX-XXX-XXX",
        required: true,
      },
      { id: "start_date", label: "Start Date", type: "date", required: true },
      {
        id: "position",
        label: "Position / Role",
        type: "text",
        placeholder: "e.g., Dog Groomer",
        required: true,
      },
    ],
    requiresSignature: true,
    isActive: true,
    version: "2.1",
    createdAt: "2026-01-15",
    updatedAt: "2026-03-01",
  },
  {
    id: "tmpl-2",
    facilityId: 1,
    title: "Confidentiality & NDA",
    type: "nda",
    description:
      "Non-disclosure agreement protecting client data and business information",
    content: `CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT

This Confidentiality Agreement ("Agreement") is made between Doggieville MTL ("Company") and the undersigned employee.

1. CONFIDENTIAL INFORMATION
"Confidential Information" includes all client data, pet health records, business practices, pricing, supplier relationships, and any proprietary information belonging to the Company.

2. OBLIGATIONS
Employee agrees to:
- Keep all Confidential Information strictly confidential
- Not disclose any Confidential Information to third parties without written authorization
- Use Confidential Information only for the purpose of performing job duties
- Return or destroy all confidential materials upon termination

3. CLIENT DATA PROTECTION
Employee acknowledges that client and pet information is protected by privacy laws (PIPEDA, Quebec Law 25) and must be handled accordingly. Any breach of client privacy is grounds for immediate termination.

4. SOCIAL MEDIA POLICY
Employee shall not post photos, videos, or information about clients, their pets, or internal business matters on any social media platform without express written consent.

5. DURATION
This Agreement remains in effect during and after the term of employment.

6. REMEDIES
Any breach of this Agreement may result in disciplinary action, termination, and/or legal proceedings.`,
    fields: [
      {
        id: "full_name",
        label: "Full Legal Name",
        type: "text",
        placeholder: "As it appears on your ID",
        required: true,
      },
      { id: "date", label: "Effective Date", type: "date", required: true },
    ],
    requiresSignature: true,
    isActive: true,
    version: "1.3",
    createdAt: "2026-01-15",
    updatedAt: "2026-02-10",
  },
  {
    id: "tmpl-3",
    facilityId: 1,
    title: "Company Policy Acknowledgement",
    type: "policy_acknowledgement",
    description:
      "Acknowledgement of having read and understood the employee handbook and all company policies",
    content: `COMPANY POLICY ACKNOWLEDGEMENT

I, the undersigned employee, acknowledge that I have received, read, and understood the Doggieville MTL Employee Handbook and all Company Policies, including but not limited to:

WORKPLACE POLICIES
- Anti-harassment and workplace respect
- Health and safety procedures
- Animal handling and care standards
- Emergency protocols
- Dress code and personal appearance

OPERATIONAL POLICIES
- Punctuality and attendance expectations
- Break and meal period policies
- Cell phone and social media use during work hours
- Facility cleanliness and sanitation standards

ANIMAL CARE STANDARDS
- Proper handling techniques for all breeds and sizes
- Vaccination and health documentation requirements
- Incident reporting procedures for injuries or escapes
- Medication administration protocols

DISCIPLINARY PROCEDURES
I understand that violation of any company policy may result in disciplinary action up to and including termination of employment.

I confirm that I have had the opportunity to ask questions about any policy I did not understand, and all my questions have been answered satisfactorily.`,
    fields: [
      {
        id: "full_name",
        label: "Full Legal Name",
        type: "text",
        required: true,
      },
      {
        id: "employee_id",
        label: "Employee ID",
        type: "text",
        placeholder: "Assigned by HR",
        required: false,
      },
      {
        id: "department",
        label: "Department",
        type: "select",
        options: [
          "Daycare",
          "Boarding",
          "Grooming",
          "Training",
          "Administration",
        ],
        required: true,
      },
    ],
    requiresSignature: true,
    isActive: true,
    version: "3.0",
    createdAt: "2026-01-15",
    updatedAt: "2026-03-15",
  },
  {
    id: "tmpl-4",
    facilityId: 1,
    title: "Emergency Contact Form",
    type: "emergency_contact",
    description:
      "Emergency contacts and voluntary medical information kept on file for workplace safety",
    content: `EMERGENCY CONTACT INFORMATION FORM

This information is collected to ensure your safety and wellbeing in the event of a workplace emergency or medical situation. This information is strictly confidential and will only be accessed in the event of an emergency.

Please provide accurate and up-to-date information. You are responsible for notifying HR of any changes to this information.

MEDICAL INFORMATION
Please indicate any conditions that may be relevant in a workplace emergency (allergies, chronic conditions, medications that first responders should be aware of). This information is voluntary but strongly recommended.

DATA PRIVACY
This information is stored securely and in accordance with Quebec privacy law (Law 25). It will not be shared with any third party unless required by emergency services.`,
    fields: [
      {
        id: "full_name",
        label: "Employee Full Name",
        type: "text",
        required: true,
      },
      {
        id: "contact1_name",
        label: "Primary Emergency Contact — Full Name",
        type: "text",
        placeholder: "Full name",
        required: true,
      },
      {
        id: "contact1_relation",
        label: "Relationship to You",
        type: "select",
        options: [
          "Spouse / Partner",
          "Parent",
          "Sibling",
          "Child",
          "Friend",
          "Other",
        ],
        required: true,
      },
      {
        id: "contact1_phone",
        label: "Primary Contact Phone",
        type: "phone",
        placeholder: "(514) 000-0000",
        required: true,
      },
      {
        id: "contact2_name",
        label: "Secondary Emergency Contact — Full Name",
        type: "text",
        placeholder: "Full name",
        required: false,
      },
      {
        id: "contact2_phone",
        label: "Secondary Contact Phone",
        type: "phone",
        placeholder: "(514) 000-0000",
        required: false,
      },
      {
        id: "allergies",
        label: "Known Allergies",
        type: "textarea",
        placeholder:
          "List any allergies (food, medications, environmental) — or write 'None'",
        required: false,
      },
      {
        id: "medical_conditions",
        label: "Medical Conditions (optional)",
        type: "textarea",
        placeholder:
          "Any conditions relevant in an emergency (e.g., diabetes, epilepsy)",
        required: false,
      },
      {
        id: "blood_type",
        label: "Blood Type (optional)",
        type: "select",
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
        required: false,
      },
    ],
    requiresSignature: false,
    isActive: true,
    version: "1.0",
    createdAt: "2026-01-15",
    updatedAt: "2026-01-15",
  },
  {
    id: "tmpl-5",
    facilityId: 1,
    title: "Direct Deposit Authorization",
    type: "direct_deposit",
    description: "Banking information for payroll direct deposit setup",
    content: `DIRECT DEPOSIT AUTHORIZATION FORM

By completing this form, you authorize Doggieville MTL ("Employer") to initiate electronic fund transfers (direct deposit) to the bank account you specify below.

AUTHORIZATION
I hereby authorize my Employer to deposit my net pay directly into my designated bank account. I understand that:

- Direct deposits are typically processed 1–2 business days before the scheduled pay date
- I am responsible for notifying HR at least 10 business days in advance of any banking changes
- If incorrect information is provided, the Employer is not liable for misdirected deposits
- This authorization will remain in effect until I provide written notice of cancellation

VOID CHEQUE REQUIREMENT
Please attach a void cheque or a bank-issued direct deposit form to confirm your banking information. Your form will be held pending receipt of this document.

SECURITY NOTICE
Your banking information is stored with bank-level encryption and is accessed only by authorized payroll personnel.`,
    fields: [
      {
        id: "full_name",
        label: "Full Legal Name",
        type: "text",
        required: true,
      },
      {
        id: "bank_name",
        label: "Bank Name",
        type: "text",
        placeholder: "e.g., RBC, TD, Desjardins",
        required: true,
      },
      {
        id: "transit_number",
        label: "Transit Number (5 digits)",
        type: "text",
        placeholder: "00000",
        required: true,
      },
      {
        id: "institution_number",
        label: "Institution Number (3 digits)",
        type: "text",
        placeholder: "000",
        required: true,
      },
      {
        id: "account_number",
        label: "Account Number",
        type: "text",
        placeholder: "Your chequing account number",
        required: true,
      },
      {
        id: "account_type",
        label: "Account Type",
        type: "select",
        options: ["Chequing", "Savings"],
        required: true,
      },
    ],
    requiresSignature: true,
    isActive: true,
    version: "1.2",
    createdAt: "2026-01-15",
    updatedAt: "2026-02-01",
  },
];

// ============================================================================
// Employee Document Submissions
// ============================================================================

export const employeeDocumentSubmissions: EmployeeDocumentSubmission[] = [
  {
    id: "sub-1",
    templateId: "tmpl-1",
    templateTitle: "Employment Agreement",
    employeeId: "emp-10",
    employeeName: "Michael Chen",
    fieldValues: {
      full_name: "Michael Chen",
      address: "4521 Sherbrooke St W, Montreal, QC H3Z 1E7",
      phone: "(514) 555-0210",
      email: "m.chen@email.com",
      sin: "123-456-789",
      start_date: "2026-04-01",
      position: "Senior Dog Handler",
    },
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2026-04-04T14:22:31.000Z",
    ipAddress: "172.16.0.45",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    timezone: "America/Toronto",
    deviceId: "d8f2a1b3",
    status: "signed",
    onboardingTaskId: "onb-2",
    facilityId: 1,
    submittedAt: "2026-04-04T14:22:31.000Z",
  },
  {
    id: "sub-2",
    templateId: "tmpl-4",
    templateTitle: "Emergency Contact Form",
    employeeId: "emp-10",
    employeeName: "Michael Chen",
    fieldValues: {
      full_name: "Michael Chen",
      contact1_name: "Wei Chen",
      contact1_relation: "Parent",
      contact1_phone: "(514) 555-0211",
      contact2_name: "Amy Chen",
      contact2_phone: "(514) 555-0212",
      allergies: "None known",
      blood_type: "A+",
    },
    status: "signed",
    onboardingTaskId: "onb-1",
    facilityId: 1,
    submittedAt: "2026-04-03T10:15:00.000Z",
  },
  {
    id: "sub-3",
    templateId: "tmpl-2",
    templateTitle: "Confidentiality & NDA",
    employeeId: "emp-10",
    employeeName: "Michael Chen",
    fieldValues: {
      full_name: "Michael Chen",
      date: "2026-04-04",
    },
    signatureData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signedAt: "2026-04-04T14:35:12.000Z",
    ipAddress: "172.16.0.45",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    timezone: "America/Toronto",
    deviceId: "d8f2a1b3",
    status: "signed",
    facilityId: 1,
    submittedAt: "2026-04-04T14:35:12.000Z",
  },
];

// ============================================================================
// Shift Opportunities
// ============================================================================

export const shiftOpportunities: ShiftOpportunity[] = [
  {
    id: "opp-1",
    facilityId: 1,
    departmentId: "dept-1",
    positionId: "pos-2",
    date: "2026-04-14",
    startTime: "06:30",
    endTime: "14:30",
    breakMinutes: 30,
    reason:
      "David called in sick — need kennel tech coverage for morning shift",
    urgency: "urgent",
    status: "open",
    originalEmployeeId: "emp-4",
    originalEmployeeName: "David Wilson",
    originalShiftId: "shift-dept-1-emp-4-2026-04-14-0",
    postedBy: "emp-1",
    postedByName: "Sarah Johnson",
    postedAt: "2026-04-13T20:45:00.000Z",
    expiresAt: "2026-04-14T05:30:00.000Z",
  },
  {
    id: "opp-2",
    facilityId: 1,
    departmentId: "dept-1",
    positionId: "pos-1",
    date: "2026-04-15",
    startTime: "07:00",
    endTime: "15:00",
    breakMinutes: 30,
    reason: "Mike has a doctor's appointment — need receptionist for the day",
    notes: "Must be comfortable handling front desk check-ins independently",
    urgency: "normal",
    status: "open",
    originalEmployeeId: "emp-2",
    originalEmployeeName: "Mike Chen",
    originalShiftId: "shift-dept-1-emp-2-2026-04-15-0",
    postedBy: "emp-1",
    postedByName: "Sarah Johnson",
    postedAt: "2026-04-13T10:00:00.000Z",
    expiresAt: "2026-04-15T06:00:00.000Z",
  },
  {
    id: "opp-3",
    facilityId: 1,
    departmentId: "dept-1",
    positionId: "pos-3",
    date: "2026-04-16",
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    reason: "Extra grooming appointments booked — need additional groomer",
    urgency: "normal",
    status: "open",
    postedBy: "emp-1",
    postedByName: "Sarah Johnson",
    postedAt: "2026-04-12T14:30:00.000Z",
    expiresAt: "2026-04-16T08:00:00.000Z",
  },
  {
    id: "opp-4",
    facilityId: 1,
    departmentId: "dept-1",
    positionId: "pos-6",
    date: "2026-04-14",
    startTime: "14:00",
    endTime: "22:00",
    breakMinutes: 30,
    reason: "Short-staffed for evening cleaning — critical need",
    urgency: "critical",
    status: "open",
    postedBy: "emp-5",
    postedByName: "Lisa Rodriguez",
    postedAt: "2026-04-13T16:00:00.000Z",
    expiresAt: "2026-04-14T13:00:00.000Z",
  },
  {
    id: "opp-5",
    facilityId: 1,
    departmentId: "dept-2",
    positionId: "pos-8",
    date: "2026-04-15",
    startTime: "07:00",
    endTime: "15:00",
    breakMinutes: 30,
    reason: "Alex is attending a family event — barista coverage needed",
    urgency: "normal",
    status: "claimed",
    originalEmployeeId: "emp-8",
    originalEmployeeName: "Alex Tremblay",
    postedBy: "emp-7",
    postedByName: "Sophie Martin",
    postedAt: "2026-04-11T09:00:00.000Z",
    claimedBy: "emp-10",
    claimedByName: "James Park",
    claimedAt: "2026-04-11T11:22:00.000Z",
    approvedBy: "emp-7",
    approvedAt: "2026-04-11T11:45:00.000Z",
  },
  {
    id: "opp-6",
    facilityId: 1,
    departmentId: "dept-3",
    positionId: "pos-11",
    date: "2026-04-17",
    startTime: "07:00",
    endTime: "15:00",
    breakMinutes: 30,
    reason: "Nadia requested day off for personal reasons",
    urgency: "normal",
    status: "open",
    originalEmployeeId: "emp-11",
    originalEmployeeName: "Nadia Lavoie",
    postedBy: "emp-1",
    postedByName: "Sarah Johnson",
    postedAt: "2026-04-13T08:00:00.000Z",
    expiresAt: "2026-04-17T06:00:00.000Z",
  },
  {
    id: "opp-7",
    facilityId: 1,
    departmentId: "dept-1",
    positionId: "pos-7",
    date: "2026-04-12",
    startTime: "10:00",
    endTime: "16:00",
    breakMinutes: 30,
    reason: "Tom is sick — training session needs coverage",
    urgency: "urgent",
    status: "expired",
    originalEmployeeId: "emp-6",
    originalEmployeeName: "Tom Anderson",
    postedBy: "emp-1",
    postedByName: "Sarah Johnson",
    postedAt: "2026-04-11T22:00:00.000Z",
    expiresAt: "2026-04-12T09:00:00.000Z",
  },
];

// ============================================================================
// Shift Opportunity Notification Settings
// ============================================================================

export const shiftOpportunityNotificationSettings: ShiftOpportunityNotificationSettings =
  {
    facilityId: 1,
    enabled: true,
    notifyAllActive: false,
    notifyByDepartment: true,
    notifyByPosition: false,
    eligibleEmployeeIds: [
      "emp-2",
      "emp-3",
      "emp-4",
      "emp-5",
      "emp-6",
      "emp-8",
      "emp-9",
      "emp-10",
      "emp-11",
      "emp-12",
      "emp-13",
    ],
    excludedEmployeeIds: [],
    channels: {
      inApp: true,
      email: true,
      sms: false,
    },
    autoApprove: false,
    requireManagerApproval: true,
    maxClaimsPerWeek: 3,
    blackoutDays: [],
  };
