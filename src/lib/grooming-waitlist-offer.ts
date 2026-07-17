// Intelligent-Waitlist auto-offer (Spec Table 96). Pure helpers that build the
// customer-facing offer message + the deep link that jumps them to a pre-filled
// confirm step, plus the 4-hour confirmation window. Mock: no real SMS/email —
// callers surface the string via toast + the notification feed.

import type { GroomingWaitlistEntry } from "@/data/grooming-waitlist";

/** Confirmation window (minutes) once a slot is offered — 4 hours (Table 96). */
export const WAITLIST_OFFER_WINDOW_MINUTES = 240;

/**
 * Deep link that jumps the client to the grooming booking flow pre-filled at
 * the confirm step for this offered slot. The flow reads `waitlistOffer` to
 * rehydrate pet + service + date/time. Mock route — no backend token yet.
 */
export function buildWaitlistOfferLink(entryId: string): string {
  return `/customer/grooming/book?waitlistOffer=${encodeURIComponent(entryId)}`;
}

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function formatOfferDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (mo ?? 1) - 1, d ?? 1, 12);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export interface WaitlistOfferMessageInput {
  petName: string;
  /** YYYY-MM-DD of the offered slot. */
  date: string;
  /** HH:MM start of the offered slot. */
  time: string;
  /** Groomer name, or undefined when the entry accepts "any". */
  groomerName?: string;
  /** Booking deep link — defaults to {@link buildWaitlistOfferLink}. */
  link: string;
  /** Expiry window in hours (defaults to 4). */
  expiryHours?: number;
}

/**
 * The Table 96 auto-offer copy, sent by SMS + email when a matching slot opens:
 * "{Pet}'s grooming slot is available! {Date} at {Time} with {Groomer/Any}.
 *  Click to book: {link} — expires in 4 hours."
 */
export function buildWaitlistOfferMessage(
  input: WaitlistOfferMessageInput,
): string {
  const { petName, date, time, groomerName, link } = input;
  const expiryHours = input.expiryHours ?? WAITLIST_OFFER_WINDOW_MINUTES / 60;
  const withWhom = groomerName ? `with ${groomerName}` : "with any groomer";
  return `${petName}'s grooming slot is available! ${formatOfferDate(
    date,
  )} at ${to12Hour(time)} ${withWhom}. Click to book: ${link} — expires in ${expiryHours} hours.`;
}

/** Convenience: build the message straight from a waitlist entry + slot. */
export function buildWaitlistOfferForEntry(
  entry: GroomingWaitlistEntry,
  slot: { date: string; startTime: string; groomerName?: string },
): { message: string; link: string } {
  const link = buildWaitlistOfferLink(entry.id);
  const message = buildWaitlistOfferMessage({
    petName: entry.petName,
    date: slot.date,
    time: slot.startTime,
    groomerName: slot.groomerName,
    link,
  });
  return { message, link };
}
