"use client";

import { useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateLong } from "@/lib/i18n/format";
import { useVaccinationMutations } from "@/lib/api/vaccinations";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { expiryState } from "@/lib/vaccinations";
import type { VaccinationRecord } from "@/types/pet";

type ReviewAction = "rejected" | "exception";

/** The review status as a chip (§3): glyph, word, ink. */
function ReviewChip({ status }: { status: VaccinationRecord["status"] }) {
  const { t } = useStaffText("vaccinations");
  switch (status) {
    case "approved":
      return (
        <Badge variant="confirmed">
          <CircleCheck aria-hidden />
          {t("statusApproved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="overdue">
          <ShieldX aria-hidden />
          {t("statusRejected")}
        </Badge>
      );
    case "exception":
      return (
        <Badge variant="inService">
          <ShieldAlert aria-hidden />
          {t("statusException")}
        </Badge>
      );
    default:
      return (
        <Badge variant="pending">
          <Clock3 aria-hidden />
          {t("statusPending")}
        </Badge>
      );
  }
}

/**
 * One vaccination record, with its review. Every action is a real write
 * (`/api/vaccinations/[id]`) stamped with the signed-in reviewer; the
 * controls are always visible, never revealed on hover (§6 rule 5).
 */
export function VaccinationRecordRow({
  record,
  today,
  requirement,
  canEdit = true,
}: {
  record: VaccinationRecord;
  today: string;
  /** Whether the facility requires this vaccine, when it names it at all. */
  requirement?: "required" | "optional";
  canEdit?: boolean;
}) {
  const { t, fill, locale } = useStaffText("vaccinations");
  const { update, remove } = useVaccinationMutations();
  const [review, setReview] = useState<{
    action: ReviewAction;
    note: string;
  } | null>(null);

  const expiry = expiryState(record.expiryDate, today);
  const busy = update.isPending || remove.isPending;
  const date = (value: string) => formatDateLong(value.slice(0, 10), locale);

  const setStatus = async (
    status: "approved" | ReviewAction,
    reviewReason?: string,
  ) => {
    try {
      await update.mutateAsync({
        id: record.id,
        patch: { status, reviewReason },
      });
      toast.success(
        fill(
          status === "approved"
            ? "approvedToast"
            : status === "rejected"
              ? "rejectedToast"
              : "exceptionToast",
          { vaccine: record.vaccineName },
        ),
      );
      setReview(null);
    } catch (error) {
      toast.error(t("reviewFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const drop = async () => {
    try {
      await remove.mutateAsync(record.id);
      toast.success(fill("removedToast", { vaccine: record.vaccineName }));
    } catch (error) {
      toast.error(t("removeFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const reason = record.rejectionReason ?? record.exceptionReason;

  return (
    <div
      className="rounded-2xl border p-4"
      data-status={record.status ?? "pending_review"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold">{record.vaccineName}</span>
          {requirement && (
            <Badge variant="outline">
              {t(requirement === "required" ? "required" : "optional")}
            </Badge>
          )}
          {expiry === "expired" && (
            <Badge variant="overdue">
              <CircleAlert aria-hidden />
              {t("expired")}
            </Badge>
          )}
          {expiry === "expiring" && (
            <Badge variant="pending">
              <Clock3 aria-hidden />
              {t("expiringSoon")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReviewChip status={record.status} />
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label={fill("moreFor", { vaccine: record.vaccineName })}
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={drop} className="text-destructive">
                  <Trash2 className="size-4" />
                  {fill("removeRecord", { vaccine: record.vaccineName })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <dl className="text-ink-secondary mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {record.administeredDate && (
          <div className="flex gap-1">
            <dt className="text-ink-tertiary">{t("givenLabel")}</dt>
            <dd className="tabular-nums">{date(record.administeredDate)}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt className="text-ink-tertiary">{t("expiresLabel")}</dt>
          <dd className="tabular-nums">
            {record.expiryDate ? date(record.expiryDate) : t("noExpiry")}
          </dd>
        </div>
        {record.veterinarianName && (
          <div className="flex gap-1">
            <dt className="text-ink-tertiary">{t("vetLabel")}</dt>
            <dd>{record.veterinarianName}</dd>
          </div>
        )}
        {record.veterinaryClinic && (
          <div className="flex gap-1">
            <dt className="text-ink-tertiary">{t("clinicLabel")}</dt>
            <dd>{record.veterinaryClinic}</dd>
          </div>
        )}
      </dl>

      {record.notes && (
        <p className="text-ink-secondary mt-2 text-sm">
          <span className="text-ink-tertiary">{t("notesLabel")} </span>
          {record.notes}
        </p>
      )}

      {record.reviewedBy && record.status !== "pending_review" && (
        <p className="text-ink-tertiary mt-2 text-sm">
          {record.reviewedAt
            ? fill("reviewedByOn", {
                name: record.reviewedBy,
                date: formatDateLong(record.reviewedAt, locale),
              })
            : fill("reviewedBy", { name: record.reviewedBy })}
          {reason ? ` — ${reason}` : ""}
        </p>
      )}

      {canEdit && !review && (
        <div className="mt-3 flex flex-wrap gap-2">
          {record.status !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setStatus("approved")}
            >
              {update.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {fill("approveRecord", { vaccine: record.vaccineName })}
            </Button>
          )}
          {record.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setReview({ action: "rejected", note: "" })}
            >
              <ShieldX className="size-4" />
              {t("reject")}
            </Button>
          )}
          {record.status !== "exception" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setReview({ action: "exception", note: "" })}
            >
              <ShieldAlert className="size-4" />
              {t("makeException")}
            </Button>
          )}
        </div>
      )}

      {canEdit && review && (
        <div className="mt-3 space-y-3 rounded-2xl border p-3">
          <div className="space-y-2">
            <Label htmlFor={`review-${record.id}`}>
              {t(
                review.action === "rejected"
                  ? "rejectReasonLabel"
                  : "exceptionNoteLabel",
              )}
            </Label>
            <Textarea
              id={`review-${record.id}`}
              value={review.note}
              onChange={(e) =>
                setReview({ action: review.action, note: e.target.value })
              }
              placeholder={t(
                review.action === "rejected"
                  ? "rejectReasonPlaceholder"
                  : "exceptionNotePlaceholder",
              )}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={review.action === "rejected" ? "destructive" : "default"}
              disabled={busy}
              onClick={() =>
                setStatus(review.action, review.note.trim() || undefined)
              }
            >
              {update.isPending && <Loader2 className="size-4 animate-spin" />}
              {fill(
                review.action === "rejected"
                  ? "confirmReject"
                  : "confirmException",
                { vaccine: record.vaccineName },
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
