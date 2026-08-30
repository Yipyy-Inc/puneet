"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NUDGE_OUTCOMES,
  reviewRequestQueries,
  SUPPRESS_REASONS,
  type RequestSend,
  type RequestState,
  type ReviewRequestRow,
} from "@/lib/api/reputation-requests";
import { cn } from "@/lib/utils";

// ============================================================================
// What happened to each ask.
//
// ── THE SUPPRESSED ROWS ARE NOT AN EDGE CASE ──────────────────────────────
//
// They are the reason this screen is worth opening. A facility whose review
// rate looks poor usually has a suppression reason repeating down this list —
// no mobile number on file, a cooldown set too long, a run of refunds — and the
// previous build could not show any of it, because a refused request was never
// written down.
//
// So SUPPRESSED is a first-class filter, and the machine reason is translated
// into a sentence here. A screen showing `negative_pause` would be showing its
// own schema.
//
// ── TIMES ARE THE FACILITY'S, WITH THE ZONE SAID OUT LOUD ─────────────────
//
// The audit found "Request sent via Email — Apr 29, 4:00 a.m." and a rating at
// 6:14 a.m. Both were UTC rendered as if local. Every timestamp here is
// formatted in the viewer's own zone with the zone name attached, so a 4 a.m.
// that IS 4 a.m. can be told from one that is a rendering artefact.
//
// ── NO SURVEY LINK IS OFFERED ─────────────────────────────────────────────
//
// The old trail card had "Open survey" and "Copy link" buttons. The token now
// exists only in the message that was sent, and that is deliberate: a member of
// staff who can open a customer's survey can answer it as them.
// ============================================================================

const TABS: { value: RequestState | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sent", label: "Waiting" },
  { value: "rated", label: "Answered" },
  { value: "suppressed", label: "Not asked" },
  { value: "expired", label: "Expired" },
  { value: "failed", label: "Failed" },
];

// A modal nobody has opened should not be in the first load. `next/dynamic`
// needs a NAMED component, not the module.
const AskForReviewDialog = dynamic(
  () => import("./AskForReviewDialog").then((m) => m.AskForReviewDialog),
  { ssr: false },
);

export function ReputationRequestsTab() {
  const [tab, setTab] = useState<RequestState | "all">("all");
  const [askOpen, setAskOpen] = useState(false);

  const { data, isPending, error } = useQuery(
    reviewRequestQueries.list(tab === "all" ? {} : { state: tab }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                tab === item.value
                  ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setAskOpen(true)}
        >
          <Plus className="size-4" />
          Ask for a review
        </Button>
      </div>

      <AskForReviewDialog open={askOpen} onOpenChange={setAskOpen} />

      {error ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {error instanceof Error
              ? error.message
              : "Could not load requests."}
          </CardContent>
        </Card>
      ) : isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : data.requests.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            {tab === "all"
              ? "Nobody has been asked yet. Requests go out after check-out once the automation is switched on, or you can ask one client now."
              : "Nothing in this state."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: ReviewRequestRow }) {
  const [open, setOpen] = useState(false);
  const suppressed = request.state === "suppressed";

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="hover:bg-muted/30 flex w-full items-center gap-3 p-3 text-left transition-colors"
        >
          <StateDot request={request} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {request.client.name}
              </span>
              {request.service_types.map((service) => (
                <Badge
                  key={service}
                  variant="secondary"
                  className="text-[10px] capitalize"
                >
                  {service}
                </Badge>
              ))}
              {request.response && (
                <span className="flex items-center gap-0.5 text-xs font-semibold">
                  {request.response.rating}
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {suppressed
                ? (SUPPRESS_REASONS[request.suppress_reason ?? ""] ??
                  "Not asked")
                : (request.response?.comment ?? describeState(request))}
            </p>
          </div>

          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && <Trail request={request} />}
      </CardContent>
    </Card>
  );
}

function StateDot({ request }: { request: ReviewRequestRow }) {
  if (request.state === "suppressed") {
    return (
      <span className="text-muted-foreground bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
        <Ban className="size-4" />
      </span>
    );
  }
  if (request.response) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
        <Check className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40">
      <Clock className="size-4" />
    </span>
  );
}

