import type { ReportCardPhoto } from "@/types/report-card";

/** A photo that actually signed, and so has something to render. */
export type UsablePhoto = ReportCardPhoto & { url: string };

/**
 * Drop the photos that did not sign.
 *
 * `url` is nullable because the bucket is private and signing can fail; the
 * type says so, and an `as string` over it puts `null` into an `src`.
 * Narrowing with a predicate keeps the compiler on the hook instead — an
 * unsigned path renders no photo, which reads better to an owner than a broken
 * one.
 *
 * In `lib/` rather than beside the customer components because the facility's
 * client file and pet file render the same photos.
 */
export const usablePhotos = (photos: ReportCardPhoto[]): UsablePhoto[] =>
  photos.filter(
    (p): p is UsablePhoto => typeof p.url === "string" && p.url !== "",
  );
