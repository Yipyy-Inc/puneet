"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Circle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import type { FeedingEntry } from "@/types/booking";

interface FeedingSectionProps {
  entries: FeedingEntry[];
}

const feedbackOptions = [
  { value: "ate_all", label: "Ate all (100%)" },
  { value: "ate_most", label: "Ate most (75%)" },
  { value: "ate_some", label: "Ate some (50%)" },
  { value: "ate_little", label: "Ate little (25%)" },
  { value: "refused", label: "Refused (0%)" },
];

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FeedingSection({ entries }: FeedingSectionProps) {
  const [items, setItems] = useState(entries);

  const handleLog = (id: string, feedback: string) => {
    setItems((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "completed" as const,
              feedback:
                feedbackOptions.find((o) => o.value === feedback)?.label ??
                feedback,
              completedBy: "You",
              completedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
    toast.success("Feeding logged");
  };

  if (items.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <UtensilsCrossed className="size-3.5" />
          Feeding Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y pt-0">
        {items.map((entry) => (
          <div key={entry.id} className="py-4 first:pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {entry.status === "completed" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : entry.status === "skipped" ? (
                    <Ban className="size-4 shrink-0 text-red-400" />
                  ) : (
                    <Circle className="text-muted-foreground/30 size-4 shrink-0" />
                  )}
                  <span className="text-sm font-semibold">{entry.label}</span>
                </div>
                <div className="text-muted-foreground mt-1 ml-6 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {fmtTime(entry.time)}
                  </span>
                  <span>{entry.amount}</span>
                  <span className="font-medium">{entry.foodType}</span>
                </div>
                {entry.instructions && (
                  <p className="text-muted-foreground mt-1 ml-6 text-xs italic">
                    {entry.instructions}
                  </p>
                )}
              </div>

              {/* Status / Log */}
              {entry.status === "completed" ? (
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {entry.feedback}
                  </span>
                  {entry.completedBy && (
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      {entry.completedBy} at{" "}
                      {entry.completedAt ? fmtTimestamp(entry.completedAt) : ""}
                    </p>
                  )}
                </div>
              ) : (
                <Select onValueChange={(v) => handleLog(entry.id, v)}>
                  <SelectTrigger className="h-7 w-[140px] text-[11px]">
                    <SelectValue placeholder="Log meal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {entry.notes && (
              <p className="text-muted-foreground bg-muted/30 mt-1 ml-6 rounded px-2 py-1 text-[11px]">
                {entry.notes}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
