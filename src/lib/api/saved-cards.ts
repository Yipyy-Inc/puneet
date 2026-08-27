"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

// ============================================================================
// The cards a customer has let this facility keep.
//
// A factory rather than a fetch in a component, per CLAUDE.md: the client id is
// in the query key, so a checkout that changes customer refetches, and the
// picker and the manage list share one request.
//
// ── NOTHING HERE IS A CARD ────────────────────────────────────────────────
//
// Brand, last four and an expiry. Enough to tell two cards apart on a screen
// and nothing else — the card itself lives at Clover, and the row in Postgres
// holds only its identifiers. See `supabase/migrations/20260826170000`.
// ============================================================================

export interface SavedCard {
  id: string;
  clientId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  /**
   * False when the card was stored without recorded consent.
   *
   * Such a card is refused by the charge route, so the screen must not offer
   * it as though it would work — it says why instead.
   */
  chargeable: boolean;
  savedAt: string;
}

export const savedCardKeys = {
  all: ["saved-cards"] as const,
  forClient: (clientId: string | null) =>
    ["saved-cards", clientId ?? "none"] as const,
};

export function useSavedCards(
  clientId: string | null,
): UseQueryResult<SavedCard[]> {
  return useQuery({
    queryKey: savedCardKeys.forClient(clientId),
    // A customer with no id has no cards; asking would return every card the
    // caller may see, which is not what any screen calling this wants.
    enabled: Boolean(clientId),
    queryFn: async (): Promise<SavedCard[]> => {
      const response = await fetch(
        `/api/payments/cards?clientId=${encodeURIComponent(clientId ?? "")}`,
      );
      if (!response.ok) throw new Error("Saved cards could not be read.");
      const payload = (await response.json()) as { cards?: SavedCard[] };
      return payload.cards ?? [];
    },
  });
}

/**
 * Remove a stored card.
 *
 * The route revokes rather than deletes — the ledger references these rows and
 * `payments` is append-only — so a removed card stays readable in history and
 * simply stops being offered.
 */
export function useRemoveSavedCard(clientId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const response = await fetch(`/api/payments/cards/${cardId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "The card could not be removed.");
      }
      return cardId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: savedCardKeys.forClient(clientId),
      });
    },
  });
}
