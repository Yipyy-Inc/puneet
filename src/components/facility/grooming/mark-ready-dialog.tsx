"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardEdit,
  DollarSign,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { GroomingAppointment } from "@/types/grooming";

export interface MarkReadyFinalCharge {
  /** Stable client id so list ops stay predictable. */
  id: string;
  label: string;
  amount: number;
}

export interface MarkReadyConfirmation {
  /** 1–3 post-groom photos. URLs in the prototype, hosted URLs after upload. */
  afterPhotos: string[];
  /** Groomer's session notes — drives the Report Card body + pet profile. */
  sessionNotes: string;
  /** Charges added during the groom (matting, extra time, etc.). */
  finalCharges: MarkReadyFinalCharge[];
}

interface MarkReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apt: GroomingAppointment | null;
  /** Default tax rate applied to the final-total preview. */
  taxRate?: number;
  facilityName?: string;
  onConfirm: (result: MarkReadyConfirmation) => void;
}

const MAX_AFTER_PHOTOS = 3;

export function MarkReadyDialog({
  open,
  onOpenChange,
  apt,
  taxRate = 0,
  facilityName,
  onConfirm,
}: MarkReadyDialogProps) {
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [finalCharges, setFinalCharges] = useState<MarkReadyFinalCharge[]>([]);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // Revoke any blob URLs from the previous run so they don't leak.
      setAfterPhotos((prev) => {
        for (const url of prev) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        }
        return [];
      });
      return;
    }
    setAfterPhotos([]);
    setSessionNotes("");
    setFinalCharges([]);
    setDraftLabel("");
    setDraftAmount("");
  }, [open, apt?.id]);

  if (!apt) return null;

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAfterPhotos((prev) => {
      const next = [...prev];
      for (let i = 0; i < files.length && next.length < MAX_AFTER_PHOTOS; i++) {
        next.push(URL.createObjectURL(files[i]));
      }
      return next;
    });
  }

  function handlePhotoRemove(index: number) {
    setAfterPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed && removed.startsWith("blob:")) URL.revokeObjectURL(removed);
      return next;
    });
  }

  function addCharge() {
    const amount = Number(draftAmount);
    if (!draftLabel.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setFinalCharges((prev) => [
      ...prev,
      {
        id: `charge-${Date.now()}-${prev.length}`,
        label: draftLabel.trim(),
        amount: Math.round(amount * 100) / 100,
      },
    ]);
    setDraftLabel("");
    setDraftAmount("");
  }

  function removeCharge(id: string) {
    setFinalCharges((prev) => prev.filter((c) => c.id !== id));
  }

  // Itemized total preview — base service + booked add-ons (from
  // priceAdjustments already on the appointment) + new final charges + tax.
  const baseService = apt.basePrice;
  const existingAdjustments = apt.priceAdjustments.reduce(
    (sum, a) => sum + a.amount,
    0,
  );
  const finalChargesTotal = finalCharges.reduce((s, c) => s + c.amount, 0);
  const preTaxSubtotal = baseService + existingAdjustments + finalChargesTotal;
  const taxAmount = preTaxSubtotal * taxRate;
  const grandTotal = preTaxSubtotal + taxAmount;

  const canConfirm = afterPhotos.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-600" />
            Mark Ready — {apt.petName}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            Snap an after photo, jot the session notes, add any late charges,
            then notify the owner.
          </p>
        </DialogHeader>

        {/* 1 · Post-groom photo */}
        <Section
          step={1}
          icon={Camera}
          title="Post-groom photo"
          subtitle="Snap 1–3 shots of the finished coat. These pair with the pre-groom photos in the report card."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePhotoSelect(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: MAX_AFTER_PHOTOS }).map((_, i) => {
              const url = afterPhotos[i];
              if (url) {
                return (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`After-groom photo ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(i)}
                      title="Remove this photo"
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/60"
                >
                  <Camera className="size-5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {afterPhotos.length === 0 ? "Take photo" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {afterPhotos.length}/{MAX_AFTER_PHOTOS} photos · at least one
            required before notifying the owner.
          </p>
        </Section>

        <Separator />

        {/* 2 · Grooming notes */}
        <Section
          step={2}
          icon={ClipboardEdit}
          title="Grooming notes"
          subtitle="What you did, anything you noticed, recommendations for next visit."
        >
          <Textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="e.g. Heavy matting on hindquarters — recommended more frequent brushing. Ears cleaned, nails trimmed. Coat condition much improved after treatment."
            rows={4}
            className="text-sm"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            These notes attach to the Report Card and the pet&rsquo;s profile.
          </p>
        </Section>

        <Separator />

        {/* 3 · Final charges */}
        <Section
          step={3}
          icon={DollarSign}
          title="Final charges"
          subtitle="Anything that came up during the groom — matting, extra time, special treatment. Owner sees these in the pickup SMS."
        >
          {finalCharges.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {finalCharges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.label}</p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    +${c.amount.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCharge(c.id)}
                    title="Remove this charge"
                    className="text-destructive/70 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-7">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Reason
              </Label>
              <Input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="e.g. Dematting (additional 20 min)"
                className="mt-0.5 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCharge();
                }}
              />
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                placeholder="0.00"
                className="mt-0.5 h-8 text-sm tabular-nums"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCharge();
                }}
              />
            </div>
            <div className="col-span-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCharge}
                disabled={
                  !draftLabel.trim() ||
                  !Number.isFinite(Number(draftAmount)) ||
                  Number(draftAmount) <= 0
                }
                className="h-8 w-full"
              >
                <Plus className="mr-1 size-3.5" />
                Add
              </Button>
            </div>
          </div>
        </Section>

        <Separator />

        {/* 4 · Itemized total */}
        <Section
          step={4}
          icon={Receipt}
          title="Confirm the total"
          subtitle="What the owner will see in the pickup SMS."
        >
          <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
            <Row label={apt.packageName} value={baseService} />
            {apt.priceAdjustments.map((a) => (
              <Row
                key={a.id}
                label={a.description}
                value={a.amount}
                muted
              />
            ))}
            {finalCharges.map((c) => (
              <Row
                key={c.id}
                label={`${c.label} (added now)`}
                value={c.amount}
                accent
              />
            ))}
            {taxRate > 0 && (
              <>
                <Separator className="my-1.5" />
                <Row label="Subtotal" value={preTaxSubtotal} muted />
                <Row
                  label={`Tax (${(taxRate * 100).toFixed(2)}%)`}
                  value={taxAmount}
                  muted
                />
              </>
            )}
            <Separator className="my-1.5" />
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-emerald-700 tabular-nums dark:text-emerald-400">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canConfirm}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              onConfirm({
                afterPhotos,
                sessionNotes: sessionNotes.trim(),
                finalCharges,
              });
            }}
            title={
              !canConfirm
                ? "Take at least one post-groom photo before notifying the owner."
                : undefined
            }
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            Notify Owner — Ready for Pickup
            {facilityName ? ` · ${facilityName}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  step,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
          {step}
        </span>
        <Icon className="text-muted-foreground size-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {subtitle && (
        <p className="text-muted-foreground mb-2 ml-8 text-xs">{subtitle}</p>
      )}
      <div className="ml-8">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: number;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        muted && "text-muted-foreground text-xs",
        accent && "text-emerald-700 dark:text-emerald-300",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="tabular-nums">${value.toFixed(2)}</span>
    </div>
  );
}
