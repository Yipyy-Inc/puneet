import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { DateRange } from "@/lib/calling/date-range";

/**
 * Date-range filter (All time / Today / This week / Last 30 days / Custom).
 * Shared by the Call Log and Recordings filters so they look and behave alike.
 */
export function DateRangeFilter({
  value,
  onChange,
  customFrom,
  onCustomFrom,
  customTo,
  onCustomTo,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  customFrom: string;
  onCustomFrom: (value: string) => void;
  customTo: string;
  onCustomTo: (value: string) => void;
}) {
  return (
    <>
      <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
        <SelectTrigger className="w-40 gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">Last 30 days</SelectItem>
          <SelectItem value="custom">Custom…</SelectItem>
        </SelectContent>
      </Select>
      {value === "custom" && (
        <div className="flex items-center gap-1.5">
          <DatePicker
            value={customFrom}
            onValueChange={onCustomFrom}
            placeholder="From"
            max={customTo || undefined}
            className="h-9 w-36"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <DatePicker
            value={customTo}
            onValueChange={onCustomTo}
            placeholder="To"
            min={customFrom || undefined}
            className="h-9 w-36"
          />
        </div>
      )}
    </>
  );
}
