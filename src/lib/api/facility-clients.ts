"use client";

import { useQuery } from "@tanstack/react-query";

import { clientQueries } from "@/lib/api/client";
import { NO_ITEMS } from "@/lib/no-items";
import type { Client } from "@/types/client";

/**
 * The facility's clients, each with their pets — for screens that only READ
 * them (the training rosters, the student profile, make-ups).
 *
 * Kept apart from src/lib/api/client.ts on purpose: that module also holds
 * the client and pet writes, and `check:success-claims` follows one import.
 * A screen that toasts over a cache-only write would look as if it had a
 * writer merely because it looked a client up.
 */
export function useFacilityClientList(): {
  clients: Client[];
  /** False until the list has arrived — "missing" and "loading" differ. */
  loaded: boolean;
} {
  const { data } = useQuery(clientQueries.all());
  return { clients: data ?? NO_ITEMS, loaded: data !== undefined };
}
