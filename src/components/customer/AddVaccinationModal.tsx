"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Upload,
  Loader2,
  X,
  Syringe,
  FileImage,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { vaccinationRules } from "@/data/settings";
import type { VaccinationRecord } from "@/data/pet-data";

interface VaccineEntryInput {
  name: string;
  expiryDate: string;
}

interface ProofFileEntry {
  file: File;
  preview: string;
}

interface AddVaccinationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: number;
  petName: string;
  petSpecies: string;
  initialStatus?: "pending_review" | "approved";
  submitLabel?: string;
  onSave: (
    vaccinations: Array<Omit<VaccinationRecord, "id">>,
  ) => Promise<void>;
}

const PROOF_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
];
const PROOF_MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddVaccinationModal({
  open,
  onOpenChange,
  petId,
  petName,
  petSpecies,
  initialStatus = "pending_review",
  submitLabel = "Upload for Review",
  onSave,
}: AddVaccinationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [vaccines, setVaccines] = useState<VaccineEntryInput[]>([]);
  const [proofs, setProofs] = useState<ProofFileEntry[]>([]);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const required = vaccinationRules
      .filter((r) => r.species.toLowerCase() === petSpecies.toLowerCase())
      .map((r) => ({ name: r.vaccineName, expiryDate: "" }));
    setVaccines(required);
    setProofs([]);
    setNotes("");
  }, [open, petSpecies]);

  const updateExpiry = (i: number, next: string) => {
    setVaccines((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, expiryDate: next } : v)),
    );
  };

  const handleProofUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (!PROOF_ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Please upload a PDF or image file`);
        continue;
      }
      if (file.size > PROOF_MAX_SIZE) {
        toast.error(`${file.name}: File size must be less than 10MB`);
        continue;
      }
      valid.push(file);
    }

    valid.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = (e.target?.result as string) ?? "";
          setProofs((prev) => [...prev, { file, preview }]);
        };
        reader.readAsDataURL(file);
      } else {
        setProofs((prev) => [...prev, { file, preview: "" }]);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeProof = (i: number) => {
    setProofs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const uploadFile = async (file: File): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filled = vaccines.filter((v) => v.expiryDate.trim());
    if (filled.length === 0) {
      toast.error("Enter an expiry date for at least one vaccine");
      return;
    }

    setIsSaving(true);
    try {
      const documentUrls = await Promise.all(
        proofs.map((p) => uploadFile(p.file)),
      );
      const primaryDocumentUrl = documentUrls[0];

      const records: Array<Omit<VaccinationRecord, "id">> = filled.map(
        (v) => ({
          petId,
          vaccineName: v.name,
          administeredDate: "",
          expiryDate: v.expiryDate,
          documentUrl: primaryDocumentUrl,
          notes: notes || undefined,
          status: initialStatus,
        }),
      );

      await onSave(records);
      toast.success(
        `${records.length} vaccination record${records.length === 1 ? "" : "s"} uploaded!`,
      );
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload vaccination records";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Vaccination Records</DialogTitle>
          <DialogDescription>
            Enter expiry dates for {petName}&apos;s required vaccines and
            upload proof. The facility will review and approve each record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {vaccines.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              The facility has not configured any required vaccines for{" "}
              {petSpecies.toLowerCase()}s.
            </p>
          ) : (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Vaccine expiry dates
              </Label>
              {vaccines.map((v, i) => (
                <div
                  key={`${v.name}-${i}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex items-center gap-2">
                    <Syringe className="text-muted-foreground size-3.5" />
                    <p className="text-sm font-medium">{v.name}</p>
                  </div>
                  <DatePicker
                    value={v.expiryDate}
                    onValueChange={(next) => updateExpiry(i, next)}
                    displayMode="dialog"
                    popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                    calendarClassName="p-1"
                    showQuickPresets={false}
                    showManualInput={false}
                    placeholder="Expiry date"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <Label className="text-muted-foreground mb-1.5 block text-xs">
              Proof of Vaccination
            </Label>
            <p className="text-muted-foreground mb-2 text-[11px]">
              Upload one or more pages covering all vaccines above. JPG, PNG,
              or PDF — max 10MB per file.
            </p>

            <label
              className={cn(
                "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                className="hidden"
                onChange={(e) => handleProofUpload(e.target.files)}
              />
              <div className="flex flex-col items-center gap-1.5">
                <div className="bg-muted rounded-full p-2">
                  <Upload className="text-muted-foreground size-4" />
                </div>
                <p className="text-xs font-medium">
                  {proofs.length === 0
                    ? "Upload vaccine proof"
                    : "Add more pages"}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Select multiple files for multi-page documents
                </p>
              </div>
            </label>

            {proofs.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {proofs.map((p, i) => (
                  <div
                    key={`${p.file.name}-${i}`}
                    className="bg-muted/30 rounded-lg border p-2"
                  >
                    {p.preview ? (
                      <div className="relative mb-1.5 overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.preview}
                          alt={p.file.name}
                          className="h-20 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted mb-1.5 flex h-20 items-center justify-center rounded-md">
                        <FileImage className="text-muted-foreground size-8 opacity-50" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">
                          {p.file.name}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {formatFileSize(p.file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-5 w-5 shrink-0 p-0"
                        onClick={() => removeProof(i)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="col-span-full flex items-center gap-1.5">
                  <Check className="size-3 text-emerald-600" />
                  <p className="text-muted-foreground text-[11px]">
                    {proofs.length} file{proofs.length === 1 ? "" : "s"}{" "}
                    ready — pending staff verification
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about these vaccinations"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || vaccines.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { VaccineEntryInput, ProofFileEntry };
