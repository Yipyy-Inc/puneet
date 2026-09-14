"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  CARE_FEE_SERVICES,
  careFeesSchema,
  type CareFees,
  type FeedingFeeScope,
  type MedicationFeeScope,
} from "@/lib/settings/care-fees";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// Medication and daycare feeding fees — what the New booking form adds to a
// bill. They were a fixture's numbers, charged at every facility, with no
// screen to change them; see lib/settings/care-fees.ts. Nothing is charged
// until a facility turns a fee on here.
// ============================================================================

const SERVICE_KEY: Record<(typeof CARE_FEE_SERVICES)[number], string> = {
  boarding: "svcBoarding",
  daycare: "svcDaycare",
  grooming: "svcGrooming",
  training: "svcTraining",
};

const MEDICATION_SCOPES: { value: MedicationFeeScope; key: string }[] = [
  { value: "per_medication", key: "scopePerMedication" },
  { value: "per_pet", key: "scopePerPet" },
  { value: "flat", key: "scopeFlat" },
];

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

  const med = draft.medicationAdmin;
  const aids = draft.medicationAids;
  const feeding = draft.daycareFeeding;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feesTitle")}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">{t("feesHelp")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Giving medication ─────────────────────────────────────── */}
        <section className="space-y-3" aria-labelledby="fee-med-title">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="fee-med-title" className="text-[15px] font-semibold">
                {t("medAdminTitle")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("medAdminHelp")}
              </p>
            </div>
            <Switch
              checked={med.enabled}
              aria-label={t("feeEnabled")}
              onCheckedChange={(enabled) =>
                update("medicationAdmin", { enabled })
              }
            />
          </div>
          {med.enabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="fee-med-amount">{t("feeAmount")}</Label>
                <Input
                  id="fee-med-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  step={0.01}
                  className="tabular-nums"
                  value={String(med.amount)}
                  onChange={(event) =>
                    update("medicationAdmin", {
                      amount: amountOf(event.target.value),
                    })
                  }
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="fee-med-scope">{t("feeScope")}</Label>
                <Select
                  value={med.scope}
                  onValueChange={(scope) =>
                    update("medicationAdmin", {
                      scope: scope as MedicationFeeScope,
                    })
                  }
                >
                  <SelectTrigger id="fee-med-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICATION_SCOPES.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {t(scope.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="min-w-0 space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">
                  {t("feeServices")}
                </legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {CARE_FEE_SERVICES.map((service) => {
                    const id = `fee-med-service-${service}`;
                    return (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={med.services.includes(service)}
                          onCheckedChange={(checked) =>
                            update("medicationAdmin", {
                              services: checked
                                ? [...med.services, service]
                                : med.services.filter((s) => s !== service),
                            })
                          }
                        />
                        <Label htmlFor={id} className="font-normal">
                          {t(SERVICE_KEY[service])}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}
        </section>

        {/* ── Medication aids ───────────────────────────────────────── */}
        <section
          className="space-y-3 border-t pt-6"
          aria-labelledby="fee-aids-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="fee-aids-title" className="text-[15px] font-semibold">
                {t("aidsTitle")}
              </h3>
              <p className="text-muted-foreground text-sm">{t("aidsHelp")}</p>
            </div>
            <Switch
              checked={aids.enabled}
              aria-label={t("feeEnabled")}
              onCheckedChange={(enabled) =>
                update("medicationAids", { enabled })
              }
            />
          </div>
          {aids.enabled && (
            <div className="space-y-3">
              {aids.items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto] items-end gap-3"
                >
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor={`fee-aid-name-${item.id}`}>
                      {t("aidName")}
                    </Label>
                    <Input
                      id={`fee-aid-name-${item.id}`}
                      value={item.name}
                      maxLength={80}
                      onChange={(event) =>
                        update("medicationAids", {
                          items: aids.items.map((it, i) =>
                            i === index
                              ? { ...it, name: event.target.value }
                              : it,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor={`fee-aid-fee-${item.id}`}>
                      {t("aidFee")}
                    </Label>
                    <Input
                      id={`fee-aid-fee-${item.id}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={1000}
                      step={0.01}
                      className="tabular-nums"
                      value={String(item.fee)}
                      onChange={(event) =>
                        update("medicationAids", {
                          items: aids.items.map((it, i) =>
                            i === index
                              ? { ...it, fee: amountOf(event.target.value) }
                              : it,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("removeAid").replace(
                      "{name}",
                      item.name.trim() || t("aidUnnamed"),
                    )}
                    onClick={() =>
                      update("medicationAids", {
                        items: aids.items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={aids.items.length >= 30}
                onClick={() =>
                  update("medicationAids", {
                    items: [
                      ...aids.items,
                      { id: `aid-${crypto.randomUUID()}`, name: "", fee: 0 },
                    ],
                  })
                }
              >
                <Plus className="size-4" />
                {t("addAid")}
              </Button>
            </div>
          )}
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
