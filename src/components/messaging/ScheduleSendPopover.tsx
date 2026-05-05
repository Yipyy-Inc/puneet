"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, Calendar as CalendarIcon, Send } from "lucide-react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatPreset(label: string, target: Date) {
  return `${label} · ${target.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${target.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
}

export function ScheduleSendPopover({
  disabled,
  onSchedule,
}: {
  disabled?: boolean;
  onSchedule: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState("09:00");

  const presets = useMemo(() => {
    const now = new Date();
    const inAnHour = new Date(now.getTime() + 60 * 60 * 1000);
    const tomorrow9 = new Date(now);
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    const monday9 = new Date(now);
    const daysUntilMon = (8 - monday9.getDay()) % 7 || 7;
    monday9.setDate(monday9.getDate() + daysUntilMon);
    monday9.setHours(9, 0, 0, 0);
    return [
      { label: "In 1 hour", date: inAnHour },
      { label: "Tomorrow 9am", date: tomorrow9 },
      { label: "Next Monday 9am", date: monday9 },
    ];
  }, []);

  const submit = (iso: string) => {
    onSchedule(iso);
    setOpen(false);
  };

  const submitCustom = () => {
    const target = new Date(`${date}T${time}`);
    if (Number.isNaN(target.getTime())) return;
    submit(target.toISOString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "size-9 shrink-0 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600",
            disabled && "opacity-40",
          )}
          title="Schedule send"
        >
          <Clock className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-xl p-3 shadow-xl"
        side="top"
      >
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon className="size-3.5 text-blue-600" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
            Schedule send
          </span>
        </div>

        <div className="space-y-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => submit(p.date.toISOString())}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <span>{formatPreset(p.label, p.date)}</span>
              <Send className="size-3 text-slate-300" />
            </button>
          ))}
        </div>

        <div className="my-3 h-px bg-slate-100" />

        <div className="space-y-2">
          <Label className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            Pick a date & time
          </Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-8 w-24 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={submitCustom}
          >
            <Clock className="mr-1.5 size-3.5" />
            Schedule
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
