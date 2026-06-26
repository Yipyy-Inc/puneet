"use client";

import { useEffect, useRef } from "react";
import { Lock, Paperclip } from "lucide-react";

import {
  assignConversation,
  setConversationStatus,
  supportAgents,
} from "@/hooks/use-support-inbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AdminSupportMessage,
  ConversationStatus,
  SupportConversation,
} from "@/types/support-chat";
import { FacilityAvatar } from "./facility-avatar";
import { MessageComposer } from "./message-composer";
import { formatTime } from "./support-chat-utils";

const STATUSES: ConversationStatus[] = ["open", "pending", "resolved"];

export function ConversationThread({
  conversation,
}: {
  conversation: SupportConversation | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = conversation?.messages.length ?? 0;
  const id = conversation?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count, id]);

  if (!conversation) {
    return (
      <div className="bg-card text-muted-foreground flex h-full flex-1 items-center justify-center rounded-2xl border text-sm">
        Select a conversation to get started.
      </div>
    );
  }

  return (
    <div className="bg-card flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-center gap-3">
          <FacilityAvatar
            name={conversation.facilityName}
            id={conversation.facilityId}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">
                {conversation.facilityName}
              </p>
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    conversation.online ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                {conversation.online ? "Online" : "Away"}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {conversation.contactName} · {conversation.contactEmail}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={conversation.assignedAgentId?.toString() ?? "unassigned"}
            onValueChange={(v) =>
              assignConversation(
                conversation.id,
                v === "unassigned" ? null : Number(v),
              )
            }
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Assign to Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {supportAgents.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={conversation.status}
            onValueChange={(v) =>
              setConversationStatus(conversation.id, v as ConversationStatus)
            }
          >
            <SelectTrigger className="h-9 w-32 capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            facilityName={conversation.facilityName}
            facilityId={conversation.facilityId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer convId={conversation.id} />
    </div>
  );
}

function MessageRow({
  message,
  facilityName,
  facilityId,
}: {
  message: AdminSupportMessage;
  facilityName: string;
  facilityId: number;
}) {
  if (message.isInternalNote) {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:bg-amber-950/30">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <Lock className="size-3" />
          Internal note · {message.authorName} · {formatTime(message.at)}
        </p>
        <p className="mt-1 text-sm">{message.body}</p>
      </div>
    );
  }

  const isAgent = message.sender === "agent";
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isAgent ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isAgent && (
        <FacilityAvatar name={facilityName} id={facilityId} size="sm" />
      )}
      <div
        className={cn(
          "flex max-w-[78%] flex-col",
          isAgent ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm",
            isAgent ? "bg-violet-600 text-white" : "bg-muted",
          )}
        >
          {message.body && (
            <p className="whitespace-pre-wrap">{message.body}</p>
          )}
          {message.attachments?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {message.attachments.map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                    isAgent ? "bg-white/20" : "bg-background border",
                  )}
                >
                  <Paperclip className="size-3" />
                  {a.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-0.5 px-1 text-[10px]">
          {message.authorName} · {formatTime(message.at)}
        </p>
      </div>
    </div>
  );
}
