"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useShellText } from "@/lib/shell/use-shell-text";
import {
  ANXIETY_TRIGGER_KEYS,
  ENERGY_LEVEL_KEYS,
  WITH_DOGS_KEYS,
  WITH_PEOPLE_KEYS,
} from "@/lib/yipyy-go/answer-labels";
import { DEFAULT_BEHAVIOR_NOTES } from "@/lib/yipyy-go/owner-form";
import type { BehaviorNotes, YipyyGoFormSectionProps } from "@/types/yipyygo";

import { ChoicePills, TogglePills } from "./ChoicePills";

// ============================================================================
// How the pet gets on, for the team looking after them.
//
// Shown when the facility's template has its care-instructions section on.
// This step existed and was never rendered, because the old form did not read
// the template. Its words were English literals, and a trigger tapped from the
// list was stored as its English label — when it was stored at all, since the
// tap added whatever the text box held before it.
// ============================================================================

function choices<T extends string>(
  keys: Record<T, string>,
  t: (key: string) => string,
) {
  return (Object.keys(keys) as T[]).map((value) => ({
    value,
    label: t(keys[value]),
  }));
}

const isOffered = (value: string) =>
  Object.prototype.hasOwnProperty.call(ANXIETY_TRIGGER_KEYS, value);

export function BehaviorSection({
  formData,
  updateFormData,
}: YipyyGoFormSectionProps) {
  const t = useShellText("yipyygo");
  const [typed, setTyped] = useState("");
  const behavior = formData.behaviorNotes ?? DEFAULT_BEHAVIOR_NOTES;
  const triggers = behavior.anxietyTriggers ?? [];
  const ownTriggers = triggers.filter((value) => !isOffered(value));

  const update = (updates: Partial<BehaviorNotes>) =>
    updateFormData({ behaviorNotes: { ...behavior, ...updates } });

  const toggleTrigger = (value: string) =>
    update({
      anxietyTriggers: triggers.includes(value)
        ? triggers.filter((trigger) => trigger !== value)
        : [...triggers, value],
    });

  const addTyped = () => {
    const value = typed.trim();
    if (!value) return;
    if (!triggers.includes(value)) {
      update({ anxietyTriggers: [...triggers, value] });
    }
    setTyped("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("behaviorTitle")}</CardTitle>
        <CardDescription>
          {t("behaviorIntro").replace("{pet}", () => formData.petName)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-7">
        <ChoicePills
          name="behavior-energy"
          legend={t("energyLevel")}
          value={behavior.energyLevel}
          options={choices(ENERGY_LEVEL_KEYS, t)}
          onChange={(energyLevel) => update({ energyLevel })}
        />
        <ChoicePills
          name="behavior-with-dogs"
          legend={t("withOtherDogs")}
          value={behavior.socialization.withDogs}
          options={choices(WITH_DOGS_KEYS, t)}
          onChange={(withDogs) =>
            update({ socialization: { ...behavior.socialization, withDogs } })
          }
        />
        <ChoicePills
          name="behavior-with-people"
          legend={t("withPeople")}
          value={behavior.socialization.withHumans}
          options={choices(WITH_PEOPLE_KEYS, t)}
          onChange={(withHumans) =>
            update({
              socialization: { ...behavior.socialization, withHumans },
            })
          }
        />

        <div className="space-y-3">
          <TogglePills
            legend={t("anxietyTriggers")}
            hint={t("optional")}
            values={triggers}
            options={Object.entries(ANXIETY_TRIGGER_KEYS).map(
              ([value, key]) => ({ value, label: t(key) }),
            )}
            onToggle={toggleTrigger}
          />
          {ownTriggers.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {ownTriggers.map((value) => (
                <li key={value}>
                  <Button
                    variant="outline"
                    onClick={() => toggleTrigger(value)}
                    aria-label={t("removeTrigger").replace(
                      "{trigger}",
                      () => value,
                    )}
                  >
                    {value}
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Input
              id="behavior-own-trigger"
              aria-label={t("ownTriggerLabel")}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTyped();
                }
              }}
              placeholder={t("ownTriggerPlaceholder")}
              maxLength={200}
              className="min-w-0 flex-1 basis-56"
            />
            <Button
              variant="outline"
              onClick={addTyped}
              disabled={!typed.trim()}
            >
              <Plus aria-hidden />
              {t("addTrigger")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="behavior-notes"
            className="flex flex-wrap items-baseline gap-2"
          >
            {t("anythingElse")}
            <span className="text-ink-tertiary text-[13px] font-normal">
              {t("optional")}
            </span>
          </Label>
          <Textarea
            id="behavior-notes"
            value={behavior.specialNotes ?? ""}
            onChange={(event) => update({ specialNotes: event.target.value })}
            placeholder={t("anythingElsePlaceholder")}
            rows={3}
            maxLength={2000}
          />
        </div>
      </CardContent>
    </Card>
  );
}
