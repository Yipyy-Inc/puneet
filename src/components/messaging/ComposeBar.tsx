"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Smartphone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function ComposeBar({
  onSend,
}: {
  onSend?: (message: string, channel: "sms" | "email") => void;
}) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");

  const charCount = text.length;
  const smsCredits = Math.ceil(charCount / 160) || 0;

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.(text, channel);
    setText("");
  };

  return (
    <div className="border-t px-4 py-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="min-h-[60px] resize-none border-0 px-0 shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7">
            <Paperclip className="text-muted-foreground size-3.5" />
          </Button>
          {/* Channel toggle */}
          <div className="border-border/60 ml-1 flex rounded-md border p-0.5">
            <button
              onClick={() => setChannel("sms")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium transition-all",
                channel === "sms"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Smartphone className="size-2.5" />
              SMS
            </button>
            <button
              onClick={() => setChannel("email")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium transition-all",
                channel === "email"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Mail className="size-2.5" />
              Email
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {channel === "sms" && text.length > 0 && (
            <span className="text-muted-foreground font-mono text-[10px]">
              {charCount}/160 · {smsCredits} SMS
            </span>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send className="size-3" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
