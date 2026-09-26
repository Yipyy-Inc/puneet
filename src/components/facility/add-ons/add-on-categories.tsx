"use client";

import { useMemo } from "react";

import { ServiceCategoriesDialog } from "@/components/facility/services/service-categories-dialog";
import {
  useDeleteAddOnCategory,
  useRenameAddOnCategory,
  useReorderAddOnCategories,
  useSaveAddOnCategory,
} from "@/lib/api/add-ons";
import type { AddOn, AddOnCategory } from "@/types/add-on";

/**
 * "Edit categories" — add, rename, sort and delete the headings the list is
 * grouped under. The same dialog the service menus use, told the add-ons'
 * words and writes; deleting a category leaves its add-ons Uncategorized.
 */
export function AddOnCategories({
  open,
  onOpenChange,
  categories,
  addOns,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AddOnCategory[];
  addOns: AddOn[];
  t: (key: string) => string;
}) {
  const create = useSaveAddOnCategory();
  const rename = useRenameAddOnCategory();
  const remove = useDeleteAddOnCategory();
  const reorder = useReorderAddOnCategories();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const addOn of addOns) {
      if (addOn.categoryId) {
        map.set(addOn.categoryId, (map.get(addOn.categoryId) ?? 0) + 1);
      }
    }
    return map;
  }, [addOns]);

  const none = t("uncategorized");
  const named = (key: string, name: string) => t(key).replace("{name}", name);

  return (
    <ServiceCategoriesDialog
      open={open}
      onOpenChange={onOpenChange}
      categories={categories}
      counts={counts}
      onCreate={(name, displayOrder) =>
        create.mutateAsync({ name, displayOrder })
      }
      onRename={(id, name) => rename.mutateAsync({ id, name })}
      onRemove={(id) => remove.mutateAsync(id)}
      onReorder={(ids) => reorder.mutateAsync(ids)}
      text={{
        title: t("sheetTitle"),
        blurb: t("sheetBlurb").replace("{none}", none),
        empty: t("sheetEmpty"),
        newLabel: t("sheetNewCategory"),
        namePlaceholder: t("sheetNamePlaceholder"),
        add: t("sheetAddCategory"),
        save: t("sheetSave"),
        cancel: t("cancel"),
        renameInput: t("sheetRenameInput"),
        renameNamed: (name) => named("sheetRenameNamed", name),
        removeNamed: (name) => named("sheetDeleteAction", name),
        removeTitle: (name) => named("sheetRemoveTitle", name),
        removeBody: t("sheetRemoveBody").replace("{none}", none),
        remove: t("delete"),
        done: t("done"),
        added: t("sheetAdded"),
        renamed: t("sheetRenamed"),
        removed: t("sheetRemoved"),
        couldNotSave: t("sheetCouldNotSave"),
        couldNotRemove: t("sheetCouldNotRemove"),
        count: (n) =>
          t(n === 1 ? "countOne" : "countOther").replace("{n}", String(n)),
        moveNamed: (name) => named("sheetMoveNamed", name),
        couldNotSort: t("sheetCouldNotSort"),
      }}
    />
  );
}
