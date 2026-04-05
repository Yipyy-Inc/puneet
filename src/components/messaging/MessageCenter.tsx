"use client";

import { useState } from "react";
import { ContactList } from "./ContactList";
import { ConversationThread } from "./ConversationThread";
import { ClientContextPanel } from "./ClientContextPanel";
import { messages } from "@/data/communications-hub";

export function MessageCenter() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("messaging-detail-panel-open") !== "false";
  });

  const toggleDetail = () => {
    const next = !detailOpen;
    setDetailOpen(next);
    localStorage.setItem("messaging-detail-panel-open", String(next));
  };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-xl border border-slate-200">
      <ContactList
        messages={messages}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
      />
      <ConversationThread
        threadId={selectedThreadId}
        messages={messages}
        detailOpen={detailOpen}
        onToggleDetail={toggleDetail}
      />
      {detailOpen && (
        <ClientContextPanel
          threadId={selectedThreadId}
          messages={messages}
          onClose={toggleDetail}
        />
      )}
    </div>
  );
}
