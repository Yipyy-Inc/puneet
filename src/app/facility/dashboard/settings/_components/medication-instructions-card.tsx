"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/ui/save-bar";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useMedicationInstructions,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { formLabel, methodLabel, slotLabel } from "@/lib/medications/describe";
import {
  DAY_RULES,
  MED_FORMS,
  MED_METHODS,
  PROVIDABLE_METHODS,
  type ProvidableMethod,
} from "@/lib/medications/vocabulary";
import {
  MEDICATION_PAGE_PARTS,
  medicationInstructionsSchema,
  type MedicationInstructions,
  type MedicationPagePart,
  type ProvidedPer,
} from "@/lib/settings/medication-instructions";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { MedDayRule } from "@/types/base";

// ============================================================================
// Medication instructions — what the booking form's Medications step shows,
// and what the facility supplies to give a medication with, at what price
// (2026-10-01). The words are the booking form's own (the forms, the ways of
// giving, the times of day), so a facility reads here exactly what a customer
// will read there.
// ============================================================================

const DAY_RULE_KEY: Record<MedDayRule, string> = {
  except_checkout: "medsDaysExceptCheckout",
  every_day: "medsDaysEveryDay",
  certain_dates: "medsDaysCertain",
};

const PART_KEY: Record<MedicationPagePart, string> = {
  strength: "partStrength",
  food: "partFood",
  supply: "partSupply",
  allergies: "partAllergies",
  notes: "partNotes",
  saveToProfile: "partSaveToProfile",
};

/** A typed price, as a number the schema can judge. Blank is nothing. */
const priceOf = (value: string) => (value.trim() === "" ? 0 : Number(value));

function toggled<T>(list: readonly T[], value: T, order: readonly T[]): T[] {
  const next = list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
  return order.filter((item) => next.includes(item));
}

// Nothing renders until the row has arrived (check:settings-seeding).
export function MedicationInstructionsCard() {
  const { instructions, configured, isPending } = useMedicationInstructions();
  if (isPending) return <Skeleton className="h-160 w-full rounded-2xl" />;
  return (
    <MedicationInstructionsEditor
      key={configured ? "stored" : "shipped"}
      initial={instructions}
    />
  );
}

function Group({
  id,
  title,
  help,
  children,
}: {
  id: string;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-line space-y-3 border-t pt-6 first:border-t-0 first:pt-0"
      aria-labelledby={id}
    >
      <div className="min-w-0">
        <h3 id={id} className="text-body-strong text-body-ink">
          {title}
        </h3>
        <p className="text-meta text-ink-tertiary">{help}</p>
      </div>
      {children}
    </section>
  );
}

