// When a groomer or a trainer can take an appointment — the shape both
// availability routes answer with (`/api/grooming/availability`,
// `/api/training/availability` and their customer twins), apart from the
// server-only code that computes it, so a client can name it.

export interface AvailablePerson {
  /** What a booking names them by: a stylist profile's app id for a groomer,
   *  the staff app id for a trainer. */
  id: string;
  /** Staff: the full name. A customer: "Maya R.", or null when the facility
   *  keeps this person's name off the online booking. */
  name: string | null;
  /** The facility's own words: specialisations. */
  role: string | null;
  /** Grooming: the packages they groom (app ids); empty is every package. */
  packageIds: string[];
  /** Grooming: they take a matted coat. */
  canHandleMatted: boolean;
}

export interface AvailabilityDay {
  date: string;
  /** Open starts (minutes from midnight) by person id. */
  starts: Record<string, number[]>;
}

export interface StaffAvailability {
  staff: AvailablePerson[];
  days: AvailabilityDay[];
}
