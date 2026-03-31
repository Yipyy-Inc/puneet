// ============================================================================
// Task Templates — define what tasks auto-generate per service module
// ============================================================================

export interface TaskTemplate {
  id: string;
  moduleId: string; // "boarding" | "daycare" | "grooming" | "training" | custom slug
  name: string;
  description?: string;
  category: "setup" | "execution" | "cleanup" | "transport" | "care" | "custom";
  timing: {
    type:
      | "before_start"
      | "at_start"
      | "during"
      | "at_end"
      | "after_end"
      | "custom_time";
    offsetMinutes?: number; // e.g., -15 = 15 min before start
    customTime?: string; // for fixed-time tasks like "08:00"
  };
  durationMinutes?: number;
  assignTo?: "booking_staff" | "any_available" | "specific_role";
  requiredRole?: string;
  isRequired: boolean; // must be completed before checkout?
  autoCreate: boolean; // auto-create on booking confirmation?
  recurring?: {
    frequency: "daily" | "per_meal" | "per_medication";
    times?: string[]; // e.g., ["08:00", "18:00"] for feeding
  };
}

// ============================================================================
// Generated Tasks — concrete task instances linked to a booking
// ============================================================================

export interface GeneratedTask {
  id: string;
  bookingId: number;
  moduleId: string;
  templateId: string;
  name: string;
  description?: string;
  category: string;
  scheduledAt: string; // ISO datetime
  durationMinutes?: number;
  assignedTo?: string; // staff name
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt?: string;
  completedBy?: string;
  isRequired: boolean;
  petName: string;
  ownerName: string;
  notes?: string;
}
