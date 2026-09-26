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

// ============================================================================
// A service menu's categories, managed from the menu's own page.
//
// A category could only be made from INSIDE a service's editor ("+ New"
// beside its Category field), so a facility had to open a service to organise
// its menu, and every service it had not opened stayed uncategorised. The
// client asked for it on the page, as the Add-ons tab has it: a Categories
// button beside the one that adds — first for boarding's rates (2026-09-26),
// then daycare's and grooming's services the same day. So it is one dialog,
// told its words and its three writes by the page, never three copies.
//
// A centred dialog, like every panel in the product: a scrolling list above a
// fixed form, the list `min-h-0` so it shrinks instead of pushing the form off
// the bottom (see AddOnCategoryDialog). Removing a category removes no service
// — every menu's `category_id` is `on delete set null` (service-category-crud
// C3) — and the confirmation says so first.
// ============================================================================

export interface ServiceCategoryRow {
  id: string;
  name: string;
}

/** The page's words: every noun here is the page's ("rates", "services"). */
export interface ServiceCategoriesText {
  title: string;
  /** Says where a service with no category is listed. */
  blurb: string;
  empty: string;
  newLabel: string;
  namePlaceholder: string;
  add: string;
  save: string;
  cancel: string;
  renameInput: string;
  renameNamed: (name: string) => string;
  removeNamed: (name: string) => string;
  removeTitle: (name: string) => string;
  removeBody: string;
  remove: string;
  done: string;
  added: string;
  renamed: string;
  removed: string;
  couldNotSave: string;
  couldNotRemove: string;
  /** "3 rates" · "1 service". */
  count: (n: number) => string;
}

export function ServiceCategoriesDialog({
  open,
  onOpenChange,
  categories,
  counts,
  onCreate,
  onRename,
  onRemove,
  text,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ServiceCategoryRow[];
  /** Category id → how many services are filed under it. */
  counts: ReadonlyMap<string, number>;
  /** Each throws on failure, with a message a person can read. */
  onCreate: (name: string, displayOrder: number) => Promise<unknown>;
  onRename: (id: string, name: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  text: ServiceCategoriesText;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ServiceCategoryRow | null>(null);
  const [removing, setRemoving] = useState<ServiceCategoryRow | null>(null);
  const [pending, setPending] = useState<"add" | "rename" | "remove" | null>(
    null,
  );
  const busy = pending !== null;

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending("add");
    try {
      await onCreate(trimmed, categories.length + 1);
      setName("");
      // success-claim-ok: after awaiting the page's own write (onCreate), which throws on failure
      toast.success(text.added);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.couldNotSave);
    } finally {
      setPending(null);
    }
  }

  async function saveRename() {
    if (!editing || !editing.name.trim()) return;
    setPending("rename");
    try {
      await onRename(editing.id, editing.name.trim());
      setEditing(null);
      // success-claim-ok: after awaiting the page's own write (onRename), which throws on failure
      toast.success(text.renamed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.couldNotSave);
    } finally {
      setPending(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setPending("remove");
    try {
      await onRemove(removing.id);
      // success-claim-ok: after awaiting the page's own write (onRemove), which throws on failure
      toast.success(text.removed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.couldNotRemove);
    } finally {
      setPending(null);
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
              {text.title}
            </DialogTitle>
            <DialogDescription>{text.blurb}</DialogDescription>
          </DialogHeader>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {categories.length === 0 ? (
              <li className="text-muted-foreground text-[14.5px]">
                {text.empty}
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
                        aria-label={text.renameInput}
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
                        {pending === "rename" ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Check className="size-4" aria-hidden />
                        )}
                        {text.save}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={text.cancel}
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
                          {text.count(counts.get(category.id) ?? 0)}
                        </p>
                      </div>
                      {/* Persistent, never revealed on hover: §6 rule 11. */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={text.renameNamed(category.name)}
                        disabled={busy}
                        onClick={() => setEditing(category)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-(--error)"
                        aria-label={text.removeNamed(category.name)}
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
            <Label htmlFor="service-category-name">{text.newLabel}</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="service-category-name"
                placeholder={text.namePlaceholder}
                value={name}
                className="min-w-0 flex-1"
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" disabled={busy || !name.trim()}>
                {pending === "add" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                {text.add}
              </Button>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {text.done}
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
              {text.removeTitle(removing?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>{text.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void confirmRemove()}
            >
              {text.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The dialog's words from a menu's staff-text area. Every menu area carries
 * the same category keys (boardingServices, daycareServices,
 * groomingServices), so the three pages cannot word the dialog three ways.
 */
export function serviceCategoriesText(
  t: (key: string) => string,
  fill: (key: string, values: Record<string, string | number>) => string,
  count: (n: number) => string,
): ServiceCategoriesText {
  const none = t("ungrouped");
  return {
    title: t("categoriesTitle"),
    blurb: fill("categoriesBlurb", { none }),
    empty: t("noCategories"),
    newLabel: t("newCategoryLabel"),
    namePlaceholder: t("categoryNamePlaceholder"),
    add: t("addCategory"),
    save: t("saveCategory"),
    cancel: t("cancel"),
    renameInput: t("renameCategory"),
    renameNamed: (name) => fill("renameNamed", { name }),
    removeNamed: (name) => fill("removeNamed", { name }),
    removeTitle: (name) => fill("removeCategoryTitle", { name }),
    removeBody: fill("removeCategoryBody", { none }),
    remove: t("remove"),
    done: t("done"),
    added: t("categoryAdded"),
    renamed: t("categoryRenamed"),
    removed: t("categoryRemoved"),
    couldNotSave: t("couldNotSaveCategory"),
    couldNotRemove: t("couldNotRemoveCategory"),
    count,
  };
}
