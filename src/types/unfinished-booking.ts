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

// ============================================================================
// Abandonment Recovery Settings
// Per-facility config for automated outreach when bookings are abandoned.
// ============================================================================

export type AbandonmentRecoveryChannel = "email" | "sms" | "both" | "off";

export interface AbandonmentStepAutomation {
  /** Whether this step-level rule is active */
  enabled: boolean;
  /** Channel override; "inherit" = use the facility-level default */
  channel: AbandonmentRecoveryChannel | "inherit";
  /** Hours after abandonment to send; "inherit" = use the facility-level default */
  delayHours: number | "inherit";
  emailSubject: string;
  emailBody: string;
  smsBody: string;
}

export interface AbandonmentRecoverySettings {
  /** Master switch — disabling this stops all abandonment automation */
  enabled: boolean;
  /** Default channel applied to every step that uses "inherit" */
  defaultChannel: AbandonmentRecoveryChannel;
  /** Default hours after abandonment before sending, for steps that inherit */
  defaultDelayHours: number;
  /** One entry per abandonment step */
  stepRules: Record<AbandonmentStep, AbandonmentStepAutomation>;
}

export interface UnfinishedBookingNote {
  id: string;
  text: string;
  /** ISO timestamp */
  createdAt: string;
  /** Display name of the staff member who wrote the note */
  staffName: string;
}

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
  /** Chronological staff notes with timestamps */
  notes?: UnfinishedBookingNote[];
  /** Estimated value of the booking they would have completed */
  estimatedValue?: number;
}
