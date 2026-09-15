"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { weekdayNames } from "@/lib/dates/calendar-names";
import { settingsHref } from "@/lib/settings/nav";
import type { SchedulingRules } from "@/lib/settings/scheduling-rules";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The schedule's rules, saved for the facility.
//
// This page offered about seventy options held in `useState`, and Save was
// `// TODO: Save to backend`: a manager could change every one of them and lose
// them all on reload. Nothing read them either — the schedule's warnings came
// from a constant in ScheduleView. It now edits the two rules the schedule
// actually applies, stored in `scheduling_rules`, and SHOWS the overtime rule
// the warnings read from Payroll rather than keeping a second copy of it.
//
// The rest — swaps, sick call-ins, breaks, coverage minimums, notifications,
// policies, the "admin only" cards — were switches for features that do not
// exist. Each returns with its feature. See lib/settings/scheduling-rules.ts.
// ============================================================================

interface Draft {
  rest: string;
  days: string;
}

function draftFrom(rules: SchedulingRules): Draft {
  return {
    rest: String(rules.minRestHours),
    days: String(rules.maxConsecutiveDays),
  };
}

export default function SchedulingSettings() {
  const { t, fill, locale } = useStaffText("schedulingRules");
  const { settings, isPending, error } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const stored = settings.scheduling_rules;
  const payroll = settings.payroll_config.value;

  // The server's value is the truth; state holds only what was edited since it
  // arrived. Seeding `useState` from it would latch the defaults shown while
  // the request was still in flight.
  const [draft, setDraft] = useState<Draft | null>(null);
  const form = draft ?? draftFrom(stored.value);
  const patch = (changes: Partial<Draft>) =>
    setDraft((prev) => ({ ...(prev ?? draftFrom(stored.value)), ...changes }));

  const rest = Number(form.rest);
  const days = Number(form.days);
  const restInvalid =
    form.rest.trim() === "" || !Number.isFinite(rest) || rest < 0 || rest > 24;
  const daysInvalid =
    form.days.trim() === "" || !Number.isInteger(days) || days < 0 || days > 14;

  const handleSave = async () => {
    if (restInvalid || daysInvalid) return;
    try {
      await saveSetting.mutateAsync({
        domain: "scheduling_rules",
        value: {
          minRestHours: rest,
          maxConsecutiveDays: days,
        } satisfies SchedulingRules,
      });
      setDraft(null);
      toast.success(t("saved"));
    } catch (cause) {
      toast.error(t("saveFailed"), {
        description: cause instanceof Error ? cause.message : undefined,
      });
    }
  };

  if (isPending) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="text-destructive p-6 text-sm">
          {t("loadFailed")}
        </CardContent>
      </Card>
    );
  }

  const overtime = payroll.overtime;
  const firstDay = weekdayNames(locale, "long")[payroll.weekStartsOn] ?? "";

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!stored.configured ? (
            <p className="text-muted-foreground text-sm">
              {t("notConfigured")}
            </p>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="scheduling-min-rest">{t("restLabel")}</Label>
              <Input
                id="scheduling-min-rest"
                inputMode="decimal"
                value={form.rest}
                aria-invalid={restInvalid}
                aria-describedby="scheduling-min-rest-help"
                onChange={(event) => patch({ rest: event.target.value })}
              />
              <p
                id="scheduling-min-rest-help"
                className={
                  restInvalid
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {restInvalid ? t("restInvalid") : t("restHelp")}
              </p>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="scheduling-max-days">{t("daysLabel")}</Label>
              <Input
                id="scheduling-max-days"
                inputMode="numeric"
                value={form.days}
                aria-invalid={daysInvalid}
                aria-describedby="scheduling-max-days-help"
                onChange={(event) => patch({ days: event.target.value })}
              />
              <p
                id="scheduling-max-days-help"
                className={
                  daysInvalid
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {daysInvalid ? t("daysInvalid") : t("daysHelp")}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={restInvalid || daysInvalid || saveSetting.isPending}
            >
              {saveSetting.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("overtimeTitle")}</CardTitle>
          <CardDescription>
            {overtime.enabled
              ? fill("overtimeOn", {
                  hours: new Intl.NumberFormat(locale).format(
                    overtime.weeklyThresholdHours,
                  ),
                  day: firstDay,
                })
              : t("overtimeOff")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={settingsHref("payroll-rules")}>{t("openPayroll")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
