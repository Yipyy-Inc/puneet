"use client";

import { useState } from "react";
import {
  Check,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDeleteBoardingServiceCategory,
  useRenameBoardingServiceCategory,
  useSaveBoardingServiceCategory,
  type BoardingServiceCategory,
} from "@/lib/api/boarding-catalogue";
import { isPluralOne } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The rates' categories, managed from the Rates page itself.
//
// A category could only be made from INSIDE a rate's editor ("+ New" beside
// its Category field), so a facility had to open a rate to organise the
// menu, and every rate it had not opened stayed under "Ungrouped". The client
// asked for it on the page, as the Add-ons tab has it: a Categories button
// beside the one that adds. The editor keeps its own "+ New" — the Add-ons
// tab offers both too — so a rate can still be filed as it is written.
//
// A centred dialog, like every panel in the product: a scrolling list above a
// fixed form, the list `min-h-0` so it shrinks instead of pushing the form
// off the bottom (see AddOnCategoryDialog). Removing a category removes no
// rate — its rates move to the uncategorised group — and says so first.
// ============================================================================

export function BoardingRateCategoriesDialog({
  open,
  onOpenChange,
  categories,
  rateCounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BoardingServiceCategory[];
  /** Category id → how many rates are filed under it. */
  rateCounts: ReadonlyMap<string, number>;
}) {
  const { t, fill, locale } = useStaffText("boardingServices");
  const save = useSaveBoardingServiceCategory();
  const rename = useRenameBoardingServiceCategory();
  const remove = useDeleteBoardingServiceCategory();

  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [removing, setRemoving] = useState<BoardingServiceCategory | null>(
    null,
  );
  const busy = save.isPending || rename.isPending || remove.isPending;

  const rates = (n: number) =>
    fill(isPluralOne(n, locale) ? "rateCountOne" : "rateCountOther", {
      n: String(n),
    });

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await save.mutateAsync({
        name: trimmed,
        displayOrder: categories.length + 1,
      });
      setName("");
      toast.success(t("categoryAdded"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotSaveCategory"),
      );
    }
  }

  async function saveRename() {
    if (!editing || !editing.name.trim()) return;
    try {
      await rename.mutateAsync({ id: editing.id, name: editing.name.trim() });
      setEditing(null);
      toast.success(t("categoryRenamed"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotSaveCategory"),
      );
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
      toast.success(t("categoryRemoved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotRemoveCategory"),
      );
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="size-5" aria-hidden />
              {t("categoriesTitle")}
            </DialogTitle>
            <DialogDescription>
              {fill("categoriesBlurb", { none: t("ungrouped") })}
            </DialogDescription>
          </DialogHeader>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {categories.length === 0 ? (
              <li className="text-muted-foreground text-[14.5px]">
                {t("noCategories")}
              </li>
            ) : (
              categories.map((category) => (
                <li
                  key={category.id}
                  className="flex min-h-12 items-center gap-2 rounded-lg border border-(--line) px-3 py-2"
                >
                  {editing?.id === category.id ? (
                    <>
                      <Input
                        aria-label={t("renameCategory")}
                        value={editing.name}
                        autoFocus
                        className="min-w-0 flex-1"
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveRename();
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || !editing.name.trim()}
                        onClick={() => void saveRename()}
                      >
                        {rename.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Check className="size-4" aria-hidden />
                        )}
                        {t("saveCategory")}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t("cancel")}
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">
                          {category.name}
                        </p>
                        <p className="text-muted-foreground text-[13.5px] tabular-nums">
                          {rates(rateCounts.get(category.id) ?? 0)}
                        </p>
                      </div>
                      {/* Persistent, never revealed on hover: §6 rule 11. */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={fill("renameNamed", {
                          name: category.name,
                        })}
                        disabled={busy}
                        onClick={() =>
                          setEditing({ id: category.id, name: category.name })
                        }
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-(--error)"
                        aria-label={fill("removeNamed", {
                          name: category.name,
                        })}
                        disabled={busy}
                        onClick={() => setRemoving(category)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>

          <form
            className="space-y-2 border-t border-(--line) pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Label htmlFor="rate-category-name">{t("newCategoryLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="rate-category-name"
                placeholder={t("categoryNamePlaceholder")}
                value={name}
                className="min-w-0 flex-1"
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" disabled={busy || !name.trim()}>
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                {t("addCategory")}
              </Button>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fill("removeCategoryTitle", { name: removing?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fill("removeCategoryBody", { none: t("ungrouped") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void confirmRemove()}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
