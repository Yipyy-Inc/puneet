"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  Download,
  Eye,
  FileText,
  Lock,
  MoreHorizontal,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  agreementQueries,
  resendAgreement,
  voidAgreement,
  type SentAgreement,
  type SentAgreementSignatureStatus,
} from "@/lib/api/agreements";
import { buildAgreementDocumentWithValues } from "@/lib/agreements/merge-preview";
import { openSignedDocument } from "@/lib/agreements/signature";

const STATUS_BADGE: Record<SentAgreementSignatureStatus, string> = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Viewed: "border-sky-200 bg-sky-50 text-sky-700",
  Signed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Declined: "border-red-200 bg-red-50 text-red-700",
  Expired: "border-zinc-200 bg-zinc-50 text-zinc-600",
  Voided: "border-zinc-200 bg-zinc-50 text-zinc-500 line-through",
};

const STATUS_OPTIONS: SentAgreementSignatureStatus[] = [
  "Pending",
  "Signed",
  "Expired",
  "Declined",
  "Voided",
];

const TYPE_OPTIONS = ["Agreement", "Waiver", "Addendum", "Amendment", "Terms"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SentAgreementsTab() {
  const queryClient = useQueryClient();
  const { data = [], isPending } = useQuery(agreementQueries.sent());
  const [voidTarget, setVoidTarget] = useState<SentAgreement | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: agreementQueries.sent().queryKey,
    });
  };

  const openDocument = (row: SentAgreement) => {
    const html =
      row.signedDocumentHtml ??
      buildAgreementDocumentWithValues(
        row.content,
        row.templateName,
        row.mergeValues,
      );
    openSignedDocument(html);
  };

  const handleResend = (row: SentAgreement) => {
    const updated = resendAgreement({
      id: row.id,
      signingToken: crypto.randomUUID().replace(/-/g, ""),
      sentAt: new Date().toISOString(),
    });
    if (!updated) {
      toast.error("Only pending requests can be resent.");
      return;
    }
    invalidate();
    toast.success(`New signing link sent to ${row.ownerEmail}.`);
  };

  const confirmVoid = () => {
    if (!voidTarget) return;
    const reason = voidReason.trim();
    if (!reason) {
      toast.error("Enter a reason for voiding.");
      return;
    }
    const updated = voidAgreement({
      id: voidTarget.id,
      reason,
      voidedAt: new Date().toISOString(),
    });
    if (!updated) {
      toast.error("This agreement can't be voided.");
    } else {
      invalidate();
      toast.success("Agreement voided. It stays in the log for audit.");
    }
    setVoidTarget(null);
    setVoidReason("");
  };

  const columns: ColumnDef<SentAgreement>[] = [
    {
      key: "facilityName",
      label: "Facility Name",
      render: (row) => <span className="font-medium">{row.facilityName}</span>,
    },
    {
      key: "templateName",
      label: "Document Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span>{row.templateName}</span>
          <span className="text-muted-foreground text-xs">
            v{row.templateVersion}
          </span>
        </div>
      ),
    },
    {
      key: "documentType",
      label: "Type",
      render: (row) => <Badge variant="outline">{row.documentType}</Badge>,
    },
    {
      key: "sentAt",
      label: "Sent Date",
      sortValue: (row) => row.sentAt,
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.sentAt)}
        </span>
      ),
    },
    {
      key: "sentBy",
      label: "Sent By",
      render: (row) => <span className="text-sm">{row.sentBy}</span>,
    },
    {
      key: "signatureStatus",
      label: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={`px-1.5 py-0 text-[11px] font-normal ${STATUS_BADGE[row.signatureStatus]}`}
        >
          {row.signatureStatus}
        </Badge>
      ),
    },
    {
      key: "signedAt",
      label: "Signed Date",
      sortValue: (row) => row.signedAt ?? "",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.signedAt)}
        </span>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "signatureStatus",
      label: "Status",
      options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    },
    {
      key: "documentType",
      label: "Type",
      options: TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Every agreement ever sent. Signed documents are permanently locked —
        they cannot be edited, renamed or deleted by anyone. Voided requests
        remain in the log for legal audit.
      </p>

      <DataTable
        data={isPending ? [] : data}
        columns={columns}
        filters={filters}
        searchKeys={["facilityName", "templateName", "ownerName", "sentBy"]}
        searchPlaceholder="Search by facility, document, owner or sender…"
        itemsPerPage={25}
        actions={(row) => {
          const isSigned = row.signatureStatus === "Signed";
          const canResend = row.signatureStatus === "Pending";
          const canVoid =
            row.signatureStatus === "Pending" ||
            row.signatureStatus === "Expired";
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Row actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDocument(row)}>
                  <Eye className="size-4" />
                  View
                </DropdownMenuItem>
                {isSigned ? (
                  <DropdownMenuItem
                    onClick={() =>
                      row.signedDocumentHtml &&
                      openSignedDocument(row.signedDocumentHtml)
                    }
                  >
                    <Download className="size-4" />
                    Download PDF
                  </DropdownMenuItem>
                ) : null}
                {canResend ? (
                  <DropdownMenuItem onClick={() => handleResend(row)}>
                    <Send className="size-4" />
                    Resend
                  </DropdownMenuItem>
                ) : null}
                {canVoid ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setVoidTarget(row)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Ban className="size-4" />
                      Void
                    </DropdownMenuItem>
                  </>
                ) : null}
                {isSigned ? (
                  <DropdownMenuItem disabled>
                    <Lock className="size-4" />
                    Locked — signed
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
        emptyState={{
          icon: Send,
          title: "No agreements sent yet",
          description:
            "Send a template from the Templates tab and it will appear here with its signature status.",
        }}
      />

      <Dialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void agreement</DialogTitle>
            <DialogDescription>
              Cancel the request sent to {voidTarget?.facilityName}. This voids
              the signing link. The record stays in the log permanently for
              audit — nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Superseded by a corrected version."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoidTarget(null);
                setVoidReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!voidReason.trim()}
              onClick={confirmVoid}
            >
              <Ban className="mr-2 size-4" />
              Void agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
