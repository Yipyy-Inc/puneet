"use client";

import { useEffect, useRef, useState } from "react";

import {
  deleteMedicationPhoto,
  uploadMedicationPhoto,
  useInvalidateMedicationPhotos,
  useMedicationPhotos,
} from "@/lib/api/booking-medication-photos";

// ============================================================================
// The label photos of the medications being booked (2026-10-01), where the
// facility asks for one. A photo belongs to a booking, and a new booking does
// not exist until the form is saved — so the form keeps each photo as a file
// with a local preview, and `flush` sends them once the booking has its ref.
// Editing a booking shows the photos it already has, and changes them the
// same way: nothing is written until Save.
//
// Called once, by the booking form, and handed to the Medications step on its
// state, so the editor and the cards read the same photos.
// ============================================================================

export interface LabelPhoto {
  /** A local preview, or the stored photo's signed URL. */
  url: string;
  name: string;
  sizeBytes: number;
  /** Chosen on this form, and not yet sent. */
  pending: boolean;
}

export interface LabelPhotos {
  photoFor: (medicationId: string) => LabelPhoto | null;
  attach: (medicationId: string, file: File) => void;
  detach: (medicationId: string) => void;
  /** Something chosen or removed is waiting for Save. */
  changed: boolean;
  /**
   * Sends what was chosen and removed, for the medications still booked.
   * Resolves with the names of the medications whose photo did not save.
   */
  flush: (
    ref: number,
    medications: readonly { id: string; name: string }[],
  ) => Promise<string[]>;
  reset: () => void;
}

interface Pending {
  file: File;
  preview: string;
}

export function useLabelPhotos(editingRef?: number): LabelPhotos {
  const stored = useMedicationPhotos(editingRef);
  const invalidate = useInvalidateMedicationPhotos();
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  // Every preview made, so none outlives the form.
  const previews = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const storedFor = (medicationId: string) =>
    (stored.data ?? []).find((photo) => photo.medicationId === medicationId);

  return {
    photoFor: (medicationId) => {
      const chosen = pending[medicationId];
      if (chosen) {
        return {
          url: chosen.preview,
          name: chosen.file.name,
          sizeBytes: chosen.file.size,
          pending: true,
        };
      }
      if (removed.includes(medicationId)) return null;
      const photo = storedFor(medicationId);
      return photo
        ? {
            url: photo.url,
            name: photo.name,
            sizeBytes: photo.sizeBytes,
            pending: false,
          }
        : null;
    },
    attach: (medicationId, file) => {
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      setPending((current) => ({
        ...current,
        [medicationId]: { file, preview },
      }));
      setRemoved((current) => current.filter((id) => id !== medicationId));
    },
    detach: (medicationId) => {
      setPending((current) => {
        const { [medicationId]: _gone, ...rest } = current;
        return rest;
      });
      if (storedFor(medicationId)) {
        setRemoved((current) =>
          current.includes(medicationId) ? current : [...current, medicationId],
        );
      }
    },
    changed: Object.keys(pending).length > 0 || removed.length > 0,
    flush: async (ref, medications) => {
      const booked = new Map(medications.map((item) => [item.id, item.name]));
      const uploads = Object.entries(pending).filter(([id]) => booked.has(id));
      const removals = removed.filter(
        (id) => booked.has(id) && !(id in pending),
      );
      const results = await Promise.allSettled([
        ...uploads.map(([id, chosen]) =>
          uploadMedicationPhoto(ref, id, chosen.file).then(() => id),
        ),
        ...removals.map((id) => deleteMedicationPhoto(ref, id).then(() => id)),
      ]);
      const ids = [...uploads.map(([id]) => id), ...removals];
      void invalidate(ref);
      return results.flatMap((result, index) =>
        result.status === "rejected" ? [booked.get(ids[index]) ?? ""] : [],
      );
    },
    reset: () => {
      setPending({});
      setRemoved([]);
    },
  };
}
