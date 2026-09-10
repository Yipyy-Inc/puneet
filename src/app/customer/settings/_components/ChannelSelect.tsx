"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CHANNEL_KEYS, type NotificationChannel } from "./types";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface ChannelSelectProps {
  value: NotificationChannel[];
  onChange: (next: NotificationChannel[]) => void;
  allowed: NotificationChannel[];
  disabled?: boolean;
}

export function ChannelSelect({
  value,
  onChange,
  allowed,
  disabled,
}: ChannelSelectProps) {
  const { t, fill } = useCustomerText("settings");
  const [open, setOpen] = useState(false);
  const ordered = allowed.filter((c) => value.includes(c));

  const toggle = (channel: NotificationChannel) => {
    onChange(
      value.includes(channel)
        ? value.filter((c) => c !== channel)
        : [...value, channel],
    );
  };

  // Single-channel categories don't need a multi-select — show a static badge.
  if (allowed.length === 1) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex h-9 items-center gap-1.5 rounded-md border border-dashed px-2.5 text-xs",
          disabled && "opacity-50",
        )}
      >
        <span className="text-muted-foreground">{t("sentVia")}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
          {t(CHANNEL_KEYS[allowed[0]])}
        </Badge>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-state={open ? "open" : "closed"}
          className={cn(
            "group border-input bg-background flex h-9 w-full items-center gap-1 rounded-md border px-2 text-left text-sm shadow-xs transition-colors outline-none",
            "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {ordered.length === 0 ? (
              <span className="text-muted-foreground text-xs">
                {t("pickAChannel")}
              </span>
            ) : (
              ordered.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="h-6 gap-0.5 px-1.5 text-[11px]"
                >
                  {t(CHANNEL_KEYS[c])}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={fill("removeChannel", {
                      channel: t(CHANNEL_KEYS[c]),
                    })}
                    className="hover:bg-foreground/10 -mr-0.5 inline-flex size-4 items-center justify-center rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!disabled) toggle(c);
                    }}
                  >
                    <X className="size-2.5" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground ml-1 size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-1"
        align="start"
      >
        <div className="space-y-0.5">
          {allowed.map((channel) => {
            const checked = value.includes(channel);
            return (
              <button
                type="button"
                key={channel}
                onClick={() => toggle(channel)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span>{t(CHANNEL_KEYS[channel])}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
