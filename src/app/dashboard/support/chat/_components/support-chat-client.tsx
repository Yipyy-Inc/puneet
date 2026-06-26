"use client";

import { useEffect, useState } from "react";

import {
  markConversationRead,
  useSupportInbox,
} from "@/hooks/use-support-inbox";
import { ConversationSidebar } from "./conversation-sidebar";
import { ConversationThread } from "./conversation-thread";
import { InboxList } from "./inbox-list";
import { NewConversationDialog } from "./new-conversation-dialog";

export function SupportChatClient() {
  const conversations = useSupportInbox();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => conversations[0]?.id ?? null,
  );
  const [newOpen, setNewOpen] = useState(false);

  // Opening a conversation clears its unread count (store mutation, not React
  // state — safe to run from an effect and idempotent once read).
  useEffect(() => {
    if (selectedId) markConversationRead(selectedId);
  }, [selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="p-4">
      <div className="flex h-[calc(100vh-9rem)] gap-3">
        <InboxList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setNewOpen(true)}
        />
        <ConversationThread conversation={selected} />
        <ConversationSidebar conversation={selected} />
      </div>

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={setSelectedId}
      />
    </div>
  );
}
