"use client";

import { Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// "What should we work on?" — the goals a training booking offers the owner
// (the booking wizard's Goals step, the client's mock, 2026-10-01). One per
// line, the facility's own words; left empty, bookings offer the eight the
// wizard ships, in the reader's language. Cleaned when the page saves.
// ============================================================================

export function TrainingGoalsCard({
  value,
  onChange,
}: {
  /** As typed, a line each; `undefined` is none of the facility's own. */
  value: readonly string[] | undefined;
  onChange: (next: string[] | undefined) => void;
}) {
  const { section } = useSettingsText();
  const t = section("training");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="text-muted-foreground size-4" aria-hidden />
          {t("goalsTitle")}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t("goalsIntro")}</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <Label className="text-sm font-semibold" htmlFor="training-goals">
          {t("goalsLabel")}
        </Label>
        <Textarea
          id="training-goals"
          rows={6}
          value={(value ?? []).join("\n")}
          placeholder={t("goalsPlaceholder")}
          onChange={(e) =>
            onChange(
              e.target.value.trim() ? e.target.value.split("\n") : undefined,
            )
          }
        />
      </CardContent>
    </Card>
  );
}
