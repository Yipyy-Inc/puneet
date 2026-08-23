"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useRecordDecision,
  type ReviewApplication,
} from "@/lib/api/merchant-review";
import {
  DECISION_LABELS,
  DETAIL_REQUIRED,
  REVIEW_TRANSITIONS,
  reviewDecisionSchema,
  type ReviewDecision,
} from "@/lib/merchant-application/review";
import { cn } from "@/lib/utils";

// ============================================================================
// Recording what a reviewer decided.
//
// ── THE BUTTONS ARE THE TRANSITIONS THAT EXIST ────────────────────────────
//
// Read from `REVIEW_TRANSITIONS` rather than listed here, so the screen cannot
// offer a move the route refuses. An approved application shows no buttons at
// all, which is the honest rendering of "there is nothing left to decide" —
// better than four disabled ones inviting somebody to hover for a reason.
//
// ── AND A REFUSAL CARRIES WORDS ───────────────────────────────────────────
//
// `more_info_needed` and `rejected` land on the facility's screen as the only
// explanation they get. The same schema the route validates with is checked
// here, so the reviewer is told before the round trip rather than after — and
// there is one copy of the rule, not two that drift.
// ============================================================================

const DESTRUCTIVE: ReviewDecision["status"][] = ["rejected"];
const CONFIRMING: ReviewDecision["status"][] = ["approved"];

export function DecisionPanel({
  application,
}: {
  application: ReviewApplication;
}) {
  const [chosen, setChosen] = useState<ReviewDecision["status"] | null>(null);
  const [detail, setDetail] = useState("");
  const [reference, setReference] = useState(
    application.externalReference ?? "",
  );
  const [problem, setProblem] = useState<string | null>(null);
  const record = useRecordDecision(application.id);

  const available = (REVIEW_TRANSITIONS[application.status] ??
    []) as ReviewDecision["status"][];

  if (available.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2.5 p-5 text-sm">
          <CheckCircle2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-medium">This application is closed.</p>
            <p className="text-muted-foreground">
              {application.status === "approved"
                ? "The facility has been told their account is open and offered the step that links it."
                : application.status === "withdrawn"
                  ? "The facility withdrew it. Nothing was sent to underwriting."
                  : "Nothing more happens to it. The facility can start a new one."}
              {application.statusDetail && (
                <>
                  {" "}
                  What they were told:{" "}
                  <span className="text-foreground">
                    {application.statusDetail}
                  </span>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function submit() {
    if (!chosen) return;
    const candidate: ReviewDecision = {
      status: chosen,
      detail: detail.trim(),
      reference: reference.trim(),
    };
    const parsed = reviewDecisionSchema.safeParse(candidate);
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? "Check the decision.");
      return;
    }
    setProblem(null);
    record.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(
          chosen === "approved"
            ? "Approved. The facility can now link their account."
            : chosen === "rejected"
              ? "Recorded as not approved."
              : chosen === "more_info_needed"
                ? "Sent back to the facility with your note."
                : "Marked as under review.",
        );
        setChosen(null);
        setDetail("");
      },
      onError: (error: Error) => setProblem(error.message),
    });
  }

  const needsDetail = chosen ? DETAIL_REQUIRED.includes(chosen) : false;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-1">
          <p className="font-semibold">What happens to this application</p>
          {application.statusDetail && (
            <p className="text-muted-foreground flex items-start gap-2 text-sm/relaxed">
              <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
              <span>
                The facility currently sees:{" "}
                <span className="text-foreground">
                  {application.statusDetail}
                </span>
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {available.map((status) => {
            const selected = chosen === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setChosen(selected ? null : status);
                  setProblem(null);
                }}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-left text-sm transition-colors",
                  selected
                    ? DESTRUCTIVE.includes(status)
                      ? "border-red-600 bg-red-600/5 ring-1 ring-red-600/30"
                      : CONFIRMING.includes(status)
                        ? "border-emerald-600 bg-emerald-600/5 ring-1 ring-emerald-600/30"
                        : "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
                    : "hover:bg-muted/50",
                )}
              >
                <span className="block font-medium">
                  {DECISION_LABELS[status].label}
                </span>
              </button>
            );
          })}
        </div>

        {chosen && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-muted-foreground text-sm/relaxed">
              {DECISION_LABELS[chosen].blurb}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="decision-detail" className="text-sm font-medium">
                {needsDetail
                  ? "What the facility will be told"
                  : "A note for the facility"}
                {!needsDetail && (
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    optional
                  </span>
                )}
              </Label>
              <Textarea
                id="decision-detail"
                rows={3}
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder={
                  chosen === "more_info_needed"
                    ? "The photo ID for Sarah Chen is cut off at the bottom — we need the whole document, including the expiry date."
                    : chosen === "rejected"
                      ? "The legal name does not match the tax authority's records and the business could not be verified."
                      : ""
                }
              />
              <p className="text-muted-foreground text-xs/relaxed">
                This is the only explanation they get. Write it to somebody who
                cannot see this screen.
              </p>
            </div>

            <div className="max-w-sm space-y-1.5">
              <Label
                htmlFor="decision-reference"
                className="text-sm font-medium"
              >
                Acquirer reference
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  optional
                </span>
              </Label>
              <Input
                id="decision-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="What underwriting calls this application"
                className="font-[tabular-nums]"
              />
            </div>

            {problem && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {problem}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={submit}
                disabled={record.isPending}
                className={cn(
                  DESTRUCTIVE.includes(chosen) &&
                    "bg-red-600 text-white hover:bg-red-700",
                  CONFIRMING.includes(chosen) &&
                    "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                {record.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {DECISION_LABELS[chosen].label}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setChosen(null);
                  setProblem(null);
                }}
                disabled={record.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
