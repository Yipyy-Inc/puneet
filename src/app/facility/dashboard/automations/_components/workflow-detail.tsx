"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  CalendarClock,
  Mail,
  MessageSquare,
  Pencil,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useUpdateWorkflow, workflowQueries } from "@/lib/api/workflows";
import { TRIGGER_META } from "@/lib/automations/triggers";
import type { WorkflowDetail as Detail } from "@/types/workflows";

// ============================================================================
// One workflow, in detail.
//
// ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
//
// Until this landed a workflow could be created and never edited again: the API
// took a PATCH, and nothing on screen could send one. Building a five-step
// sequence and then finding a typo in step three meant deleting it and starting
// over.
//
// ── THE NUMBERS COME FROM THE OUTBOX ──────────────────────────────────────
//
// Per-step counts and the activity log are both read from `message_sends`,
// which is also what the list totals are computed from. One record of what was
// attempted means the step counts, the log and the tile cannot disagree — and
// a step that has sent nothing shows 0 rather than being absent, which is the
// difference between "not firing" and "not configured".
// ============================================================================

export function WorkflowDetailSheet({
  workflowId,
  open,
  onOpenChange,
  onEdit,
}: {
  workflowId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (workflow: Detail) => void;
}) {
  const detail = useQuery(workflowQueries.detail(workflowId));
  const updateWorkflow = useUpdateWorkflow();
  const workflow = detail.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {workflow?.name ?? "Workflow"}
            {workflow && (
              <Badge
                variant={workflow.status === "active" ? "default" : "secondary"}
              >
                {workflow.status}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {workflow
              ? workflow.kind === "audience"
                ? "Runs on a schedule against a filtered group."
                : "Starts when a client does something."
              : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {detail.isLoading || !workflow ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="In progress" value={workflow.activeEnrollments} />
              <Stat label="Messages sent" value={workflow.messagesSent} />
              <Stat label="People reached" value={workflow.uniqueRecipients} />
              <Stat label="Stopped early" value={workflow.stoppedEarly} />
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">How it starts</h3>
              <div className="rounded-lg border p-3 text-sm">
                {workflow.kind === "audience" ? (
                  <>
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarClock className="size-4" />
                      {workflow.frequency ?? "weekly"} at{" "}
                      {workflow.sendAtLocal ?? "09:00"}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {workflow.audience?.filterGroups?.[0]?.filters.length ??
                        0}{" "}
                      filter(s). Times are on the facility&apos;s own clock.
                    </p>
                    {workflow.lastEstimate !== null && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        About {workflow.lastEstimate} matched when last counted.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 font-medium">
                      <Zap className="size-4" />
                      {TRIGGER_META[
                        workflow.trigger as keyof typeof TRIGGER_META
                      ]?.label ?? workflow.trigger}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {
                        TRIGGER_META[
                          workflow.trigger as keyof typeof TRIGGER_META
                        ]?.description
                      }
                    </p>
                  </>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  Won&apos;t write to the same client more than once every{" "}
                  {workflow.minDaysBetweenSends} days.
                  {workflow.stopOn.length > 0 &&
                    ` Stops when: ${workflow.stopOn.join(", ")}.`}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">The sequence</h3>
              {workflow.steps.map((step) => {
                const stat = workflow.stepStats.find(
                  (s) => s.stepIndex === step.stepIndex,
                );
                return (
                  <div
                    key={step.stepIndex}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        Step {step.stepIndex + 1}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {step.delayMinutes === 0
                          ? "immediately"
                          : `after ${Math.round(step.delayMinutes / 1440)} day(s)`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {step.emailTemplateId && (
                        <Badge variant="outline">
                          <Mail className="mr-1 size-3" /> Email
                        </Badge>
                      )}
                      {step.smsTemplateId && (
                        <Badge variant="outline">
                          <MessageSquare className="mr-1 size-3" /> Text
                        </Badge>
                      )}
                    </div>
                    {/* Zero is shown, not hidden. A step absent from this line
                        would read as "not configured" when it means "has not
                        fired yet", and those need different responses. */}
                    <p className="text-muted-foreground mt-2 text-xs">
                      {stat?.sent ?? 0} sent
                      {(stat?.queued ?? 0) > 0 && ` · ${stat!.queued} waiting`}
                      {(stat?.skipped ?? 0) > 0 &&
                        ` · ${stat!.skipped} skipped`}
                      {(stat?.failed ?? 0) > 0 && ` · ${stat!.failed} failed`}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Recent activity</h3>
              {workflow.recentActivity.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border p-3 text-sm">
                  Nothing yet.{" "}
                  {workflow.status === "active"
                    ? "It is live and waiting for someone to qualify."
                    : "It is not switched on."}
                </p>
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {workflow.recentActivity.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <span>
                        {entry.clientName ?? "A client"}
                        <span className="text-muted-foreground">
                          {" "}
                          · step {(entry.stepIndex ?? 0) + 1} · {entry.channel}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge
                          variant={
                            entry.status === "sent" ? "default" : "secondary"
                          }
                          title={entry.skipReason ?? undefined}
                        >
                          {entry.status}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {workflow.recentActivity.some((a) => a.skipReason) && (
                <p className="text-muted-foreground text-xs">
                  A skipped message names its reason on hover — an unsubscribe,
                  a cooldown, or a channel with no credentials.
                </p>
              )}
            </section>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => onEdit(workflow)}>
                <Pencil className="mr-1 size-4" /> Edit
              </Button>
              <Button
                variant="outline"
                disabled={!workflow.deliverable || updateWorkflow.isPending}
                onClick={() =>
                  updateWorkflow.mutate(
                    {
                      id: workflow.id,
                      patch: {
                        status:
                          workflow.status === "active" ? "paused" : "active",
                      },
                    },
                    {
                      onSuccess: () =>
                        toast.success(
                          workflow.status === "active"
                            ? "Paused."
                            : "It is live.",
                        ),
                      onError: (e: Error) => toast.error(e.message),
                    },
                  )
                }
              >
                {workflow.status === "active" ? "Pause" : "Switch on"}
              </Button>
              {!workflow.deliverable && (
                <span className="text-muted-foreground self-center text-xs">
                  <Ban className="mr-1 inline size-3" />
                  Nothing emits this action yet.
                </span>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Users className="size-3" /> {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
