"use client";

import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUploadDocument } from "@/lib/api/merchant-application";
import {
  ACCEPTED_MIME,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  REQUIRED_DOCUMENT_TYPES,
  type DocumentType,
  type MerchantApplication,
  type MerchantApplicationDocument,
} from "@/lib/merchant-application/application";

// ============================================================================
// Step 4 — the evidence.
//
// ── WHAT HAPPENS TO THESE FILES IS SAID ON THE SCREEN ─────────────────────
//
// Yipyy holds them. That is a change from what the earlier connect flow told
// facilities, and it is stated here in plain words rather than left for
// somebody to infer: a private bucket, readable by the person who uploaded it
// and by the Yipyy administrator who submits the application, deleted once the
// merchant account is open.
//
// A screen that collects a passport scan while saying "we never see your
// documents" is worse than one that says nothing. The copy on the landing page
// and on the connect wizard was changed in the same release as this file.
//
// ── AND NOTHING CAN BE DELETED FROM HERE ──────────────────────────────────
//
// There is no delete route, so there is no delete button. A wrong file is
// answered by uploading the right one, and the screen says which is which by
// time. Rendering a bin icon that reported success and removed nothing is the
// exact failure this codebase has a gate for.
// ============================================================================

const ACCEPT_ATTR = ACCEPTED_MIME.join(",");

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepDocuments({
  application,
  onBack,
  onContinue,
}: {
  application: MerchantApplication;
  onBack: () => void;
  onContinue: () => void;
}) {
  const live = application.documents.filter((d) => !d.purgedAt);

  const forSlot = (docType: DocumentType, principalId: string | null) =>
    live.filter(
      (d) =>
        d.docType === docType &&
        (principalId === null || d.principalId === principalId),
    );

  const missing = REQUIRED_DOCUMENT_TYPES.filter(
    (t) => !live.some((d) => d.docType === t),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">Documents</h3>
        <p className="text-muted-foreground text-sm/relaxed">
          Photographs are fine as long as every corner and all the text are
          readable. PDF, PNG, JPEG or HEIC, up to{" "}
          {formatSize(MAX_DOCUMENT_BYTES)} each.
        </p>
      </header>

      <div className="flex items-start gap-2.5 rounded-lg border p-3.5 text-sm">
        <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">
            Where these go, plainly:
          </span>{" "}
          Yipyy stores them in private storage that only you and the Yipyy
          administrator handling your application can open, passes them to the
          provider who opens your merchant account, and deletes them once it is
          open. Nothing here is public and nothing is used for anything else.
        </p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_TYPES.filter((t) => t.value !== "other").map((docType) => {
          const required = REQUIRED_DOCUMENT_TYPES.includes(docType.value);

          if (docType.perPrincipal) {
            return (
              <section key={docType.value} className="rounded-xl border p-4">
                <SlotHeader
                  label={docType.label}
                  hint={docType.hint}
                  required={required}
                />
                {application.principals.length === 0 ? (
                  <p className="text-muted-foreground mt-3 text-sm">
                    Add an owner in step 2 first — a photo ID has to belong to
                    somebody.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {application.principals.map((principal) => (
                      <div
                        key={principal.id}
                        className="bg-muted/30 rounded-lg border p-3"
                      >
                        <p className="text-sm font-medium">
                          {principal.fullName}
                        </p>
                        <UploadedList
                          documents={forSlot(
                            docType.value,
                            principal.id ?? null,
                          )}
                        />
                        <UploadSlot
                          docType={docType.value}
                          principalId={principal.id}
                          label={`Upload ID for ${principal.fullName}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          return (
            <section key={docType.value} className="rounded-xl border p-4">
              <SlotHeader
                label={docType.label}
                hint={docType.hint}
                required={required}
              />
              <UploadedList documents={forSlot(docType.value, null)} />
              <UploadSlot docType={docType.value} label="Upload" />
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {missing.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {missing.length} still needed
            </p>
          )}
          <Button size="lg" onClick={onContinue} disabled={missing.length > 0}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SlotHeader({
  label,
  hint,
  required,
}: {
  label: string;
  hint: string;
  required: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{label}</p>
        {required ? (
          <Badge variant="outline" className="text-xs">
            Required
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            Only if asked
          </Badge>
        )}
      </div>
      {hint && <p className="text-muted-foreground text-sm/relaxed">{hint}</p>}
    </div>
  );
}

function UploadedList({
  documents,
}: {
  documents: MerchantApplicationDocument[];
}) {
  if (documents.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {documents.map((document, index) => (
        <li
          key={document.id}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <FileText className="text-muted-foreground size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{document.fileName}</span>
          <span className="text-muted-foreground text-xs">
            {formatSize(document.sizeBytes)}
          </span>
          {/* Newest last, and the last one is the one that counts. Said out
              loud because nothing here can be deleted. */}
          {index === documents.length - 1 && documents.length > 1 && (
            <span className="text-muted-foreground text-xs">
              — the most recent
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function UploadSlot({
  docType,
  principalId,
  label,
}: {
  docType: DocumentType;
  principalId?: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();

  function choose(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(
        `${file.name} is ${formatSize(file.size)}. The limit is ${formatSize(MAX_DOCUMENT_BYTES)}.`,
      );
      return;
    }
    upload.mutate(
      { file, docType, principalId },
      {
        onSuccess: () => toast.success(`${file.name} uploaded.`),
        onError: (error: Error) => toast.error(error.message),
        onSettled: () => {
          // Cleared so the same file can be chosen again after a failure —
          // a file input fires no change event for an identical value.
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  }

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {label}
      </Button>
    </div>
  );
}
