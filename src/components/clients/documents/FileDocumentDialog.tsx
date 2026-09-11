"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientDocumentMutations } from "@/lib/api/client-documents";
import {
  CLIENT_DOCUMENT_TYPES,
  type ClientDocumentType,
} from "@/lib/api/mappers/client-document";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Pet } from "@/types/pet";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.heic,application/pdf,image/png,image/jpeg,image/heic";
const MAX_BYTES = 10 * 1024 * 1024;
const NO_PET = "none";

/**
 * File a document on a client's record. The server sniffs the bytes and
 * refuses anything but PDF, PNG, JPEG or HEIC; the size is checked here too
 * so a 40 MB scan is refused before it is sent rather than after.
 */
export function FileDocumentDialog({
  open,
  onOpenChange,
  clientRef,
  clientName,
  pets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRef: number;
  clientName: string;
  pets: Pet[];
}) {
  const { t, fill } = useStaffText("clientDocuments");
  const { upload } = useClientDocumentMutations(clientRef);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<ClientDocumentType>("agreement");
  const [petRef, setPetRef] = useState(NO_PET);
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");

  const tooBig = Boolean(file && file.size > MAX_BYTES);
  const canSave = Boolean(file) && !tooBig && !upload.isPending;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !canSave) return;
    try {
      await upload.mutateAsync({
        file,
        type,
        petRef: petRef === NO_PET ? undefined : Number(petRef),
        notes: notes.trim() || undefined,
        expiresOn: expiresOn || undefined,
      });
      toast.success(
        fill("filedToast", { name: file.name, client: clientName }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(t("fileFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fill("fileTitle", { client: clientName })}</DialogTitle>
          <DialogDescription>{t("fileDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-file">{t("fileLabel")}</Label>
            <input
              ref={inputRef}
              id="doc-file"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-4" aria-hidden />
              <span className="truncate">
                {file ? file.name : t("chooseFile")}
              </span>
            </Button>
            <p
              className={
                tooBig
                  ? "text-destructive text-sm"
                  : "text-ink-tertiary text-sm"
              }
              role={tooBig ? "alert" : undefined}
            >
              {tooBig ? t("tooBig") : t("fileHelp")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="doc-type">{t("typeLabel")}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ClientDocumentType)}
              >
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_DOCUMENT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`type_${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="doc-pet">{t("petLabel")}</Label>
              <Select value={petRef} onValueChange={setPetRef}>
                <SelectTrigger id="doc-pet">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PET}>{t("noPet")}</SelectItem>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={String(pet.id)}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-expires">{t("expiresLabel")}</Label>
            <DatePicker
              id="doc-expires"
              value={expiresOn}
              onValueChange={setExpiresOn}
              placeholder={t("noExpiry")}
              displayMode="dialog"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-notes">{t("notesLabel")}</Label>
            <Textarea
              id="doc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={upload.isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {upload.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("fileButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
