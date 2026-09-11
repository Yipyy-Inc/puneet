"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MarketingPromoCode } from "@/types/marketing";

// ============================================================================
// The facility's promo codes, and putting one on a bill (20260911173538).
//
// Marketing → Promo Codes read `promoCodes` from @/data/marketing
// — another facility's codes — and nothing anywhere could apply one to a
// booking. These read and write `promo_codes`; applying goes through
// `redeem_promo_code`, which checks the code and writes the line and the use
// together.
// ============================================================================

export const promoCodeKeys = {
  all: ["promo-codes"] as const,
};

/** A refusal from the database, with the reason the screen translates. */
export class PromoCodeRefused extends Error {
  constructor(
    message: string,
    readonly reason: string | null,
  ) {
    super(message);
  }
}

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
    | (T & { error?: string; reason?: string | null })
    | null;
  if (!response.ok) {
    throw new PromoCodeRefused(
      parsed?.error ?? `Request failed (${response.status})`,
      parsed?.reason ?? null,
    );
  }
  return parsed as T;
}

export function usePromoCodes() {
  return useQuery({
    queryKey: promoCodeKeys.all,
    queryFn: () => json<MarketingPromoCode[]>("/api/promo-codes"),
  });
}

/** Create a code (no id) or change one (with its id). */
export function useSavePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; code: Partial<MarketingPromoCode> }) =>
      input.id
        ? json<MarketingPromoCode>(
            `/api/promo-codes/${encodeURIComponent(input.id)}`,
            { method: "PATCH", body: input.code },
          )
        : json<MarketingPromoCode>("/api/promo-codes", {
            method: "POST",
            body: input.code,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promoCodeKeys.all });
    },
  });
}

export function useDeletePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<void>(`/api/promo-codes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promoCodeKeys.all });
    },
  });
}

/**
 * Put a code on a booking's bill. Resolves with the dollars it took off;
 * rejects with a `PromoCodeRefused` whose `reason` names why.
 */
export function useApplyPromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingRef: number; code: string }) =>
      json<{ code: string; amount: number; lineItemId: string }>(
        `/api/bookings/${input.bookingRef}/promo-code`,
        { method: "POST", body: { code: input.code } },
      ),
    onSuccess: () => {
      // The line moved `amount_due`; the code's use count moved too.
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({ queryKey: promoCodeKeys.all });
    },
  });
}
