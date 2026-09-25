"use client";

import { useState } from "react";
import { Save, TriangleAlert } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  useLodgingConfig,
  useSaveCheckoutCutOff,
} from "@/lib/api/facility-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// THE CHECKOUT CUT-OFF, WHERE A FACILITY CAN SET IT.
//
// The rule has been enforced in Postgres since 20260924200000 — a check-out at
// or after the cut-off keeps the kennel for that night — and until this card
// nothing could switch it on: the setting had no screen.
//
// Saving goes through `save_checkout_cut_off`, which also re-derives every
// upcoming stay, so the answer is not "saved" but WHAT CHANGED: how many stays
// now hold their night, how many were given one back, and the bookings it
// could not hold because another guest is due in that kennel that evening.
// Those are listed here, not only toasted, because somebody has to act on
// them and a toast is gone in four seconds.
// ============================================================================

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Draft {
  enabled: boolean;
  time: string;
}

export function CheckoutCutOffCard() {
  const { t, fill } = useStaffText("checkoutCutOff");
  const { config, isPending } = useLodgingConfig();
  const save = useSaveCheckoutCutOff();

  const stored: Draft = {
    enabled: config.checkoutCutOff?.enabled ?? false,
    time: config.checkoutCutOff?.time ?? "",
  };
  // Null until somebody edits: the card shows what is stored, so a setting
  // that has not loaded yet can never be saved back over the real one.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflicts, setConflicts] = useState<number[]>([]);
  const value = draft ?? stored;

  const changed =
    draft !== null &&
    (draft.enabled !== stored.enabled || draft.time !== stored.time);
  const needsTime = value.enabled && !HH_MM.test(value.time);

  const submit = () => {
    if (isPending || !changed || needsTime) return;
    save.mutate(
      { enabled: value.enabled, time: value.time || null },
      {
        onSuccess: (report) => {
          setConflicts(report.conflicts);
          const moved = report.held + report.released;
          toast.success(t("savedTitle"), {
            description:
              moved === 0
                ? t("savedNothing")
                : fill("savedBody", {
                    held: report.held,
                    released: report.released,
                  }),
          });
        },
        onError: (error) => {
          toast.error(t("saveFailed"), { description: error.message });
        },
      },
    );
  };

  return (
    <Card id="checkout-cut-off">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="checkout-cut-off-enabled" className="min-w-0">
            {t("enabledLabel")}
          </Label>
          <Switch
            id="checkout-cut-off-enabled"
            checked={value.enabled}
            disabled={isPending || save.isPending}
            onCheckedChange={(enabled) =>
              setDraft({ ...value, enabled: enabled === true })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-cut-off-time">{t("timeLabel")}</Label>
          <Input
            id="checkout-cut-off-time"
            type="time"
            className="max-w-40"
            value={value.time}
            disabled={isPending || save.isPending}
            onChange={(e) => setDraft({ ...value, time: e.target.value })}
          />
          {needsTime ? (
            <p className="text-muted-foreground text-sm">{t("timeRequired")}</p>
          ) : null}
        </div>

        {conflicts.length > 0 ? (
          <div
            role="status"
            className="border-warning space-y-1 rounded-xl border p-3 text-sm"
          >
            <p className="text-warning flex items-start gap-2 font-semibold">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("conflictsTitle")}
            </p>
            <p className="tabular-nums">
              {conflicts.map((ref) => `#${ref}`).join(", ")}
            </p>
            <p className="text-muted-foreground">{t("conflictsHelp")}</p>
          </div>
        ) : null}

        <Button
          type="button"
          loading={save.isPending}
          disabled={isPending || !changed || needsTime}
          onClick={submit}
        >
          {save.isPending ? null : <Save aria-hidden />}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
