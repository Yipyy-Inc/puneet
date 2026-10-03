"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { careLogKeys, logCare } from "@/lib/api/care-log";
import {
  journalKind,
  journalOptions,
} from "@/lib/bookings/details/service-view";
import { wallClockParts } from "@/lib/time/facility-time";

import type { BookingDetails } from "../use-booking-details";
import { optionLabel } from "./journal-row";

// ============================================================================
// "+ Log activity" — something that happened that no plan asked for: an extra
// potty break, a walk, a game in the yard. It is a care-log row like any
// other (an ad-hoc task key), so it appears in the day's journal, on the
// Daily Care board and in the report card's material, and it can be taken
// back the same way.
// ============================================================================

const TYPES = [
  { type: "potty", key: "journalTaskPotty" },
  { type: "walk", key: "journalTaskWalk" },
  { type: "other", key: "journalTaskOther" },
] as const;

type ActivityType = (typeof TYPES)[number]["type"];

/** An ad-hoc log's own key: nothing planned it, so nothing else shares it. */
const adHocKey = (bookingRef: number) =>
  `activity-${bookingRef}-${Date.now().toString(36)}`;

export function LogActivityDialog({
  d,
  day,
  open,
  onOpenChange,
}: {
  d: BookingDetails;
  /** The journal's day, YYYY-MM-DD on the facility's clock. */
  day: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill } = d.text;
  const queryClient = useQueryClient();
  const [type, setType] = useState<ActivityType>("walk");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [time, setTime] = useState(
    () => wallClockParts(new Date().toISOString(), d.timeZone).time,
  );
  const [note, setNote] = useState("");
  const kind = journalKind(type);
  const options = journalOptions(kind);
  const chosen = outcome && options.includes(outcome) ? outcome : options[0];
  const bookingRef = d.booking?.id ?? 0;

  const save = useMutation({
    mutationFn: () =>
      logCare({
        bookingRef,
        petRef: d.pet?.id ?? null,
        taskKey: adHocKey(bookingRef),
        taskType: type,
        outcome: chosen,
        occurredOn: day,
        executedAt: time,
        notes: note.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: careLogKeys.forBooking(bookingRef),
      });
      toast.success(
        fill("activityLogged", {
          what: t(TYPES.find((entry) => entry.type === type)?.key ?? ""),
        }),
      );
      setNote("");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(t("activityNotLogged"), {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logActivityTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">{t("activityWhat")}</span>
            <div
              role="radiogroup"
              aria-label={t("activityWhat")}
              className="flex flex-wrap gap-2"
            >
              {TYPES.map((entry) => (
                <ChoicePill
                  key={entry.type}
                  type="radio"
                  name="log-activity-type"
                  size="md"
                  checked={type === entry.type}
                  onChange={() => {
                    setType(entry.type);
                    setOutcome(null);
                  }}
                >
                  {t(entry.key)}
                </ChoicePill>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">{t("activityHow")}</span>
            <div
              role="radiogroup"
              aria-label={t("activityHow")}
              className="flex flex-wrap gap-2"
            >
              {options.map((option) => (
                <ChoicePill
                  key={option}
                  type="radio"
                  name="log-activity-outcome"
                  checked={chosen === option}
                  onChange={() => setOutcome(option)}
                >
                  {optionLabel(t, kind, option)}
                </ChoicePill>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-activity-time">{t("activityTime")}</Label>
            <Input
              id="log-activity-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-[140px] tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-activity-note">{t("activityNote")}</Label>
            <Textarea
              id="log-activity-note"
              rows={2}
              value={note}
              placeholder={t("activityNotePlaceholder")}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            {t("notNow")}
          </Button>
          <Button
            variant="bd-cta"
            onClick={() => save.mutate()}
            disabled={save.isPending || !bookingRef || !time}
            data-loading={save.isPending || undefined}
          >
            {t("logActivitySave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
