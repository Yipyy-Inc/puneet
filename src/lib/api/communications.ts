import {
  messages,
  messageTemplates,
  automationRules,
  petUpdates,
  callLogs,
  routingRules,
  internalMessages,
} from "@/data/communications-hub";
import { clientCommunications } from "@/data/communications";
import { quickReplyTemplates } from "@/data/quick-replies";
import { supportSavedReplies } from "@/data/support-saved-replies";
import type {
  Message,
  MessageTemplate,
  AutomationRule,
  PetUpdate,
  CallLog,
  RoutingRule,
  InternalMessage,
  CommunicationRecord,
  QuickReplyTemplate,
} from "@/types/communications";
import type {
  SupportReplyCategory,
  SupportSavedReply,
} from "@/types/support-saved-replies";

export const communicationsQueries = {
  messages: () => ({
    queryKey: ["communications", "messages"] as const,
    queryFn: async (): Promise<Message[]> => messages,
  }),
  templates: () => ({
    queryKey: ["communications", "templates"] as const,
    queryFn: async (): Promise<MessageTemplate[]> => messageTemplates,
  }),
  automationRules: () => ({
    queryKey: ["communications", "automation-rules"] as const,
    queryFn: async (): Promise<AutomationRule[]> => automationRules,
  }),
  petUpdates: () => ({
    queryKey: ["communications", "pet-updates"] as const,
    queryFn: async (): Promise<PetUpdate[]> => petUpdates,
  }),
  callLogs: () => ({
    queryKey: ["communications", "call-logs"] as const,
    queryFn: async (): Promise<CallLog[]> => callLogs,
  }),
  routingRules: () => ({
    queryKey: ["communications", "routing-rules"] as const,
    queryFn: async (): Promise<RoutingRule[]> => routingRules,
  }),
  internalMessages: () => ({
    queryKey: ["communications", "internal"] as const,
    queryFn: async (): Promise<InternalMessage[]> => internalMessages,
  }),
  clientCommunications: (clientId: number) => ({
    queryKey: ["communications", "client", clientId] as const,
    queryFn: async (): Promise<CommunicationRecord[]> =>
      clientCommunications.filter((c) => c.clientId === clientId),
  }),
  quickReplies: () => ({
    queryKey: ["communications", "quick-replies"] as const,
    queryFn: async (): Promise<QuickReplyTemplate[]> => quickReplyTemplates,
  }),
  // Manual chat/support saved replies (managed on the Email Templates page's
  // "Saved Replies" tab; consumed by the chat composer's "/" panel).
  savedReplies: () => ({
    queryKey: SAVED_REPLIES_KEY_ARR,
    queryFn: async (): Promise<SupportSavedReply[]> =>
      loadSavedReplies().map((r) => ({ ...r })),
  }),
};

// ---- Support saved replies — mutable, localStorage-backed store -----------
//
// Seeded from @/data/support-saved-replies. Mutations write here and persist to
// localStorage so replies survive reloads; callers invalidate the query key
// below to refresh both the management UI and the chat composer's "/" panel.

export const SAVED_REPLIES_KEY_ARR = [
  "communications",
  "saved-replies",
] as const;
const SAVED_REPLIES_STORAGE_KEY = "yipyy.support.saved-replies";

let savedRepliesState: SupportSavedReply[] | null = null;

function loadSavedReplies(): SupportSavedReply[] {
  if (savedRepliesState) return savedRepliesState;
  savedRepliesState = supportSavedReplies.map((r) => ({ ...r }));
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(SAVED_REPLIES_STORAGE_KEY);
      if (raw) savedRepliesState = JSON.parse(raw) as SupportSavedReply[];
    } catch {
      // Ignore malformed storage — fall back to the seed.
    }
  }
  return savedRepliesState;
}

function persistSavedReplies(): void {
  if (typeof window === "undefined" || !savedRepliesState) return;
  try {
    window.localStorage.setItem(
      SAVED_REPLIES_STORAGE_KEY,
      JSON.stringify(savedRepliesState),
    );
  } catch {
    // Storage full/unavailable — in-memory store still works this session.
  }
}

export interface SavedReplyInput {
  title: string;
  category: SupportReplyCategory;
  body: string;
  shortcut: string;
}

/** `id` is supplied by the caller (an event handler) to avoid impure calls. */
export function createSavedReply(
  input: SavedReplyInput & { id: string },
): SupportSavedReply {
  const reply: SupportSavedReply = { ...input, useCount: 0 };
  savedRepliesState = [reply, ...loadSavedReplies()];
  persistSavedReplies();
  return reply;
}

export function updateSavedReply(
  id: string,
  patch: Partial<SavedReplyInput>,
): void {
  savedRepliesState = loadSavedReplies().map((r) =>
    r.id === id ? { ...r, ...patch } : r,
  );
  persistSavedReplies();
}

export function deleteSavedReply(id: string): void {
  savedRepliesState = loadSavedReplies().filter((r) => r.id !== id);
  persistSavedReplies();
}
