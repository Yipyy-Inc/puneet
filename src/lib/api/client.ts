"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { resolveBookingStaffId } from "./booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import { liveFetch } from "./live-fetch";

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

/** Real clients, with their pets nested; mocks only when signed out. */
async function fetchClients(): Promise<Client[]> {
  return liveFetch<Client[]>("/api/clients", () => clients, "clients");
}

export const clientQueries = {
  /**
   * All clients, or — when `assignedStaffId` is passed (the viewer's id when
   * view_client_list resolves to assigned_only) — only clients whose bookings
   * are assigned to that staff member. Same factory admin uses (no scope arg).
   */
  all: (opts?: { assignedStaffId?: string }) => ({
    queryKey: ["clients", opts?.assignedStaffId ?? "all"] as const,
    queryFn: async (): Promise<Client[]> => {
      const list = await fetchClients();
      return opts?.assignedStaffId
        ? scopeClientsToStaff(list, opts.assignedStaffId)
        : list;
    },
  }),
  detail: (id: number) => ({
    queryKey: ["clients", id] as const,
    queryFn: async () =>
      (await fetchClients()).find((c) => c.id === id) ?? null,
  }),
  search: (query: string) => ({
    queryKey: ["clients", "search", query] as const,
    queryFn: async () => {
      const q = query.toLowerCase();
      return (await fetchClients()).filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      );
    },
  }),
};

// ============================================================================
// Writes.
//
// One place, so a screen never talks to /api/clients directly and every write
// invalidates the same keys. The rules these obey are in the database
// (20260803090000), not here — see the route handlers.
// ============================================================================

async function writeJson<T>(
  url: string,
  method: "POST" | "PATCH",
  payload: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    // The database writes its refusals for a person ("A client record belongs
    // to one facility and cannot be moved"), and the route passes them through.
    // Surfacing that beats a generic failure the user cannot act on.
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

/**
 * Create a client, and its pets.
 *
 * Two round trips because they are two tables and a pet needs its owner's id
 * to exist first. A pet that fails to save does NOT roll the client back: the
 * client is the record that matters, the caller is told which pets did not
 * make it, and losing a saved customer because their spaniel had a bad breed
 * string would be the worse failure.
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Client> & { pets?: Partial<Pet>[] }) => {
      const { pets = [], ...clientInput } = input;
      const created = await writeJson<Client>(
        "/api/clients",
        "POST",
        clientInput,
      );

      const failed: string[] = [];
      for (const pet of pets) {
        try {
          await writeJson<Pet>("/api/pets", "POST", {
            ...pet,
            clientId: created.id,
          });
        } catch {
          failed.push(pet.name ?? "a pet");
        }
      }
      return { client: created, failedPets: failed };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}

/** Update a client. The response is the STORED row, not the request. */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Client> }) =>
      writeJson<Client>(`/api/clients/${id}`, "PATCH", patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
