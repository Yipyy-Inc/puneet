import {
  addTokenizedCard as _addTokenizedCard,
  updateTokenizedCard as _updateTokenizedCard,
  deleteTokenizedCard as _deleteTokenizedCard,
  addYipyyPayTransaction as _addYipyyPayTransaction,
  addYipyyPayDevice as _addYipyyPayDevice,
} from "@/data/fiserv-payments";
import type {
  TokenizedCard,
  YipyyPayTransaction,
  YipyyPayDevice,
} from "@/types/payments";

export interface ClientPayment {
  id: string;
  bookingId: string | null;
  method: string;
  /** NEGATIVE for a refund — that is how the row is stored, not a display choice. */
  amount: number;
  tip: number;
  cardBrand: string | null;
  cardLast4: string | null;
  entryMethod: string | null;
  processor: string | null;
  authorName: string;
  createdAt: string;
  isRefund: boolean;
}

export const paymentQueries = {
  /**
   * One client's payments, newest first.
   *
   * No fixture fallback. The billing tab listed `@/data/payments` filtered by
   * clientId, so a real client's history was whatever the fixture held for that
   * number — usually nothing, and on a colliding id somebody else's money. A
   * fallback would put that back the moment a request failed, on the screen
   * that says what a customer has paid.
   */
  byClient: (clientRef: number) => ({
    queryKey: ["payments", "by-client", clientRef] as const,
    queryFn: async (): Promise<ClientPayment[]> => {
      const response = await fetch(
        `/api/payments?clientRef=${encodeURIComponent(String(clientRef))}`,
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as ClientPayment[];
    },
  }),
};

export const paymentMutations = {
  addTokenizedCard: (card: Omit<TokenizedCard, "id" | "createdAt">) => ({
    mutationFn: async () => _addTokenizedCard(card),
  }),
  updateTokenizedCard: (cardId: string, updates: Partial<TokenizedCard>) => ({
    mutationFn: async () => _updateTokenizedCard(cardId, updates),
  }),
  deleteTokenizedCard: (cardId: string) => ({
    mutationFn: async () => _deleteTokenizedCard(cardId),
  }),
  addYipyyPayTransaction: (
    transaction: Omit<YipyyPayTransaction, "id" | "createdAt">,
  ) => ({
    mutationFn: async () => _addYipyyPayTransaction(transaction),
  }),
  addYipyyPayDevice: (device: Omit<YipyyPayDevice, "id" | "createdAt">) => ({
    mutationFn: async () => _addYipyyPayDevice(device),
  }),
};
