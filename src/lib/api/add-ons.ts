"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddOn,
  AddOnCategory,
  AddOnInput,
} from "@/types/add-on";

// ============================================================================
// The one add-ons list, from Postgres (20260926230000).
//
// Staff read `/api/add-ons` (their facility, archived ones left out); a pet
// owner reads `/api/customer/add-ons` (their facility, live ones only) under
// its own key, so the two can never serve each other's cache.
//
// NO MOCK FALLBACK: an empty list means the facility sells no add-ons yet, and
// a fixture would hide exactly that.
// ============================================================================

const BASE = "/api/add-ons";
const CATEGORIES = "/api/add-ons/categories";
const CUSTOMER = "/api/customer/add-ons";

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;

  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const addOnKeys = {
  all: ["add-ons"] as const,
  list: () => [...addOnKeys.all, "list"] as const,
  categories: () => [...addOnKeys.all, "categories"] as const,
  customer: () => ["customer", "add-ons"] as const,
};

export const addOnQueries = {
  list: () => ({
    queryKey: addOnKeys.list(),
    queryFn: () => json<AddOn[]>(BASE),
  }),
  categories: () => ({
    queryKey: addOnKeys.categories(),
    queryFn: () => json<AddOnCategory[]>(CATEGORIES),
  }),
  customer: () => ({
    queryKey: addOnKeys.customer(),
    queryFn: () =>
      json<{ addOns: AddOn[]; categories: AddOnCategory[] }>(CUSTOMER),
  }),
};

export function useAddOns(options: { enabled?: boolean } = {}) {
  return useQuery({ ...addOnQueries.list(), enabled: options.enabled });
}

export function useAddOnCategories(options: { enabled?: boolean } = {}) {
  return useQuery({ ...addOnQueries.categories(), enabled: options.enabled });
}

export function useCustomerAddOns(options: { enabled?: boolean } = {}) {
  return useQuery({ ...addOnQueries.customer(), enabled: options.enabled });
}

export interface SavedAddOn {
  addOn: AddOn;
  /** False: the add-on is saved, its overrides by location are not. */
  overridesWritten: boolean;
}

/** Create (no id) or change (id) an add-on. */
export function useSaveAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AddOnInput }) =>
      id
        ? json<SavedAddOn>(`${BASE}/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: input,
          })
        : json<SavedAddOn>(BASE, { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.all });
    },
  });
}

/** Delete = archive: bookings that used it still resolve. */
export function useArchiveAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ archived: number }>(`${BASE}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.all });
    },
  });
}

export function useSaveAddOnCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; displayOrder?: number }) =>
      json<AddOnCategory>(CATEGORIES, { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.all });
    },
  });
}

export function useRenameAddOnCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      json<AddOnCategory>(`${CATEGORIES}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { name },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.all });
    },
  });
}

export function useDeleteAddOnCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ removed: number }>(`${CATEGORIES}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    // Its add-ons are `on delete set null`, but the LIST still holds their old
    // `categoryId` — so everything.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.all });
    },
  });
}

/** Every category id, in its new order. */
export function useReorderAddOnCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      json<{ moved: number }>(`${CATEGORIES}/order`, {
        method: "PUT",
        body: { ids },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: addOnKeys.categories() });
    },
  });
}
