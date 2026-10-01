"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/ui/save-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCareFees,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  careFeesSchema,
  type CareFees,
  type FeedingFeeScope,
} from "@/lib/settings/care-fees";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The daycare meals fee — what the New booking form adds to a daycare bill.
// It was a fixture's number, charged at every facility, with no screen to
// change it; see lib/settings/care-fees.ts. Nothing is charged until a
// facility turns it on here. The medication fees moved, with what a facility
// sells to give a medication with, to Settings › Services › Feeding &
// medications (2026-10-01).
// ============================================================================

const FEEDING_SCOPES: { value: FeedingFeeScope; key: string }[] = [
  { value: "per_pet", key: "scopePerPet" },
  { value: "per_meal", key: "scopePerMeal" },
  { value: "flat", key: "scopeFlat" },
];

/** A typed amount, as a number the schema can judge. Blank is nothing. */
function amountOf(value: string): number {
  return value.trim() === "" ? 0 : Number(value);
}

// Nothing renders until the row has arrived — the editor seeds `useState`, and
// a first Save against the fallback would write "no fees" over the facility's.
export function CareFeesSettingsCard() {
  const { fees, configured, isPending } = useCareFees();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <CareFeesEditor key={configured ? "stored" : "shipped"} initial={fees} />
  );
}

function CareFeesEditor({ initial }: { initial: CareFees }) {
  const t = useSettingsText().section("booking-rules");
  const settingsPath = useSettingsHref();
  const save = useSaveFacilitySetting();
  const [saved, setSaved] = useState<CareFees>(initial);
  const [draft, setDraft] = useState<CareFees>(initial);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = <K extends keyof CareFees>(
    key: K,
    patch: Partial<CareFees[K]>,
  ) =>
    setDraft((previous) => ({
      ...previous,
      [key]: { ...previous[key], ...patch },
    }));

  const handleSave = () => {
    const parsed = careFeesSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(t("feesInvalid"));
      return;
    }
    save.mutate(
      { domain: "care_fees", value: parsed.data },
      {
        onSuccess: () => {
          setSaved(parsed.data);
          setDraft(parsed.data);
          toast.success(t("feesSaved"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  };

  const feeding = draft.daycareFeeding;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feesTitle")}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">{t("feesHelp")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Medication fees, priced with the Medications step ─────── */}
        <section
          className="flex flex-wrap items-start justify-between gap-3"
          aria-labelledby="fee-supplies-title"
        >
          <div className="min-w-0">
            <h3 id="fee-supplies-title" className="text-[15px] font-semibold">
              {t("suppliesTitle")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("suppliesMoved")}
            </p>
          </div>
          <Link
            href={settingsPath("feeding-medications")}
            className="text-primary shrink-0 font-medium hover:underline"
          >
            {t("suppliesMovedLink")}
          </Link>
        </section>

        {/* ── Daycare meals ─────────────────────────────────────────── */}
        <section
          className="space-y-3 border-t pt-6"
          aria-labelledby="fee-feeding-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="fee-feeding-title" className="text-[15px] font-semibold">
                {t("feedingTitle")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("feedingHelp")}
              </p>
            </div>
            <Switch
              checked={feeding.enabled}
              aria-label={t("feeEnabled")}
              onCheckedChange={(enabled) =>
                update("daycareFeeding", { enabled })
              }
            />
          </div>
          {feeding.enabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="fee-feeding-amount">{t("feeAmount")}</Label>
                <Input
                  id="fee-feeding-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  step={0.01}
                  className="tabular-nums"
                  value={String(feeding.amount)}
                  onChange={(event) =>
                    update("daycareFeeding", {
                      amount: amountOf(event.target.value),
                    })
                  }
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="fee-feeding-scope">{t("feeScope")}</Label>
                <Select
                  value={feeding.scope}
                  onValueChange={(scope) =>
                    update("daycareFeeding", {
                      scope: scope as FeedingFeeScope,
                    })
                  }
                >
                  <SelectTrigger id="fee-feeding-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDING_SCOPES.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {t(scope.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        <SaveBar
          placement="card"
          dirty={dirty}
          saving={save.isPending}
          onSave={handleSave}
          onReset={() => setDraft(saved)}
        />
      </CardContent>
    </Card>
  );
}
