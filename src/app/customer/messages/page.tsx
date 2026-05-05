"use client";

import { MessageCenter } from "@/components/messaging/MessageCenter";
import { SavedRepliesProvider } from "@/components/messaging/saved-replies-context";
import { ScheduledMessagesProvider } from "@/components/messaging/scheduled-messages-context";
import { ConversationStateProvider } from "@/components/messaging/conversation-state-context";

export default function CustomerMessagesPage() {
  // Static customer ID for mock mode; swap with auth context when available.
  const customerId = 15;

  return (
    <SavedRepliesProvider>
      <ScheduledMessagesProvider>
        <ConversationStateProvider>
          <MessageCenter mode="customer" customerId={customerId} />
        </ConversationStateProvider>
      </ScheduledMessagesProvider>
    </SavedRepliesProvider>
  );
}
