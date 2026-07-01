export type FacilityTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

/** A support ticket submitted by a facility from the Support Center panel. */
export interface FacilityTicket {
  id: string;
  /** Human-facing ticket number, e.g. "TKT-1042". */
  number: string;
  facilityId: number;
  subject: string;
  category: string;
  description: string;
  attachmentName?: string;
  status: FacilityTicketStatus;
  /** ISO timestamp. */
  createdAt: string;
}
