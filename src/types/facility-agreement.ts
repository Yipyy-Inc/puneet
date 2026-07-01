// Legal documents & agreements between a facility and Yipyy. Managed by Super
// Admins (upload / request signature); facility owners view & download only.
// This is also the data source for the global Agreements report (FB-19).

export type AgreementType = "Agreement" | "Waiver" | "Amendment" | "Addendum";

// "signed" = an executed document on file; "pending" = sent to the facility's
// primary contact for e-signature and not yet countersigned.
export type AgreementStatus = "signed" | "pending";

export interface FacilityAgreement {
  id: string;
  facilityId: number;
  name: string;
  type: AgreementType;
  /** ISO date the document was signed; null while a signature is pending. */
  dateSigned: string | null;
  /** Facility owner (or authorised signer) name; empty while pending. */
  signedBy: string;
  /** Document version, e.g. "1.0", "2.1". */
  version: string;
  status: AgreementStatus;
}
