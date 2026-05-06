import type { KennelStatus } from "@/types/base";

export type BookingWorkflowStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface OccupancyKennel {
  id: string;
  name: string;
  categoryId: string;
  status: KennelStatus;
  bookingStatus?: BookingWorkflowStatus;
  paymentStatus?: PaymentStatus;
  bookingId?: number;
  petId?: number;
  petName?: string;
  petPhotoUrl?: string;
  petBreed?: string;
  petSize?: "small" | "medium" | "large" | "xlarge";
  petSpecies?: "dog" | "cat";
  clientName?: string;
  clientPhone?: string;
  clientPhotoUrl?: string;
  checkIn?: string;
  checkOut?: string;
  checkInTime?: string;
  checkOutTime?: string;
  dailyRate: number;
  hasFeedingInstructions?: boolean;
  hasMedications?: boolean;
  specialRequests?: string;
}

export interface RoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export interface CalendarFilterState {
  categoryIds: string[];
  bookingStatuses: BookingWorkflowStatus[];
  petSizes: Array<"small" | "medium" | "large" | "xlarge">;
  species: Array<"dog" | "cat">;
  arrivalDepartureFocus: "none" | "arrivals" | "departures";
}

export const DEFAULT_FILTER_STATE: CalendarFilterState = {
  categoryIds: [],
  bookingStatuses: [],
  petSizes: [],
  species: [],
  arrivalDepartureFocus: "none",
};
