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
