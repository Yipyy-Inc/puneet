"use client";

import { Input } from "@/components/ui/input";
import { format12h } from "@/lib/care-log-scheduler";

type Props = {
  /** Current time as "HH:MM" — the default shown in "Logging at". */
  nowValue: string;
  /** Chosen log time as "HH:MM", or "" to log at the current time. */
  value: string;
  onChange: (next: string) => void;
};

/**
 * Shared meta row for every log modal: an auto-stamped "Logging at {time}" line
 * plus an "Override time" link that reveals a time input for backdated entries.
 * A non-empty `value` is the override; "" means "use the current time".
 */
export function LogMeta({ nowValue, value, onChange }: Props) {
  const effective = value || nowValue;
  const overriding = value !== "";

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs">
        Logging at:{" "}
        <span className="text-foreground font-medium">
          {effective ? format12h(effective) : "—"}
        </span>
      </p>
      {overriding ? (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Log time"
            className="h-8 w-32"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground text-xs hover:underline"
          >
            Use current time
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange(nowValue)}
          className="text-primary text-xs hover:underline"
        >
          Override time
        </button>
      )}
    </div>
  );
}
