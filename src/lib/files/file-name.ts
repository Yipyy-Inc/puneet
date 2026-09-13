// ============================================================================
// A file name shortened in the MIDDLE (§5t).
//
// Filenames end in the part that matters — "vaccination-record-kofi-FINAL.pdf"
// — so the end and the extension survive, and the middle gives way. CSS can
// only cut the end, which is why this is a string function; the full name
// still belongs in a `title` or an accessible label beside it.
// ============================================================================

/** The extension kept whole when a name is shortened: a dot, then up to 7. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
}

export function middleTruncate(name: string, max = 32): string {
  if (name.length <= max) return name;
  const extension = extensionOf(name);
  const base = extension ? name.slice(0, -extension.length) : name;
  // One character is the ellipsis.
  const budget = Math.max(2, max - extension.length - 1);
  const head = Math.ceil(budget * 0.6);
  const tail = budget - head;
  return `${base.slice(0, head)}…${tail > 0 ? base.slice(-tail) : ""}${extension}`;
}

const UPLOAD_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

/**
 * The name a file was uploaded with, from where a bucket keeps it —
 * `{facility}/{form}/{uuid}-{name}` — without the folders, or the uuid that
 * keeps two uploads of IMG_0001.jpg apart.
 */
export function uploadedFileName(storagePath: string): string {
  const file = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  return UPLOAD_PREFIX.test(file) ? file.slice(37) : file;
}
