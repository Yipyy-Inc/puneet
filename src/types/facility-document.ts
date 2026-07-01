export type FacilityDocumentType =
  | "Agreement"
  | "Terms"
  | "Amendment"
  | "Addendum"
  | "Liability Waiver"
  | "Intake Form"
  | "Contract"
  | "Other";

/** A document shown on the facility Documents page. */
export interface FacilityDocument {
  id: string;
  name: string;
  type: FacilityDocumentType;
  /** ISO date the document was added. */
  dateAdded: string;
  /**
   * "platform" = uploaded by the Yipyy Super Admin (read-only for the facility);
   * "facility" = the facility's own waiver/intake PDFs (upload/rename/delete).
   */
  source: "platform" | "facility";
  /** Approximate size in KB (for display only — no real file storage). */
  sizeKb?: number;
}
