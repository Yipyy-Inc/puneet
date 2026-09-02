"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clients } from "@/data/clients";
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
/**
 * Which clients are assigned to `staffId`, from the bookings that say so.
 *
 * ── WHAT THIS REPLACED ───────────────────────────────────────────────────
 *
 *   const ids = new Set<number>();
 *   for (const b of bookings) {                       // ← src/data
 *     if (resolveBookingStaffId(b) === staffId) ids.add(b.clientId);
 *   }
 *
 * A permission scope decided from the bookings fixture. `view_clients =
 * assigned_shifts` is a real grant and this answered which records it admits.
 *
 * MEASURED: with a client's booking genuinely assigned to groomer@yipyy.dev in
 * Postgres, the list showed them 0 clients — the fixture's staff ids are
 * strings like "fs-dev-groomer" and a viewer's id is a uuid, so nothing ever
 * matched. Empty for everyone, and one id-space collision away from showing a
 * scoped viewer somebody else's clients.
 *
 * The argument is the viewer's SCOPE (undefined for full access), not a staff
 * id — the route resolves the caller from their session, so a screen cannot ask
 * about somebody else.
 *
 * `refs` is null while the answer is unknown. Callers must not read that as
 * "assigned to nobody" — an empty Set and "not yet known" are different, and
 * treating them alike is how a gate flashes at somebody who has access.
 */
export function useAssignedClientRefs(scoped: string | undefined): {
  refs: Set<number> | null;
  pending: boolean;
} {
  const { data, isPending } = useQuery({
    // `scoped` is the viewer's scope marker, not a parameter — the route
    // resolves WHO from the session. It stays in the key only so the query is
    // re-run if a viewer's scope changes within a session (the RBAC previewer
    // does exactly that).
    queryKey: ["clients", "assigned", scoped ?? null] as const,
    enabled: Boolean(scoped),
    queryFn: async (): Promise<number[]> => {
      const response = await fetch("/api/clients/assigned");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Request failed (${response.status})`);
      }
      return ((await response.json()) as { refs: number[] }).refs;
    },
  });

  return {
    refs: data ? new Set(data) : null,
    pending: Boolean(scoped) && isPending,
  };
}

/**
 * Filter `list` to the clients in `refs`.
 *
 * Separate from the fetch so a caller that already holds the set — every one of
 * them does, via useAssignedClientRefs — does not fetch it twice.
 */
export function scopeClientsToRefs(
  list: Client[],
  refs: Set<number>,
): Client[] {
  return list.filter((c) => refs.has(c.id));
}

/** Real clients, with their pets nested; mocks only when signed out. */
async function fetchClients(): Promise<Client[]> {
  return liveFetch<Client[]>("/api/clients", () => clients, "clients");
}

export const clientQueries = {
  /**
   * Every client this facility has, as RLS allows.
   *
   * It used to take `assignedStaffId` and narrow the list here, through a
   * helper that walked the bookings FIXTURE. Scoping now comes from
   * `useAssignedClientRefs`, which asks the database — and the caller applies
   * it, because the same caller has to distinguish "not assigned" from "not
   * loaded yet" and a queryFn cannot.
   */
  all: () => ({
    queryKey: ["clients", "all"] as const,
    queryFn: fetchClients,
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

/**
 * One client, by the numeric ref in the URL.
 *
 * ── WHY A HOOK AND NOT `clients.find(...)` AT EACH CALL SITE ──────────────
 *
 * Fifteen files in the client file did this:
 *
 *   const client = clients.find((c) => c.id === parseInt(id, 10));
 *   if (!client) return "Client not found.";
 *
 * against `src/data/clients.ts`. The fixtures hold twenty clients; the database
 * holds a different set — so EVERY client created since the migration had a
 * profile, a pets tab, a billing tab and a vaccination record that all reported
 * the person did not exist.
 *
 * Converted one page at a time, each would have re-invented the same pending
 * handling, and any that forgot would render "Client not found." for as long as
 * the request took. `pending` is returned separately from `client` so a caller
 * cannot accidentally treat "not loaded yet" as "not there" — the distinction
 * the fixture version never had to make, and the one that breaks these pages
 * when it is missed.
 *
 * `parseInt` lives here too: every call site was doing it, and two of them
 * forgot the radix.
 */
export function useClientRecord(id: string | number | undefined) {
  const ref = typeof id === "number" ? id : parseInt(String(id ?? ""), 10);
  const valid = Number.isInteger(ref);

  const { data, isPending } = useQuery({
    ...clientQueries.detail(ref),
    enabled: valid,
  });

  return {
    client: data ?? undefined,
    /** True while the answer is unknown. A disabled query is not pending. */
    pending: valid && isPending,
  };
}

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
    // `Omit<…, "pets">` and not a plain intersection. `Partial<Client> & {
    // pets?: Partial<Pet>[] }` requires `pets` to satisfy BOTH halves, so it
    // demanded fully-formed `Pet` objects — including the `id` the database has
    // not issued yet. The one thing a pet being CREATED cannot have.
    mutationFn: async (
      input: Omit<Partial<Client>, "pets"> & { pets?: Partial<Pet>[] },
    ) => {
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
