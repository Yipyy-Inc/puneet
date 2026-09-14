// ============================================================================
// A message the facility sent a client, as the client file lists it.
//
// The file's Communications tab, its overview and its Messages page all read
// `clientCommunications` from src/data/communications — invented emails and
// texts, matched to real clients by numeric id. What the facility really sent
// a client is `public.message_sends`: every automation, workflow and manual
// message, with what was rendered and whether it went.
//
// Inbound replies are not stored anywhere yet, so every row is outbound.
// ============================================================================

export const MESSAGE_SEND_SELECT =
  "id, channel, subject_rendered, body_rendered, status, scheduled_for, sent_at, created_at";

export interface MessageSendRow {
  id: string;
  channel: "email" | "sms";
  subject_rendered: string | null;
  body_rendered: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface ClientMessage {
  id: string;
  type: "email" | "sms";
  direction: "outbound";
  subject?: string;
  /** Plain text: an email is stored as rendered HTML. */
  content: string;
  status: string;
  timestamp: string;
}

/** An email body is HTML; the file shows a line of it, so the tags go. */
function toPlainText(body: string): string {
  return body
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function rowToClientMessage(row: MessageSendRow): ClientMessage {
  return {
    id: row.id,
    type: row.channel,
    direction: "outbound",
    subject: row.subject_rendered ?? undefined,
    content:
      row.channel === "email"
        ? toPlainText(row.body_rendered)
        : row.body_rendered,
    status: row.status,
    // When it went, or when it is due to — a queued reminder has not gone yet.
    timestamp: row.sent_at ?? row.scheduled_for ?? row.created_at,
  };
}
