import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { resolveBookingStaffId } from "./booking";
import type { Client } from "@/types/client";

// ============================================================================
// Section 8B — viewer scoping (assigned_only). A client is "assigned to" a
// viewer when they have at least one booking the viewer is assigned to serve
// (reusing the booking→staff resolver). Scoping is enforced here in the data
// layer, not as cosmetic client filtering.
// ============================================================================

/** Client ids with at least one booking assigned to `staffId` (8B). */
export function assignedClientIds(staffId: string): Set<number> {
  const ids = new Set<number>();
  for (const b of bookings) {
    if (resolveBookingStaffId(b) === staffId) ids.add(b.clientId);
  }
  return ids;
}

/** Filter clients to those with a booking assigned to `staffId` (8B scope). */
export function scopeClientsToStaff(list: Client[], staffId: string): Client[] {
  const ids = assignedClientIds(staffId);
  return list.filter((c) => ids.has(c.id));
}

/** Is `client` in `staffId`'s assigned set? (URL-fetch 403 check.) */
export function isClientAssignedTo(client: Client, staffId: string): boolean {
  return assignedClientIds(staffId).has(client.id);
}

export const clientQueries = {
  /**
   * All clients, or — when `assignedStaffId` is passed (the viewer's id when
   * view_client_list resolves to assigned_only) — only clients whose bookings
   * are assigned to that staff member. Same factory admin uses (no scope arg).
   */
  all: (opts?: { assignedStaffId?: string }) => ({
    queryKey: ["clients", opts?.assignedStaffId ?? "all"] as const,
    queryFn: async (): Promise<Client[]> =>
      opts?.assignedStaffId
        ? scopeClientsToStaff(clients, opts.assignedStaffId)
        : clients,
  }),
  detail: (id: number) => ({
    queryKey: ["clients", id] as const,
    queryFn: async () => clients.find((c) => c.id === id) ?? null,
  }),
  search: (query: string) => ({
    queryKey: ["clients", "search", query] as const,
    queryFn: async () => {
      const q = query.toLowerCase();
      return clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      );
    },
  }),
};
