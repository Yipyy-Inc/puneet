"use client";

import { useState } from "react";
import { toast } from "sonner";

import { TagList } from "@/components/shared/TagList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDaycareDay,
  useDaycareVisitUpdate,
} from "@/lib/api/daycare-attendance";
import {
  usePetGroomingPreferences,
  useSavePetGroomingPreferences,
  type PetGroomingPreferences,
} from "@/lib/api/pet-grooming-preferences";

import { AddMedicationDialog } from "./add-medication-dialog";
import { LogActivityDialog } from "./journal/log-activity-dialog";
import { MoveKennelDialog } from "./move-kennel-dialog";
import type { BookingDetails } from "./use-booking-details";
import type { BookingHandlers } from "./use-booking-handlers";
import type { ServiceFacts } from "./use-service-facts";

// ============================================================================
// The booking page's own small dialogs — the ones its mock's buttons open
// that no other screen had: Move kennel, Change group, "+ Add" a medication,
// "+ Log activity", the groom preferences' Edit, and the tags.
// ============================================================================

export function DetailsSmallDialogs({
  d,
  facts,
  h,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  h: BookingHandlers;
}) {
  const booking = d.booking;
  if (!booking) return null;
  const close = (open: boolean) => {
    if (!open) h.setDialog(null);
  };
  const is = (name: typeof h.dialog) => h.dialog === name;

  return (
    <>
      {is("moveKennel") ? (
        <MoveKennelDialog
          open
          onOpenChange={close}
          bookingRef={booking.id}
          petName={d.petName}
          startDate={booking.startDate}
          endDate={booking.endDate}
        />
      ) : null}
      {is("changeGroup") ? (
        <ChangeGroupDialog d={d} facts={facts} onOpenChange={close} />
      ) : null}
      {is("addMedication") ? (
        <AddMedicationDialog d={d} open onOpenChange={close} />
      ) : null}
      {is("logActivity") ? (
        <LogActivityDialog
          d={d}
          day={h.dialogArg ?? d.logDay}
          open
          onOpenChange={close}
        />
      ) : null}
      {is("groomPrefs") && (d.pet || h.dialogArg) ? (
        <GroomPrefsDialog
          d={d}
          petRef={Number(h.dialogArg ?? d.pet?.id ?? 0)}
          onOpenChange={close}
        />
      ) : null}
      <Dialog open={is("tags")} onOpenChange={close}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{d.text.t("tagsTitle")}</DialogTitle>
          </DialogHeader>
          <TagList
            entityType="booking"
            entityId={booking.id}
            editable
            maxVisible={20}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Today's playgroup: one already in use on the floor, or a new one. */
function ChangeGroupDialog({
  d,
  facts,
  onOpenChange,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill } = d.text;
  const update = useDaycareVisitUpdate();
  const { data: day } = useDaycareDay(d.booking?.startDate);
  const current = facts.daycareVisit?.playGroup ?? "";
  const [group, setGroup] = useState(current);
  const inUse = [
    ...new Set(
      (day?.visits ?? [])
        .map((visit) => visit.playGroup)
        .filter((name): name is string => Boolean(name?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const bookingRef = d.booking?.id ?? 0;

  const save = async () => {
    try {
      await update.mutateAsync({
        bookingRef,
        playGroup: group.trim() || null,
      });
      toast.success(
        group.trim()
          ? fill("groupChanged", { pet: d.petName, group: group.trim() })
          : fill("groupCleared", { pet: d.petName }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(t("groupNotChanged"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fill("changeGroupTitle", { pet: d.petName })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="change-group">{t("playgroup")}</Label>
          <Input
            id="change-group"
            list="change-group-options"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            placeholder={t("groupPlaceholder")}
          />
          <datalist id="change-group-options">
            {inUse.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {inUse.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {inUse.map((name) => (
                <Button
                  key={name}
                  variant="quiet"
                  size="bd-34"
                  aria-pressed={group === name}
                  onClick={() => setGroup(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            {t("notNow")}
          </Button>
          <Button
            variant="bd-cta"
            onClick={() => void save()}
            disabled={update.isPending || group.trim() === current.trim()}
            data-loading={update.isPending || undefined}
          >
            {t("saveGroup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PREF_FIELDS = [
  { field: "cut", key: "prefCut" },
  { field: "face", key: "prefFace" },
  { field: "ears", key: "prefEars" },
  { field: "shampoo", key: "prefShampoo" },
] as const;

/** The pet's groom preferences — kept for every future groom too. */
function GroomPrefsDialog({
  d,
  petRef,
  onOpenChange,
}: {
  d: BookingDetails;
  petRef: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: stored, isPending } = usePetGroomingPreferences(petRef);
  if (isPending || !stored) return null;
  return (
    <GroomPrefsForm
      d={d}
      petRef={petRef}
      stored={stored}
      onOpenChange={onOpenChange}
    />
  );
}

function GroomPrefsForm({
  d,
  petRef,
  stored,
  onOpenChange,
}: {
  d: BookingDetails;
  petRef: number;
  stored: PetGroomingPreferences;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill } = d.text;
  const save = useSavePetGroomingPreferences(petRef);
  const [draft, setDraft] = useState({
    cut: stored.cut,
    face: stored.face,
    ears: stored.ears,
    shampoo: stored.shampoo,
    behavior: stored.behavior,
  });
  const petName = d.pets.find((pet) => pet.id === petRef)?.name ?? d.petName;

  const submit = async () => {
    try {
      await save.mutateAsync(draft);
      toast.success(fill("prefsSaved", { pet: petName }));
      onOpenChange(false);
    } catch (error) {
      toast.error(t("prefsNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fill("prefsTitle", { pet: petName })}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {PREF_FIELDS.map(({ field, key }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <Label htmlFor={`pref-${field}`}>{t(key)}</Label>
              <Input
                id={`pref-${field}`}
                value={draft[field]}
                maxLength={200}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [field]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-behavior">{t("prefBehavior")}</Label>
          <Textarea
            id="pref-behavior"
            rows={3}
            maxLength={500}
            value={draft.behavior}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, behavior: event.target.value }))
            }
          />
        </div>
        <p className="text-ink-tertiary text-[13px]">{t("prefsEveryGroom")}</p>
        <DialogFooter>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            {t("notNow")}
          </Button>
          <Button
            variant="bd-cta"
            onClick={() => void submit()}
            disabled={save.isPending}
            data-loading={save.isPending || undefined}
          >
            {t("prefsSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
