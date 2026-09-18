"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Backpack,
  CheckCircle2,
  Plus,
  Camera,
  AlertTriangle,
  PackageCheck,
  Expand,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BelongingEntry } from "@/types/booking";
import { formatDateShort, formatTime } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// What the pet came in with, and whether it went home.
//
// Translated as it was touched. The booking page always saves the list
// (`onSave`), so the branches that kept an item or a photo in this
// component's state alone are gone; a returned item reads in a quieter ink
// rather than at half opacity, which rewrote every contrast ratio in the row
// (§6 rule 4); and a saved item now says WHEN it was checked in and handed
// back — it said so only beside a name, which a saved list never records.
//
// Photos are shown and can be removed, but not added: an image read as a data
// URL would be stored in the booking's JSON and sent with every booking list.
// They wait for file storage (debt map, 2026-09-12).
// ============================================================================

interface BelongingsSectionProps {
  entries: BelongingEntry[];
  isCompleted?: boolean;
  required?: boolean;
  /** Saves the list on the booking; a refusal puts the screen back. */
  onSave: (entries: BelongingEntry[]) => Promise<void>;
}

export function BelongingsSection({
  entries,
  isCompleted,
  required,
  onSave,
}: BelongingsSectionProps) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const [items, setItems] = useState(entries);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "" });

  const stamp = (ts: string) =>
    fill("stampAt", {
      date: formatDateShort(ts, locale),
      time: formatTime(ts, locale),
    });

  /** Show the change, write it, and put it back if the write is refused. */
  const commit = async (next: BelongingEntry[], done?: string) => {
    const before = items;
    setItems(next);
    setSaving(true);
    try {
      await onSave(next);
      if (done) toast.success(done);
      return true;
    } catch (error) {
      setItems(before);
      toast.error(t("belongingsNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.length;
  const returnedCount = items.filter((i) => i.returned).length;
  const unreturnedCount = totalItems - returnedCount;

  const handleReturn = (id: string, checked: boolean) => {
    void commit(
      items.map((e) =>
        e.id === id
          ? {
              ...e,
              returned: checked,
              returnedAt: checked ? new Date().toISOString() : undefined,
              returnedBy: undefined,
            }
          : e,
      ),
      checked ? t("belongingsReturnedToast") : undefined,
    );
  };

  const handleReturnAll = () => {
    const now = new Date().toISOString();
    void commit(
      items.map((e) =>
        e.returned ? e : { ...e, returned: true, returnedAt: now },
      ),
      fill("belongingsAllReturnedToast", { n: unreturnedCount }),
    );
  };

  const handleAdd = () => {
    if (!newItem.name.trim()) {
      toast.error(t("belongingsNameRequired"));
      return;
    }
    void commit(
      [
        ...items,
        {
          id: `bel-${crypto.randomUUID()}`,
          name: newItem.name.trim(),
          description: newItem.description.trim() || undefined,
          condition: "Good",
          checkedInAt: new Date().toISOString(),
          returned: false,
        },
      ],
      t("belongingsAddedToast"),
    ).then((saved) => {
      if (!saved) return;
      setNewItem({ name: "", description: "" });
      setAddOpen(false);
    });
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-ink-tertiary flex flex-wrap items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
              <Backpack className="size-4" />
              {t("belongingsTitle")}
              {required && (
                <Badge variant="destructive" className="normal-case">
                  {t("taskRequired")}
                </Badge>
              )}
              {totalItems > 0 && (
                <span className="text-ink-secondary font-normal tracking-normal normal-case">
                  {fill("belongingsReturnedOf", {
                    returned: returnedCount,
                    total: totalItems,
                  })}
                </span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {unreturnedCount > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReturnAll}
                  disabled={saving}
                >
                  <PackageCheck className="size-4" />
                  {t("belongingsReturnAll")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(!addOpen)}
              >
                <Plus className="size-4" />
                {t("belongingsAdd")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Unreturned items — on completed bookings */}
          {isCompleted && unreturnedCount > 0 && (
            <div className="border-warning mt-4 flex items-start gap-2.5 rounded-2xl border px-3.5 py-3">
              <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-body-ink text-sm font-semibold">
                  {fill(
                    unreturnedCount === 1
                      ? "belongingsNotReturnedOne"
                      : "belongingsNotReturnedMany",
                    { n: unreturnedCount },
                  )}
                </p>
                <p className="text-ink-secondary mt-0.5 text-sm">
                  {t("belongingsNotReturnedBody")}
                </p>
              </div>
            </div>
          )}

          {/* Inline add form */}
          <Collapsible open={addOpen} onOpenChange={setAddOpen}>
            <CollapsibleContent>
              <div className="border-line space-y-3 border-b py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="belonging-name" className="text-xs">
                      {t("belongingsName")}
                    </Label>
                    <Input
                      id="belonging-name"
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder={t("belongingsNamePlaceholder")}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="belonging-description" className="text-xs">
                      {t("belongingsDescription")}
                    </Label>
                    <Input
                      id="belonging-description"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder={t("belongingsDescriptionPlaceholder")}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddOpen(false)}
                  >
                    {t("notNow")}
                  </Button>
                  <Button size="sm" onClick={handleAdd} loading={saving}>
                    {t("belongingsAddConfirm")}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="py-6 text-center">
              <Backpack className="text-ink-disabled mx-auto size-6" />
              <p className="text-ink-secondary mt-2 text-sm">
                {t("belongingsNone")}
              </p>
            </div>
          ) : (
            <div className="divide-line divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-4 first:pt-4"
                >
                  {/* Photo, when an item has one */}
                  {item.photoUrl ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("belongingsPhoto")}
                          className="relative shrink-0 overflow-hidden rounded-2xl"
                        >
                          <img
                            src={item.photoUrl}
                            alt=""
                            className="size-16 object-cover"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto p-1.5"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => setLightboxUrl(item.photoUrl!)}
                          >
                            <Expand className="size-4" />
                            {t("belongingsViewPhoto")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive justify-start"
                            onClick={() =>
                              void commit(
                                items.map((b) =>
                                  b.id === item.id
                                    ? { ...b, photoUrl: undefined }
                                    : b,
                                ),
                                t("belongingsPhotoRemoved"),
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                            {t("belongingsRemovePhoto")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="border-line flex size-16 shrink-0 items-center justify-center rounded-2xl border">
                      <Camera className="text-ink-disabled size-5" />
                    </div>
                  )}

                  {/* Details — a returned item in a quieter ink, not at half
                      opacity (§6 rule 4). */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        item.returned
                          ? "text-ink-tertiary line-through"
                          : "text-body-ink",
                      )}
                    >
                      {item.name}
                    </span>
                    {item.description && (
                      <p className="text-ink-secondary mt-0.5 text-xs">
                        {item.description}
                      </p>
                    )}
                    {item.checkedInAt && (
                      <p className="text-ink-tertiary mt-0.5 text-xs">
                        {item.checkedInBy
                          ? fill("belongingsInBy", {
                              name: item.checkedInBy,
                              at: stamp(item.checkedInAt),
                            })
                          : fill("belongingsInAt", {
                              at: stamp(item.checkedInAt),
                            })}
                      </p>
                    )}
                    {item.returned && item.returnedAt && (
                      <p className="text-success mt-0.5 flex items-center gap-1 text-xs">
                        <CheckCircle2 className="size-4" />
                        {item.returnedBy
                          ? fill("belongingsOutBy", {
                              name: item.returnedBy,
                              at: stamp(item.returnedAt),
                            })
                          : fill("belongingsOutAt", {
                              at: stamp(item.returnedAt),
                            })}
                      </p>
                    )}
                  </div>

                  {/* Return checkbox */}
                  <div className="flex min-h-10 shrink-0 items-center gap-2">
                    <Checkbox
                      id={`return-${item.id}`}
                      checked={item.returned}
                      disabled={saving}
                      onCheckedChange={(c) => handleReturn(item.id, c === true)}
                    />
                    <label
                      htmlFor={`return-${item.id}`}
                      className="text-ink-secondary cursor-pointer text-sm"
                    >
                      {t("belongingsReturned")}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent
          className="max-w-lg p-2"
          showCloseButton
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{t("belongingsPhoto")}</DialogTitle>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt=""
              className="w-full rounded-2xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
