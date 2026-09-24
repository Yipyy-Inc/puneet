"use client";

import { useState } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// PICK A CATEGORY — OR MAKE ONE, RENAME IT, OR REMOVE IT.
//
// ── WHAT WAS MISSING, AND HOW IT HID ──────────────────────────────────────
//
// The service dialogs offered a Category select whose only entry was "No
// category". The API to create one existed and was scoped and tested
// (`/api/daycare/service-categories`, `/api/boarding/service-categories`), the
// query factories exported `useSaveDaycareServiceCategory` and
// `useSaveBoardingServiceCategory` — and NOTHING CALLED EITHER. A facility
// could group its menu only if a category already existed, and none ever could.
//
// Client feedback, 2026-09-24. It is the same shape as the boarding menu
// itself: a route with no screen is dead code one layer down, and every gate
// stays green over it because the code is correct — it is simply never
// reached.
//
// Rename and remove followed in the same pass, because a create button on its
// own makes every typo permanent — the collection route had shipped GET and
// POST and nothing else.
//
// ── THE WORDS COME FROM THE CALLER ────────────────────────────────────────
//
// This is shared by daycare and boarding, whose strings live in their own
// catalogues. It takes them as props rather than defaulting to English —
// `RateColorPicker` carries the note about why: a default parameter reads as
// translated to a global search while being the English word forever.
//
// ── WRITING A CATEGORY DOES NOT SAVE THE SERVICE ──────────────────────────
//
// All three writes land immediately, because a category is its own row and the
// dialog around this may still be cancelled. So a facility that creates "Puppy
// programmes" and then abandons the service keeps the category — recoverable
// now that it can also be removed, and better than losing the typing.
//
// ── THE ACTIONS ARE BEHIND A VISIBLE BUTTON, NOT A HOVER ──────────────────
//
// §6 rule 11: two of the three contexts have no hover at all, so a control
// revealed by it does not exist for most of the product. The overflow button is
// always there whenever a real category is selected.
// ============================================================================

/** Radix Select throws on an item whose value is the empty string. */
const NO_CATEGORY = "__none__";

export interface ServiceCategoryOption {
  id: string;
  name: string;
}

