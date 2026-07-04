// Types for the admin Support Chat Inbox (the agent side of the facility
// Support drawer chat). A conversation is permanently linked to a facility
// account; messages are the record surfaced in that facility's Logs tab.

export type SupportChannel = "chat" | "email" | "sms";

export type ConversationStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type MessageSender = "facility" | "agent";

export interface SupportAttachment {
  id: string;
  name: string;
  /** Data URL — powers inline thumbnails in the thread and download. */
  url?: string;
  /** MIME type (e.g. "image/png", "application/pdf"). */
  type?: string;
  /** File size in bytes. */
  size?: number;
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
  /** Channel the reply was sent over (defaults to chat). */
  channel?: SupportChannel;
  /** Subject line when sent as an email. */
  subject?: string;
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
  /** Agent-side organizational flags (mirror the facility ContactList). */
  followUp?: boolean;
  starred?: boolean;
  assignedAgentId: number | null;
  /** Facility presence indicator (Online / Away). */
  online: boolean;
  unreadCount: number;
  messages: AdminSupportMessage[];
}
