"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  OwnerCard,
  OwnerCardListItem,
} from "@/lib/evaluations/owner-card-types";

// ============================================================================
// The owner's evaluation report cards (the client's mock, 2026-10-02): their
// list, and one card — which, read, is marked opened.
// ============================================================================

async function read<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !body) {
    throw Object.assign(new Error(body?.error ?? "Not available."), {
      status: response.status,
    });
  }
  return body;
}

export const customerEvaluationQueries = {
  all: () => ({
    queryKey: ["customer", "evaluations"] as const,
    queryFn: () => read<OwnerCardListItem[]>("/api/customer/evaluations"),
  }),
  one: (id: string) => ({
    queryKey: ["customer", "evaluations", id] as const,
    queryFn: () => read<OwnerCard>(`/api/customer/evaluations/${id}`),
  }),
};

export function useOwnerEvaluationCards() {
  return useQuery(customerEvaluationQueries.all());
}

export function useOwnerEvaluationCard(id: string) {
  return useQuery({
    ...customerEvaluationQueries.one(id),
    // A card that is not theirs answers 404, and asking again will not change it.
    retry: false,
  });
}
