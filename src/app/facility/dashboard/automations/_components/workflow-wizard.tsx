"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { LocationScopeField } from "./location-scope-field";
import {
  useAudienceEstimate,
  useCreateWorkflow,
  useUpdateWorkflow,
  type NewWorkflow,
} from "@/lib/api/workflows";
import { TRIGGER_META, triggersByCategory } from "@/lib/automations/triggers";
import { DELIVERABLE_TRIGGERS } from "@/types/automations";
import type { RealMessageTemplate } from "@/types/automations";
import {
  AUDIENCE_FIELDS,
  STOP_CONDITIONS,
  describeStopConditions,
  type Audience,
  type Workflow,
} from "@/types/workflows";

// ============================================================================
// Creating a workflow, in four steps.
//
// ── THE ESTIMATE IS A REAL QUERY, NOT A GUESS ─────────────────────────────
//
// "About N clients match" comes from `count_audience()` in Postgres, debounced,
// as the filter is edited. The segment builder already in this app freezes a
// customerIds[] array at save time and never re-runs its filters, so a saved
// segment there is a photograph of one moment. This asks the question every
// time, and the scheduled run asks the same question through the same function
// — so the number on screen and the number messaged cannot disagree.
//
// ── UNSUBSCRIBE IS NOT A CHECKBOX HERE ────────────────────────────────────
//
// The spec lists it among the stop conditions. It is not one: suppression is
// enforced inside the sender, against every message from every source, keyed by
// address. A per-workflow opt-out would mean somebody who unsubscribed from one
// sequence still receives the next — which under CASL is a compliance failure
// and, more simply, is rude. The screen states it as a fact instead.
// ============================================================================

const STEPS = ["Name & trigger", "Who and when", "The sequence", "Review"];

interface DraftStep {
  delayMinutes: number;
  emailTemplateId: string | null;
  smsTemplateId: string | null;
}

const EMPTY_AUDIENCE: Audience = {
  groupLogicOperator: "AND",
  filterGroups: [{ filters: [] }],
};

