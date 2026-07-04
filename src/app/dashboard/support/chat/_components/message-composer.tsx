"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarPlus,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { helpArticles } from "@/data/help-articles";
import { communicationsQueries } from "@/lib/api/communications";
import { emailTemplateQueries } from "@/lib/api/email-templates";
import { sendSupportReply } from "@/hooks/use-support-inbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SupportAttachment } from "@/types/support-chat";
import { SavedRepliesPanel } from "./saved-replies-panel";
import { applySupportMergeFields } from "./support-chat-utils";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.mp4,.csv";
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4",
  "text/csv",
]);
// CSVs sometimes arrive with an empty/odd MIME type — fall back to the extension.
const ALLOWED_EXT = /\.(pdf|png|jpe?g|gif|mp4|csv)$/i;

function isAllowed(file: File): boolean {
  return ALLOWED_TYPES.has(file.type) || ALLOWED_EXT.test(file.name);
}

export function MessageComposer({
  convId,
  facilityName,
  contactName,
  contactEmail,
}: {
  convId: string;
  facilityName: string;
  contactName: string;
  contactEmail: string;
}) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [channel, setChannel] = useState<"chat" | "email">("chat");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedQuery, setSavedQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: emailTemplates = [] } = useQuery(emailTemplateQueries.list());
  const { data: savedReplies = [] } = useQuery(
    communicationsQueries.savedReplies(),
  );

  const isNote = mode === "note";
  const isEmail = !isNote && channel === "email";
  const mergeCtx = { facilityName, contactName, contactEmail };

  function insert(snippet: string) {
    setText((t) => (t ? `${t} ${snippet}` : snippet));
  }

  function handleTextChange(value: string) {
    setText(value);
    // Saved replies are for facility replies only, not internal notes.
    if (isNote) return;
    if (value.startsWith("/")) {
      setSavedQuery(value.slice(1));
      setSavedOpen(true);
    } else if (savedOpen) {
      setSavedOpen(false);
    }
  }

  function pickReply(body: string) {
    setText(applySupportMergeFields(body, mergeCtx));
    setSavedOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function applyTemplate(templateSubject: string, templateBody: string) {
    setSubject(applySupportMergeFields(templateSubject, mergeCtx));
    setText(applySupportMergeFields(templateBody, mergeCtx));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      if (!isAllowed(file)) {
        toast.error(
          `${file.name}: unsupported type (PDF, PNG, JPG, GIF, MP4, CSV)`,
        );
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is over the 25MB limit.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url =
          typeof reader.result === "string" ? reader.result : undefined;
        setAttachments((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}-${prev.length}-${file.name}`,
            name: file.name,
            url,
            type: file.type,
            size: file.size,
          },
        ]);
      };
      reader.onerror = () => toast.error(`Could not read ${file.name}.`);
      reader.readAsDataURL(file);
    }
  }

  const nothingToSend = !text.trim() && attachments.length === 0;
  const emailNeedsSubject = isEmail && !subject.trim();
  const sendDisabled = nothingToSend || emailNeedsSubject;

  function send() {
    if (sendDisabled) return;
    sendSupportReply(convId, text, {
      isInternalNote: isNote,
      attachments: attachments.length ? attachments : undefined,
      channel: isNote ? undefined : channel,
      subject: isEmail && subject.trim() ? subject.trim() : undefined,
    });
    setText("");
    setSubject("");
    setAttachments([]);
    setSavedOpen(false);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative border-t p-3",
        isNote && "bg-amber-50/60 dark:bg-amber-950/20",
        dragging && "ring-primary ring-2 ring-inset",
      )}
    >
      {dragging && (
        <div className="bg-background/80 text-muted-foreground pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-b-2xl text-sm">
          <Upload className="size-6" />
          Drop files to attach
          <span className="text-[10px]">
            PDF, PNG, JPG, GIF, MP4, CSV · max 25MB
          </span>
        </div>
      )}

      <div className="mb-2 flex items-center gap-1">
        <ToggleButton active={!isNote} onClick={() => setMode("reply")}>
          Facility
        </ToggleButton>
        <ToggleButton active={isNote} onClick={() => setMode("note")}>
          Internal Notes
        </ToggleButton>

        {!isNote && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-[10px] font-semibold tracking-wide uppercase">
              Send via
            </span>
            <ChannelButton
              active={channel === "chat"}
              onClick={() => setChannel("chat")}
            >
              <MessageSquare className="size-3" />
              Chat
            </ChannelButton>
            <ChannelButton
              active={channel === "email"}
              onClick={() => setChannel("email")}
            >
              <Mail className="size-3" />
              Email
            </ChannelButton>
          </div>
        )}
      </div>

      {/* Email header: To, Subject, Use template */}
      {isEmail && (
        <div className="mb-2 space-y-2 rounded-lg border p-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-14 shrink-0 font-semibold tracking-wide uppercase">
              To
            </span>
            <span className="truncate">
              {contactName}{" "}
              {contactEmail ? (
                <span className="text-muted-foreground">{`<${contactEmail}>`}</span>
              ) : (
                <span className="text-amber-600">No email on file</span>
              )}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7"
                >
                  <FileText className="mr-1.5 size-3.5" />
                  Use template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-72 w-64 overflow-y-auto"
              >
                <DropdownMenuLabel>Email templates</DropdownMenuLabel>
                {emailTemplates.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => applyTemplate(t.subject, t.body)}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-xs font-medium">{t.name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-[11px]">
                      {t.subject}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-14 shrink-0 text-xs font-semibold tracking-wide uppercase">
              Subject
            </span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Add a subject line"
              className="h-8"
            />
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-xs"
            >
              <Paperclip className="size-3" />
              <span className="max-w-[160px] truncate">{a.name}</span>
              {a.size ? (
                <span className="text-muted-foreground">
                  {a.size < 1024 * 1024
                    ? `${Math.round(a.size / 1024)} KB`
                    : `${(a.size / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
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

      <div className="relative">
        {!isNote && (
          <SavedRepliesPanel
            open={savedOpen}
            query={savedQuery}
            replies={savedReplies}
            onPick={(reply) => pickReply(reply.body)}
            onClose={() => setSavedOpen(false)}
          />
        )}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={
            isNote
              ? "Add an internal note (only visible to agents)…"
              : isEmail
                ? "Write your email…"
                : "Reply to the facility… or type / for saved replies"
          }
          className={cn("min-h-16", isNote && "border-amber-300")}
        />
      </div>

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
          disabled={sendDisabled}
          title={
            emailNeedsSubject ? "Add a subject to send this email" : undefined
          }
        >
          <Send className="mr-1.5 size-4" />
          {isNote ? "Add note" : isEmail ? "Send email" : "Send"}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
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

function ChannelButton({
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
        "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-border bg-background text-foreground border shadow-sm"
          : "text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
