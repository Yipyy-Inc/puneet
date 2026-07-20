"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
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
      {/* Single-panel below lg: the 380px inbox beside the thread leaves a
          phone nothing for the conversation, and the layout clips it. */}
      <div className="flex h-[calc(100vh-9rem)] gap-3">
        <div
          className={cn(
            "h-full w-full shrink-0 lg:w-[380px]",
            selectedId ? "hidden lg:block" : "block",
          )}
        >
          <InboxList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={() => setNewOpen(true)}
          />
        </div>
        <div
          className={cn(
            "h-full min-w-0 flex-1",
            selectedId ? "block" : "hidden lg:block",
          )}
        >
          <ConversationThread
            conversation={selected}
            onBack={() => setSelectedId(null)}
          />
        </div>
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
