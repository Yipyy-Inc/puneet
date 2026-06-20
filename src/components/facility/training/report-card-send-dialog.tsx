"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CalendarClock,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Palette,
  PawPrint,
  Send,
  Sparkles,
} from "lucide-react";
import { fanOutReportCardUpsert } from "@/lib/training-report-cards";
import {
  REPORT_CARD_THEME_ACCENT,
  REPORT_CARD_THEME_DOT,
  REPORT_CARD_THEME_LABELS,
  TRAINING_LEVEL_BADGE_CLS,
  TRAINING_LEVEL_LABELS,
} from "@/lib/training-report-cards";
import type { TrainingReportCard } from "@/lib/training-enrollment";
import type { ReportCardTheme } from "@/types/pet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: TrainingReportCard | null;
  /** Today as `YYYY-MM-DD` — pinned to the DatePicker's `min`. */
  todayISO: string;
}

const ALL_THEMES: ReportCardTheme[] = [
  "everyday",
  "halloween",
  "christmas",
  "valentines",
  "easter",
  "summer",
  "winter",
];

function combineDateTimeISO(date: string, time: string): string {
  // Combine YYYY-MM-DD + HH:MM into a local-timezone ISO string. We treat
  // the picked moment as local because the trainer thinks in local time —
  // converting to UTC happens automatically when stringified.
  const [y, m, d] = date.split("-").map((p) => Number(p));
  const [hh, mm] = time.split(":").map((p) => Number(p));
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return new Date().toISOString();
  }
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}

