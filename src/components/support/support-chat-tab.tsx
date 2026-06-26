"use client";

import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Send } from "lucide-react";

import {
  sendAsFacility,
  useCurrentFacilityConversation,
} from "@/hooks/use-support-inbox";
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
  const conversation = useCurrentFacilityConversation();
  // Internal notes are agent-only — never shown to the facility.
  const messages = (conversation?.messages ?? []).filter(
    (m) => !m.isInternalNote,
  );
  const recent = messages.slice(-5);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    if (!draft.trim()) return;
    sendAsFacility(draft);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
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
            <Button onClick={() => document.getElementById(INPUT_ID)?.focus()}>
              Start a conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.length > recent.length && (
              <p className="text-muted-foreground text-center text-xs">
                Showing the last {recent.length} messages
              </p>
            )}
            {recent.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

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
