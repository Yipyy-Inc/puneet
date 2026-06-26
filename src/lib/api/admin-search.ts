// Global admin search — queries across the 5 super-admin entity types.
// Wrapped as a TanStack Query factory so the search bar can debounce + cache by
// term. Swapping to a real backend later means changing only the queryFn.

import { facilities } from "@/data/facilities";
import { supportTickets } from "@/data/support-tickets";
import { adminUsers, roleDisplayNames } from "@/data/admin-users";
import { announcements } from "@/data/announcements";
import { buildPlatformInvoices } from "@/data/platform-invoices";

export type AdminEntityType =
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

function cityOf(f: (typeof facilities)[number]): string | null {
  const address = f.locationsList?.[0]?.address;
  if (!address) return null;
  const parts = address.split(",").map((s) => s.trim());
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function makeMatcher(term: string) {
  return (...values: (string | number | null | undefined)[]) =>
    values.some((v) => v != null && String(v).toLowerCase().includes(term));
}

export function searchAdminEntities(rawTerm: string): AdminSearchResult[] {
  const term = rawTerm.trim().toLowerCase();
  if (term.length < ADMIN_SEARCH_MIN_CHARS) return [];
  const match = makeMatcher(term);

  // Facilities — name / city / email
  const facilityResults: AdminSearchResult[] = facilities
    .filter((f) => match(f.name, cityOf(f), f.contact?.email))
    .slice(0, PER_GROUP)
    .map((f) => ({
      entityType: "facility" as const,
      id: String(f.id),
      href: `/dashboard/facilities/${f.id}`,
      primaryText: f.name,
      secondaryText:
        [cityOf(f), f.contact?.email].filter(Boolean).join(" · ") || f.plan,
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
  const announcementResults: AdminSearchResult[] = announcements
    .filter((a) => match(a.title))
    .slice(0, PER_GROUP)
    .map((a) => ({
      entityType: "announcement" as const,
      id: a.id,
      href: `/dashboard/communication/announcements?id=${encodeURIComponent(a.id)}`,
      primaryText: a.title,
      secondaryText: `${a.status} · ${a.target}`,
    }));

  return [
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
