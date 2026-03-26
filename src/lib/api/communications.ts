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
};
