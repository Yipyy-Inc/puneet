"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, X, Image as ImageIcon, Wrench } from "lucide-react";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  ScheduledTask,
  TaskExecution,
  CleaningType,
  CleaningDetail,
} from "@/types/care-log";

const CLEANING_TYPES: { value: CleaningType; label: string; hint: string }[] = [
  { value: "full", label: "Full clean", hint: "Strip, disinfect, re-bed" },
  { value: "quick", label: "Quick tidy", hint: "Surface wipe & refresh" },
  { value: "spot", label: "Spot clean", hint: "Targeted mess only" },
];

// Suggested products — free text is still allowed via the datalist. Swap this
// for a facility-configured list when settings grow one.
const PRODUCT_SUGGESTIONS = [
  "Rescue disinfectant",
  "Accel / AHP wipes",
  "Kennel-safe deodorizer",
  "Enzyme cleaner",
  "Bleach solution (1:32)",
];

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** When present, the modal opens pre-filled to edit this existing log. */
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    outcome: string;
    notes?: string;
    staffName: string;
    staffInitials: string;
    /** Override log time as "HH:MM"; omitted means stamp the current time. */
    executedAt?: string;
    photoUrls?: string[];
    cleaning?: CleaningDetail;
  }) => void;
};

/**
 * Dedicated Kennel Cleaning log modal — no booking data needed. Captures the
 * cleaning type, products used, and an optional maintenance path ("Any damage
 * or issues noticed" → a Kennel condition note), plus the shared Logged-by /
 * timestamp / photo pieces. The outcome is always "completed"; the damage note,
 * when filled, builds the maintenance log via TaskExecution.cleaning.
 */
export function KennelCleanLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const [cleaningType, setCleaningType] = useState<CleaningType>("full");
  const [products, setProducts] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");
  // Maintenance path — off until damage/issues are noticed.
  const [damageNoticed, setDamageNoticed] = useState(false);
  const [conditionNote, setConditionNote] = useState("");

  // On open: seed from the existing execution when editing, otherwise clear.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    // Capturing the wall clock at open time is a legitimate on-open reset, not
    // a cascading-render smell — the modal stays mounted between opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    if (existing) {
      setNotes(existing.notes ?? "");
      setPhotos(
        existing.photoUrls ?? (existing.photoUrl ? [existing.photoUrl] : []),
      );
      setLogTime(existing.executedAt);
      const c = existing.cleaning;
      setCleaningType(c?.type ?? "full");
      setProducts(c?.products ?? "");
      setDamageNoticed(Boolean(c?.conditionNote));
      setConditionNote(c?.conditionNote ?? "");
    } else {
      setCleaningType("full");
      setProducts("");
      setNotes("");
      setPhotos([]);
      setLogTime("");
      setDamageNoticed(false);
      setConditionNote("");
    }
  }, [open, task?.id, existing]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const requiresPhoto = task.requiresPhotoProof === true;
  const MAX_PHOTOS = 3;

  const addPhoto = () => {
    // TODO: open the real camera / library picker; mock URL for now.
    setPhotos((prev) =>
      prev.length >= MAX_PHOTOS
        ? prev
        : [...prev, `mock://photo-${prev.length + 1}`],
    );
  };
  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  // If damage is flagged, the condition note must describe it (maintenance log).
  const conditionOk = !damageNoticed || conditionNote.trim().length > 0;
  const canSubmit = (!requiresPhoto || photos.length > 0) && conditionOk;

  function handleSubmit() {
    const cleaning: CleaningDetail = {
      type: cleaningType,
      products: products.trim() || undefined,
      conditionNote:
        damageNoticed && conditionNote.trim()
          ? conditionNote.trim()
          : undefined,
    };
    onSubmit({
      outcome: "completed",
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
      cleaning,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
            >
              <Icon className={`size-5 ${meta.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">
                {existing ? "Edit" : "Log"} kennel cleaning
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.kennelName} · {task.petName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cleaning type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {CLEANING_TYPES.map((ct) => {
                const selected = cleaningType === ct.value;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setCleaningType(ct.value)}
                    data-selected={selected}
                    className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 data-[selected=false]:text-muted-foreground rounded-md border p-2 text-center transition-all data-[selected=true]:ring-1"
                  >
                    <span className="block text-xs font-medium">
                      {ct.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-[10px]">
                      {ct.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clean-products" className="text-xs">
              Products used{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="clean-products"
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              list="kennel-clean-products"
              placeholder="Type or pick a product..."
            />
            <datalist id="kennel-clean-products">
              {PRODUCT_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* Maintenance path — reveals the kennel condition note. */}
          <div className="space-y-3 rounded-md border p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={damageNoticed}
                onCheckedChange={(v) => setDamageNoticed(v === true)}
                className="mt-0.5"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Wrench className="size-4 text-amber-500" />
                Any damage or issues noticed
              </span>
            </label>

            {damageNoticed && (
              <div className="space-y-1.5 pl-6">
                <Label htmlFor="condition-note" className="text-xs">
                  Kennel condition
                </Label>
                <Textarea
                  id="condition-note"
                  value={conditionNote}
                  onChange={(e) => setConditionNote(e.target.value)}
                  rows={2}
                  placeholder="Soiling type, broken hardware, items left behind..."
                  className="resize-none"
                  aria-invalid={damageNoticed && !conditionOk}
                />
                <p className="text-muted-foreground text-[11px]">
                  Added to the maintenance log for this kennel.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Photos{" "}
              <span className="text-muted-foreground font-normal">
                {requiresPhoto ? "(required)" : "(optional)"}
              </span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="bg-muted relative flex size-12 items-center justify-center rounded-md border"
                >
                  <ImageIcon className="text-muted-foreground size-5" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="bg-destructive absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-white"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhoto}
                  className="h-12 gap-1.5"
                >
                  <Camera className="size-4" />
                  Add photo
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              {photos.length}/{MAX_PHOTOS} · camera or library
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clean-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="clean-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything worth recording..."
              className="resize-none"
            />
          </div>

          <LogMeta nowValue={nowValue} value={logTime} onChange={setLogTime} />

          <p className="text-muted-foreground text-xs">
            Logged by:{" "}
            <span className="text-foreground font-medium">{user.name}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {existing ? "Update log" : "Save log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
