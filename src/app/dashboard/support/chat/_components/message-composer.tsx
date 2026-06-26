"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  CalendarPlus,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from "lucide-react";

import { helpArticles } from "@/data/help-articles";
import { sendSupportReply } from "@/hooks/use-support-inbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SupportAttachment } from "@/types/support-chat";

export function MessageComposer({ convId }: { convId: string }) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNote = mode === "note";

  function insert(snippet: string) {
    setText((t) => (t ? `${t} ${snippet}` : snippet));
  }

  function send() {
    if (!text.trim() && attachments.length === 0) return;
    sendSupportReply(convId, text, {
      isInternalNote: isNote,
      attachments: attachments.length ? attachments : undefined,
    });
    setText("");
    setAttachments([]);
  }

  return (
    <div
      className={cn(
        "border-t p-3",
        isNote && "bg-amber-50/60 dark:bg-amber-950/20",
      )}
    >
      <div className="mb-2 flex items-center gap-1">
        <ToggleButton active={!isNote} onClick={() => setMode("reply")}>
          Facility
        </ToggleButton>
        <ToggleButton active={isNote} onClick={() => setMode("note")}>
          Internal Notes
        </ToggleButton>
        {!isNote && (
          <span className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-[10px] font-medium">
            <MessageSquare className="size-3" />
            Send via Chat
          </span>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-xs"
            >
              <Paperclip className="size-3" />
              {a.name}
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                }
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          isNote
            ? "Add an internal note (only visible to agents)…"
            : "Reply to the facility…"
        }
        className={cn("min-h-16", isNote && "border-amber-300")}
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground mr-1 text-[10px] font-semibold tracking-wide uppercase">
          Insert
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insert("[Booking link: https://book.yipyy.com]")}
        >
          <CalendarPlus className="mr-1.5 size-3.5" />
          Booking link
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <BookOpen className="mr-1.5 size-3.5" />
              KB article
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 overflow-y-auto"
          >
            {helpArticles.slice(0, 8).map((a) => (
              <DropdownMenuItem
                key={a.id}
                onClick={() => insert(`[Help: ${a.title}]`)}
              >
                {a.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="mr-1.5 size-3.5" />
          Attach
        </Button>

        <Button
          type="button"
          className="ml-auto"
          onClick={send}
          disabled={!text.trim() && attachments.length === 0}
        >
          <Send className="mr-1.5 size-4" />
          {isNote ? "Add note" : "Send"}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            setAttachments((prev) => [
              ...prev,
              { id: `a-${prev.length}-${f.name}`, name: f.name },
            ]);
          e.target.value = "";
        }}
      />
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
