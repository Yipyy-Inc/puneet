"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocationContext } from "@/hooks/use-location-context";
import { useSaveAddOn } from "@/lib/api/add-ons";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import type { AddOn, AddOnCategory } from "@/types/add-on";

import {
  draftFrom,
  draftProblem,
  draftToInput,
  type AddOnDraft,
} from "./add-on-draft";
import { AddOnBasicInfo } from "./add-on-basic-info";
import { AddOnLocations } from "./add-on-locations";
import { AddOnPetDetails } from "./add-on-pet-details";
import { AddOnPriceDuration } from "./add-on-price-duration";
import { AddOnServices } from "./add-on-services";
import { AddOnStaff } from "./add-on-staff";

// ============================================================================
// Create or edit one add-on, section by section as the reference article sets
// it up: basic info, the locations that offer it (only when there is more than
// one), price & duration, staff, applicable services, pet details.
//
// The parent remounts this by key each time it opens, so the draft is seeded
// once from the add-on it was given and never from a refetch mid-edit.
// ============================================================================

export function AddOnDialog({
  open,
  onOpenChange,
  addOn,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = adding a new one. */
  addOn: AddOn | null;
  categories: AddOnCategory[];
  /** After a save that changed an existing add-on — for "apply to upcoming". */
  onSaved?: (saved: AddOn, before: AddOn | null) => void;
}) {
  const { section, locale } = useSettingsText();
  const t = section("addons");
  const { locations, isMultiLocation } = useLocationContext();
  const save = useSaveAddOn();

  const [draft, setDraft] = useState<AddOnDraft>(() => draftFrom(addOn));
  const [problem, setProblem] = useState<string | null>(null);
  const patch = (next: Partial<AddOnDraft>) => {
    setProblem(null);
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const locationList = locations.map((l) => ({ id: l.id, name: l.name }));
  const base = isMultiLocation ? 3 : 2;

  async function handleSave() {
    const stop = draftProblem(draft);
    if (stop) {
      setProblem(t(stop));
      return;
    }
    const name = draft.name.trim();
    try {
      const result = await save.mutateAsync({
        id: addOn?.id,
        input: draftToInput(
          draft,
          locationList.map((l) => l.id),
        ),
      });
      if (!result.overridesWritten) {
        toast.warning(t("savedNoOverrides").replace("{name}", name));
      } else {
        toast.success(
          t(addOn ? "addOnUpdated" : "addOnCreated").replace("{name}", name),
        );
      }
      onOpenChange(false);
      onSaved?.(result.addOn, addOn);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{addOn ? t("dialogEdit") : t("addNew")}</DialogTitle>
          <DialogDescription>{t("dialogBlurb")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] pr-4">
          <div className="space-y-8 py-2">
            <AddOnBasicInfo
              draft={draft}
              patch={patch}
              categories={categories}
              t={t}
            />
            {isMultiLocation ? (
              <AddOnLocations
                draft={draft}
                patch={patch}
                locations={locationList}
                t={t}
              />
            ) : null}
            <AddOnPriceDuration
              index={base}
              draft={draft}
              patch={patch}
              locations={locationList}
              t={t}
            />
            <AddOnStaff index={base + 1} draft={draft} patch={patch} t={t} />
            <AddOnServices index={base + 2} draft={draft} patch={patch} t={t} />
            <AddOnPetDetails
              index={base + 3}
              draft={draft}
              patch={patch}
              t={t}
              locale={locale}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {problem ? (
            <p
              role="alert"
              className="text-[13px] font-medium text-(--error) sm:mr-auto"
            >
              {problem}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => void handleSave()}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {addOn ? t("saveChanges") : t("createAddOn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
