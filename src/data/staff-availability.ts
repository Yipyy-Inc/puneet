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
  { id: 1, staffId: 1, staffName: "Admin User", dayOfWeek: 1, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 2, staffId: 1, staffName: "Admin User", dayOfWeek: 2, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 3, staffId: 1, staffName: "Admin User", dayOfWeek: 3, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 4, staffId: 1, staffName: "Admin User", dayOfWeek: 4, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 5, staffId: 1, staffName: "Admin User", dayOfWeek: 5, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // Manager One - Weekdays with some weekend availability
  { id: 6, staffId: 2, staffName: "Manager One", dayOfWeek: 1, startTime: "07:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 7, staffId: 2, staffName: "Manager One", dayOfWeek: 2, startTime: "07:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 8, staffId: 2, staffName: "Manager One", dayOfWeek: 3, startTime: "07:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 9, staffId: 2, staffName: "Manager One", dayOfWeek: 4, startTime: "07:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 10, staffId: 2, staffName: "Manager One", dayOfWeek: 5, startTime: "07:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 11, staffId: 2, staffName: "Manager One", dayOfWeek: 6, startTime: "09:00", endTime: "14:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // Mike Chen - Flexible schedule
  { id: 12, staffId: 3, staffName: "Mike Chen", dayOfWeek: 1, startTime: "06:00", endTime: "15:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 13, staffId: 3, staffName: "Mike Chen", dayOfWeek: 2, startTime: "06:00", endTime: "15:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 14, staffId: 3, staffName: "Mike Chen", dayOfWeek: 3, startTime: "06:00", endTime: "15:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 15, staffId: 3, staffName: "Mike Chen", dayOfWeek: 4, startTime: "06:00", endTime: "15:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 16, staffId: 3, staffName: "Mike Chen", dayOfWeek: 5, startTime: "06:00", endTime: "15:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 17, staffId: 3, staffName: "Mike Chen", dayOfWeek: 0, startTime: "08:00", endTime: "12:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // Emily Davis - Part-time
  { id: 18, staffId: 5, staffName: "Emily Davis", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 19, staffId: 5, staffName: "Emily Davis", dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 20, staffId: 5, staffName: "Emily Davis", dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 21, staffId: 5, staffName: "Emily Davis", dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // David Wilson - Evening shifts
  { id: 22, staffId: 7, staffName: "David Wilson", dayOfWeek: 1, startTime: "12:00", endTime: "20:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 23, staffId: 7, staffName: "David Wilson", dayOfWeek: 2, startTime: "12:00", endTime: "20:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 24, staffId: 7, staffName: "David Wilson", dayOfWeek: 3, startTime: "12:00", endTime: "20:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 25, staffId: 7, staffName: "David Wilson", dayOfWeek: 4, startTime: "12:00", endTime: "20:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 26, staffId: 7, staffName: "David Wilson", dayOfWeek: 5, startTime: "12:00", endTime: "20:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // Lisa Rodriguez - Weekend focused
  { id: 27, staffId: 8, staffName: "Lisa Rodriguez", dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 28, staffId: 8, staffName: "Lisa Rodriguez", dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 29, staffId: 8, staffName: "Lisa Rodriguez", dayOfWeek: 6, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 30, staffId: 8, staffName: "Lisa Rodriguez", dayOfWeek: 0, startTime: "08:00", endTime: "18:00", isAvailable: true, facility: "Paws & Play Daycare" },

  // Tom Anderson - New employee, weekdays
  { id: 31, staffId: 9, staffName: "Tom Anderson", dayOfWeek: 1, startTime: "08:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 32, staffId: 9, staffName: "Tom Anderson", dayOfWeek: 2, startTime: "08:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 33, staffId: 9, staffName: "Tom Anderson", dayOfWeek: 3, startTime: "08:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 34, staffId: 9, staffName: "Tom Anderson", dayOfWeek: 4, startTime: "08:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
  { id: 35, staffId: 9, staffName: "Tom Anderson", dayOfWeek: 5, startTime: "08:00", endTime: "16:00", isAvailable: true, facility: "Paws & Play Daycare" },
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
    startDate: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(nextMonth.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "Family vacation to Hawaii",
    status: "approved",
    requestedAt: lastWeek.toISOString().split("T")[0],
    reviewedBy: 1,
    reviewedByName: "Admin User",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewNotes: "Approved. Coverage arranged with Tom.",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 5,
    staffName: "Emily Davis",
    type: "personal",
    startDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
    startDate: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(lastWeek.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "Flu symptoms",
    status: "approved",
    requestedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewedBy: 2,
    reviewedByName: "Manager One",
    reviewedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewNotes: "Get well soon!",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 9,
    staffName: "Tom Anderson",
    type: "vacation",
    startDate: new Date(nextMonth.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(nextMonth.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "Wedding anniversary trip",
    status: "pending",
    requestedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    type: "bereavement",
    startDate: new Date(lastWeek.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(lastWeek.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "Family emergency",
    status: "approved",
    requestedAt: new Date(lastWeek.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewedBy: 1,
    reviewedByName: "Admin User",
    reviewedAt: new Date(lastWeek.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewNotes: "Our condolences. Take the time you need.",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    staffId: 5,
    staffName: "Emily Davis",
    type: "vacation",
    startDate: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(nextMonth.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reason: "Long weekend getaway",
    status: "denied",
    requestedAt: new Date(lastWeek.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewedBy: 2,
    reviewedByName: "Manager One",
    reviewedAt: new Date(lastWeek.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    reviewNotes: "Sorry, we have too many staff off during this period. Please choose different dates.",
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
    hourlyRate: 35.00,
    overtimeRate: 52.50,
    effectiveFrom: "2025-01-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 2,
    staffId: 2,
    staffName: "Manager One",
    role: "Manager",
    hourlyRate: 28.00,
    overtimeRate: 42.00,
    effectiveFrom: "2025-06-10",
    facility: "Paws & Play Daycare",
  },
  {
    id: 3,
    staffId: 3,
    staffName: "Mike Chen",
    role: "Staff",
    hourlyRate: 18.00,
    overtimeRate: 27.00,
    effectiveFrom: "2025-04-10",
    facility: "Paws & Play Daycare",
  },
  {
    id: 4,
    staffId: 4,
    staffName: "Sarah Johnson",
    role: "Manager",
    hourlyRate: 30.00,
    overtimeRate: 45.00,
    effectiveFrom: "2025-02-15",
    facility: "Paws & Play Daycare",
  },
  {
    id: 5,
    staffId: 5,
    staffName: "Emily Davis",
    role: "Staff",
    hourlyRate: 17.50,
    overtimeRate: 26.25,
    effectiveFrom: "2025-07-22",
    facility: "Paws & Play Daycare",
  },
  {
    id: 6,
    staffId: 7,
    staffName: "David Wilson",
    role: "Staff",
    hourlyRate: 18.50,
    overtimeRate: 27.75,
    effectiveFrom: "2025-09-05",
    facility: "Paws & Play Daycare",
  },
  {
    id: 7,
    staffId: 8,
    staffName: "Lisa Rodriguez",
    role: "Staff",
    hourlyRate: 19.00,
    overtimeRate: 28.50,
    effectiveFrom: "2025-01-30",
    facility: "Paws & Play Daycare",
  },
  {
    id: 8,
    staffId: 9,
    staffName: "Tom Anderson",
    role: "Staff",
    hourlyRate: 16.50,
    overtimeRate: 24.75,
    effectiveFrom: "2025-11-01",
    facility: "Paws & Play Daycare",
  },
];