function describeState(request: ReviewRequestRow): string {
  if (request.state === "expired") return "No answer, and the link has closed";
  if (request.state === "failed") return "The message could not be sent";
  const sent = request.sends.find((send) => send.step_index === 0);
  if (sent?.sent_at) return `Asked ${when(sent.sent_at)}`;
  return `Going out ${when(request.first_send_at)}`;
}

function Trail({ request }: { request: ReviewRequestRow }) {
  return (
    <div className="space-y-4 border-t px-3 py-3">
      {request.state === "suppressed" ? (
        <div>
          <p className="text-xs font-semibold">Not asked</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {SUPPRESS_REASONS[request.suppress_reason ?? ""] ??
              request.suppress_reason}
            {request.suppress_stage === "send" &&
              " — checked again just before sending"}
          </p>
          {request.next_eligible_at && (
            <p className="text-muted-foreground mt-1 text-xs">
              Eligible again {when(request.next_eligible_at)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold">What went out</p>
          {request.sends.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nothing queued yet.</p>
          ) : (
            request.sends.map((send) => <SendRow key={send.id} send={send} />)
          )}
          {request.nudge_outcome && (
            <p className="text-muted-foreground text-xs">
              Follow-up: {NUDGE_OUTCOMES[request.nudge_outcome]}
            </p>
          )}
        </div>
      )}

      {request.response && (
        <div>
          <p className="text-xs font-semibold">What they said</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-xs font-semibold">
              {request.response.rating}
              <Star className="size-3 fill-amber-400 text-amber-400" />
            </span>
            <span className="text-muted-foreground text-xs">
              {when(request.response.submitted_at)} · via{" "}
              {request.response.source.replace("_", " ")}
            </span>
            {request.response.public_clicked_at && (
              <Badge variant="secondary" className="text-[10px]">
                Followed the public link
              </Badge>
            )}
          </div>
          {request.response.comment && (
            <p className="text-muted-foreground mt-1 text-xs italic">
              &ldquo;{request.response.comment}&rdquo;
            </p>
          )}
          {request.response.staff && (
            <p className="text-muted-foreground mt-1 text-xs">
              Credited to {request.response.staff.first_name}{" "}
              {request.response.staff.last_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SendRow({ send }: { send: RequestSend }) {
  const [showBody, setShowBody] = useState(false);
  const Icon = send.channel === "email" ? Mail : MessageSquare;

  return (
    <div className="text-xs">
      <div className="flex items-start gap-2">
        <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-medium">
              {send.step_index === 0 ? "The ask" : "Follow-up"}
            </span>{" "}
            <span className="text-muted-foreground">
              {send.sent_at
                ? `sent ${when(send.sent_at)}`
                : send.status === "skipped"
                  ? `not sent — ${send.skip_reason ?? "skipped"}`
                  : `due ${when(send.scheduled_for)}`}
            </span>
          </p>
          {send.last_error && (
            <p className="mt-0.5 text-rose-600 dark:text-rose-400">
              {send.last_error}
            </p>
          )}
        </div>

        {/* The rendered copy. "What did you tell my customer" is a question a
            facility has to be able to answer, and `body_rendered` is the record
            CASL requires them to keep — frozen literally, by
            `message_sends_freeze`, so this is the copy that went out rather
            than whatever the template says today.

            Inline rather than a dialog: it is a lookup, not a document, and a
            modal would be the fourth interactive thing on an already dense row. */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-6 shrink-0 px-2 text-[11px]"
          onClick={() => setShowBody((value) => !value)}
        >
          {showBody ? "Hide" : "View"}
        </Button>
      </div>

      {showBody && (
        <div className="bg-muted/40 mt-1.5 ml-5 rounded-lg border p-2">
          {send.subject_rendered && (
            <p className="font-medium">{send.subject_rendered}</p>
          )}
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
            {send.body_rendered}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * A timestamp in the VIEWER's zone, with the zone named.
 *
 * The audit found an SMS logged at 4:00 a.m. that was really 4:00 UTC. Naming
 * the zone is what lets somebody tell a genuine 4 a.m. send from a rendering
 * artefact without opening the database.
 */
function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
