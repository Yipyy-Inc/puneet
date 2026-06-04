"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  Send,
  Smile,
  Image as ImageIcon,
  Mic,
  Plus,
  Sparkles,
  Loader2,
  Save,
  Smartphone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAiText } from "@/hooks/use-ai-text";
import { SavedRepliesMenu } from "./SavedRepliesMenu";
import { SaveAsReplyDialog } from "./SaveAsReplyDialog";
import { ScheduleSendPopover } from "./ScheduleSendPopover";
import { QuickLinkBar, type QuickLinkContext } from "./QuickLinkBar";
import { useSavedReplies } from "./saved-replies-context";
import { useScheduledMessages } from "./scheduled-messages-context";

const SMS_SEGMENT_CHARS = 160;
const SMS_SEGMENT_CHARS_WITH_EMOJI = 70;

function countSegments(text: string): number {
  const hasEmoji = /\p{Emoji}/u.test(text);
  const charsPerSegment = hasEmoji ? SMS_SEGMENT_CHARS_WITH_EMOJI : SMS_SEGMENT_CHARS;
  if (text.length === 0) return 0;
  return Math.ceil(text.length / charsPerSegment);
}

type ActiveChannel = "sms" | "email" | "in-app";

const CHANNEL_OPTIONS: {
  key: ActiveChannel;
  label: string;
  icon: typeof Smartphone;
}[] = [
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "email", label: "Email", icon: Mail },
  { key: "in-app", label: "Chat", icon: MessageCircle },
];

function applyTokens(body: string, ctx: QuickLinkContext): string {
  return body
    .replace(/\{ClientName\}/g, ctx.clientName ?? "")
    .replace(/\{PetName\}/g, ctx.petName ?? "your pet")
    .replace(/\{Balance\}/g, "$0.00");
}

