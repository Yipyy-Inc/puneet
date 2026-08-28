"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Mail,
  MessageSquare,
  Send,
  Settings,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { RebookRemindersCard } from "@/components/communications/RebookRemindersCard";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/skeletons";
import { automationQueries, useUpdateRule } from "@/lib/api/automations";
import {
  CATEGORY_LABEL,
  TRIGGER_META,
  type AutomationTrigger,
  type TriggerCategory,
} from "@/lib/automations/triggers";
import type { RealAutomationRule } from "@/types/automations";
import { AutomationRuleEditor } from "./automation-rule-editor";
import { SmartWorkflowsTab } from "./smart-workflows-tab";

// ============================================================================
// The automations screen, reading Postgres.
//
// ── WHAT CHANGED, AND WHY IT MATTERS MORE THAN IT LOOKS ───────────────────
//
// The previous version of this screen rendered eighteen rules, four KPI tiles,
// per-rule "Total Sent" figures and "Last Triggered" dates — all of it literals
// in `src/data/communications-hub.ts`. Its save handler was
// `console.log(formData)`. Nothing had ever been sent.
//
// So the numbers here are deliberately austere. Every count is derived from
// `message_sends`; a facility that has sent nothing sees zero, because zero is
// the true answer and 1,392 was not.
//
// ── "NOT YET DELIVERING" ──────────────────────────────────────────────────
//
// Sixteen of the nineteen triggers have no emitter yet. Those rules are still
// listed and still editable — hiding them is exactly what caused the bug this
// work exists to fix, where nine rules used triggers the editor could not show
// and touching the dropdown silently rewrote them. Instead the row says so and
// the switch is disabled, so nobody turns on a rule expecting messages.
// ============================================================================

const TAB_ORDER: (TriggerCategory | "all" | "rebook" | "campaign")[] = [
  "all",
  "booking",
  "reminder",
  "rebook",
  "payment",
  "forms",
  "recovery",
  "campaign",
];

const TAB_LABEL: Record<string, string> = {
  all: "All Rules",
  ...CATEGORY_LABEL,
  rebook: "Rebook Reminders",
  campaign: "Smart Workflows",
};

