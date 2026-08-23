"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Lock,
  User,
} from "lucide-react";
import { liveFormQueries, useReviewSubmission } from "@/lib/api/forms-live";
import type { SubmissionStatus } from "@/lib/api/mappers/form";
import {
  MissingAnswers,
  SubmissionAnswers,
} from "@/components/forms/SubmissionAnswers";
import { submissionFlags } from "@/components/forms/submission-shape";
import { FileUnderCustomer } from "./_components/FileUnderCustomer";

// ============================================================================
// One submission: what was asked, what was answered, and what staff do next.
//
// ── WHAT THIS REPLACED, AND WHY MOST OF IT IS GONE ────────────────────────
//
// The old page was 1,304 lines over `src/data/form-submissions`, and three of
// its buttons announced work that never happened: "New profile created",
// "Booking request created", "Follow-up alert created for staff". Each was a
// `toast.success` and nothing else — one of them first calling
// `linkSubmissionToCustomer(id, 999, …)` against a hardcoded customer id that
// belongs to nobody. A button that says it did something is worse than a
// missing button, because the person believes it.
//
// They are deleted rather than wired: none of the three has a backend to reach.
// A booking is created in the booking flow, which is real; a follow-up is a
// task, which is real; neither belongs here just because the fixture put it
// here. The merge-conflict machinery went with them — it reconciled fields
// against `src/data/clients` and wrote to memory.
//
// ── WHAT SURVIVES IS THE PART THAT WAS REAL WORK ──────────────────────────
//
// Reading the answers, marking them reviewed or flagged, and filing an
// unattached submission under a customer. That last one is one-way and the
// database enforces it: see `FileUnderCustomer`.
//
// The answers themselves are laid out against the submission's OWN frozen
// version, not the form as it stands today.
// ============================================================================

/**
 * The four a reviewer may choose.
 *
 * `draft` is missing on purpose: it means the customer has not sent this yet,
 * and staff putting it back would be editing somebody else's unfinished form.
 */
type ReviewStatus = Exclude<SubmissionStatus, "draft">;

const REVIEW_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "submitted", label: "Awaiting review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "flagged", label: "Flagged" },
  { value: "archived", label: "Archived" },
];

function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    data: submission,
    isPending,
    isError,
    error,
  } = useQuery(liveFormQueries.submission(id));

  const review = useReviewSubmission();
  const [pendingStatus, setPendingStatus] = useState<ReviewStatus | null>(null);

  const flags = useMemo(
    () => (submission ? submissionFlags(submission) : null),
    [submission],
  );

  if (isPending) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <div className="flex-1 p-4 pt-6">
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
            <p className="font-medium">This submission could not be opened.</p>
            <p className="mt-1 text-sm">
              {error instanceof Error
                ? error.message
                : "It may have been removed, or belong to another facility."}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/facility/dashboard/forms/submissions">
                Back to the inbox
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = pendingStatus ?? submission.status;
  const isDraft = submission.status === "draft";

  const saveStatus = (next: ReviewStatus) => {
    setPendingStatus(next);
    review.mutate(
      { id: submission.id, status: next },
      {
        onSuccess: () => {
          setPendingStatus(null);
          toast.success(
            next === "flagged"
              ? "Flagged for attention"
              : next === "reviewed"
                ? "Marked reviewed"
                : next === "archived"
                  ? "Archived"
                  : "Moved back to awaiting review",
          );
        },
        onError: (err) => {
          // Put the control back where the database left it, rather than
          // showing a state the row does not have.
          setPendingStatus(null);
          toast.error(err instanceof Error ? err.message : "Could not save.");
        },
      },
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/facility/dashboard/forms/submissions">
              <ArrowLeft className="size-4" />
              Submissions
            </Link>
          </Button>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="size-5" />
            {submission.formName ?? "Submission"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Submitted {formatSubmittedAt(submission.submittedAt)}
            {submission.versionNumber !== null && (
              <> · version {submission.versionNumber} of the form</>
            )}
            {submission.staffAssisted && <> · captured by staff</>}
          </p>
        </div>
        <Badge variant="outline" className="mt-8 capitalize">
          {status}
        </Badge>
      </div>

      {flags?.alertFlag && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            A logic rule on this version of the form flagged these answers for
            attention.
          </span>
        </div>
      )}

      {(flags?.missingCount ?? 0) > 0 && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="size-4 shrink-0" />
            {flags!.missingCount} required question(s) came back empty
          </p>
          <MissingAnswers row={submission} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Answers</CardTitle>
            <p className="text-muted-foreground text-sm">
              {/* Says which questions these are, because the form may have been
                  rewritten since — that opens a new version and leaves this one
                  exactly as it was answered. */}
              Shown against version {submission.versionNumber ?? "—"}, the
              questions as they were asked.
            </p>
          </CardHeader>
          <CardContent>
            <SubmissionAnswers row={submission} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUnderCustomer submission={submission} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft ? (
                <p className="text-muted-foreground text-sm">
                  {/* A draft is the customer's unfinished form. There is
                      nothing to review until they send it. */}
                  This form has not been sent yet. It becomes reviewable once
                  the customer submits it.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="review-status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => saveStatus(v as ReviewStatus)}
                    disabled={review.isPending}
                  >
                    <SelectTrigger id="review-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="text-muted-foreground flex items-start gap-2 text-xs">
                <Lock className="mt-0.5 size-3 shrink-0" />
                {/* Not a UI choice — `private.submitted_answers_are_final`
                    refuses the write, so an edit control here could only ever
                    produce an error. */}
                The answers themselves cannot be edited. They are the record of
                what the person said.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
