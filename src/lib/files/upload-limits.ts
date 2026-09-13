// ============================================================================
// What an upload may be.
//
// The routes refuse anything else (lib/api/file-type.ts sniffs the bytes, and
// the buckets and CHECK constraints hold the same limit and, for a photo, the
// same three types), and a screen has to say so before somebody picks a file.
// That module is server-only, so the numbers a form shows live here, with no
// import that would keep them out of the browser. file-type.ts reads its
// limit from here, so a route and a screen cannot disagree about it.
// ============================================================================

/** 10 MB: the file_size_limit on the upload buckets, and the CHECK beside it. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** For a file picker. `.heic` too: some systems report no type for one. */
export const PHOTO_ACCEPT = "image/png,image/jpeg,image/heic,.heic";
