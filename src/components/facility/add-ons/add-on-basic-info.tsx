"use client";

import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";
import { ServiceCategoryField } from "@/components/facility/services/service-category-field";
import {
  useDeleteAddOnCategory,
  useRenameAddOnCategory,
  useSaveAddOnCategory,
} from "@/lib/api/add-ons";
import type { AddOnCategory } from "@/types/add-on";

import type { AddOnDraft } from "./add-on-draft";
import { AddOnChoiceCard, AddOnSection } from "./add-on-section";

/** 1 · Basic info — name, category, description, status, image, colour. */
export function AddOnBasicInfo({
  draft,
  patch,
  categories,
  t,
}: {
  draft: AddOnDraft;
  patch: (next: Partial<AddOnDraft>) => void;
  categories: AddOnCategory[];
  t: (key: string) => string;
}) {
  const saveCategory = useSaveAddOnCategory();
  const renameCategory = useRenameAddOnCategory();
  const removeCategory = useDeleteAddOnCategory();

  const failed = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : t(fallback));

  return (
    <AddOnSection index={1} title={t("secBasics")}>
      <div className="space-y-2">
        <Label htmlFor="add-on-name">{t("fieldName")}</Label>
        <Input
          id="add-on-name"
          value={draft.name}
          maxLength={120}
          placeholder={t("namePlaceholder")}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <p className="text-muted-foreground text-[13.5px]">{t("nameHint")}</p>
      </div>

      <ServiceCategoryField
        value={draft.categoryId}
        onChange={(categoryId) => patch({ categoryId })}
        categories={categories}
        onCreate={async (name) => {
          try {
            return await saveCategory.mutateAsync({
              name,
              displayOrder: categories.length + 1,
            });
          } catch (error) {
            failed(error, "sheetCouldNotSave");
            return null;
          }
        }}
        onRename={async (id, name) => {
          try {
            return await renameCategory.mutateAsync({ id, name });
          } catch (error) {
            failed(error, "sheetCouldNotSave");
            return null;
          }
        }}
        onDelete={async (id) => {
          try {
            await removeCategory.mutateAsync(id);
            return true;
          } catch (error) {
            failed(error, "sheetCouldNotRemove");
            return false;
          }
        }}
        text={{
          label: t("fieldCategory"),
          none: t("uncategorized"),
          newCategory: t("categoryNewShort"),
          namePlaceholder: t("categoryNamePlaceholder"),
          save: t("sheetSave"),
          cancel: t("cancel"),
          rename: t("categoryRename"),
          remove: t("delete"),
          removeTitle: t("sheetRemoveTitle"),
          removeBody: t("sheetRemoveBody"),
          actions: t("categoryActions"),
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="add-on-description">{t("fieldDescription")}</Label>
        <Textarea
          id="add-on-description"
          value={draft.description}
          rows={3}
          maxLength={2000}
          placeholder={t("descriptionPlaceholder")}
          onChange={(e) => patch({ description: e.target.value })}
        />
        <p className="text-muted-foreground text-[13.5px]">
          {t("descriptionHint")}
        </p>
      </div>

      <AddOnChoiceCard
        title={t("secStatus")}
        hint={t("statusHint")}
        control={
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[13.5px] font-semibold">
              {draft.isActive ? t("statusActive") : t("statusInactive")}
            </span>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(isActive) => patch({ isActive })}
              aria-label={t("secStatus")}
            />
          </div>
        }
      />

      <RoomImageUpload
        value={draft.imageUrl || undefined}
        onChange={(url) => patch({ imageUrl: url ?? "" })}
        label={t("fieldPhoto")}
        hint={t("photoHint")}
        compact={!draft.imageUrl}
        aspectClass="aspect-[3/1]"
        slug={draft.name || "add-on"}
      />

      <div className="space-y-1">
        <RateColorPicker
          value={draft.colorCode}
          onChange={(colorCode) => patch({ colorCode })}
          label={t("fieldColour")}
        />
        <p className="text-muted-foreground text-[13.5px]">{t("colourHint")}</p>
      </div>
    </AddOnSection>
  );
}
