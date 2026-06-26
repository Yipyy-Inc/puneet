import type { TenantActivityLog } from "@/data/tenant-logs";
import type { SupportConversation } from "@/types/support-chat";

// Project a facility's support-chat messages into activity-log entries so the
// conversation record shows up in that facility's Logs tab (the rule: support
// messages are stored permanently and visible there). Internal notes are
// agent-only and are intentionally excluded.
export function buildSupportActivityLogs(
  facilityId: number,
  conversations: SupportConversation[],
): TenantActivityLog[] {
  const logs: TenantActivityLog[] = [];

  for (const conversation of conversations) {
    if (conversation.facilityId !== facilityId) continue;

    for (const message of conversation.messages) {
      if (message.isInternalNote) continue;
      const isAgent = message.sender === "agent";

      logs.push({
        id: `supportlog-${message.id}`,
        facilityId,
        timestamp: message.at,
        actorId: isAgent ? "yipyy-support" : `facility-${facilityId}`,
        actorName: message.authorName,
        actorRole: isAgent ? "Yipyy Support" : "Facility contact",
        action: isAgent ? "Replied in support chat" : "Messaged Yipyy support",
        actionType: "communication",
        targetType: "Support conversation",
        targetName: conversation.facilityName,
        targetId: conversation.id,
        description:
          message.body ||
          (message.attachments?.length
            ? `Shared ${message.attachments.length} attachment(s)`
            : ""),
        metadata: {
          channel: "Chat",
          ...(message.attachments?.length
            ? { attachments: message.attachments.map((a) => a.name) }
            : {}),
        },
      });
    }
  }

  return logs;
}