export function ServiceCategoryField({
  value,
  onChange,
  categories,
  onCreate,
  onRename,
  onDelete,
  text,
  disabled,
}: {
  /** The chosen category id, or null for ungrouped. */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  categories: ServiceCategoryOption[];
  /**
   * Writes the category and resolves the created row, or null when it failed.
   * The caller owns the mutation so each menu writes to its own table.
   */
  onCreate: (name: string) => Promise<ServiceCategoryOption | null>;
  /** Resolves the renamed row, or null when it failed. */
  onRename: (id: string, name: string) => Promise<ServiceCategoryOption | null>;
  /** Resolves true when the row is gone. */
  onDelete: (id: string) => Promise<boolean>;
  text: {
    label: string;
    none: string;
    newCategory: string;
    namePlaceholder: string;
    save: string;
    cancel: string;
    rename: string;
    remove: string;
    /** Carries a `{name}` hole: §5j names the object, never "this". */
    removeTitle: string;
    /** Carries a `{none}` hole for the ungrouped label. */
    removeBody: string;
    actions: string;
  };
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "create" | "rename">("idle");
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // Held apart from `selected`, which becomes null the moment the removal
  // succeeds — while the dialog is still animating out, so a title read from
  // it would flash "Remove ?" on the way out.
  const [removeTarget, setRemoveTarget] =
    useState<ServiceCategoryOption | null>(null);
  // Rows this field has written, held until the caller's list catches up. The
  // mutations invalidate their query rather than awaiting the refetch, so for
  // one round trip `categories` does NOT reflect what just happened — and a
  // Radix Select whose value matches no item renders BLANK. Without these the
  // facility types a name, saves, and watches the field go empty.
  const [local, setLocal] = useState<ServiceCategoryOption[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const merged = [
    ...categories.filter((c) => !local.some((l) => l.id === c.id)),
    ...local,
  ];
  const options = merged.filter((c) => !removedIds.includes(c.id));
  const selected = options.find((c) => c.id === value) ?? null;

  /** Remember a row locally, replacing any earlier copy of the same id. */
  function remember(row: ServiceCategoryOption) {
    setLocal((prev) => [...prev.filter((c) => c.id !== row.id), row]);
  }

  async function submit() {
    const name = draftName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      if (mode === "rename") {
        if (!selected) return;
        const renamed = await onRename(selected.id, name);
        if (renamed) {
          remember(renamed);
          setMode("idle");
          setDraftName("");
        }
        return;
      }
      const created = await onCreate(name);
      if (created) {
        // Chosen straight away: somebody who just typed a category name wants
        // this service in it, and making them find it in the list again is a
        // step with no decision in it.
        remember(created);
        onChange(created.id);
        setMode("idle");
        setDraftName("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const target = removeTarget;
    if (!target || busy) return;
    setBusy(true);
    try {
      const gone = await onDelete(target.id);
      if (gone) {
        setRemovedIds((prev) => [...prev, target.id]);
        // The services it grouped are `on delete set null`, so they are still
        // on the menu — but THIS service's category is now nothing.
        onChange(null);
        setConfirmingRemove(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function cancelEditing() {
    setMode("idle");
    setDraftName("");
  }

  if (mode !== "idle") {
    const inputId = mode === "rename" ? "rename-category" : "new-category";
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{text.label}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={inputId}
            className="min-w-48 flex-1"
            autoFocus
            value={draftName}
            placeholder={text.namePlaceholder}
            disabled={busy}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              // Enter saves and Escape backs out, because a field that only
              // responds to a mouse is a field somebody will fight with.
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
          />
          <Button
            type="button"
            disabled={busy || draftName.trim().length === 0}
            onClick={() => void submit()}
          >
            <Check className="size-4" aria-hidden />
            {text.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={cancelEditing}
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">{text.cancel}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="service-category">{text.label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={value ?? NO_CATEGORY}
          disabled={disabled}
          onValueChange={(v) => onChange(v === NO_CATEGORY ? null : v)}
        >
          <SelectTrigger id="service-category" className="min-w-48 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>{text.none}</SelectItem>
            {options.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Beside the select rather than an item inside it. A "+ New…" row in
            a Radix Select is still a VALUE being chosen, so keyboard selection
            and type-ahead both land on it, and the control briefly holds a
            value that is not a category. A button is a button. */}
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={disabled}
          onClick={() => {
            setMode("create");
            setDraftName("");
          }}
        >
          <Plus className="size-4" aria-hidden />
          {text.newCategory}
        </Button>

        {/* Only with a real category chosen: there is nothing to rename or
            remove about "ungrouped", which is the absence of a row. */}
        {selected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                disabled={disabled}
              >
                <MoreHorizontal className="size-4" aria-hidden />
                <span className="sr-only">{text.actions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setMode("rename");
                  setDraftName(selected.name);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                {text.rename}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setRemoveTarget(selected);
                  setConfirmingRemove(true);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                {text.remove}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* §5j, all four parts: the object is NAMED ("Remove Puppy
                programmes?", never "this category"); the body says it cannot
                be undone and what survives — the services, which is the
                question somebody deleting a heading is actually asking; the
                button's verb is the title's verb; and Cancel, the safe
                default, takes focus and sits on the left. */}
            <AlertDialogTitle>
              {text.removeTitle.replace("{name}", removeTarget?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.removeBody.replace("{none}", text.none)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction
              // The Button's own destructive variant — `--bad`, #B23B3B —
              // not the prose's `--error-dot`: white on #D24545 is 4.49:1
              // and fails, and button.tsx records why the page won.
              className={buttonVariants({ variant: "destructive" })}
              disabled={busy}
              onClick={(e) => {
                // The dialog closes on its own action; hold it open until the
                // write answers, so a refusal is seen rather than dismissed.
                e.preventDefault();
                void remove();
              }}
            >
              {text.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
