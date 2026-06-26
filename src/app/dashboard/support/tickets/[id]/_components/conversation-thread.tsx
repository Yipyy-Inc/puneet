"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Download, Lock, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTimestamp, mockAttachments } from "./ticket-utils";

export interface ThreadMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function ConversationThread({
  messages,
  requester,
  facilityName,
}: {
  messages: ThreadMessage[];
  requester: string;
  facilityName: string;
}) {
  const [view, setView] = useState<"conversation" | "notes">("conversation");
  const shown = messages.filter((m) =>
    view === "notes" ? m.isInternal : !m.isInternal,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Conversation</h2>
        <div className="bg-muted inline-flex rounded-lg p-0.5 text-xs">
          <ToggleButton
            active={view === "conversation"}
            onClick={() => setView("conversation")}
          >
            Conversation
          </ToggleButton>
          <ToggleButton
            active={view === "notes"}
            onClick={() => setView("notes")}
          >
            <Lock className="mr-1 size-3" />
            Internal Notes
          </ToggleButton>
        </div>
      </div>

      <div className="space-y-3">
        {shown.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            {view === "notes" ? "No internal notes yet." : "No messages yet."}
          </p>
        ) : (
          shown.map((m) =>
            m.isInternal ? (
              <NoteCard key={m.id} message={m} />
            ) : (
              <Bubble
                key={m.id}
                message={m}
                requester={requester}
                facilityName={facilityName}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function Bubble({
  message,
  requester,
  facilityName,
}: {
  message: ThreadMessage;
  requester: string;
  facilityName: string;
}) {
  const isFacility = message.sender === requester;
  const atts = mockAttachments(message.id);
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isFacility ? "flex-row" : "flex-row-reverse",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
          isFacility ? "bg-slate-500" : "bg-violet-600",
        )}
      >
        {isFacility ? initials(message.sender) : "Y"}
      </span>
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isFacility ? "items-start" : "items-end",
        )}
      >
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span className="text-foreground font-medium">{message.sender}</span>
          <span className="bg-muted rounded px-1.5 py-0.5">
            {isFacility ? facilityName : "Yipyy Support"}
          </span>
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
            isFacility ? "bg-muted" : "bg-violet-600 text-white",
          )}
        >
          {message.message}
        </div>
        {atts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {atts.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => toast.success(`Downloading ${a.name}`)}
                className="bg-background hover:bg-muted flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]"
              >
                <Paperclip className="size-3" />
                {a.name}
                <span className="text-muted-foreground">{a.size}</span>
                <Download className="text-muted-foreground size-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ message }: { message: ThreadMessage }) {
  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        <Lock className="size-3" />
        Internal note · {message.sender} · {formatTimestamp(message.timestamp)}
      </p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{message.message}</p>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
