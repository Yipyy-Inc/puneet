"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile, Image as ImageIcon, Mic } from "lucide-react";

export function ComposeBar({
  onSend,
}: {
  onSend?: (message: string, channel: "sms" | "email") => void;
}) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.(text.trim(), "sms");
    setText("");
  };

  return (
    <div className="border-t bg-white px-6 py-4">
      <div className="flex items-end gap-2">
        {/* Left actions */}
        <div className="flex shrink-0 items-center gap-0.5 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-slate-400 hover:text-slate-600"
          >
            <Paperclip className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-slate-400 hover:text-slate-600"
          >
            <ImageIcon className="size-4" />
          </Button>
        </div>

        {/* Input */}
        <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a message..."
            rows={1}
            className="max-h-28 min-h-[20px] flex-1 resize-none bg-transparent text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400"
            style={{
              height: "20px",
              overflowY: text.split("\n").length > 4 ? "auto" : "hidden",
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "20px";
              t.style.height = `${Math.min(t.scrollHeight, 112)}px`;
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-full text-slate-400 hover:text-slate-600"
          >
            <Smile className="size-4" />
          </Button>
        </div>

        {/* Send / Mic */}
        <div className="shrink-0 pb-1">
          {text.trim() ? (
            <Button
              size="icon"
              className="size-10 rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"
              onClick={handleSend}
            >
              <Send className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-slate-400 hover:text-slate-600"
            >
              <Mic className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
