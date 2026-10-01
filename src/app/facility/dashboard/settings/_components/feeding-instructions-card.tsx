"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveBar } from "@/components/ui/save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFeedingInstructions,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  FEEDING_LISTS,
  feedingInstructionsSchema,
  type FeedingInstructions,
  type FeedingList,
} from "@/lib/settings/feeding-instructions";
import { useSettingsText } from "@/lib/settings/use-settings-text";

import {
  CategoryGroup,
  ListEditor,
  MealTimeEditor,
  MealTimeTags,
  ValueTags,
} from "./care-list-editors";

// ============================================================================
// Feeding instructions — the choices the booking form's Feeding step offers.
// Saved to the `feeding_instructions` domain since 2026-10-01; it was spliced
// into a fixture before and reached nobody (lib/settings/feeding-instructions).
// ============================================================================

const LIST_COPY: Record<FeedingList, { label: string; placeholder: string }> = {
  units: { label: "catUnits", placeholder: "phUnits" },
  foodTypes: { label: "catFoodTypes", placeholder: "phFoodTypes" },
  instructions: { label: "catInstructions", placeholder: "phInstructions" },
  sources: { label: "catSources", placeholder: "phSources" },
  destinations: { label: "catDestinations", placeholder: "phDestinations" },
  frequencies: { label: "catFrequencies", placeholder: "phFrequencies" },
  allowedProteins: { label: "catAllowedProteins", placeholder: "phProteins" },
  allergyPresets: { label: "catAllergyPresets", placeholder: "phAllergies" },
};

// Nothing renders until the row has arrived — the editor seeds `useState`, and
// a first Save against the fallback would write the shipped lists over the
// facility's own (check:settings-seeding).
export function FeedingInstructionsCard() {
  const { instructions, configured, isPending } = useFeedingInstructions();
  if (isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  return (
    <FeedingInstructionsEditor
      key={configured ? "stored" : "shipped"}
      initial={instructions}
    />
  );
}

function FeedingInstructionsEditor({
  initial,
}: {
  initial: FeedingInstructions;
}) {
  const { locale, section } = useSettingsText();
  const t = section("care-tasks");
  const save = useSaveFacilitySetting();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const toggle = (id: string) =>
    setEditing((open) => (open === id ? null : id));

  const handleSave = () => {
    const parsed = feedingInstructionsSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(t("feedingInvalid"));
      return;
    }
    save.mutate(
      { domain: "feeding_instructions", value: parsed.data },
      {
        onSuccess: () => {
          setSaved(parsed.data);
          setDraft(parsed.data);
          setEditing(null);
          toast.success(t("feedingSaved"));
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("instructionsNotSaved"),
          ),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section text-heading">
          {t("feedingInstructionsTitle")}
        </CardTitle>
        <p className="text-meta text-ink-tertiary mt-1">
          {t("feedingInstructionsHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <CategoryGroup
          id="feeding-schedules"
          label={t("catSchedules")}
          count={draft.schedules.length}
          editing={editing === "schedules"}
          onToggle={() => toggle("schedules")}
          editor={
            <MealTimeEditor
              items={draft.schedules}
              onChange={(schedules) =>
                setDraft((current) => ({ ...current, schedules }))
              }
            />
          }
        >
          <MealTimeTags items={draft.schedules} locale={locale} />
        </CategoryGroup>

        {FEEDING_LISTS.map((list) => (
          <CategoryGroup
            key={list}
            id={`feeding-${list}`}
            label={t(LIST_COPY[list].label)}
            count={draft[list].length}
            editing={editing === list}
            onToggle={() => toggle(list)}
            editor={
              <ListEditor
                id={`feeding-${list}`}
                items={draft[list]}
                placeholder={t(LIST_COPY[list].placeholder)}
                onChange={(items) =>
                  setDraft((current) => ({ ...current, [list]: items }))
                }
              />
            }
          >
            <ValueTags items={draft[list]} />
          </CategoryGroup>
        ))}

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