function MedicationInstructionsEditor({
  initial,
}: {
  initial: MedicationInstructions;
}) {
  const t = useSettingsText().section("care-tasks");
  const words = useShellText("booking");
  const save = useSaveFacilitySetting();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<MedicationInstructions>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const handleSave = () => {
    if (draft.forms.length === 0) {
      toast.error(t("medFormsAtLeastOne"));
      return;
    }
    if (draft.dayRules.length === 0) {
      toast.error(t("medDaysAtLeastOne"));
      return;
    }
    if (!draft.customTimes && !draft.times.some((slot) => slot.enabled)) {
      toast.error(t("medTimesAtLeastOne"));
      return;
    }
    if (draft.provided.some((item) => !(item.price > 0))) {
      toast.error(t("medSupplyPriceNeeded"));
      return;
    }
    const parsed = medicationInstructionsSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(t("medicationInvalid"));
      return;
    }
    save.mutate(
      { domain: "medication_instructions", value: parsed.data },
      {
        onSuccess: () => {
          setSaved(parsed.data);
          setDraft(parsed.data);
          toast.success(t("medicationSaved"));
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("instructionsNotSaved"),
          ),
      },
    );
  };

  const supplied = (method: ProvidableMethod) =>
    draft.provided.find((item) => item.method === method);
  const setSupplied = (
    method: ProvidableMethod,
    patch: { price?: number; per?: ProvidedPer } | null,
  ) =>
    set({
      provided:
        patch === null
          ? draft.provided.filter((item) => item.method !== method)
          : PROVIDABLE_METHODS.flatMap((m) => {
              const existing = draft.provided.find((item) => item.method === m);
              if (m !== method) return existing ? [existing] : [];
              return [
                {
                  method: m,
                  price: patch.price ?? existing?.price ?? 0,
                  per: patch.per ?? existing?.per ?? "dose",
                },
              ];
            }),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section text-heading">
          {t("medicationInstructionsTitle")}
        </CardTitle>
        <p className="text-meta text-ink-tertiary mt-1">
          {t("medicationInstructionsHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Group
          id="med-forms"
          title={t("medFormsTitle")}
          help={t("medFormsHelp")}
        >
          <div className="flex flex-wrap gap-2">
            {MED_FORMS.map((form) => (
              <ChoicePill
                key={form}
                type="checkbox"
                checked={draft.forms.includes(form)}
                onChange={() =>
                  set({ forms: toggled(draft.forms, form, MED_FORMS) })
                }
              >
                {formLabel(words, form)}
              </ChoicePill>
            ))}
          </div>
        </Group>

        <Group
          id="med-methods"
          title={t("medMethodsTitle")}
          help={t("medMethodsHelp")}
        >
          <div className="flex flex-wrap gap-2">
            {MED_METHODS.map((method) => (
              <ChoicePill
                key={method}
                type="checkbox"
                checked={draft.methods.includes(method)}
                onChange={() =>
                  set({ methods: toggled(draft.methods, method, MED_METHODS) })
                }
              >
                {methodLabel(words, method)}
              </ChoicePill>
            ))}
          </div>
        </Group>

        <Group
          id="med-supply"
          title={t("medSupplyTitle")}
          help={t("medSupplyHelp")}
        >
          <ul className="space-y-2">
            {PROVIDABLE_METHODS.map((method) => {
              const item = supplied(method);
              const name = methodLabel(words, method);
              return (
                <li
                  key={method}
                  className="border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <Switch
                      checked={Boolean(item)}
                      onCheckedChange={(on) =>
                        setSupplied(method, on ? {} : null)
                      }
                    />
                    <span className="text-body-strong text-body-ink">
                      {name}
                    </span>
                  </label>
                  {item ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={1000}
                        step={0.01}
                        aria-label={t("medSupplyPriceFor").replace(
                          "{item}",
                          name,
                        )}
                        value={String(item.price)}
                        onChange={(event) =>
                          setSupplied(method, {
                            price: priceOf(event.target.value),
                          })
                        }
                        className="w-28 tabular-nums"
                      />
                      <Segmented
                        name={`med-supply-per-${method}`}
                        label={t("medSupplyPerFor").replace("{item}", name)}
                        value={item.per}
                        options={[
                          { value: "dose", label: t("perDose") },
                          { value: "day", label: t("perDay") },
                        ]}
                        onChange={(per) => setSupplied(method, { per })}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Group>

        <Group
          id="med-times"
          title={t("medTimesTitle")}
          help={t("medTimesHelp")}
        >
          <ul className="space-y-2">
            {draft.times.map((slot) => {
              const name = slotLabel(words, slot.id);
              return (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <Switch
                      checked={slot.enabled}
                      onCheckedChange={(enabled) =>
                        set({
                          times: draft.times.map((s) =>
                            s.id === slot.id ? { ...s, enabled } : s,
                          ),
                        })
                      }
                    />
                    <span className="text-body text-body-ink">{name}</span>
                  </label>
                  <Input
                    type="time"
                    aria-label={t("medTimeFor").replace("{slot}", name)}
                    value={slot.time}
                    onChange={(event) =>
                      set({
                        times: draft.times.map((s) =>
                          s.id === slot.id
                            ? { ...s, time: event.target.value }
                            : s,
                        ),
                      })
                    }
                    className="w-36 tabular-nums"
                  />
                </li>
              );
            })}
          </ul>
          <label className="flex items-center gap-3">
            <Switch
              checked={draft.customTimes}
              onCheckedChange={(customTimes) => set({ customTimes })}
            />
            <span className="text-body text-body-ink">
              {t("medCustomTimes")}
            </span>
          </label>
        </Group>

        <Group id="med-days" title={t("medDaysTitle")} help={t("medDaysHelp")}>
          <div className="flex flex-wrap gap-2">
            {DAY_RULES.map((rule) => (
              <ChoicePill
                key={rule}
                type="checkbox"
                checked={draft.dayRules.includes(rule)}
                onChange={() =>
                  set({ dayRules: toggled(draft.dayRules, rule, DAY_RULES) })
                }
              >
                {words(DAY_RULE_KEY[rule])}
              </ChoicePill>
            ))}
          </div>
        </Group>

        <Group
          id="med-parts"
          title={t("medPartsTitle")}
          help={t("medPartsHelp")}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {MEDICATION_PAGE_PARTS.map((part) => (
              <li key={part}>
                <Label className="text-body text-body-ink flex items-center gap-3 font-normal">
                  <Switch
                    checked={draft.show[part]}
                    onCheckedChange={(on) =>
                      set({ show: { ...draft.show, [part]: on } })
                    }
                  />
                  {t(PART_KEY[part])}
                </Label>
              </li>
            ))}
          </ul>
        </Group>

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
