"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FolderOpen, Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { billedTermsChanged } from "@/lib/add-ons/billed-terms";
import {
  addOnUpcomingBookings,
  useAddOnCategories,
  useAddOns,
  useArchiveAddOn,
  useSaveAddOn,
} from "@/lib/api/add-ons";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import type { AddOn } from "@/types/add-on";

import { AddOnCategories } from "./add-on-categories";
import { duplicateInput } from "./add-on-draft";
import { AddOnRow } from "./add-on-row";

// ============================================================================
// SETTINGS > SERVICES > ADD-ONS — the one list, set up as the reference
// article describes (2026-09-26, 20260926223644).
//
// The list is grouped under the facility's categories in the order it sorted
// them, with the uncategorised last; each add-on has Edit, Duplicate and
// Delete. It is the ONLY place add-ons are managed: the Add-ons tabs the
// Rates pages carried are gone, and each links here instead.
// ============================================================================

const AddOnDialog = dynamic(
  () => import("./add-on-dialog").then((mod) => mod.AddOnDialog),
  { ssr: false },
);

const ApplyToUpcomingDialog = dynamic(
  () =>
    import("./apply-to-upcoming-dialog").then(
      (mod) => mod.ApplyToUpcomingDialog,
    ),
  { ssr: false },
);

/** The uncategorised group's key — never a word, so no category can be it. */
const UNCATEGORIZED = "__uncategorized__";

export function AddOnsSettings() {
  const { section, locale } = useSettingsText();
  const t = section("addons");
  const addOns = useAddOns();
  const categories = useAddOnCategories();
  const save = useSaveAddOn();
  const archive = useArchiveAddOn();

  const [editing, setEditing] = useState<{
    seq: number;
    addOn: AddOn | null;
  } | null>(null);
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState<AddOn | null>(null);
  // The edit just saved, when unconfirmed upcoming bookings carry the add-on.
  const [applying, setApplying] = useState<{
    addOn: AddOn;
    bookings: number;
  } | null>(null);

  const list = addOns.data;
  const cats = categories.data;

  const groups = useMemo(() => {
    const all = list ?? [];
    const known = new Set((cats ?? []).map((c) => c.id));
    const out = (cats ?? [])
      .map((c) => ({
        key: c.id,
        name: c.name,
        items: all.filter((a) => a.categoryId === c.id),
      }))
      .filter((g) => g.items.length > 0);
    const loose = all.filter((a) => !a.categoryId || !known.has(a.categoryId));
    if (loose.length > 0) {
      out.push({ key: UNCATEGORIZED, name: t("uncategorized"), items: loose });
    }
    return out;
  }, [list, cats, t]);

  const count = (n: number) =>
    t(n === 1 ? "countOne" : "countOther").replace("{n}", String(n));

  const openEditor = (addOn: AddOn | null) =>
    setEditing((prev) => ({ seq: (prev?.seq ?? 0) + 1, addOn }));

  async function duplicate(addOn: AddOn) {
    const name = t("copyOf").replace("{name}", addOn.name).slice(0, 120);
    try {
      await save.mutateAsync({ input: duplicateInput(addOn, name) });
      // success-claim-ok: after awaiting the save, which throws on failure
      toast.success(t("duplicated").replace("{name}", addOn.name));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("couldNotDuplicate").replace("{name}", addOn.name),
      );
    }
  }

  // "Apply the changes to all unconfirmed upcoming appointments?" — asked
  // only when the edit changed something a booking's line carries, and only
  // when there are such bookings.
  async function offerToApply(saved: AddOn, before: AddOn | null) {
    if (!before || !billedTermsChanged(before, saved)) return;
    try {
      const bookings = await addOnUpcomingBookings(saved.id);
      if (bookings > 0) setApplying({ addOn: saved, bookings });
    } catch {
      // The add-on IS saved; what could not be read is whether any booking
      // is waiting on the answer. Said, rather than left looking like "none".
      toast.warning(t("couldNotCheckUpcoming").replace("{name}", saved.name));
    }
  }

  async function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      await archive.mutateAsync(target.id);
      // success-claim-ok: after awaiting the delete, which throws on failure
      toast.success(t("deleted").replace("{name}", target.name));
      setDeleting(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("couldNotDelete").replace("{name}", target.name),
      );
    }
  }

  const failed = addOns.isError || categories.isError;
  const loading = !failed && (addOns.isPending || categories.isPending);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-[14.5px]">
          {t("intro")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setManaging(true)}
            disabled={loading || failed}
          >
            <FolderOpen className="size-4" aria-hidden />
            {t("editCategories")}
            <span className="text-(--ink-tertiary) tabular-nums">
              {(cats ?? []).length}
            </span>
          </Button>
          <Button
            type="button"
            onClick={() => openEditor(null)}
            disabled={loading || failed}
          >
            <Plus className="size-4" aria-hidden />
            {t("addNew")}
          </Button>
        </div>
      </div>

      {failed ? (
        <TableEmptyState
          pose="error"
          title={t("loadFailed")}
          action={{
            label: t("retry"),
            onClick: () => {
              void addOns.refetch();
              void categories.refetch();
            },
          }}
        />
      ) : loading ? (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <TableEmptyState
          pose="secure"
          title={t("emptyFirstTitle")}
          description={t("emptyFirst")}
          action={{
            label: t("addNew"),
            icon: Plus,
            onClick: () => openEditor(null),
          }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h3 className="flex items-baseline gap-2">
                <span className="text-[12px] font-bold tracking-[.06em] text-(--ink-tertiary) uppercase">
                  {group.name}
                </span>
                <span className="text-[13.5px] text-(--ink-tertiary) tabular-nums">
                  {count(group.items.length)}
                </span>
              </h3>
              <ul className="space-y-2">
                {group.items.map((addOn) => (
                  <AddOnRow
                    key={addOn.id}
                    addOn={addOn}
                    t={t}
                    locale={locale}
                    onEdit={() => openEditor(addOn)}
                    onDuplicate={() => void duplicate(addOn)}
                    onDelete={() => setDeleting(addOn)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <AddOnDialog
          key={editing.seq}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          addOn={editing.addOn}
          categories={cats ?? []}
          onSaved={(saved, before) => void offerToApply(saved, before)}
        />
      ) : null}

      {applying ? (
        <ApplyToUpcomingDialog
          addOn={applying.addOn}
          bookings={applying.bookings}
          onClose={() => setApplying(null)}
          t={t}
        />
      ) : null}

      <AddOnCategories
        open={managing}
        onOpenChange={setManaging}
        categories={cats ?? []}
        addOns={list ?? []}
        t={t}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteTitle").replace("{name}", deleting?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archive.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={archive.isPending}
              onClick={(e) => {
                // Held open until the write answers, so a refusal is seen.
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
