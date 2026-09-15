// ============================================================================
// Small helpers the operations calendar and its drawer share.
//
// This file also held vaccine, signed-agreement, visit-history and note
// lookups over `src/data/pet-data`, `src/data/documents`, `src/data/settings`
// and `src/data/tags-notes`, matched to real bookings by numeric id. None of
// the vaccine, agreement or history helpers had a caller, and the note lookups
// seeded the drawer with fixture notes signed "System". They are gone; the
// drawer's Notes tab reads the booking's real notes through `NotesList`.
// ============================================================================

export interface NoteSectionState {
  content: string;
  lastEditedBy: string;
  lastEditedAt: string;
}

export function toDisplayRole(role: string): string {
  return role
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatLocalDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount ?? 0);
}
