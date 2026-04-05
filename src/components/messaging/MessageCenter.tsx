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
    <div
      className="flex h-[calc(100vh-120px)] gap-3"
      style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        letterSpacing: "-0.01em",
      }}
    >
      {/* Contacts */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ContactList
          messages={messages}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
        />
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ConversationThread
          threadId={selectedThreadId}
          messages={messages}
          detailOpen={detailOpen}
          onToggleDetail={toggleDetail}
        />
      </div>

      {/* Media panel */}
      {detailOpen && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ClientContextPanel
            threadId={selectedThreadId}
            messages={messages}
            onClose={toggleDetail}
          />
        </div>
      )}
    </div>
  );
}
