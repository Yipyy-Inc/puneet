// Global admin search — queries across the 5 super-admin entity types.
// Wrapped as a TanStack Query factory so the search bar can debounce + cache by
// term. Swapping to a real backend later means changing only the queryFn.

import { supportTickets } from "@/data/support-tickets";
import { adminUsers, roleDisplayNames } from "@/data/admin-users";
import { buildPlatformInvoices } from "@/data/platform-invoices";
import type { EnhancedAnnouncement } from "@/types/announcement";
import type { AdminFacilityRow } from "@/types/admin-facility";
import type { AdminBookingMatch } from "@/app/api/admin/bookings/route";
import { bookingRefCandidates, formatBookingRef } from "@/lib/booking-id";

export type AdminEntityType =
  | "booking"
  | "facility"
  | "invoice"
  | "ticket"
  | "team"
  | "announcement";

export interface AdminSearchResult {
  entityType: AdminEntityType;
  id: string;
  href: string;
  primaryText: string;
  secondaryText: string;
}

/** Minimum characters before the dropdown queries. */
export const ADMIN_SEARCH_MIN_CHARS = 2;
/** Max results shown per entity group. */
const PER_GROUP = 5;

/**
 * The real facilities (/api/facilities, platform admins only). This group
 * read the `@/data/facilities` fixture and linked to its NUMERIC ids, which
 * the detail page — resolving real uuids — answered with a 404.
 */
async function platformFacilities(): Promise<AdminFacilityRow[]> {
  try {
    const response = await fetch("/api/facilities");
    if (!response.ok) return [];
    return (await response.json()) as AdminFacilityRow[];
  } catch {
    return [];
  }
}

/**
 * A booking, when the term is a number that could be one — "#10896" or
 * "896" (bookingRefCandidates). Any facility's, with its facility named.
 */
async function bookingMatches(term: string): Promise<AdminBookingMatch[]> {
  if (bookingRefCandidates(term).length === 0) return [];
  try {
    const response = await fetch(
      `/api/admin/bookings?q=${encodeURIComponent(term)}`,
    );
    if (!response.ok) return [];
    return (await response.json()) as AdminBookingMatch[];
  } catch {
    return [];
  }
}

function makeMatcher(term: string) {
  return (...values: (string | number | null | undefined)[]) =>
    values.some((v) => v != null && String(v).toLowerCase().includes(term));
}

/**
 * The real platform announcements (20260918103842). The other four groups
 * still read fixtures; this one read a fixture too, and linked to a page that
 * edited it. A failed read leaves the group empty rather than failing the
 * whole search.
 */
async function platformAnnouncements(): Promise<EnhancedAnnouncement[]> {
  try {
    const response = await fetch("/api/admin/announcements");
    if (!response.ok) return [];
    const body = (await response.json()) as {
      announcements?: EnhancedAnnouncement[];
    };
    return body.announcements ?? [];
  } catch {
    return [];
  }
}

export async function searchAdminEntities(
  rawTerm: string,
): Promise<AdminSearchResult[]> {
  const term = rawTerm.trim().toLowerCase();
  if (term.length < ADMIN_SEARCH_MIN_CHARS) return [];
  const match = makeMatcher(term);

  const [facilityRows, bookingRows] = await Promise.all([
    platformFacilities(),
    bookingMatches(rawTerm),
  ]);

  // Bookings — by number, across every facility
  const bookingResults: AdminSearchResult[] = bookingRows
    .slice(0, PER_GROUP)
    .map((b) => ({
      entityType: "booking" as const,
      id: String(b.ref),
      href: `/dashboard/bookings/${b.ref}`,
      primaryText: `${formatBookingRef(b.ref)} · ${b.facilityName}`,
      secondaryText: [b.clientName, b.service].filter(Boolean).join(" · "),
    }));

  // Facilities — name / slug / owner email
  const facilityResults: AdminSearchResult[] = facilityRows
    .filter((f) => match(f.name, f.slug, f.owner?.email))
    .slice(0, PER_GROUP)
    .map((f) => ({
      entityType: "facility" as const,
      id: f.id,
      href: `/dashboard/facilities/${f.id}`,
      primaryText: f.name,
      secondaryText: [f.slug, f.owner?.email].filter(Boolean).join(" · "),
    }));

  // Invoices — number / amount (+ facility)
  const invoiceResults: AdminSearchResult[] = buildPlatformInvoices(new Date())
    .filter((i) => match(i.number, i.amount, i.facilityName))
    .slice(0, PER_GROUP)
    .map((i) => ({
      entityType: "invoice" as const,
      id: i.id,
      href: `/dashboard/commercial/invoices?invoice=${encodeURIComponent(i.id)}`,
      primaryText: i.number,
      secondaryText: `${i.facilityName} · $${i.amount.toLocaleString()} · ${i.status}`,
    }));

  // Support tickets — ID / subject
  const ticketResults: AdminSearchResult[] = supportTickets
    .filter((t) => match(t.id, t.title))
    .slice(0, PER_GROUP)
    .map((t) => ({
      entityType: "ticket" as const,
      id: t.id,
      href: `/dashboard/support/tickets/${t.id}`,
      primaryText: t.title,
      secondaryText: `${t.id} · ${t.status}`,
    }));

  // Team members — name / email
  const teamResults: AdminSearchResult[] = adminUsers
    .filter((u) => match(u.name, u.email))
    .slice(0, PER_GROUP)
    .map((u) => ({
      entityType: "team" as const,
      id: String(u.id),
      href: `/dashboard/user-management?user=${encodeURIComponent(String(u.id))}`,
      primaryText: u.name,
      secondaryText: `${u.email} · ${roleDisplayNames[u.role] ?? u.role}`,
    }));

  // Announcements — title
  const announcementResults: AdminSearchResult[] = (
    await platformAnnouncements()
  )
    .filter((a) => match(a.title))
    .slice(0, PER_GROUP)
    .map((a) => ({
      entityType: "announcement" as const,
      id: a.id,
      href: `/dashboard/support/announcements/compose?id=${encodeURIComponent(a.id)}`,
      primaryText: a.title,
      secondaryText: `${a.status} · ${a.target}`,
    }));

  return [
    ...bookingResults,
    ...facilityResults,
    ...invoiceResults,
    ...ticketResults,
    ...teamResults,
    ...announcementResults,
  ];
}

export const adminSearchQueries = {
  results: (term: string) => ({
    queryKey: ["admin-search", term.trim().toLowerCase()] as const,
    queryFn: async (): Promise<AdminSearchResult[]> =>
      searchAdminEntities(term),
    enabled: term.trim().length >= ADMIN_SEARCH_MIN_CHARS,
  }),
};
