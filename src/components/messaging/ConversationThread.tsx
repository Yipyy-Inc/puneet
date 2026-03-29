"use client";

import { useMemo, useRef, useEffect } from "react";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { ComposeBar } from "./ComposeBar";
import { ChannelBadge } from "./ChannelBadge";
import { MessageSquare } from "lucide-react";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";

export function ConversationThread({
  threadId,
  messages,
}: {
  threadId: string | null;
  messages: Message[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadMessages = useMemo(
    () =>
      threadId
        ? messages
            .filter((m) => (m.threadId ?? m.id) === threadId)
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )
        : [],
    [threadId, messages],
  );

  const client = useMemo(() => {
    const first = threadMessages[0];
    if (!first?.clientId) return null;
    return clients.find((c) => c.id === first.clientId) ?? null;
  }, [threadMessages]);

  const channels = useMemo(
    () => [...new Set(threadMessages.map((m) => m.type))],
    [threadMessages],
  );

  // Pre-compute date separators
  const messagesWithDates = useMemo(() => {
    const result: { msg: Message; showDate: boolean }[] = [];
    const seen = new Set<string>();
    for (const msg of threadMessages) {
      const d = new Date(msg.timestamp).toDateString();
      result.push({ msg, showDate: !seen.has(d) });
      seen.add(d);
    }
    return result;
  }, [threadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [threadMessages.length]);

  if (!threadId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <MessageSquare className="text-muted-foreground mb-3 size-12 opacity-30" />
        <p className="text-muted-foreground text-sm">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">{client?.name ?? "Unknown"}</h3>
          <div className="mt-0.5 flex gap-1">
            {channels.map((ch) => (
              <ChannelBadge key={ch} channel={ch} size="xs" />
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        {messagesWithDates.map(({ msg, showDate }) => (
          <div key={msg.id}>
            {showDate && <DateSeparator date={msg.timestamp} />}
            <MessageBubble message={msg} />
          </div>
        ))}
      </div>

      {/* Compose */}
      <ComposeBar />
    </div>
  );
}
