"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// A medication's label photo (2026-10-01) — /api/bookings/[ref]/medication-
// photos. The booking form uploads a photo after the booking is saved, since
// the file belongs to a booking that has to exist first; the booking page
// reads the newest of each medication.
//
// The key sits outside ["bookings"]: a booking refetch should not re-sign
// every photo URL, and a photo change should not refetch every booking.
// ============================================================================

export interface MedicationPhoto {
  id: string;
  medicationId: string;
  /** Signed for a minute: fetch again to open it later. */
  url: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

const medicationPhotoQueries = {
  forBooking: (ref: number) => ({
    queryKey: ["medication-photos", ref] as const,
    queryFn: async (): Promise<MedicationPhoto[]> => {
      const response = await fetch(`/api/bookings/${ref}/medication-photos`);
      if (!response.ok) {
        throw new Error(`Could not load the label photos (${response.status})`);
      }
      return (await response.json()) as MedicationPhoto[];
    },
  }),
};

/** The booking's label photos, newest of each medication; none without a ref. */
export function useMedicationPhotos(ref: number | undefined) {
  return useQuery({
    ...medicationPhotoQueries.forBooking(ref ?? 0),
    enabled: typeof ref === "number" && ref > 0,
  });
}

export function useInvalidateMedicationPhotos() {
  const queryClient = useQueryClient();
  return (ref: number) =>
    queryClient.invalidateQueries({
      queryKey: medicationPhotoQueries.forBooking(ref).queryKey,
    });
}

/** A refusal the form can name: too large, not a photo, or not allowed. */
class MedicationPhotoError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MedicationPhotoError";
    this.status = status;
  }
}

async function refusal(response: Response): Promise<MedicationPhotoError> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new MedicationPhotoError(
    body?.error ?? `Request failed (${response.status})`,
    response.status,
  );
}

export async function uploadMedicationPhoto(
  ref: number,
  medicationId: string,
  file: File,
): Promise<MedicationPhoto> {
  const form = new FormData();
  form.set("file", file);
  form.set("medicationId", medicationId);
  const response = await fetch(`/api/bookings/${ref}/medication-photos`, {
    method: "POST",
    body: form,
  });
  if (response.status !== 201) throw await refusal(response);
  return (await response.json()) as MedicationPhoto;
}

export async function deleteMedicationPhoto(
  ref: number,
  medicationId: string,
): Promise<void> {
  const response = await fetch(
    `/api/bookings/${ref}/medication-photos?medicationId=${encodeURIComponent(medicationId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw await refusal(response);
}
