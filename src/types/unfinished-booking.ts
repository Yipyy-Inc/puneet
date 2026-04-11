// ============================================================================
// Unfinished Booking Types
// Tracks customers who started but did not complete a reservation.
// ============================================================================

export type AbandonmentStep =
  | "service_selection"
  | "pet_selection"
  | "date_and_details"
  | "add_ons"
  | "forms"
  | "review"
  | "payment";

export type UnfinishedBookingStatus = "abandoned" | "contacted" | "recovered";

export interface UnfinishedBooking {
  id: string;
  /** Set when the abandoner already has a client profile */
  clientId?: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  petName?: string;
  petType?: "dog" | "cat";
  service?: string;
  serviceType?: string;
  requestedStartDate?: string;
  requestedEndDate?: string;
  facilityId: number;
  /** ISO timestamp of when the session was last active */
  abandonedAt: string;
  /** The step in the booking wizard where they dropped off */
  abandonmentStep: AbandonmentStep;
  status: UnfinishedBookingStatus;
  lastContactedAt?: string;
  staffNotes?: string;
  /** Estimated value of the booking they would have completed */
  estimatedValue?: number;
}
