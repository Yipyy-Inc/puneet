"use client";

import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Send, X } from "lucide-react";
import { toast } from "sonner";

import {
  sendAsFacility,
  setConversationStatus,
  useCurrentFacilityConversation,
} from "@/hooks/use-support-inbox";
import { useRealtimeConnection } from "@/lib/realtime/use-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminSupportMessage } from "@/types/support-chat";

const INPUT_ID = "facility-support-input";

function formatTime(at: string): string {
  return new Date(at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SupportChatTab() {
  // The facility's ACTIVE (open/pending) conversation, or null after resolving.
  const conversation = useCurrentFacilityConversation();
  const hasConversation = conversation !== null;
  // Internal notes are agent-only — never shown to the facility.
  const messages = (conversation?.messages ?? []).filter(
    (m) => !m.isInternalNote,
  );
  const hasThread = messages.length > 0;

  // Yipyy Support is "online" while the shared realtime connection is live.
  const supportOnline = useRealtimeConnection() === "connected";

  const [draft, setDraft] = useState("");
  // The composer is revealed either by an active conversation or by the user
  // clicking "Start a conversation" from the empty state.
  const [composerOpen, setComposerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const showEmptyState = !hasConversation && !composerOpen;
  const showComposer = hasConversation || composerOpen;

  // New messages append at the bottom — keep the latest in view (real-time
  // replies land here via the shared realtime connection, no navigation).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus the input the moment it expands from the empty state.
  useEffect(() => {
    if (composerOpen) document.getElementById(INPUT_ID)?.focus();
  }, [composerOpen]);

  function send() {
    if (!draft.trim()) return;
    sendAsFacility(draft);
    setDraft("");
  }

  function closeConversation() {
    if (!conversation) return;
    setConversationStatus(conversation.id, "resolved");
    setComposerOpen(false);
    setDraft("");
    toast.success("Conversation closed. Start a new one any time.");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — Yipyy Support with online/offline status + response-time hint */}
      <div className="flex items-center gap-2.5 border-b px-4 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <MessagesSquare className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">Yipyy Support</span>
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                supportOnline ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            <span className="text-muted-foreground text-[11px] font-medium">
              {supportOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            We typically reply in minutes
          </p>
        </div>
      </div>

      {/* Chat-area toolbar — resolve the active thread from the top-right. */}
      {hasThread && (
        <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Support conversation · Open
          </span>
          <button
            type="button"
            onClick={closeConversation}
            aria-label="Close conversation"
            className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors hover:text-rose-600"
          >
            <X className="size-3" />
            Close conversation
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {showEmptyState ? (
          // Illustrated empty state — ONLY when no prior conversation exists.
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <MessagesSquare className="size-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold tracking-tight">Chat with Yipyy</h3>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                👋 Start a conversation and our support team will reply here in
                real time.
              </p>
            </div>
            <Button onClick={() => setComposerOpen(true)}>
              Start a conversation
            </Button>
          </div>
        ) : hasThread ? (
          <div className="space-y-3">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          // Composer expanded but no message sent yet.
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-2xl">👋</span>
            <p className="text-muted-foreground max-w-xs text-sm">
              Send your first message below — our team will reply here in real
              time.
            </p>
          </div>
        )}
      </div>

      {/* Composer — expands from the empty state; stays for active threads. */}
      {showComposer && (
        <div className="border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <Input
              id={INPUT_ID}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              aria-label="Message Yipyy support"
            />
            <Button type="submit" size="icon" disabled={!draft.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function Bubble({ message }: { message: AdminSupportMessage }) {
  const mine = message.sender === "facility";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          mine ? "bg-emerald-600 text-white" : "bg-muted",
        )}
      >
        {message.body}
      </div>
      <span className="text-muted-foreground mt-0.5 px-1 text-[10px]">
        {message.authorName} · {formatTime(message.at)}
      </span>
    </div>
  );
}
