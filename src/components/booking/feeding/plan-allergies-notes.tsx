"use client";

import { useState } from "react";

import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { allergyLabel, optionValue } from "@/lib/feeding/labels";
import { offeredOptions } from "@/lib/settings/feeding-instructions";
import { useShellText } from "@/lib/shell/use-shell-text";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// ALLERGIES & NOTES: the facility's allergy quick picks with one tap — the
// common ones it left on, and its own — any other typed and added with Enter,
// notes, and keeping the plan on the pet's profile.
//
// A marked allergy is a choice like any other — the 2px ring (§5s) — and an
// alert, so it carries the alert glyph in its own ink (§3: colour is never
// the only channel). A typed one shows while it is marked.
// ============================================================================

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export function PlanAllergiesNotes({ step }: { step: FeedingStepState }) {
  const t = useShellText("booking");
  const plan = step.plan!;
  const { show } = step.settings;
  const [typed, setTyped] = useState("");
  // What a quick pick stores: a common allergy's canonical word, or the
  // facility's own words.
  const presets = offeredOptions(step.settings, "allergies").map((row) =>
    optionValue("allergies", row),
  );

  const marked = (value: string) => plan.allergies.some((a) => same(a, value));
  const toggle = (value: string) =>
    step.update((current) => ({
      allergies: current.allergies.some((a) => same(a, value))
        ? current.allergies.filter((a) => !same(a, value))
        : [...current.allergies, value],
    }));
  const typedOnes = plan.allergies.filter(
    (allergy) => !presets.some((preset) => same(preset, allergy)),
  );
  const add = () => {
    const value = typed.trim();
    if (value && !marked(value)) {
      step.update((current) => ({ allergies: [...current.allergies, value] }));
    }
    setTyped("");
  };

  return (
    <EditorSection label={t("feedSectionAllergies")}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <FieldLabel id="feed-allergies-label">
          {t("feedAllergiesLabel")}
        </FieldLabel>
        <div
          role="group"
          aria-labelledby="feed-allergies-label"
          className="flex flex-wrap items-center gap-2"
        >
          {[...presets, ...typedOnes].map((allergy) => {
            const on = marked(allergy);
            return (
              <ChoicePill
                key={allergy}
                type="checkbox"
                value={allergy}
                checked={on}
                onChange={() => toggle(allergy)}
                // A marked allergy is red, as the mock draws it.
                className="has-checked:border-(--care-allergy-line) has-checked:bg-(--care-allergy-bg) has-checked:text-(--care-allergy-ink)"
              >
                {allergyLabel(t, allergy)}
              </ChoicePill>
            );
          })}
          <Input
            aria-label={t("feedAllergyAdd")}
            value={typed}
            placeholder={t("feedAllergyPlaceholder")}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
            className="h-11 w-[190px] max-w-full rounded-full border-[1.5px] border-dashed border-(--care-dash-2) px-4 text-[15px] max-lg:h-11"
          />
        </div>
      </div>

      {show.notes ? (
        <div className="flex min-w-0 flex-col gap-2">
          <FieldLabel htmlFor="feed-notes">
            {t("feedNotesLabel")}{" "}
            <span className="font-normal text-(--care-micro)">
              {t("medsOptional")}
            </span>
          </FieldLabel>
          <Textarea
            id="feed-notes"
            rows={3}
            maxLength={1000}
            value={plan.notes}
            placeholder={t("feedNotesPlaceholder")}
            onChange={(event) => step.update({ notes: event.target.value })}
            className="rounded-[12px] px-3.5 py-3 text-[15px] leading-[22.5px]"
          />
        </div>
      ) : null}

      {show.saveToProfile ? (
        <div className="flex items-start gap-3 rounded-[12px] bg-(--care-card-on) px-4 py-3.5">
          <Checkbox
            id="feed-save-profile"
            checked={plan.saveToProfile}
            onCheckedChange={(on) =>
              step.update({ saveToProfile: on === true })
            }
            className="mt-0.5"
          />
          <label
            htmlFor="feed-save-profile"
            className="flex cursor-pointer flex-col gap-0.5"
          >
            <span className="text-acc-soft-text text-[15px] font-medium">
              {t("medsSaveToProfile")}
            </span>
            <span className="text-acc-deep text-[13px]">
              {t("feedSaveToProfileHelp")}
            </span>
          </label>
        </div>
      ) : null}
    </EditorSection>
  );
}