function defaultScheduleTime(): string {
  const d = new Date();
  d.setMinutes(0);
  d.setSeconds(0);
  d.setHours(d.getHours() + 1); // round up an hour
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type SendMode = "now" | "in-1-hour" | "end-of-day" | "custom";

const SEND_OPTIONS: { value: SendMode; label: string; hint: string }[] = [
  {
    value: "now",
    label: "Send immediately",
    hint: "Email + portal notification go out now.",
  },
  {
    value: "in-1-hour",
    label: "Send in 1 hour",
    hint: "Queued to deliver an hour from now.",
  },
  {
    value: "end-of-day",
    label: "Send at end of day",
    hint: "Delivers today at 5:00 PM.",
  },
  {
    value: "custom",
    label: "Custom date & time",
    hint: "Pick an exact date and time.",
  },
];

export function ReportCardSendDialog({
  open,
  onOpenChange,
  card,
  todayISO,
}: Props) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ReportCardTheme>("everyday");
  const [mode, setMode] = useState<SendMode>("now");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  // Capture "now" once on open so preset offsets (in 1h / end of day) and the
  // future-check stay stable across re-renders while the dialog is open.
  const [openedAtMs] = useState(() => Date.now());

  // Sync state when the dialog opens against a new target card.
  useEffect(() => {
    if (!open || !card) return;
    setTheme(card.theme);
    if (card.scheduledSendAt) {
      const d = new Date(card.scheduledSendAt);
      setMode("custom");
      setScheduleDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
      setScheduleTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    } else {
      setMode("now");
      setScheduleDate(todayISO);
      setScheduleTime(defaultScheduleTime());
    }
    setPreviewOpen(false);
  }, [open, card, todayISO]);

  const scheduleISO = useMemo(() => {
    if (mode === "now") return null;
    if (mode === "in-1-hour") {
      return new Date(openedAtMs + 60 * 60 * 1000).toISOString();
    }
    if (mode === "end-of-day") {
      const d = new Date(openedAtMs);
      d.setHours(17, 0, 0, 0);
      // If it's already past 5 PM, roll the send to 5 PM the next day so the
      // schedule is always in the future.
      if (d.getTime() <= openedAtMs) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (!scheduleDate || !scheduleTime) return null;
    return combineDateTimeISO(scheduleDate, scheduleTime);
  }, [mode, scheduleDate, scheduleTime, openedAtMs]);

  const scheduleInFuture = useMemo(() => {
    if (!scheduleISO) return false;
    return new Date(scheduleISO).getTime() > openedAtMs;
  }, [scheduleISO, openedAtMs]);

  if (!card) return null;

  function handleConfirm() {
    if (!card) return;
    if (mode !== "now") {
      if (!scheduleISO) {
        toast.error("Pick a date and time for the scheduled send.");
        return;
      }
      if (!scheduleInFuture) {
        toast.error("Scheduled send must be in the future.");
        return;
      }
      fanOutReportCardUpsert(queryClient, {
        ...card,
        theme,
        sentToOwner: false,
        sentAt: null,
        scheduledSendAt: scheduleISO,
      });
      toast.success(
        `Scheduled for ${new Date(scheduleISO).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}.`,
      );
    } else {
      fanOutReportCardUpsert(queryClient, {
        ...card,
        theme,
        sentToOwner: true,
        sentAt: new Date().toISOString(),
        scheduledSendAt: null,
      });
      toast.success(`Report card sent to ${card.petName}'s owner.`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="text-muted-foreground size-4" />
            Send report card
          </DialogTitle>
          <DialogDescription>
            Pick a theme, choose whether to send now or schedule for later, and
            preview what the owner will see before it goes out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {previewOpen && (
            <ReportCardPreview card={card} theme={theme} todayISO={todayISO} />
          )}

          {/* Theme picker ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1 text-sm font-semibold">
              <Palette className="size-3.5" />
              Theme
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_THEMES.map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    data-active={active || undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors",
                      "hover:bg-slate-100",
                      "data-active:border-slate-900 data-active:bg-slate-900 data-active:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        REPORT_CARD_THEME_DOT[t],
                      )}
                    />
                    {REPORT_CARD_THEME_LABELS[t]}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Themes wrap the card with a seasonal accent the owner sees in
              their portal + email.
            </p>
          </div>

          {/* Send mode ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1 text-sm font-semibold">
              <Send className="size-3.5" />
              Delivery
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as SendMode)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {SEND_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`send-${opt.value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors",
                    mode === opt.value
                      ? "border-slate-900 bg-slate-50"
                      : "hover:bg-slate-50/60",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`send-${opt.value}`}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {opt.hint}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            {(mode === "in-1-hour" || mode === "end-of-day") && scheduleISO && (
              <p className="text-muted-foreground inline-flex items-center gap-1 rounded-lg border bg-slate-50/40 px-3 py-2 text-[11px]">
                <CalendarClock className="size-3" />
                Delivers{" "}
                {new Date(scheduleISO).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                .
              </p>
            )}
            {mode === "custom" && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50/40 px-3 py-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    Send date
                  </Label>
                  <DatePicker
                    value={scheduleDate}
                    onValueChange={(v) => setScheduleDate(v || "")}
                    displayMode="dialog"
                    min={todayISO}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    Send time
                  </Label>
                  <TimePickerLux
                    value={scheduleTime}
                    onValueChange={(v) => setScheduleTime(v)}
                    displayMode="dialog"
                  />
                </div>
                {scheduleISO && !scheduleInFuture && (
                  <p className="text-[11px] text-rose-600 sm:col-span-2">
                    Pick a future date and time — scheduling in the past
                    isn&apos;t supported.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setPreviewOpen((v) => !v)}
            className="gap-1.5"
          >
            {previewOpen ? (
              <>
                <EyeOff className="size-4" />
                Hide preview
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Preview
              </>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className={cn(
                mode === "now" &&
                  "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              {mode === "now" ? (
                <>
                  <Send className="mr-1.5 size-4" />
                  Send now
                </>
              ) : (
                <>
                  <CalendarClock className="mr-1.5 size-4" />
                  Schedule send
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Preview of what the owner will see in their portal email, used inside
 *  the send dialog so trainers can sanity-check the theme + level before
 *  committing. Focused on the elements that change between sends (theme,
 *  level, assessment) — the trainer can also peek at the body content. */
function ReportCardPreview({
  card,
  theme,
  todayISO,
}: {
  card: TrainingReportCard;
  theme: ReportCardTheme;
  todayISO: string;
}) {
  const isGraduation = card.kind === "series-completion";
  void todayISO;
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div
        className={cn(
          "h-2 w-full bg-linear-to-r",
          REPORT_CARD_THEME_ACCENT[theme],
        )}
      />
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
          >
            <Sparkles className="size-3" />
            Preview
          </Badge>
          <span className="text-muted-foreground text-[11px]">
            What the owner sees
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {card.petImageUrl ? (
              <div className="size-12 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
                <Image
                  src={card.petImageUrl}
                  alt={card.petName}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                <PawPrint className="size-5" />
              </div>
            )}
            <span
              className={cn(
                "absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full shadow-sm ring-2 ring-white",
                isGraduation
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-500 text-white",
              )}
            >
              {isGraduation ? (
                <Award className="size-3" />
              ) : (
                <FileText className="size-3" />
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-base font-semibold text-slate-800">
              {isGraduation
                ? `${card.petName} graduated`
                : `${card.petName} · Session ${card.throughSessionNumber}`}
            </p>
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[12px]">
              <BookOpen className="size-3" />
              {card.courseName}
              <span className="text-muted-foreground/50">·</span>
              {card.seriesName}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border text-[11px] font-semibold",
                TRAINING_LEVEL_BADGE_CLS[card.trainingLevel],
              )}
            >
              <Award className="size-3" />
              {TRAINING_LEVEL_LABELS[card.trainingLevel]}
            </Badge>
          </div>
        </div>
        {card.overallAssessment ? (
          <p className="text-[13px]/relaxed text-slate-700">
            {card.overallAssessment}
          </p>
        ) : (
          <p className="text-muted-foreground text-[12px] italic">
            Add a 1-2 sentence assessment before sending so the owner has a
            clear snapshot.
          </p>
        )}
        {card.assignedHomework.length > 0 && (
          <div className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <Clock className="size-3" />
            {card.assignedHomework.length} homework
            {card.assignedHomework.length === 1 ? "" : "s"} to work on
          </div>
        )}
      </div>
    </div>
  );
}
