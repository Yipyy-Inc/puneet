"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Circle,
  Ban,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import type { FeedingEntry } from "@/types/booking";

interface FeedingSectionProps {
  entries: FeedingEntry[];
}

const FEEDBACK_OPTIONS = [
  { value: "ate_all", label: "Ate all (100%)" },
  { value: "ate_most", label: "Ate most (75%)" },
  { value: "ate_some", label: "Ate some (50%)" },
  { value: "ate_little", label: "Ate little (25%)" },
  { value: "refused", label: "Refused (0%)" },
];

const MEAL_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack", "Treats"];
const FOOD_TYPES = [
  "Dry Kibble",
  "Wet Food",
  "Raw",
  "Homemade",
  "Prescription Diet",
  "Other",
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

let _feedId = 100;

export function FeedingSection({ entries }: FeedingSectionProps) {
  const [items, setItems] = useState(entries);
  const [addOpen, setAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    label: "Breakfast",
    time: "08:00",
    amount: "",
    foodType: "",
    instructions: "",
  });

  const handleLog = (id: string, feedback: string) => {
    setItems((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "completed" as const,
              feedback:
                FEEDBACK_OPTIONS.find((o) => o.value === feedback)?.label ??
                feedback,
              completedBy: "You",
              completedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
    toast.success("Feeding logged");
  };

  const handleAdd = () => {
    if (!newEntry.amount && !newEntry.foodType) {
      toast.error("Please fill in amount and food type");
      return;
    }
    _feedId += 1;
    setItems((prev) => [
      ...prev,
      {
        id: `feed-new-${_feedId}`,
        ...newEntry,
        status: "pending" as const,
      },
    ]);
    setNewEntry({
      label: MEAL_LABELS[Math.min(items.length + 1, MEAL_LABELS.length - 1)],
      time: "12:00",
      amount: "",
      foodType: "",
      instructions: "",
    });
    setAddOpen(false);
    toast.success("Meal added");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <UtensilsCrossed className="size-3.5" />
            Feeding Instructions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={() => setAddOpen(!addOpen)}
          >
            <Plus className="size-3" />
            Add Meal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Inline add form */}
        <Collapsible open={addOpen} onOpenChange={setAddOpen}>
          <CollapsibleContent>
            <div className="space-y-3 border-b py-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label className="text-[11px]">Meal</Label>
                  <Select
                    value={newEntry.label}
                    onValueChange={(v) =>
                      setNewEntry((p) => ({ ...p, label: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_LABELS.map((l) => (
                        <SelectItem key={l} value={l} className="text-xs">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Time</Label>
                  <Input
                    type="time"
                    value={newEntry.time}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, time: e.target.value }))
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Amount</Label>
                  <Input
                    value={newEntry.amount}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, amount: e.target.value }))
                    }
                    placeholder="e.g. 1 cup"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Food Type</Label>
                  <Select
                    value={newEntry.foodType}
                    onValueChange={(v) =>
                      setNewEntry((p) => ({ ...p, foodType: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_TYPES.map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Instructions (optional)</Label>
                <Textarea
                  value={newEntry.instructions}
                  onChange={(e) =>
                    setNewEntry((p) => ({ ...p, instructions: e.target.value }))
                  }
                  placeholder="e.g. Mix with warm water..."
                  className="mt-1 min-h-[50px] text-xs"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={handleAdd}
                >
                  Add Meal
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Entries */}
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <UtensilsCrossed className="text-muted-foreground/20 mx-auto size-8" />
            <p className="text-muted-foreground mt-2 text-xs">
              No feeding instructions — click &quot;Add Meal&quot; to add
            </p>
          </div>
        ) : (
          <div className="divide-y">
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
                      <span className="text-sm font-semibold">
                        {entry.label}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 ml-6 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {fmtTime(entry.time)}
                      </span>
                      {entry.amount && <span>{entry.amount}</span>}
                      {entry.foodType && (
                        <span className="font-medium">{entry.foodType}</span>
                      )}
                    </div>
                    {entry.instructions && (
                      <p className="text-muted-foreground mt-1 ml-6 text-xs italic">
                        {entry.instructions}
                      </p>
                    )}
                  </div>

                  {entry.status === "completed" ? (
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {entry.feedback}
                      </span>
                      {entry.completedBy && (
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {entry.completedBy} at{" "}
                          {entry.completedAt
                            ? fmtTimestamp(entry.completedAt)
                            : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Select onValueChange={(v) => handleLog(entry.id, v)}>
                      <SelectTrigger className="h-7 w-[140px] text-[11px]">
                        <SelectValue placeholder="Log meal..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_OPTIONS.map((opt) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