export function WorkflowWizard({
  templates,
  existing,
  onDone,
}: {
  templates: RealMessageTemplate[];
  /** Present when editing. Its `kind` and `trigger` are fixed - see below. */
  existing?: Workflow | null;
  onDone: () => void;
}) {
  const editing = Boolean(existing);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(existing?.name ?? "");
  const [kind, setKind] = useState<"event" | "audience">(
    existing?.kind ?? "event",
  );
  const [trigger, setTrigger] = useState(
    existing?.trigger ?? "booking_created",
  );
  const [audience, setAudience] = useState<Audience>(
    existing?.audience ?? EMPTY_AUDIENCE,
  );
  const [frequency, setFrequency] = useState<string>(
    existing?.frequency ?? "weekly",
  );
  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(existing?.dayOfMonth ?? 1);
  const [sendAt, setSendAt] = useState(existing?.sendAtLocal ?? "09:00");
  const [cooldown, setCooldown] = useState(existing?.minDaysBetweenSends ?? 30);
  const [stopOn, setStopOn] = useState<string[]>(
    existing?.stopOn ?? ["booked"],
  );
  // Empty means EVERY location, never none — the same convention the engine
  // uses, so an untouched picker cannot silently scope a workflow to nobody.
  const [locationIds, setLocationIds] = useState<string[]>(
    existing?.locationIds ?? [],
  );
  const [serviceTypes, setServiceTypes] = useState<string[]>(
    existing?.serviceTypes ?? [],
  );
  const [narrowBy, setNarrowBy] = useState<Audience | null>(
    existing?.triggerFilters ?? null,
  );
  const [steps, setSteps] = useState<DraftStep[]>(
    existing && existing.steps.length > 0
      ? existing.steps.map((s) => ({
          delayMinutes: s.delayMinutes,
          emailTemplateId: s.emailTemplateId,
          smsTemplateId: s.smsTemplateId,
        }))
      : [{ delayMinutes: 0, emailTemplateId: null, smsTemplateId: null }],
  );

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const estimate = useAudienceEstimate();
  const [matched, setMatched] = useState<{ n: number; total: number } | null>(
    null,
  );
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const emailTemplates = templates.filter((t) => t.channel === "email");
  const smsTemplates = templates.filter((t) => t.channel === "sms");

  const filters = audience.filterGroups[0]?.filters ?? [];

  // Debounced, because it runs a real count query on every keystroke otherwise.
  const estimateMutate = estimate.mutate;
  useEffect(() => {
    if (kind !== "audience" || filters.length === 0) {
      setMatched(null);
      setEstimateError(null);
      return;
    }
    const timer = setTimeout(() => {
      estimateMutate(audience, {
        onSuccess: (r) => {
          setMatched({ n: r.matched, total: r.total });
          setEstimateError(null);
        },
        // The compiler raises on an unknown field rather than matching
        // everybody, so its own words are the most useful thing to show.
        onError: (e: Error) => {
          setMatched(null);
          setEstimateError(e.message);
        },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [audience, kind, filters.length, estimateMutate]);

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1)
      return kind === "event" ? Boolean(trigger) : filters.length > 0;
    if (step === 2)
      return steps.every((s) => s.emailTemplateId || s.smsTemplateId);
    return true;
  }, [step, name, kind, trigger, filters.length, steps]);

  function save(activate: boolean) {
    const payload: NewWorkflow = {
      name: name.trim(),
      kind,
      trigger: kind === "event" ? trigger : null,
      audience: kind === "audience" ? audience : null,
      frequency: kind === "audience" ? frequency : null,
      dayOfWeek:
        kind === "audience" && frequency === "weekly" ? dayOfWeek : null,
      dayOfMonth:
        kind === "audience" && frequency === "monthly" ? dayOfMonth : null,
      sendAtLocal: kind === "audience" ? sendAt : null,
      minDaysBetweenSends: cooldown,
      stopOn,
      locationIds,
      serviceTypes: kind === "event" ? serviceTypes : [],
      triggerFilters: kind === "event" ? narrowBy : null,
      steps,
    };

    if (existing) {
      // `kind` and `trigger` are NOT sent: they are the workflow's identity and
      // the API refuses to change them. Editing one in place would turn a
      // post-checkout follow-up into something that fires on booking while
      // keeping its name, its enrolments and its send history.
      updateWorkflow.mutate(
        {
          id: existing.id,
          patch: {
            name: payload.name,
            audience: payload.audience,
            frequency: payload.frequency,
            dayOfWeek: payload.dayOfWeek,
            dayOfMonth: payload.dayOfMonth,
            sendAtLocal: payload.sendAtLocal,
            minDaysBetweenSends: payload.minDaysBetweenSends,
            stopOn: payload.stopOn,
            locationIds: payload.locationIds,
            serviceTypes: payload.serviceTypes,
            triggerFilters: payload.triggerFilters,
            steps: payload.steps,
            ...(activate ? { status: "active" as const } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success(activate ? `"${payload.name}" is live.` : "Saved.");
            onDone();
          },
          onError: (e: Error) => toast.error(e.message),
        },
      );
      return;
    }

    createWorkflow.mutate(payload, {
      onSuccess: (created) => {
        if (!activate) {
          toast.success("Saved as a draft.");
          onDone();
          return;
        }
        // Created as a draft, then activated — the API refuses to create one
        // live, so activation is always a second, deliberate call.
        void fetch(`/api/workflows/${created.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        })
          .then(async (r) => {
            const b = (await r.json().catch(() => null)) as {
              error?: string;
            } | null;
            if (!r.ok) throw new Error(b?.error ?? "Could not switch it on.");
            toast.success(`"${created.name}" is live.`);
          })
          .catch((e: Error) => toast.warning(`Saved as a draft — ${e.message}`))
          .finally(onDone);
      },
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editing ? `Edit ${existing?.name}` : "Create a Smart Workflow"}
        </DialogTitle>
        <DialogDescription>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </DialogDescription>
      </DialogHeader>

      <ol className="flex flex-wrap gap-2 py-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs disabled:opacity-40"
              data-active={i === step}
            >
              {i < step ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <span className="text-muted-foreground">{i + 1}</span>
              )}
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-76 space-y-5 py-2">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="wf-name">Workflow name</Label>
              <Input
                id="wf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vaccine Reminder Sequence"
              />
            </div>
            {editing && (
              <p className="text-muted-foreground rounded-md border p-2 text-xs">
                A workflow&apos;s type and starting action cannot be changed
                after it is created — that would rewrite the history of everyone
                already enrolled. Create a new one instead.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <KindCard
                disabled={editing}
                selected={kind === "event"}
                onSelect={() => setKind("event")}
                icon={Zap}
                title="Action-based"
                body="Starts when a client does something — books, checks out. Best for welcome series and post-visit follow-ups."
              />
              <KindCard
                disabled={editing}
                selected={kind === "audience"}
                onSelect={() => setKind("audience")}
                icon={CalendarClock}
                title="Scheduled audience"
                body="Re-checks a filter on a schedule and sends to whoever matches. Best for vaccine reminders and win-backs."
              />
            </div>
          </>
        )}

        {step === 1 && kind === "event" && (
          <div className="space-y-2">
            <Label htmlFor="wf-trigger">What starts this workflow?</Label>
            <Select
              value={trigger}
              onValueChange={setTrigger}
              disabled={editing}
            >
              <SelectTrigger id="wf-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggersByCategory().map((group) => (
                  <SelectGroup key={group.category}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.triggers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TRIGGER_META[t].label}
                        {!DELIVERABLE_TRIGGERS.has(t) &&
                          " — not yet delivering"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {TRIGGER_META[trigger as keyof typeof TRIGGER_META]?.description}
            </p>
            {!DELIVERABLE_TRIGGERS.has(trigger) && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Nothing emits this action yet. You can build and keep the
                workflow, but it cannot be switched on until that lands.
              </p>
            )}

            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <Label className="text-sm">Only for these services</Label>
                <p className="text-muted-foreground text-xs">
                  Leave all unticked for every service.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["grooming", "boarding", "daycare", "training"].map((svc) => (
                  <button
                    key={svc}
                    type="button"
                    data-on={serviceTypes.includes(svc)}
                    onClick={() =>
                      setServiceTypes(
                        serviceTypes.includes(svc)
                          ? serviceTypes.filter((x) => x !== svc)
                          : [...serviceTypes, svc],
                      )
                    }
                    className="rounded-full border px-3 py-1 text-xs data-[on=true]:border-emerald-500 data-[on=true]:bg-emerald-50"
                  >
                    {svc[0].toUpperCase() + svc.slice(1)}
                  </button>
                ))}
              </div>

              <div className="border-t pt-3">
                <Label className="text-sm">Only for certain clients</Label>
                <p className="text-muted-foreground mb-2 text-xs">
                  The same filters a scheduled workflow uses, checked when the
                  action happens. &ldquo;Lapsed clients who just booked&rdquo;,
                  for instance.
                </p>
                {narrowBy === null ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNarrowBy({
                        groupLogicOperator: "AND",
                        filterGroups: [
                          {
                            filters: [
                              {
                                field: "last_visit_days",
                                operator: "more_than",
                                value: 90,
                              },
                            ],
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 size-3" /> Add a client filter
                  </Button>
                ) : (
                  <>
                    <FilterRows audience={narrowBy} setAudience={setNarrowBy} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setNarrowBy(null)}
                    >
                      Remove all client filters
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 1 && kind === "audience" && (
          <AudienceStep
            audience={audience}
            setAudience={setAudience}
            matched={matched}
            error={estimateError}
            pending={estimate.isPending}
            frequency={frequency}
            setFrequency={setFrequency}
            dayOfWeek={dayOfWeek}
            setDayOfWeek={setDayOfWeek}
            dayOfMonth={dayOfMonth}
            setDayOfMonth={setDayOfMonth}
            sendAt={sendAt}
            setSendAt={setSendAt}
            cooldown={cooldown}
            setCooldown={setCooldown}
          />
        )}

        {step === 2 && (
          <SequenceStep
            steps={steps}
            setSteps={setSteps}
            emailTemplates={emailTemplates}
            smsTemplates={smsTemplates}
            stopOn={stopOn}
            setStopOn={setStopOn}
          />
        )}

        {step === 3 && (
          <>
            <LocationScopeField value={locationIds} onChange={setLocationIds} />
            <ReviewStep
              name={name}
              kind={kind}
              trigger={trigger}
              filters={filters.length}
              matched={matched}
              frequency={frequency}
              sendAt={sendAt}
              steps={steps}
              cooldown={cooldown}
              stopOn={stopOn}
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? onDone() : setStep(step - 1))}
          disabled={createWorkflow.isPending || updateWorkflow.isPending}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => save(false)}
              disabled={createWorkflow.isPending || updateWorkflow.isPending}
            >
              Save as draft
            </Button>
            <Button
              onClick={() => save(true)}
              disabled={createWorkflow.isPending || updateWorkflow.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save &amp; switch on
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function KindCard({
  selected,
  onSelect,
  disabled,
  icon: Icon,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  icon: typeof Zap;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      data-selected={selected}
      className="rounded-lg border p-4 text-left transition disabled:opacity-50 data-[selected=true]:border-emerald-500 data-[selected=true]:bg-emerald-50/60"
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4" /> {title}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{body}</p>
    </button>
  );
}

function AudienceStep(props: {
  audience: Audience;
  setAudience: (a: Audience) => void;
  matched: { n: number; total: number } | null;
  error: string | null;
  pending: boolean;
  frequency: string;
  setFrequency: (v: string) => void;
  dayOfWeek: number;
  setDayOfWeek: (v: number) => void;
  dayOfMonth: number;
  setDayOfMonth: (v: number) => void;
  sendAt: string;
  setSendAt: (v: string) => void;
  cooldown: number;
  setCooldown: (v: number) => void;
}) {
  const filters = props.audience.filterGroups[0]?.filters ?? [];

  function update(next: typeof filters) {
    props.setAudience({
      groupLogicOperator: "AND",
      filterGroups: [{ filters: next }],
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Who should receive this?</Label>
        {filters.length === 0 && (
          <p className="text-muted-foreground text-xs">
            No filters yet — a workflow with no filter reaches nobody, so add at
            least one.
          </p>
        )}
        <FilterRows audience={props.audience} setAudience={props.setAudience} />

        <div className="rounded-md border p-3 text-sm">
          {props.error ? (
            <span className="text-rose-700">{props.error}</span>
          ) : props.pending ? (
            <span className="text-muted-foreground">Counting…</span>
          ) : props.matched ? (
            <>
              <span className="font-medium">
                About {props.matched.n}{" "}
                {props.matched.n === 1 ? "client" : "clients"}
              </span>
              {props.matched.total > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  — {Math.round((props.matched.n / props.matched.total) * 100)}%
                  of {props.matched.total}
                </span>
              )}
              {props.matched.n === 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Nobody matches right now. The workflow will still run on its
                  schedule and send to whoever matches then.
                </p>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              Add a filter to see how many clients it names.
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>How often?</Label>
          <Select value={props.frequency} onValueChange={props.setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Every day</SelectItem>
              <SelectItem value="weekly">Every week</SelectItem>
              <SelectItem value="monthly">Every month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>At what time?</Label>
          <TimePickerLux
            value={props.sendAt}
            onValueChange={props.setSendAt}
            displayMode="dialog"
            stepMinutes={30}
          />
        </div>

        {props.frequency === "weekly" && (
          <div className="space-y-2">
            <Label>Which day?</Label>
            <Select
              value={String(props.dayOfWeek)}
              onValueChange={(v) => props.setDayOfWeek(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {props.frequency === "monthly" && (
          <div className="space-y-2">
            <Label htmlFor="wf-dom">Day of the month</Label>
            <Input
              id="wf-dom"
              type="number"
              min={1}
              max={31}
              value={props.dayOfMonth}
              onChange={(e) => props.setDayOfMonth(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              Months without that date use their last day.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="wf-cooldown">Don&apos;t re-send within</Label>
          <Input
            id="wf-cooldown"
            type="number"
            min={0}
            value={props.cooldown}
            onChange={(e) => props.setCooldown(Number(e.target.value))}
          />
          <p className="text-muted-foreground text-xs">
            Days. Without this, a daily filter messages the same people every
            day for as long as they keep matching.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The filter builder itself, shared by the scheduled-audience step and the
 * action-based "only for certain clients" narrowing.
 *
 * One component, so the two cannot end up offering different fields or
 * meaning different things by the same operator — and both produce exactly
 * the shape `compile_audience()` reads.
 */
function FilterRows({
  audience,
  setAudience,
}: {
  audience: Audience;
  setAudience: (a: Audience) => void;
}) {
  const filters = audience.filterGroups[0]?.filters ?? [];

  function update(next: typeof filters) {
    setAudience({
      groupLogicOperator: "AND",
      filterGroups: [{ filters: next }],
    });
  }

  return (
    <>
      {filters.map((f, i) => {
        const def = AUDIENCE_FIELDS.find((d) => d.field === f.field);
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Select
              value={f.field}
              onValueChange={(field) => {
                const d = AUDIENCE_FIELDS.find((x) => x.field === field);
                const next = [...filters];
                next[i] = {
                  field,
                  operator: d?.operators[0].value ?? "is",
                  value: null,
                };
                update(next);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_FIELDS.map((d) => (
                  <SelectItem key={d.field} value={d.field}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={f.operator}
              onValueChange={(operator) => {
                const next = [...filters];
                next[i] = { ...next[i], operator };
                update(next);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(def?.operators ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FilterValue
              def={def}
              operator={f.operator}
              value={f.value}
              onChange={(value) => {
                const next = [...filters];
                next[i] = { ...next[i], value };
                update(next);
              }}
            />

            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove filter"
              onClick={() => update(filters.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          update([
            ...filters,
            { field: "last_visit_days", operator: "more_than", value: 30 },
          ])
        }
      >
        <Plus className="mr-1 size-3" /> Add filter
      </Button>
    </>
  );
}

function FilterValue({
  def,
  operator,
  value,
  onChange,
}: {
  def: (typeof AUDIENCE_FIELDS)[number] | undefined;
  operator: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (!def) return null;

  // Operators that carry their own meaning need no value at all.
  if (
    operator === "expired" ||
    operator === "missing" ||
    def.input === "services"
  ) {
    if (def.input === "services") {
      return (
        <Select
          value={
            Array.isArray(value) && value.length ? String(value[0]) : "grooming"
          }
          onValueChange={(v) => onChange([v])}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["grooming", "boarding", "daycare", "training"].map((s) => (
              <SelectItem key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return null;
  }

  if (def.input === "boolean") {
    return (
      <Select
        value={value === false ? "false" : "true"}
        onValueChange={(v) => onChange(v === "true")}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (def.input === "membership") {
    return (
      <Select
        value={typeof value === "string" ? value : "active"}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (def.input === "tag") {
    return (
      <Input
        className="w-52"
        placeholder="Tag id"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (def.input === "date") {
    return (
      <Input
        type="date"
        className="w-44"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      type="number"
      className="w-28"
      placeholder={"placeholder" in def ? def.placeholder : undefined}
      value={typeof value === "number" ? value : ""}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function SequenceStep({
  steps,
  setSteps,
  emailTemplates,
  smsTemplates,
  stopOn,
  setStopOn,
}: {
  steps: DraftStep[];
  setSteps: (s: DraftStep[]) => void;
  emailTemplates: RealMessageTemplate[];
  smsTemplates: RealMessageTemplate[];
  stopOn: string[];
  setStopOn: (s: string[]) => void;
}) {
  function patch(i: number, next: Partial<DraftStep>) {
    const copy = [...steps];
    copy[i] = { ...copy[i], ...next };
    setSteps(copy);
  }

  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Step {i + 1}</span>
            {steps.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove step ${i + 1}`}
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`delay-${i}`} className="text-xs">
                {i === 0 ? "Wait after the trigger" : "Wait after step " + i}
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id={`delay-${i}`}
                  type="number"
                  min={0}
                  value={Math.round(s.delayMinutes / 1440)}
                  onChange={(e) =>
                    patch(i, { delayMinutes: Number(e.target.value) * 1440 })
                  }
                />
                <span className="text-muted-foreground text-xs">days</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email template</Label>
              <Select
                value={s.emailTemplateId ?? "NONE"}
                onValueChange={(v) =>
                  patch(i, { emailTemplateId: v === "NONE" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {emailTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Text template</Label>
              <Select
                value={s.smsTemplateId ?? "NONE"}
                onValueChange={(v) =>
                  patch(i, { smsTemplateId: v === "NONE" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {smsTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!s.emailTemplateId && !s.smsTemplateId && (
            <p className="text-xs text-amber-700">
              This step has nothing to send. Pick a template.
            </p>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setSteps([
            ...steps,
            { delayMinutes: 2880, emailTemplateId: null, smsTemplateId: null },
          ])
        }
      >
        <Plus className="mr-1 size-3" /> Add step
      </Button>

      <div className="space-y-2 rounded-lg border p-3">
        <Label className="text-sm">Stop the sequence when…</Label>
        {STOP_CONDITIONS.map((c) => (
          <label key={c.value} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={stopOn.includes(c.value)}
              onChange={(e) =>
                setStopOn(
                  e.target.checked
                    ? [...stopOn, c.value]
                    : stopOn.filter((x) => x !== c.value),
                )
              }
            />
            <span>
              {c.label}
              <span className="text-muted-foreground block text-xs">
                {c.hint}
              </span>
            </span>
          </label>
        ))}
        <p className="text-muted-foreground border-t pt-2 text-xs">
          Anyone who has unsubscribed is always excluded — from this and every
          other message. That is enforced when the message is sent, so it is not
          a setting here.
        </p>
        {/* This was a third checkbox until the button existed. It could only
            ever have been a control with no off position: unticking it must
            not take away staff's ability to pull one person out. */}
        <p className="text-muted-foreground text-xs">
          Staff can always stop the sequence for one client by hand, from the
          workflow&apos;s detail panel. Anything queued for them is cancelled
          with it.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  name,
  kind,
  trigger,
  filters,
  matched,
  frequency,
  sendAt,
  steps,
  cooldown,
  stopOn,
}: {
  name: string;
  kind: "event" | "audience";
  trigger: string;
  filters: number;
  matched: { n: number; total: number } | null;
  frequency: string;
  sendAt: string;
  steps: DraftStep[];
  cooldown: number;
  stopOn: string[];
}) {
  const rows: [string, string][] = [
    ["Name", name],
    [
      "Starts",
      kind === "event"
        ? (TRIGGER_META[trigger as keyof typeof TRIGGER_META]?.label ?? trigger)
        : `${frequency} at ${sendAt}, for ${filters} filter${filters === 1 ? "" : "s"}`,
    ],
    [
      "Reaches",
      kind === "audience"
        ? matched
          ? `about ${matched.n} clients today`
          : "not counted yet"
        : "whoever triggers it",
    ],
    ["Messages", `${steps.length} step${steps.length === 1 ? "" : "s"}`],
    ["Re-send guard", `no more often than every ${cooldown} days`],
    ["Stops when", describeStopConditions(stopOn)],
  ];

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 p-3 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {kind === "event" && !DELIVERABLE_TRIGGERS.has(trigger) && (
          <Badge variant="outline" className="border-amber-300 text-amber-800">
            Can be saved, but not switched on yet
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Switching it on means real customers start receiving these messages.
        Saving as a draft keeps everything and sends nothing.
      </p>
    </div>
  );
}
