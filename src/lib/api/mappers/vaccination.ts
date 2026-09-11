import { z } from "zod";

import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// public.pet_vaccinations ⇄ the `VaccinationRecord` the client file reads.
//
// The pet is named by its numeric `ref`, the same number every facility screen
// already holds, and read back through the embedded `pets(ref)` — so the
// record carries no uuid the screen would have to translate.
//
// ONE reason column in the table (`review_reason`), two fields on the screen
// type: a rejection reason and an exception note are the same fact under two
// statuses, and the mapper puts it under the one the status names.
// ============================================================================

export const VACCINATION_SELECT =
  "id, pet_id, vaccine_name, administered_on, expires_on, veterinarian_name, veterinary_clinic, document_url, status, reviewed_by, reviewed_at, review_reason, notes, created_at, pets!inner(ref, client_id, clients!inner(ref))";

export type VaccinationStatus = NonNullable<VaccinationRecord["status"]>;

export type VaccinationRow = {
  id: string;
  pet_id: string;
  vaccine_name: string;
  administered_on: string | null;
  expires_on: string | null;
  veterinarian_name: string | null;
  veterinary_clinic: string | null;
  document_url: string | null;
  status: VaccinationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  notes: string | null;
  created_at: string;
  pets: { ref: number; client_id: string; clients: { ref: number } };
};

/** The record, plus the owner's ref so a list can be grouped by client. */
export type Vaccination = VaccinationRecord & { clientId: number };

export function rowToVaccination(row: VaccinationRow): Vaccination {
  return {
    id: row.id,
    petId: row.pets.ref,
    clientId: row.pets.clients.ref,
    vaccineName: row.vaccine_name,
    administeredDate: row.administered_on ?? "",
    // A record with no expiry never lapses; the screens compare dates, so it
    // is carried as the empty string and read as "no expiry".
    expiryDate: row.expires_on ?? "",
    veterinarianName: row.veterinarian_name ?? undefined,
    veterinaryClinic: row.veterinary_clinic ?? undefined,
    documentUrl: row.document_url ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    rejectionReason:
      row.status === "rejected" ? (row.review_reason ?? undefined) : undefined,
    exceptionReason:
      row.status === "exception" ? (row.review_reason ?? undefined) : undefined,
  };
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A date is YYYY-MM-DD.");

export const vaccinationWriteSchema = z.object({
  petRef: z.number().int().positive(),
  vaccineName: z.string().trim().min(1).max(200),
  administeredDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  veterinarianName: z.string().trim().max(200).optional(),
  veterinaryClinic: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  /**
   * Staff entering a record they are holding the certificate for approve it
   * as they enter it; one keyed from a phone call can wait for review.
   */
  status: z.enum(["pending_review", "approved"]).optional(),
});
export type VaccinationWrite = z.infer<typeof vaccinationWriteSchema>;

export const vaccinationPatchSchema = z
  .object({
    status: z
      .enum(["pending_review", "approved", "rejected", "exception"])
      .optional(),
    reviewReason: z.string().trim().max(2000).optional(),
    vaccineName: z.string().trim().min(1).max(200).optional(),
    administeredDate: isoDate.nullable().optional(),
    expiryDate: isoDate.nullable().optional(),
    veterinarianName: z.string().trim().max(200).optional(),
    veterinaryClinic: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");
export type VaccinationPatch = z.infer<typeof vaccinationPatchSchema>;
