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
  /**
   * How many pets are in this unit right now, across EVERY stay holding it.
   *
   * `petName` above is the first pet of the first stay, which is all a room
   * square needs. An AREA holds several stays at once and is counted in PETS
   * (MoeGo: "an area remains available until the number of assigned pets
   * reaches the maximum limit"), so the count cannot be derived from one row.
   */
  petCount?: number;
  /**
   * Every stay holding this unit, when there is more than one.
   *
   * Absent or of length one is a ROOM and behaves exactly as it always has —
   * the fields above describe the single guest. Longer is an AREA, which the
   * board expands into one LANE per stay so a busy yard reads as a busy yard
   * rather than as whichever guest happened to sort first.
   */
  stays?: OccupancyStay[];
  /**
   * A React key for one lane of an expanded area row.
   *
   * NOT the room id — `id` stays the unit, because drag, drop, blocking and
   * the cell grid all address the unit and must keep doing so.
   */
  laneKey?: string;
  /** Which lane this is. Only lane 0 draws the unit's name and rate. */
  laneIndex?: number;
  /** How many lanes this unit was expanded into. 1 for every room. */
  laneCount?: number;
  hasFeedingInstructions?: boolean;
  hasMedications?: boolean;
  specialRequests?: string;
}

/**
 * One stay holding a unit, for a unit that can hold several at once.
 *
 * A ROOM holds one family and the fields on `OccupancyKennel` describe it.
 * An AREA is counted in pets and holds several stays side by side, so the
 * board has to know about all of them or it draws a busy yard as one guest.
 */
export interface OccupancyStay {
  bookingId?: number;
  petId?: number;
  petName?: string;
  petSpecies?: "dog" | "cat";
  clientName?: string;
  checkIn?: string;
  checkOut?: string;
  status: KennelStatus;
  bookingStatus?: BookingWorkflowStatus;
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
