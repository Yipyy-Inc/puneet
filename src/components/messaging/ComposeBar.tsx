"use client";

import { useState, useMemo } from "react";
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
  ChevronDown,
  Bookmark,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAiText } from "@/hooks/use-ai-text";
import { messageTemplates } from "@/data/messaging";

const SMS_SEGMENT_CHARS = 160;
const SMS_SEGMENT_CHARS_WITH_EMOJI = 70;

function countSegments(text: string): number {
  const hasEmoji = /\p{Emoji}/u.test(text);
  const charsPerSegment = hasEmoji ? SMS_SEGMENT_CHARS_WITH_EMOJI : SMS_SEGMENT_CHARS;
  if (text.length === 0) return 0;
  return Math.ceil(text.length / charsPerSegment);
}

type ActiveChannel = "sms" | "email" | "in-app";

export function ComposeBar({
  onSend,
  clientName,
  lastMessage,
  preferredLanguageLabel,
  mode = "facility",
  activeChannel = "sms",
  onChannelChange,
}: {
  onSend?: (message: string, channel: ActiveChannel) => void;
  clientName?: string;
  lastMessage?: string;
  preferredLanguageLabel?: string;
  mode?: "facility" | "customer";
  activeChannel?: ActiveChannel;
  onChannelChange?: (channel: ActiveChannel) => void;
}) {
  const isCustomerMode = mode === "customer";
  const [text, setText] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const ai = useAiText({ type: "chat_reply", maxWords: 60 });

  const segments = useMemo(() => (activeChannel === "sms" ? countSegments(text) : 0), [text, activeChannel]);
  const hasEmoji = /\p{Emoji}/u.test(text);
  const charLimit = hasEmoji ? SMS_SEGMENT_CHARS_WITH_EMOJI : SMS_SEGMENT_CHARS;
  const charsInCurrentSegment = text.length % charLimit || (text.length > 0 ? charLimit : 0);
  const charsLeft = segments > 0 ? charLimit - charsInCurrentSegment : charLimit;

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.(text.trim(), activeChannel);
    setText("");
  };

  const handleAiReply = async () => {
    const result = await ai.generate({
      clientName: clientName || "the client",
      lastMessage: lastMessage || "General inquiry",
      facilityName: "PawCare Facility",
    });
    if (result) setText(result);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = messageTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const body =
      activeChannel === "email"
        ? (tpl.emailBody ?? tpl.smsBody ?? "")
        : (tpl.smsBody ?? "");
    setText(body.replace("{ClientName}", clientName ?? "").replace("{PetName}", "your pet"));
  };

  const channelPlaceholder: Record<ActiveChannel, string> = {
    sms: preferredLanguageLabel ? `Type an SMS in ${preferredLanguageLabel}...` : "Type an SMS...",
    email: "Type your email...",
    "in-app": isCustomerMode ? "Type a message to your facility..." : "Type a chat message...",
  };

  return (
    <div className="border-t bg-white">
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

              {/* Saved replies / Templates */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Bookmark className="size-4" />
                    Templates
                    <ChevronDown className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 rounded-xl p-2 shadow-xl">
                  <p className="mb-2 px-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Saved Templates
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {messageTemplates
                      .filter((t) =>
                        activeChannel === "email" ? !!t.emailBody : !!t.smsBody,
                      )
                      .map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl.id)}
                          className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="text-xs font-semibold text-slate-700">{tpl.name}</span>
                          <span className="mt-0.5 truncate text-[11px] text-slate-400">
                            {activeChannel === "email" ? tpl.emailBody?.slice(0, 60) : tpl.smsBody?.slice(0, 60)}...
                          </span>
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      )}

      {/* Main compose row */}
      <div className="flex items-end gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 size-9 shrink-0 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          onClick={() => setShowExtras(!showExtras)}
        >
          <Plus
            className="size-5 transition-transform"
            style={{ transform: showExtras ? "rotate(45deg)" : "rotate(0deg)" }}
          />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-0 rounded-3xl border border-slate-200 bg-slate-50/80">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
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

          {/* Footer: emoji + SMS counter */}
          <div className="flex items-center justify-between px-3 pb-2">
            <button type="button" className="text-slate-400 transition-colors hover:text-slate-600">
              <Smile className="size-4" />
            </button>
            {activeChannel === "sms" && text.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[10px] tabular-nums",
                  charsLeft < 20 ? "text-red-500" : charsLeft < 40 ? "text-amber-500" : "text-slate-400",
                )}
              >
                <span>
                  {text.length} chars
                </span>
                <span className="text-slate-300">·</span>
                <span className={cn("font-semibold", segments > 1 ? "text-amber-600" : "text-slate-500")}>
                  {segments} SMS segment{segments !== 1 ? "s" : ""}
                </span>
                {segments > 1 && (
                  <span className="text-amber-500">· {segments} credits used</span>
                )}
                {hasEmoji && (
                  <span className="text-amber-500">· Emoji: {charLimit} chars/seg</span>
                )}
              </div>
            )}
            {activeChannel === "email" && text.length > 0 && (
              <span className="text-[10px] text-slate-400">{text.length} chars</span>
            )}
          </div>
        </div>

        <div className="mb-0.5 shrink-0">
          {text.trim() ? (
            <Button
              size="icon"
              className="size-10 rounded-full bg-blue-500 shadow-md shadow-blue-200 hover:bg-blue-600"
              onClick={handleSend}
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
    </div>
  );
}