export function AutomationsClient() {
  const [editing, setEditing] = useState<RealAutomationRule | null>(null);
  const [creating, setCreating] = useState(false);

  const rules = useQuery(automationQueries.rules());
  const templates = useQuery(automationQueries.templates());
  const updateRule = useUpdateRule();

  const list = useMemo(() => rules.data ?? [], [rules.data]);

  const stats = useMemo(() => {
    const active = list.filter((r) => r.enabled).length;
    const sent = list.reduce((total, r) => total + r.totalSent, 0);
    const email = list.filter((r) => r.emailTemplateId).length;
    const sms = list.filter((r) => r.smsTemplateId).length;
    return { active, sent, email, sms, total: list.length };
  }, [list]);

  const undeliverable = list.filter((r) => !r.deliverable).length;

  function toggle(rule: RealAutomationRule, next: boolean) {
    updateRule.mutate(
      { id: rule.id, patch: { enabled: next } },
      {
        onSuccess: () =>
          toast.success(
            next ? `"${rule.name}" is on.` : `"${rule.name}" is off.`,
          ),
        // The server refuses an enable it cannot honour — nothing emits that
        // trigger, or the channel has no credentials. Show its reason rather
        // than a generic failure: the reason is the whole message.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Messages Yipyy sends on your behalf when something happens. Managers
            and admins only.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Create Automation Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Active Automations"
          value={rules.isLoading ? "—" : stats.active}
          hint={`of ${stats.total} total`}
          icon={Zap}
          tone="indigo"
          alert={
            undeliverable > 0
              ? { label: `${undeliverable} not yet delivering`, tone: "amber" }
              : undefined
          }
        />
        <KpiTile
          label="Messages Sent"
          value={rules.isLoading ? "—" : stats.sent}
          hint="All time, from these rules"
          icon={Send}
          tone="emerald"
        />
        <KpiTile
          label="Email Rules"
          value={rules.isLoading ? "—" : stats.email}
          hint="Rules with an email template"
          icon={Mail}
          tone="violet"
        />
        <KpiTile
          label="SMS Rules"
          value={rules.isLoading ? "—" : stats.sms}
          hint="Rules with a text template"
          icon={MessageSquare}
          tone="amber"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap">
          {TAB_ORDER.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABEL[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <RuleList
            rules={list}
            loading={rules.isLoading}
            error={rules.error}
            onEdit={setEditing}
            onToggle={toggle}
            emptyHint="No automation rules yet. Create one to start sending."
          />
        </TabsContent>

        {(["booking", "reminder", "payment", "forms", "recovery"] as const).map(
          (category) => (
            <TabsContent key={category} value={category}>
              <RuleList
                rules={list.filter(
                  (r) =>
                    TRIGGER_META[r.trigger as AutomationTrigger].category ===
                    category,
                )}
                loading={rules.isLoading}
                error={rules.error}
                onEdit={setEditing}
                onToggle={toggle}
                emptyHint={`No ${CATEGORY_LABEL[category].toLowerCase()} rules yet.`}
              />
            </TabsContent>
          ),
        )}

        <TabsContent value="rebook">
          {/* Still fixture-backed. Converting the rebook engine is its own
              piece of work; leaving the screen in place beats deleting a
              feature people use to make a boundary look tidy. */}
          <RebookRemindersCard />
        </TabsContent>

        <TabsContent value="campaign">
          <SmartWorkflowsTab templates={templates.data ?? []} />
        </TabsContent>
      </Tabs>

      <Dialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <AutomationRuleEditor
            rule={editing}
            templates={templates.data ?? []}
            onDone={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleList({
  rules,
  loading,
  error,
  onEdit,
  onToggle,
  emptyHint,
}: {
  rules: RealAutomationRule[];
  loading: boolean;
  error: Error | null;
  onEdit: (rule: RealAutomationRule) => void;
  onToggle: (rule: RealAutomationRule, next: boolean) => void;
  emptyHint: string;
}) {
  if (loading) return <TableSkeleton rows={5} cols={4} />;

  if (error) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          <AlertTriangle className="mx-auto mb-3 size-8 text-amber-500" />
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          {emptyHint}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => {
        const meta = TRIGGER_META[rule.trigger as AutomationTrigger];
        return (
          <Card key={rule.id} data-enabled={rule.enabled}>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{rule.name}</span>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? "Active" : "Inactive"}
                  </Badge>
                  {!rule.deliverable && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-700"
                      title={
                        meta.timeDriven
                          ? "This fires at a moment in time and needs the scheduled run, which is not built yet."
                          : "Nothing emits this event yet."
                      }
                    >
                      <Ban className="mr-1 size-3" /> Not yet delivering
                    </Badge>
                  )}
                  {rule.emailTemplateId && (
                    <Badge variant="outline">
                      <Mail className="mr-1 size-3" /> Email
                    </Badge>
                  )}
                  {rule.smsTemplateId && (
                    <Badge variant="outline">
                      <MessageSquare className="mr-1 size-3" /> SMS
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {meta.label} — {meta.description}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {rule.totalSent === 0
                    ? "Never sent"
                    : `Sent ${rule.totalSent}×`}
                  {rule.lastTriggeredAt
                    ? ` · last ${new Date(rule.lastTriggeredAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* The inline toggle. It replaces a four-click round trip
                    through a modal whose Save button did nothing. */}
                <Switch
                  checked={rule.enabled}
                  disabled={!rule.deliverable}
                  aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                  onCheckedChange={(next) => onToggle(rule, next)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${rule.name}`}
                  onClick={() => onEdit(rule)}
                >
                  <Settings className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
