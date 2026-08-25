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
  /** Why it happened, in the operator's words. Null on an ordinary sale, and
   *  on a reversal that came back from Clover with nobody here to ask. */
  note: string | null;
  createdAt: string;
  isRefund: boolean;
}

/**
 * What a booking took, what it gave back, and the difference.
 *
 * All three, always — the same reason `facility_takings` reports gross, refunded
 * and net rather than just the last one: a booking paid $800 and refunded $200
 * nets to $600 and reads identically to one that only ever paid $600. The sum
 * cannot tell those apart, and one of them has a refund to account for.
 */
export interface BookingMoney {
  gross: number;
  refunded: number;
  net: number;
  refunds: ClientPayment[];
}

export function bookingMoney(payments: ClientPayment[]): BookingMoney {
  let gross = 0;
  let refunded = 0;
  for (const payment of payments) {
    // The SIGN decides, not `isRefund`. A reversal always carries a negative
    // `grand_total`, but a row can be negative without pointing at an original
    // — a refund to store credit against a booking with no card payment is one.
    // Reading the flag would have missed those and overstated the net.
    if (payment.amount < 0) refunded += -payment.amount;
    else gross += payment.amount;
  }
  return {
    gross,
    refunded,
    net: gross - refunded,
    refunds: payments.filter((p) => p.amount < 0),
  };
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

  /**
   * One booking's payments, newest first — including the negative rows.
   *
   * Separate from `byClient` rather than filtered out of it: a client with two
   * years of history would be 200 rows fetched to show three, and the booking
   * screen would silently go wrong once a client passed the route's limit.
   */
  byBooking: (bookingRef: number) => ({
    queryKey: ["payments", "by-booking", bookingRef] as const,
    queryFn: async (): Promise<ClientPayment[]> => {
      const response = await fetch(
        `/api/payments?bookingRef=${encodeURIComponent(String(bookingRef))}`,
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
