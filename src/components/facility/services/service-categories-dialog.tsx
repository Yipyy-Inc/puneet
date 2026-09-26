"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  FolderOpen,
  GripVertical,
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
import { cn } from "@/lib/utils";

// ============================================================================
// A service menu's categories, managed from the menu's own page.
//
// A category could only be made from INSIDE a service's editor ("+ New"
// beside its Category field), so a facility had to open a service to organise
// its menu, and every service it had not opened stayed uncategorised. The
// client asked for it on the page, as the Add-ons tab has it: a Categories
// button beside the one that adds — first for boarding's rates (2026-09-26),
// then daycare's and grooming's services the same day. So it is one dialog,
// told its words and its writes by the page, never three copies — and since
// the one add-ons list, the add-ons' categories use it too, with the rows
// dragged into order ("sort the order of categories", `onReorder`).
//
// A centred dialog, like every panel in the product: a scrolling list above a
// fixed form, the list `min-h-0` so it shrinks instead of pushing the form off
// the bottom. Removing a category removes no service
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
  /** The drag handle's name — only needed where categories can be sorted. */
  moveNamed?: (name: string) => string;
  couldNotSort?: string;
}

/**
 * One row that can be dragged into a new order. The grip is always there —
 * never revealed on hover (§6 rule 11) — and the keyboard moves it too: focus
 * the grip, Space to lift, the arrows to move, Space to drop.
 */
function SortableCategoryItem({
  id,
  handleLabel,
  disabled,
  children,
}: {
  id: string;
  handleLabel: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card flex min-h-12 items-center gap-2 rounded-lg border border-(--line) px-3 py-2",
        // A lift, not a fade: opacity would drop the row's text below the
        // floor (§6 rule 4).
        isDragging && "relative z-(--z-dropdown) shadow-lg",
      )}
    >
      <button
        type="button"
        className="hover:text-foreground flex min-h-10 min-w-10 cursor-grab touch-none items-center justify-center rounded-full text-(--ink-tertiary) active:cursor-grabbing max-lg:min-h-12 max-lg:min-w-12"
        aria-label={handleLabel}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {children}
    </li>
  );
}

export function ServiceCategoriesDialog({
  open,
  onOpenChange,
  categories,
  counts,
  onCreate,
  onRename,
  onRemove,
  onReorder,
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
  /**
   * Every category id in its new order. When given, the rows can be dragged
   * ("sort the order of categories"); the list the page groups by follows.
   */
  onReorder?: (ids: string[]) => Promise<unknown>;
  text: ServiceCategoriesText;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ServiceCategoryRow | null>(null);
  const [removing, setRemoving] = useState<ServiceCategoryRow | null>(null);
  const [pending, setPending] = useState<
    "add" | "rename" | "remove" | "sort" | null
  >(null);
  const busy = pending !== null;

  // The order just dropped, shown until the page's list catches up. Kept only
  // while it names exactly the categories the page has: once the refetch lands
  // it agrees, and an add or a remove makes it stale on its own.
  const [dropped, setDropped] = useState<string[] | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const shown =
    dropped &&
    dropped.length === categories.length &&
    dropped.every((id) => byId.has(id))
      ? dropped.map((id) => byId.get(id)!)
      : categories;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = shown.map((c) => c.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(ids, from, to);
    setDropped(next);
    setPending("sort");
    try {
      await onReorder(next);
    } catch (error) {
      setDropped(null);
      toast.error(
        error instanceof Error
          ? error.message
          : (text.couldNotSort ?? text.couldNotSave),
      );
    } finally {
      setPending(null);
    }
  }

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

  /** One row's contents: its name and count, or its rename form. */
  function rowBody(category: ServiceCategoryRow) {
    return editing?.id === category.id ? (
      <>
        <Input
          aria-label={text.renameInput}
          value={editing.name}
          autoFocus
          className="min-w-0 flex-1"
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
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
            <Loader2 className="size-4 animate-spin" aria-hidden />
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
          <p className="truncate text-[15px] font-semibold">{category.name}</p>
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
    );
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

          {shown.length === 0 ? (
            <p className="text-muted-foreground min-h-0 flex-1 text-[14.5px]">
              {text.empty}
            </p>
          ) : onReorder ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext
                items={shown.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {shown.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      id={category.id}
                      handleLabel={
                        text.moveNamed?.(category.name) ?? category.name
                      }
                      disabled={busy || editing !== null}
                    >
                      {rowBody(category)}
                    </SortableCategoryItem>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {shown.map((category) => (
                <li
                  key={category.id}
                  className="flex min-h-12 items-center gap-2 rounded-lg border border-(--line) px-3 py-2"
                >
                  {rowBody(category)}
                </li>
              ))}
            </ul>
          )}

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
