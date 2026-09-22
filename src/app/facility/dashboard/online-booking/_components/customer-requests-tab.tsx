"use client";

import { useState } from "react";
import { CalendarClock, CircleX, Inbox, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  usePendingCustomerRequests,
  useDecideCustomerRequest,
  type CustomerRequest,
} from "@/lib/api/customer-requests";
import { formatDayHeading } from "@/lib/i18n/format";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ── What customers have asked for, and the answer ────────────────────────
//
// A customer's "change these dates" or "please cancel" lands as a booking note
// and nothing could answer one: it sat in the notes and whether anybody had
// dealt with it was a judgement call.
//
// AGREEING TO A CANCELLATION DOES NOT CANCEL. It records that staff agreed and
// then says, on screen, that the cancel is still theirs to do — because that
// is where `cancellation_terms` prices it and shows the figure before anybody
// commits it. A button here that cancelled would be a second path to the same
// money, which is the duplication this whole area exists to remove.

export function CustomerRequestsTab() {
  const { locale, section } = useSettingsText();
  const t = section("customer-requests");
  const { data, isPending, isError } = usePendingCustomerRequests();
  const decide = useDecideCustomerRequest();

  const [answering, setAnswering] = useState<{
    request: CustomerRequest;
    decision: "approved" | "declined";
  } | null>(null);
  const [reply, setReply] = useState("");

  // A failed read is NOT an empty list, and saying so is the whole point: the
  // shape that answers `[]` on a 500 is how three teardowns silently cleaned
  // up nothing.
  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-6">
          <TriangleAlert className="text-warning size-5 shrink-0" />
          <p className="text-body">{t("failed")}</p>
        </CardContent>
      </Card>
    );
  }

  const requests = data ?? [];

  // ── LOADING IS A STATE, NOT A GAP ────────────────────────────────────────
  //
  // Without this the tab rendered NOTHING while the query was in flight: the
  // empty card is gated on `!isPending`, so the grid fell through with no
  // rows and the panel was blank. A screenshot caught it; a typecheck never
  // would. §5s — every cell of the matrix gets an answer, and "loading" is
  // one of them.
  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <div className="bg-inset yy-skel h-5 w-40 rounded-full" />
              <div className="bg-inset yy-skel h-4 w-full rounded-full" />
              <div className="bg-inset yy-skel h-4 w-2/3 rounded-full" />
              <div className="bg-inset yy-skel h-9 w-32 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <Inbox className="text-ink-tertiary size-8" />
          <p className="text-body-strong">{t("empty")}</p>
          <p className="text-meta text-ink-tertiary max-w-sm">
            {t("emptyHelp")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const send = () => {
    if (!answering) return;
    const words = reply.trim();
    if (!words) {
      toast.error(t("replyRequired"));
      return;
    }
    decide.mutate(
      {
        bookingRef: answering.request.bookingRef,
        noteId: answering.request.noteId,
        decision: answering.decision,
        reply: words,
      },
      {
        onSuccess: (result) => {
          toast.success(t("answered"), {
            description: result?.cancelStillNeeded
              ? t("cancelStillNeeded")
              : undefined,
          });
          setAnswering(null);
          setReply("");
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {requests.map((request) => {
          const isCancel = request.kind === "cancel_request";
          return (
            <Card key={request.noteId}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* A glyph as well as the word — colour is never the only
                      channel a reader has (§3). */}
                  <Badge variant="outline" className="gap-1.5">
                    {isCancel ? (
                      <CircleX className="size-3.5" />
                    ) : (
                      <CalendarClock className="size-3.5" />
                    )}
                    {isCancel ? t("kindCancel") : t("kindDates")}
                  </Badge>
                  <span className="text-meta text-ink-tertiary">
                    {t("bookingRef").replace(
                      "{ref}",
                      String(request.bookingRef),
                    )}
                  </span>
                </div>

                <p className="text-body whitespace-pre-wrap">
                  {request.content}
                </p>

                <p className="text-meta text-ink-tertiary">
                  {t("askedOn").replace(
                    "{date}",
                    formatDayHeading(request.askedAt, locale),
                  )}
                  {request.askedBy ? ` · ${request.askedBy}` : ""}
                </p>

                {/* Persistent, never revealed on hover — two of the three
                    contexts have no hover at all (§6 rule 11). */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setAnswering({ request, decision: "approved" });
                      setReply("");
                    }}
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAnswering({ request, decision: "declined" });
                      setReply("");
                    }}
                  >
                    {t("decline")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={answering !== null}
        onOpenChange={(open) => {
          if (!open) setAnswering(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {answering?.decision === "approved"
                ? t("approveTitle")
                : t("declineTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="customer-request-reply">{t("replyLabel")}</Label>
            <Textarea
              id="customer-request-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={4}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnswering(null)}
              disabled={decide.isPending}
            >
              {t("goBack")}
            </Button>
            <Button onClick={send} disabled={decide.isPending}>
              {decide.isPending ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
