"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { formatTime, formatTimeOfDay } from "@/lib/i18n/format";
import { SHIPPED_CARE_TASK_FEEDBACK } from "@/lib/settings/care-task-feedback";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { FeedingEntry } from "@/types/booking";

// ============================================================================
// Today's meals on the booking page, and how each one went.
//
// Translated as it was touched, and two things corrected:
//
//   · The outcomes it offered came from `facilityConfig.careTaskFeedback` — a
//     fixture — while the day-care board read the facility's own
//     `care_task_feedback` setting, so the same meal could be logged with
//     options one screen offered and the other did not. Both read the setting.
//     A facility that has not set its own sees the shipped options in its
//     language; one that has sees its own words.
//   · "Add Meal" added a row to this component's state and nothing else — the
//     comment beside it said so — and a reload lost it. Meals are planned in
//     the booking itself (Edit the booking), which is where it went.
// ============================================================================

interface FeedingSectionProps {
  entries: FeedingEntry[];
  required?: boolean;
  /**
   * Whether staff may log a meal here — only when `onLog` is supplied, since
   * that is what makes it persist (the care log, 20260819140000).
   */
  canLog?: boolean;
  /**
   * Record a meal. The parent owns the write and the refetch; this panel just
   * says which slot and how it went.
   */
  onLog?: (entryId: string, outcome: string) => void;
}

// The shipped outcomes by their translated names (the journal's keys).
const OUTCOME_KEYS: Record<string, string> = {
  ate_all: "journalOutcomeAteAll",
  ate_most: "journalOutcomeAteMost",
  ate_some: "journalOutcomeAteSome",
  ate_little: "journalOutcomeAteLittle",
  refused: "journalOutcomeRefused",
};

export function FeedingSection({
  entries,
  required,
  canLog = true,
  onLog,
}: FeedingSectionProps) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const { settings } = useFacilitySettings();
  const feedback = settings.care_task_feedback;
  const options = (
    feedback.configured
      ? feedback.value.feeding
      : SHIPPED_CARE_TASK_FEEDBACK.feeding
  ).map((option) => ({
    value: option.value,
    // The facility's own words when it chose them; ours in its language
    // when it did not.
    label:
      !feedback.configured && OUTCOME_KEYS[option.value]
        ? t(OUTCOME_KEYS[option.value])
        : option.label,
  }));
  const outcomeLabel = (value?: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  const [items, setItems] = useState(entries);

  const handleLog = (id: string, outcome: string) => {
    // Optimistic, then authoritative: the row turns over immediately and the
    // parent's refetch replaces it with what the database stored.
    setItems((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "completed" as const,
              feedback: outcome,
              completedBy: t("loggedByYou"),
              completedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
    onLog?.(id, outcome);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-ink-tertiary flex flex-wrap items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
          <UtensilsCrossed className="size-4" />
          {t("feedingTitle")}
          {required && (
            <Badge variant="destructive" className="normal-case">
              {t("taskRequired")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <UtensilsCrossed className="text-ink-disabled mx-auto size-6" />
            <p className="text-ink-secondary mt-2 text-sm">
              {t("feedingNone")}
            </p>
          </div>
        ) : (
          <div className="divide-line divide-y">
            {items.map((entry) => (
              <div key={entry.id} className="py-4 first:pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {entry.status === "completed" ? (
                        <CheckCircle2 className="text-success size-4 shrink-0" />
                      ) : entry.status === "skipped" ? (
                        <Ban className="text-destructive size-4 shrink-0" />
                      ) : (
                        <Circle className="text-ink-disabled size-4 shrink-0" />
                      )}
                      {/* The meal's name as the owner gave it. */}
                      <span className="text-body-ink text-sm font-semibold">
                        {entry.label}
                      </span>
                    </div>
                    <div className="text-ink-secondary mt-1 ml-6 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="size-4" />
                        {formatTimeOfDay(entry.time, locale)}
                      </span>
                      {entry.amount && <span>{entry.amount}</span>}
                      {entry.foodType && (
                        <span className="font-semibold">{entry.foodType}</span>
                      )}
                    </div>
                    {entry.instructions && (
                      <p className="text-ink-secondary mt-1 ml-6 text-xs">
                        {entry.instructions}
                      </p>
                    )}
                  </div>

                  {entry.status === "completed" ? (
                    <div className="shrink-0 text-right">
                      <span className="bg-wash-success text-success rounded-full px-2 py-0.5 text-xs font-semibold">
                        {/* A logged outcome arrives as its stored value
                            ("ate_all"); both paths name it the same way. */}
                        {outcomeLabel(entry.feedback)}
                      </span>
                      {entry.completedBy && (
                        <p className="text-ink-tertiary mt-0.5 text-xs">
                          {entry.completedAt
                            ? fill("loggedByAt", {
                                name: entry.completedBy,
                                time: formatTime(entry.completedAt, locale),
                              })
                            : entry.completedBy}
                        </p>
                      )}
                    </div>
                  ) : canLog && onLog ? (
                    <Select onValueChange={(v) => handleLog(entry.id, v)}>
                      <SelectTrigger
                        className="w-[180px] text-sm"
                        aria-label={t("logMeal")}
                      >
                        <SelectValue placeholder={t("logMeal")} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                {entry.notes && (
                  <p className="border-line text-ink-secondary mt-1 ml-6 rounded-2xl border px-2 py-1 text-xs">
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
