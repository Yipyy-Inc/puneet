import "server-only";

// ============================================================================
// What a file actually is, as opposed to what the browser said it is.
//
// A multipart upload carries a Content-Type the CLIENT chose. It is a hint, and
// a hostile one costs nothing to forge: `evil.exe` announced as
// `application/pdf` passes any check that reads the header. So the bytes are
// read instead, and the header is discarded — the row records what was found.
//
// Magic numbers only, deliberately, rather than a parsing library:
//   • it is four signatures, and a dependency that reads arbitrary file formats
//     to decide whether to accept them is a larger attack surface than the
//     problem it solves
//   • an unrecognised file is REFUSED rather than guessed at, so the failure
//     mode of this function is "no", not "probably fine"
//
// This is the real defence. The CHECK constraint on staff_documents.content_type
// is the floor under it: PostgREST is reachable without this route, so the
// database must refuse an executable even when nothing sniffed it.
// ============================================================================

export type AllowedContentType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/heic";

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0): boolean =>
  sig.every((b, i) => bytes[offset + i] === b);

/**
 * Returns the content type the BYTES prove, or null when they prove none.
 *
 * Null means refuse. It never falls back to the declared type — that would
 * reintroduce exactly the trust this function exists to remove.
 */
export function sniffContentType(bytes: Uint8Array): AllowedContentType | null {
  // %PDF
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";

  // \x89PNG\r\n\x1a\n
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // HEIC: an ISO-BMFF box whose brand at offset 8 is `ftypheic`/`heix`/`mif1`.
  // Phones produce these constantly, so refusing them would mean telling a hire
  // their photo of their own passport is not a file.
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (["heic", "heix", "hevc", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }

  return null;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * The image subset, for callers that accept photos and not documents.
 *
 * A separate function rather than a flag on `sniffContentType`, because the
 * grooming-photos bucket's `allowed_mime_types` and the CHECK on
 * `grooming_photos.content_type` both list exactly these three. Three places
 * naming the same set is already one too many; a boolean parameter would make
 * the fourth one invisible at the call site.
 *
 * Null still means refuse. A PDF is a real file that this particular caller has
 * no use for, and answering "no" is the correct answer to "is this a photo".
 */
export function sniffImageContentType(
  bytes: Uint8Array,
): Exclude<AllowedContentType, "application/pdf"> | null {
  const found = sniffContentType(bytes);
  return found === null || found === "application/pdf" ? null : found;
}
