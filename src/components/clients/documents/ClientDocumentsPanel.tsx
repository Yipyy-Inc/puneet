"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileText,
  MoreHorizontal,
  PenLine,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-facility-rbac";
import {
  useClientDocumentMutations,
  useClientDocuments,
} from "@/lib/api/client-documents";
import { waiverQueries } from "@/lib/api/waivers";
import { formatDateLong, formatNumber } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { localToday } from "@/lib/vaccinations";
import type { WaiverSignatureStatus } from "@/lib/api/mappers/waiver";
import type { AppLocale } from "@/lib/language-settings";
import type { Pet } from "@/types/pet";
import { FileDocumentDialog } from "./FileDocumentDialog";

// ============================================================================
// Everything on file for one client: the files staff filed, and the waivers
// the client signed.
//
// Both halves are real. The files are `client_documents` rows with their
// bytes in the private bucket; the agreements are `waiver_signatures`, which
// already held every signature and were simply not shown here. This replaced
// the `clientDocuments` fixture, whose Upload, Download and Open buttons had
// no handlers and whose files did not exist.
// ============================================================================

function fileSize(bytes: number, locale: AppLocale, t: (k: string) => string) {
  if (bytes < 1024 * 1024) {
    return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), locale)} ${t("unitKB")}`;
  }
  return `${formatNumber(bytes / (1024 * 1024), locale, 1)} ${t("unitMB")}`;
}

function SignatureChip({ status }: { status: WaiverSignatureStatus }) {
  const { t } = useStaffText("clientDocuments");
  if (status === "valid") {
    return (
      <Badge variant="confirmed">
        <CircleCheck aria-hidden />
        {t("signatureValid")}
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="overdue">
        <CircleAlert aria-hidden />
        {t("signatureExpired")}
      </Badge>
    );
  }
  return (
    <Badge variant="cancelled">
      <CircleX aria-hidden />
      {t("signatureRevoked")}
    </Badge>
  );
}

export function ClientDocumentsPanel({
  clientRef,
  clientName,
  pets,
}: {
  clientRef: number;
  clientName: string;
  pets: Pet[];
}) {
  const { t, fill, locale } = useStaffText("clientDocuments");
  const canFile = usePermission("edit_clients");
  const { documents, pending } = useClientDocuments(clientRef);
  const { remove, openDocument } = useClientDocumentMutations(clientRef);
  const { data: signatures } = useQuery(
    waiverQueries.signaturesForClient(clientRef),
  );
  const [filing, setFiling] = useState(false);
  const [today] = useState(localToday);

  const open = async (id: string) => {
    // A new tab opened synchronously, filled once the fresh link arrives —
    // a popup opened after an await is blocked by every browser.
    // Not "noopener" in the features: with it, window.open returns null and
    // the tab cannot be pointed anywhere. The opener is cut by hand instead.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    const url = await openDocument(id).catch(() => null);
    if (url && tab) {
      tab.location.href = url;
    } else {
      tab?.close();
      toast.error(t("openFailed"));
    }
  };

  const drop = async (id: string, name: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(fill("removedToast", { name }));
    } catch (error) {
      toast.error(t("removeFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const agreements = signatures ?? [];
  const nothing = !pending && documents.length === 0 && agreements.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {canFile && (
            <Button variant="outline" size="sm" onClick={() => setFiling(true)}>
              <Upload className="size-4" aria-hidden />
              {t("fileButton")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {pending && <Skeleton className="h-16 w-full rounded-2xl" />}

        {nothing && (
          <p className="text-ink-tertiary py-6 text-center text-sm">
            {fill("empty", { client: clientName })}
          </p>
        )}

        {documents.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-ink-tertiary text-xs font-bold tracking-wider uppercase">
              {t("filesHeading")}
            </h3>
            <ul className="space-y-2">
              {documents.map((doc) => {
                const expired = Boolean(
                  doc.expiresOn && doc.expiresOn.slice(0, 10) < today,
                );
                return (
                  <li
                    key={doc.id}
                    className="flex min-h-12 items-start gap-3 rounded-2xl border p-3"
                  >
                    <FileText
                      className="text-ink-tertiary mt-0.5 size-5 shrink-0"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {doc.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{t(`type_${doc.type}`)}</Badge>
                        {doc.petName && (
                          <span className="text-ink-secondary text-sm">
                            {doc.petName}
                          </span>
                        )}
                        {doc.expiresOn && (
                          <Badge variant={expired ? "overdue" : "outline"}>
                            {expired && <CircleAlert aria-hidden />}
                            {fill(expired ? "expiredOn" : "expiresOn", {
                              date: formatDateLong(doc.expiresOn, locale),
                            })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
                        {formatDateLong(doc.uploadedAt, locale)}
                        {" · "}
                        {fileSize(doc.sizeBytes, locale, t)}
                        {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
                      </p>
                      {doc.notes && (
                        <p className="text-ink-secondary mt-1 text-sm">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => open(doc.id)}
                        aria-label={fill("openLabel", { name: doc.name })}
                      >
                        <ExternalLink className="size-4" aria-hidden />
                        <span className="max-sm:sr-only">{t("open")}</span>
                      </Button>
                      {canFile && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={remove.isPending}
                              aria-label={fill("moreFor", { name: doc.name })}
                            >
                              <MoreHorizontal className="size-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => drop(doc.id, doc.name)}
                            >
                              <Trash2 className="size-4" />
                              {fill("removeLabel", { name: doc.name })}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {agreements.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-ink-tertiary text-xs font-bold tracking-wider uppercase">
              {t("agreementsHeading")}
            </h3>
            <ul className="space-y-2">
              {agreements.map((sig) => (
                <li
                  key={sig.id}
                  className="flex min-h-12 items-start gap-3 rounded-2xl border p-3"
                >
                  <PenLine
                    className="text-ink-tertiary mt-0.5 size-5 shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{sig.waiverName}</p>
                      <SignatureChip status={sig.status} />
                    </div>
                    <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
                      {fill("signedBy", {
                        name: sig.signatureName,
                        date: formatDateLong(sig.signedAt, locale),
                      })}
                      {sig.waiverVersion
                        ? ` · ${fill("version", { v: sig.waiverVersion })}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>

      {filing && (
        <FileDocumentDialog
          open
          onOpenChange={setFiling}
          clientRef={clientRef}
          clientName={clientName}
          pets={pets}
        />
      )}
    </Card>
  );
}
