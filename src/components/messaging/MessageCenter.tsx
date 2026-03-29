"use client";

import { useState } from "react";
import { ContactList } from "./ContactList";
import { ConversationThread } from "./ConversationThread";
import { ClientContextPanel } from "./ClientContextPanel";
import { messages } from "@/data/communications-hub";

export function MessageCenter() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ContactList
        messages={messages}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
      />
      <ConversationThread threadId={selectedThreadId} messages={messages} />
      <ClientContextPanel threadId={selectedThreadId} messages={messages} />
    </div>
  );
}
