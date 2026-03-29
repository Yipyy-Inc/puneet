"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChannelBadge } from "@/components/messaging/ChannelBadge";
import {
  MessageBubble,
  DateSeparator,
} from "@/components/messaging/MessageBubble";
import { MessageSquare, Send, Paperclip, ArrowLeft } from "lucide-react";
import { facilities } from "@/data/facilities";
import type { CommunicationRecord } from "@/types/communications";
import type { Message } from "@/types/communications";

/** Convert CommunicationRecord to the Message format used by MessageBubble */
function toMessage(rec: CommunicationRecord): Message {
  return {
    id: rec.id,
    type: (rec.type === "in-app" ? "in-app" : rec.type) as Message["type"],
    direction: rec.direction as Message["direction"],
    from: rec.direction === "outbound" ? "facility" : "customer",
    to: rec.direction === "outbound" ? "customer" : "facility",
    subject: rec.subject,
    body: rec.content,
    status: (rec.status ?? "sent") as Message["status"],
    timestamp: rec.timestamp,
    clientId: rec.clientId,
    hasRead: rec.status === "read",
  };
}

export function CustomerConversation({
  facilityId,
  communications,
  onBack,
}: {
  facilityId: number | null;
  communications: CommunicationRecord[];
  onBack?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const facility = useMemo(
    () => (facilityId ? facilities.find((f) => f.id === facilityId) : null),
    [facilityId],
  );

  const threadMessages = useMemo(() => {
    if (!facilityId) return [];
    return communications
      .filter((c) => c.facilityId === facilityId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [facilityId, communications]);

  const messages = useMemo(
    () => threadMessages.map(toMessage),
    [threadMessages],
  );

  const messagesWithDates = useMemo(() => {
    const result: { msg: Message; showDate: boolean }[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      const d = new Date(msg.timestamp).toDateString();
      result.push({ msg, showDate: !seen.has(d) });
      seen.add(d);
    }
    return result;
  }, [messages]);

  const channels = useMemo(
    () => [...new Set(threadMessages.map((m) => m.type))],
    [threadMessages],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  if (!facilityId || !facility) {
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
      <div className="flex items-center gap-3 border-b px-4 py-3 md:px-5">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <div>
          <h3 className="text-sm font-semibold">{facility.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="flex gap-1">
              {channels.map((ch) => (
                <ChannelBadge
                  key={ch}
                  channel={ch as "email" | "sms" | "in-app"}
                  size="xs"
                />
              ))}
            </div>
            <span className="text-muted-foreground text-[10px]">
              Typically responds within 2 hours
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5"
      >
        {messagesWithDates.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              Start a conversation with {facility.name}
            </p>
          </div>
        ) : (
          messagesWithDates.map(({ msg, showDate }) => (
            <div key={msg.id}>
              {showDate && <DateSeparator date={msg.timestamp} />}
              <MessageBubble message={msg} />
            </div>
          ))
        )}
      </div>

      {/* Compose */}
      <div className="border-t px-4 py-3 md:px-5">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="size-8 shrink-0">
            <Paperclip className="text-muted-foreground size-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="max-h-[120px] min-h-[40px] resize-none border-0 px-0 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setText("");
              }
            }}
          />
          <Button
            size="icon"
            className="size-8 shrink-0"
            disabled={!text.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
