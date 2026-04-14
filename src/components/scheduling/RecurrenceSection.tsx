"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOW_LABELS,
  DOW_VALUES,
  getRecurrenceSummary,
} from "@/lib/shift-recurrence";
import type { ShiftRecurrence } from "@/types/scheduling";

interface RecurrenceSectionProps {
  isRecurring: boolean;
  onIsRecurringChange: (v: boolean) => void;
  frequency: ShiftRecurrence["frequency"];
  onFrequencyChange: (v: ShiftRecurrence["frequency"]) => void;
  daysOfWeek: number[];
  onToggleDay: (day: number) => void;
  endsOn: "never" | "date" | "count";
  onEndsOnChange: (v: "never" | "date" | "count") => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  occurrences: string;
  onOccurrencesChange: (v: string) => void;
  startDate: string;
}

export function RecurrenceSection({
  isRecurring,
  onIsRecurringChange,
  frequency,
  onFrequencyChange,
  daysOfWeek,
  onToggleDay,
  endsOn,
  onEndsOnChange,
  endDate,
  onEndDateChange,
  occurrences,
  onOccurrencesChange,
  startDate,
}: RecurrenceSectionProps) {
  const summary = isRecurring
    ? getRecurrenceSummary(frequency, daysOfWeek, endsOn, endDate, occurrences)
    : "";

  return (
    <>
      <Separator />
      <div className="space-y-3">
        {/* Toggle header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat2 className="text-muted-foreground size-3.5" />
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Recurrence
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRecurring && (
              <span className="text-muted-foreground max-w-[200px] truncate text-[11px] italic">
                {summary}
              </span>
            )}
            <Switch
              id="recurring-toggle"
              checked={isRecurring}
              onCheckedChange={onIsRecurringChange}
            />
          </div>
        </div>

        {/* Expanded recurrence options */}
        {isRecurring && (
          <div className="bg-muted/20 space-y-4 rounded-lg border p-3">
            {/* Frequency */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Repeat</Label>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  onFrequencyChange(v as ShiftRecurrence["frequency"])
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days-of-week picker (weekly / biweekly only) */}
            {(frequency === "weekly" || frequency === "biweekly") && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Repeat on
                </Label>
                <div className="flex gap-1">
                  {DOW_LABELS.map((label, i) => {
                    const dayVal = DOW_VALUES[i];
                    const selected = daysOfWeek.includes(dayVal);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleDay(dayVal)}
                        className={cn(
                          "flex h-8 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* End condition */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Ends</Label>
              <RadioGroup
                value={endsOn}
                onValueChange={(v) =>
                  onEndsOnChange(v as "never" | "date" | "count")
                }
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="never" id="ends-never" />
                  <Label
                    htmlFor="ends-never"
                    className="cursor-pointer text-sm font-normal"
                  >
                    Never
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem value="date" id="ends-date" />
                  <Label
                    htmlFor="ends-date"
                    className="cursor-pointer text-sm font-normal"
                  >
                    On date
                  </Label>
                  {endsOn === "date" && (
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => onEndDateChange(e.target.value)}
                      className="ml-2 h-7 w-36 text-xs"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem value="count" id="ends-count" />
                  <Label
                    htmlFor="ends-count"
                    className="cursor-pointer text-sm font-normal"
                  >
                    After
                  </Label>
                  {endsOn === "count" && (
                    <>
                      <Input
                        type="number"
                        value={occurrences}
                        onChange={(e) => onOccurrencesChange(e.target.value)}
                        className="ml-2 h-7 w-16 text-xs"
                        min={1}
                        max={365}
                      />
                      <span className="text-muted-foreground text-xs">
                        occurrences
                      </span>
                    </>
                  )}
                </div>
              </RadioGroup>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
