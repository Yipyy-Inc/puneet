"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useAiText } from "@/hooks/use-ai-text";

export function ComposeBar({
  onSend,
  clientName,
  lastMessage,
  preferredLanguageLabel,
  mode = "facility",
}: {
  onSend?: (message: string, channel: "sms" | "email") => void;
  clientName?: string;
  lastMessage?: string;
  preferredLanguageLabel?: string;
  mode?: "facility" | "customer";
}) {
  const isCustomerMode = mode === "customer";
  const [text, setText] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const ai = useAiText({ type: "chat_reply", maxWords: 60 });

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.(text.trim(), "sms");
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
          )}
        </div>
      )}

      {/* Main compose row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Plus button */}
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 size-9 shrink-0 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          onClick={() => setShowExtras(!showExtras)}
        >
          <Plus
            className="size-5 transition-transform"
            style={{
              transform: showExtras ? "rotate(45deg)" : "rotate(0deg)",
            }}
          />
        </Button>

        {/* Input area */}
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isCustomerMode
                ? "Type a message to your facility..."
                : preferredLanguageLabel
                  ? `Type a message in ${preferredLanguageLabel}...`
                  : "Type a message..."
            }
            rows={1}
            className="max-h-32 min-h-[22px] flex-1 resize-none bg-transparent text-sm leading-[22px] text-slate-800 outline-none placeholder:text-slate-400"
            style={{ height: "22px", overflowY: "hidden" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "22px";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              t.style.overflowY = t.scrollHeight > 128 ? "auto" : "hidden";
            }}
          />
          <button
            type="button"
            className="mb-0.5 shrink-0 text-slate-400 transition-colors hover:text-slate-600"
          >
            <Smile className="size-5" />
          </button>
        </div>

        {/* Send button */}
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
