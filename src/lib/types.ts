export interface Evaluation {
  id: string;
  petId: number;
  status: "pending" | "passed" | "failed" | "outdated";
  evaluatedAt?: string;
  evaluatedBy?: string;
  notes?: string;
}

export interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  imageUrl?: string;
  evaluations?: Evaluation[];
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  imageUrl?: string;
  pets: Pet[];
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

export interface FeedingScheduleItem {
  id: string;
  petId?: number;
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

export interface MedicationItem {
  id: string;
  petId?: number;
  name: string;
  time: string[];
  amount: string;
  unit: string;
  type: string;
  source?: string;
  instructions: string;
  notes: string;
}

export interface DaycareDateTime {
  date: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface ExtraService {
  serviceId: string;
  quantity: number;
  petId: number;
}

export interface Task {
  id: string;
  bookingId: number;
  petId: number;
  type: "feeding" | "medication" | "service" | "walking";
  title: string;
  time: string | null;
  details: string;
  assignedStaff?: string;
  completionStatus: "pending" | "in_progress" | "completed" | "cancelled";
  assignable: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface NewBooking {
  clientId: number;
  petId: number | number[];
  facilityId: number;
  service: string;
  serviceType?: string;
  startDate: string;
  endDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  basePrice: number;
  discount: number;
  discountReason?: string;
  totalCost: number;
  paymentStatus: "pending" | "paid" | "refunded";
  specialRequests?: string;
  notificationEmail?: boolean;
  notificationSMS?: boolean;
  // Service-specific fields
  daycareSelectedDates?: string[]; // ISO date strings for multi-date daycare
  daycareDateTimes?: DaycareDateTime[];
  groomingStyle?: string;
  groomingAddOns?: string[];
  stylistPreference?: string;
  trainingType?: string;
  trainerId?: string;
  trainingGoals?: string;
  vetReason?: string;
  vetSymptoms?: string;
  isEmergency?: boolean;
  kennel?: string;
  feedingSchedule?: FeedingScheduleItem[];
  walkSchedule?: string;
  medications?: MedicationItem[];
  extraServices?: ExtraService[];
}

export interface Booking extends NewBooking {
  id: number;
  paymentMethod?: "cash" | "card";
  refundMethod?: "card" | "store_credit";
  refundAmount?: number;
  cancellationReason?: string;
}