export function ComposeBar({
  onSend,
  clientName,
  lastMessage,
  preferredLanguageLabel,
  mode = "facility",
  activeChannel = "sms",
  onChannelChange,
  threadId,
  petName,
  upcomingBookingSummary,
  bookingId,
  recipientEmail,
  senderName,
  prefillKey,
  prefillText,
}: {
  onSend?: (message: string, channel: ActiveChannel, meta?: { subject?: string }) => void;
  clientName?: string;
  lastMessage?: string;
  preferredLanguageLabel?: string;
  mode?: "facility" | "customer";
  activeChannel?: ActiveChannel;
  onChannelChange?: (channel: ActiveChannel) => void;
  threadId?: string | null;
  petName?: string;
  upcomingBookingSummary?: string | null;
  bookingId?: string | number | null;
  recipientEmail?: string | null;
  senderName?: string;
  /** When `prefillKey` changes, the draft is replaced once with `prefillText`
   *  (e.g. a missed-call template deep-linked from the Call Log). Editable. */
  prefillKey?: string;
  prefillText?: string;
}) {
  const isCustomerMode = mode === "customer";
  const [text, setText] = useState("");
  const prefillAppliedRef = useRef<string | null>(null);
  const [subject, setSubject] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(true);
  const [savedRepliesOpen, setSavedRepliesOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedQuery, setSavedQuery] = useState("");
  const ai = useAiText({ type: "chat_reply", maxWords: 60 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedReplies = useSavedReplies();
  const scheduledMessages = useScheduledMessages();

  // Replace the draft once per prefill key (deep-linked templates, e.g. a
  // missed-call SMS from the Call Log). Stays editable afterwards.
  useEffect(() => {
    if (!prefillKey || prefillText == null) return;
    if (prefillAppliedRef.current === prefillKey) return;
    prefillAppliedRef.current = prefillKey;
    setText(prefillText);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.style.height = "22px";
        ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
        ta.style.overflowY = ta.scrollHeight > 128 ? "auto" : "hidden";
      }
    });
  }, [prefillKey, prefillText]);

  const segments = useMemo(
    () => (activeChannel === "sms" ? countSegments(text) : 0),
    [text, activeChannel],
  );
  const hasEmoji = /\p{Emoji}/u.test(text);
  const charLimit = hasEmoji ? SMS_SEGMENT_CHARS_WITH_EMOJI : SMS_SEGMENT_CHARS;
  const charsInCurrentSegment = text.length % charLimit || (text.length > 0 ? charLimit : 0);
  const charsLeft = segments > 0 ? charLimit - charsInCurrentSegment : charLimit;

  const linkContext: QuickLinkContext = useMemo(
    () => ({
      clientName,
      clientFirstName: clientName?.split(" ")[0],
      petName,
      upcomingBookingSummary,
      bookingId,
    }),
    [clientName, petName, upcomingBookingSummary, bookingId],
  );

  const handleSend = () => {
    if (!text.trim()) return;
    const meta =
      activeChannel === "email" && subject.trim()
        ? { subject: subject.trim() }
        : undefined;
    onSend?.(text.trim(), activeChannel, meta);
    setText("");
    setSubject("");
  };

  const handleSchedule = (iso: string) => {
    if (!text.trim() || !threadId) return;
    scheduledMessages.schedule({
      id: `sched-${Date.now()}`,
      threadId,
      clientName: clientName ?? "Client",
      body: text.trim(),
      channel: activeChannel,
      scheduledFor: iso,
      createdAt: new Date().toISOString(),
      createdBy: "You",
    });
    setText("");
    setSubject("");
    toast.success(
      `Scheduled for ${new Date(iso).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`,
    );
  };

  const handleAiReply = async () => {
    const result = await ai.generate({
      clientName: clientName || "the client",
      lastMessage: lastMessage || "General inquiry",
      facilityName: "PawCare Facility",
    });
    if (result) setText(result);
  };

  const insertSnippet = (snippet: string) => {
    setText((t) => (t ? `${t}\n${snippet}` : snippet));
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.style.height = "22px";
        ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
        ta.style.overflowY = ta.scrollHeight > 128 ? "auto" : "hidden";
      }
    });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (isCustomerMode) return;

    if (value.startsWith("/")) {
      setSavedQuery(value.slice(1));
      setSavedRepliesOpen(true);
    } else if (savedRepliesOpen) {
      setSavedRepliesOpen(false);
    }
  };

  const handlePickSavedReply = (reply: import("@/types/saved-replies").SavedReply) => {
    const body = applyTokens(reply.body, linkContext);
    setText(body);
    savedReplies.incrementUse(reply.id);
    setSavedRepliesOpen(false);
    toast.success(`Inserted "${reply.title}"`);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const channelPlaceholder: Record<ActiveChannel, string> = {
    sms: isCustomerMode
      ? "Type an SMS…"
      : preferredLanguageLabel
        ? `Type an SMS in ${preferredLanguageLabel}… or type / for saved replies`
        : "Type an SMS… or type / for saved replies",
    email: isCustomerMode
      ? "Write your email…"
      : "Write your email… or type / for saved replies",
    "in-app": isCustomerMode
      ? "Type a message to your facility…"
      : "Type a chat message… or type / for saved replies",
  };

  const isEmail = activeChannel === "email";
  const sendDisabled = !text.trim() || (isEmail && !subject.trim());

  return (
    <div className="relative border-t bg-white">
      {/* Saved replies dropdown (anchored above textarea) */}
      {!isCustomerMode && (
        <div className="relative">
          <SavedRepliesMenu
            open={savedRepliesOpen}
            query={savedQuery}
            replies={savedReplies.replies}
            onPick={handlePickSavedReply}
            onClose={() => setSavedRepliesOpen(false)}
          />
        </div>
      )}

      {/* Extra actions row */}
      {showExtras && (
        <div className="flex items-center gap-1 border-b px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-600"
          >
            <ImageIcon className="size-4" />
            Photo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-600"
          >
            <Paperclip className="size-4" />
            File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-600"
          >
            <Mic className="size-4" />
            Voice
          </Button>
          {!isCustomerMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                onClick={handleAiReply}
                disabled={ai.isGenerating}
              >
                {ai.isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                AI Reply
              </Button>

              {text.trim().length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Save className="size-4" />
                  Save as reply
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Send Via selector */}
      {!isCustomerMode && (
        <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/60 px-4 py-1.5">
          <span className="mr-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Send via
          </span>
          {CHANNEL_OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = activeChannel === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChannelChange?.(key)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                  active
                    ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:bg-white/70 hover:text-slate-600",
                )}
              >
                <Icon className="size-3" />
                {label}
              </button>
            );
          })}
          {isEmail && (
            <span className="ml-auto text-[10px] text-amber-500">
              Client may not respond instantly
            </span>
          )}
        </div>
      )}

      {/* Quick-insert toolbar */}
      {!isCustomerMode && showQuickLinks && (
        <QuickLinkBar context={linkContext} onInsert={insertSnippet} />
      )}

      {/* Main compose row */}
      <div className="flex items-end gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 size-9 shrink-0 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          onClick={() => setShowExtras(!showExtras)}
          title={showExtras ? "Hide actions" : "More actions"}
        >
          <Plus
            className="size-5 transition-transform"
            style={{ transform: showExtras ? "rotate(45deg)" : "rotate(0deg)" }}
          />
        </Button>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-0 border border-slate-200 bg-slate-50/80",
            isEmail ? "rounded-2xl" : "rounded-3xl",
          )}
        >
          {isEmail && (
            <div className="flex flex-col border-b border-slate-200/80 bg-white/60 px-4 py-1.5 text-[12px]">
              <div className="flex items-center gap-2 border-b border-slate-100 py-1">
                <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  To
                </span>
                <span className="truncate text-slate-700">
                  {clientName ? `${clientName} ` : ""}
                  {recipientEmail ? (
                    <span className="text-slate-400">{`<${recipientEmail}>`}</span>
                  ) : (
                    <span className="text-amber-500">No email on file</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 py-1">
                <label
                  htmlFor="email-subject"
                  className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Subject
                </label>
                <input
                  id="email-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Add a subject line"
                  className="flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (savedRepliesOpen) return; // menu owns keys
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sendDisabled) handleSend();
              }
            }}
            placeholder={channelPlaceholder[activeChannel]}
            rows={1}
            className="max-h-32 min-h-[22px] flex-1 resize-none bg-transparent px-4 pt-2.5 text-sm leading-[22px] text-slate-800 outline-none placeholder:text-slate-400"
            style={{ height: "22px", overflowY: "hidden" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "22px";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              t.style.overflowY = t.scrollHeight > 128 ? "auto" : "hidden";
            }}
          />

          {isEmail && senderName && (
            <p className="px-4 pb-1 text-[10px] italic text-slate-400">
              — {senderName} will appear as the sender
            </p>
          )}

          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-slate-400 transition-colors hover:text-slate-600"
                title="Emoji"
              >
                <Smile className="size-4" />
              </button>
              {!isCustomerMode && (
                <button
                  type="button"
                  onClick={() => setShowQuickLinks((v) => !v)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                    showQuickLinks
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  )}
                >
                  Quick links {showQuickLinks ? "on" : "off"}
                </button>
              )}
            </div>
            {activeChannel === "sms" && text.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[10px] tabular-nums",
                  charsLeft < 20 ? "text-red-500" : charsLeft < 40 ? "text-amber-500" : "text-slate-400",
                )}
              >
                <span>{text.length} chars</span>
                <span className="text-slate-300">·</span>
                <span className={cn("font-semibold", segments > 1 ? "text-amber-600" : "text-slate-500")}>
                  {segments} SMS segment{segments !== 1 ? "s" : ""}
                </span>
                {segments > 1 && (
                  <span className="text-amber-500">· {segments} credits</span>
                )}
              </div>
            )}
            {activeChannel === "email" && text.length > 0 && (
              <span className="text-[10px] text-slate-400">{text.length} chars</span>
            )}
          </div>
        </div>

        {!isCustomerMode && (
          <ScheduleSendPopover
            disabled={!text.trim() || !threadId}
            onSchedule={handleSchedule}
          />
        )}

        <div className="mb-0.5 shrink-0">
          {text.trim() ? (
            <Button
              size="icon"
              className="size-10 rounded-full bg-blue-500 shadow-md shadow-blue-200 hover:bg-blue-600 disabled:bg-slate-300 disabled:shadow-none"
              onClick={handleSend}
              disabled={sendDisabled}
              title={
                isEmail && !subject.trim()
                  ? "Add a subject to send this email"
                  : "Send"
              }
            >
              <Send className="size-[18px] text-white" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
            >
              <Mic className="size-5" />
            </Button>
          )}
        </div>
      </div>

      <SaveAsReplyDialog
        open={saveDialogOpen}
        initialBody={text}
        onClose={() => setSaveDialogOpen(false)}
        onSave={(reply) => {
          savedReplies.add(reply);
          toast.success(`Saved "${reply.title}" — type / to use it`);
        }}
      />
    </div>
  );
}
