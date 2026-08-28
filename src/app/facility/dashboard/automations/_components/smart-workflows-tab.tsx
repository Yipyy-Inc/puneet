"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Send,
  Trash2,
  Users,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TableSkeleton } from "@/components/ui/skeletons";
import {
  useArchiveWorkflow,
  useUpdateWorkflow,
  workflowQueries,
} from "@/lib/api/workflows";
import { TRIGGER_META } from "@/lib/automations/triggers";
import type { RealMessageTemplate } from "@/types/automations";
import type { Workflow } from "@/types/workflows";
import { WorkflowWizard } from "./workflow-wizard";

// ============================================================================
// The Smart Workflows tab.
//
// Everything on this screen is derived from real rows: enrolments from
// `workflow_enrollments`, messages from `message_sends`. A facility that has
// run nothing sees zeroes, which is the true answer — the screen this feature
// sits beside once displayed "Total Sent: 1,392" for a system that had never
// sent anything, and that is the mistake worth not repeating.
// ============================================================================

export function SmartWorkflowsTab({
  templates,
}: {
  templates: RealMessageTemplate[];
}) {
  const [creating, setCreating] = useState(false);
  const workflows = useQuery(workflowQueries.all());
  const updateWorkflow = useUpdateWorkflow();
  const archiveWorkflow = useArchiveWorkflow();

  const list = workflows.data ?? [];
  const active = list.filter((w) => w.status === "active").length;
  const enrolled = list.reduce((n, w) => n + w.activeEnrollments, 0);
  const sent = list.reduce((n, w) => n + w.messagesSent, 0);

  function toggle(workflow: Workflow, on: boolean) {
    updateWorkflow.mutate(
      { id: workflow.id, patch: { status: on ? "active" : "paused" } },
      {
        onSuccess: () =>
          toast.success(
            on
              ? `"${workflow.name}" is live.`
              : `"${workflow.name}" is paused.`,
          ),
        // The server refuses an activation it cannot honour — nothing emits
        // that action, no steps, or the channel has no credentials. Its reason
        // is the whole message.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Smart Workflows</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Sequences rather than single messages: several messages spread over
            days, aimed at a chosen group, that stop as soon as the client does
            what you were asking for.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Create Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Active Workflows"
          value={workflows.isLoading ? "—" : active}
          hint={`of ${list.length} total`}
          icon={WorkflowIcon}
          tone="violet"
        />
        <KpiTile
          label="Clients In Progress"
          value={workflows.isLoading ? "—" : enrolled}
          hint="Partway through a sequence"
          icon={Users}
          tone="indigo"
        />
        <KpiTile
          label="Messages Sent"
          value={workflows.isLoading ? "—" : sent}
          hint="All time, from workflows"
          icon={Send}
          tone="emerald"
        />
        <KpiTile
          label="Stopped Early"
          value={
            workflows.isLoading
              ? "—"
              : list.reduce((n, w) => n + w.stoppedEarly, 0)
          }
          hint="Client did the thing first"
          icon={Ban}
          tone="amber"
        />
      </div>

      {workflows.isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : workflows.error ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            <AlertTriangle className="mx-auto mb-3 size-8 text-amber-500" />
            {workflows.error.message}
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <WorkflowIcon className="text-muted-foreground mx-auto mb-4 size-12 opacity-40" />
            <p className="text-lg font-medium">No workflows yet</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              A good first one: a welcome sequence for new bookings, or a
              vaccination reminder aimed at clients whose records expire soon.
            </p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              Create your first workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((w) => (
            <WorkflowRow
              key={w.id}
              workflow={w}
              onToggle={toggle}
              onArchive={() =>
                archiveWorkflow.mutate(w.id, {
                  onSuccess: () => toast.success(`"${w.name}" removed.`),
                  onError: (e: Error) => toast.error(e.message),
                })
              }
            />
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <WorkflowWizard
            templates={templates}
            onDone={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowRow({
  workflow,
  onToggle,
  onArchive,
}: {
  workflow: Workflow;
  onToggle: (w: Workflow, on: boolean) => void;
  onArchive: () => void;
}) {
  const summary =
    workflow.kind === "audience"
      ? `${workflow.frequency ?? "weekly"} at ${workflow.sendAtLocal ?? "09:00"} · ${
          workflow.audience?.filterGroups?.[0]?.filters.length ?? 0
        } filter(s)`
      : (TRIGGER_META[workflow.trigger as keyof typeof TRIGGER_META]?.label ??
        workflow.trigger ??
        "—");

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{workflow.name}</span>
            <Badge
              variant={workflow.status === "active" ? "default" : "secondary"}
            >
              {workflow.status}
            </Badge>
            <Badge variant="outline">
              {workflow.kind === "audience" ? (
                <>
                  <CalendarClock className="mr-1 size-3" /> Scheduled
                </>
              ) : (
                <>
                  <Zap className="mr-1 size-3" /> Action-based
                </>
              )}
            </Badge>
            {!workflow.deliverable && (
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-700"
                title="Nothing emits this action yet, so it cannot be switched on."
              >
                <Ban className="mr-1 size-3" /> Not yet delivering
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary} · {workflow.steps.length} step
            {workflow.steps.length === 1 ? "" : "s"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {workflow.activeEnrollments} in progress ·{" "}
            {workflow.messagesSent === 0
              ? "never sent"
              : `${workflow.messagesSent} sent`}
            {workflow.stoppedEarly > 0 &&
              ` · ${workflow.stoppedEarly} stopped early`}
            {workflow.lastRunAt &&
              ` · last ran ${new Date(workflow.lastRunAt).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={workflow.status === "active"}
            disabled={!workflow.deliverable}
            aria-label={`${workflow.status === "active" ? "Pause" : "Activate"} ${workflow.name}`}
            onCheckedChange={(on) => onToggle(workflow, on)}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${workflow.name}`}
            onClick={onArchive}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
