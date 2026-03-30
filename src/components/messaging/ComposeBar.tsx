"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paperclip, Send, Smartphone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { countSms } from "@/lib/sms-counter";
import { facilities } from "@/data/facilities";

// Get SMS credits for facility 11
const facility = facilities.find((f) => f.id === 11);
const credits = (facility as Record<string, unknown>)?.smsCredits as
  | {
      monthlyAllowance: number;
      used: number;
      purchased: number;
      autoReload: boolean;
      autoReloadThreshold: number;
    }
  | undefined;
const smsRemaining = credits
  ? credits.monthlyAllowance + credits.purchased - credits.used
  : 0;

export function ComposeBar({
  onSend,
}: {
  onSend?: (message: string, channel: "sms" | "email") => void;
}) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");

  const smsInfo = useMemo(() => countSms(text), [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    if (channel === "sms" && smsInfo.isOverLimit) return;
    onSend?.(text, channel);
    setText("");
  };

  // Color based on how close to segment boundary
  const counterColor = smsInfo.isOverLimit
    ? "text-destructive"
    : smsInfo.remainingInSegment <= 20
      ? "text-warning"
      : "text-muted-foreground";

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
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "font-mono text-[10px] transition-colors",
                      counterColor,
                    )}
                  >
                    {smsInfo.isOverLimit
                      ? "Too long"
                      : `${smsInfo.characterCount}/${smsInfo.segmentCount <= 1 ? smsInfo.charsPerSegment : smsInfo.charsPerConcatSegment} · ${smsInfo.segmentCount} SMS`}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>
                    Encoding: {smsInfo.encoding}
                    {smsInfo.encoding === "UCS-2" && " (emoji detected)"}
                  </p>
                  <p>
                    {smsInfo.encoding === "GSM-7"
                      ? "Standard: 160 chars/SMS"
                      : "With emoji: 70 chars/SMS"}
                  </p>
                  <p>Max: {smsInfo.maxSegments} segments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {channel === "sms" && credits && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground text-[10px] transition-colors">
                  {smsRemaining.toLocaleString()} left
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-56 text-xs">
                <p className="mb-2 text-sm font-semibold">SMS Credits</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-[tabular-nums]">
                      {credits.monthlyAllowance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchased</span>
                    <span className="font-[tabular-nums]">
                      {credits.purchased.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-border my-1 h-px" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-[tabular-nums]">
                      {(
                        credits.monthlyAllowance + credits.purchased
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used</span>
                    <span className="text-destructive font-[tabular-nums]">
                      -{credits.used.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-border my-1 h-px" />
                  <div className="flex justify-between font-medium">
                    <span>Remaining</span>
                    <span className="font-[tabular-nums]">
                      {smsRemaining.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-[10px]">
                  Auto-reload: {credits.autoReload ? "On" : "Off"}
                  {credits.autoReload &&
                    ` (at ${credits.autoReloadThreshold} left)`}
                </p>
              </PopoverContent>
            </Popover>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSend}
            disabled={
              !text.trim() || (channel === "sms" && smsInfo.isOverLimit)
            }
          >
            <Send className="size-3" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
