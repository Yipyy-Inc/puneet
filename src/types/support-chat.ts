// Types for the admin Support Chat Inbox (the agent side of the facility
// Support drawer chat). A conversation is permanently linked to a facility
// account; messages are the record surfaced in that facility's Logs tab.

export type SupportChannel = "chat";

export type ConversationStatus = "open" | "pending" | "resolved";

export type MessageSender = "facility" | "agent";

export interface SupportAttachment {
  id: string;
  name: string;
}

export interface AdminSupportMessage {
  id: string;
  sender: MessageSender;
  authorName: string;
  body: string;
  at: string; // ISO
  attachments?: SupportAttachment[];
  /** Internal notes are agent-only (yellow tint, never shown to the facility). */
  isInternalNote?: boolean;
}

export interface SupportConversation {
  id: string;
  facilityId: number;
  facilityName: string;
  contactName: string;
  contactEmail: string;
  channel: SupportChannel;
  status: ConversationStatus;
  priority: boolean;
  assignedAgentId: number | null;
  /** Facility presence indicator (Online / Away). */
  online: boolean;
  unreadCount: number;
  messages: AdminSupportMessage[];
}
