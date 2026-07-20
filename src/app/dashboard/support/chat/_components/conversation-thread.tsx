"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FileVideo,
  Lock,
  Mail,
  Paperclip,
  Sheet,
} from "lucide-react";

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
  SupportAttachment,
  SupportConversation,
} from "@/types/support-chat";
import { FacilityAvatar } from "./facility-avatar";
import { MessageComposer } from "./message-composer";
import { STATUS_META, STATUS_ORDER, formatTime } from "./support-chat-utils";

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type?: string) {
  const cls = "size-3.5 shrink-0";
  if (type === "application/pdf") return <FileText className={cls} />;
  if (type === "text/csv") return <Sheet className={cls} />;
  if (type?.startsWith("video/")) return <FileVideo className={cls} />;
  return <Paperclip className={cls} />;
}

export function ConversationThread({
  conversation,
  onBack,
}: {
  conversation: SupportConversation | null;
  /** Small screens only: return to the inbox list (clears the selection). */
  onBack?: () => void;
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
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to inbox"
              className="hover:bg-muted -ml-1 flex size-8 shrink-0 items-center justify-center rounded-full lg:hidden"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <FacilityAvatar
            name={conversation.facilityName}
            id={conversation.facilityId}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/facilities/${conversation.facilityId}`}
                className="truncate font-semibold hover:underline"
                title={`Open ${conversation.facilityName}`}
              >
                {conversation.facilityName}
              </Link>
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

        <div className="flex flex-wrap items-center justify-end gap-2">
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
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
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

      <MessageComposer
        convId={conversation.id}
        facilityName={conversation.facilityName}
        contactName={conversation.contactName}
        contactEmail={conversation.contactEmail}
      />
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
          {message.channel === "email" && (
            <p
              className={cn(
                "mb-1 flex items-center gap-1 border-b pb-1 text-[10px] font-semibold",
                isAgent
                  ? "border-white/20 text-white/80"
                  : "text-muted-foreground",
              )}
            >
              <Mail className="size-3" />
              Email{message.subject ? ` · ${message.subject}` : ""}
            </p>
          )}
          {message.body && (
            <p className="whitespace-pre-wrap">{message.body}</p>
          )}
          {message.attachments?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {message.attachments.map((a) => (
                <AttachmentPreview
                  key={a.id}
                  attachment={a}
                  isAgent={isAgent}
                />
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

function AttachmentPreview({
  attachment: a,
  isAgent,
}: {
  attachment: SupportAttachment;
  isAgent: boolean;
}) {
  const isImage = a.type?.startsWith("image/") && a.url;

  if (isImage) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noreferrer"
        title={a.name}
        className="block overflow-hidden rounded-lg border"
      >
        {/* Inline image preview (data URL from the composer). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt={a.name}
          className="max-h-44 max-w-[220px] object-cover"
        />
      </a>
    );
  }

  const chip = (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]",
        isAgent ? "bg-white/20" : "bg-background border",
      )}
    >
      {fileIcon(a.type)}
      <span className="max-w-[160px] truncate font-medium">{a.name}</span>
      {a.size ? (
        <span className={isAgent ? "text-white/70" : "text-muted-foreground"}>
          {formatBytes(a.size)}
        </span>
      ) : null}
    </span>
  );

  return a.url ? (
    <a href={a.url} target="_blank" rel="noreferrer" title={a.name}>
      {chip}
    </a>
  ) : (
    chip
  );
}
