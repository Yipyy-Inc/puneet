"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  X,
  HelpCircle,
} from "lucide-react";
import type {
  AssigneeRole,
  ContactMethod,
  FollowUpProtocol,
  FollowUpProtocolStep,
  IncidentSeverity,
  IncidentType,
} from "@/types/incidents";

interface ProtocolEditorDialogProps {
  protocol: FollowUpProtocol | null;
  onSave: (protocol: FollowUpProtocol) => void;
  onCancel: () => void;
}

const SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const TYPES: IncidentType[] = [
  "injury",
  "illness",
  "behavioral",
  "accident",
  "escape",
  "fight",
  "other",
];

const CONTACT_METHODS: { value: ContactMethod; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS / text" },
  { value: "in_person", label: "In person" },
  { value: "video_call", label: "Video call" },
  { value: "other", label: "Other / internal" },
];

const ASSIGNEE_ROLES: { value: AssigneeRole; label: string; help: string }[] = [
  {
    value: "reporter",
    label: "Staff who reported",
    help: "The person who filed the incident",
  },
  {
    value: "manager",
    label: "On-duty manager",
    help: "Whoever is the manager when the task is due",
  },
  {
    value: "shift_lead",
    label: "Shift lead on duty",
    help: "The shift lead the day this task fires",
  },
  {
    value: "owner_contact",
    label: "Facility owner",
    help: "Senior contact / facility owner",
  },
  {
    value: "any_staff",
    label: "Any available staff",
    help: "First available staff member can claim it",
  },
  {
    value: "specific",
    label: "Specific person",
    help: "Always the same named staff member",
  },
];

function emptyStep(order: number): FollowUpProtocolStep {
  return {
    id: `step-new-${Date.now()}-${order}`,
    order,
    title: "",
    description: "",
    instructions: "",
    daysAfterIncident: 0,
    hoursAfterIncident: 0,
    contactMethod: "phone",
    assigneeRole: "reporter",
    questionsToAsk: [],
    requiresPhoto: false,
    requiresClientResponse: true,
  };
}

export function ProtocolEditorDialog({
  protocol,
  onSave,
  onCancel,
}: ProtocolEditorDialogProps) {
  const isNew = !protocol;
  const [name, setName] = useState(protocol?.name ?? "");
  const [description, setDescription] = useState(protocol?.description ?? "");
  const [severityScopes, setSeverityScopes] = useState<IncidentSeverity[]>(
    protocol?.severityScopes ?? [],
  );
  const [typeScopes, setTypeScopes] = useState<IncidentType[]>(
    protocol?.typeScopes ?? [],
  );
  const [isDefault, setIsDefault] = useState(protocol?.isDefault ?? false);
  const [isActive, setIsActive] = useState(protocol?.isActive ?? true);
  const [steps, setSteps] = useState<FollowUpProtocolStep[]>(
    protocol?.steps ?? [emptyStep(1)],
  );
  const [expandedStep, setExpandedStep] = useState<string | null>(
    protocol?.steps[0]?.id ?? steps[0]?.id ?? null,
  );

  const toggleSeverity = (s: IncidentSeverity) => {
    setSeverityScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const toggleType = (t: IncidentType) => {
    setTypeScopes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const updateStep = (
    id: string,
    update: Partial<FollowUpProtocolStep>,
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...update } : s)),
    );
  };

  const addStep = () => {
    const newStep = emptyStep(steps.length + 1);
    setSteps((prev) => [...prev, newStep]);
    setExpandedStep(newStep.id);
  };

  const removeStep = (id: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })),
    );
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const isValid =
    name.trim().length > 0 &&
    steps.length > 0 &&
    steps.every((s) => s.title.trim().length > 0);

  const handleSave = () => {
    const now = new Date().toISOString();
    const next: FollowUpProtocol = {
      id: protocol?.id ?? `proto-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      severityScopes,
      typeScopes,
      isDefault,
      isActive,
      steps,
      createdBy: protocol?.createdBy ?? "Current User",
      createdAt: protocol?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(next);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClipboardList className="size-5" />
          {isNew ? "New Follow-Up Protocol" : `Edit: ${protocol?.name}`}
        </DialogTitle>
        <DialogDescription>
          Design the procedure your staff will follow when an incident matching
          this scope is reported.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* ── Basics ─────────────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Protocol Name *
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Critical Bite Incident Follow-Up"
                />
              </div>
              <div className="flex items-center justify-end gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                  Default for scope
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="When this protocol fires and what it accomplishes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Scope ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label className="text-sm font-semibold">
                Triggers for these severities
              </Label>
              <p className="text-muted-foreground text-xs">
                The protocol will be suggested when an incident matches.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SEVERITIES.map((s) => {
                  const active = severityScopes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeverity(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">
                And these incident types
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TYPES.map((t) => {
                  const active = typeScopes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Steps ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Procedure Steps</h4>
              <p className="text-muted-foreground text-xs">
                Each step becomes an automatically-scheduled follow-up task on
                the assignee&apos;s daily list.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="mr-1.5 size-4" />
              Add Step
            </Button>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => (
              <StepEditor
                key={step.id}
                step={step}
                expanded={expandedStep === step.id}
                isFirst={idx === 0}
                isLast={idx === steps.length - 1}
                onToggle={() =>
                  setExpandedStep(expandedStep === step.id ? null : step.id)
                }
                onUpdate={(u) => updateStep(step.id, u)}
                onMove={(dir) => moveStep(step.id, dir)}
                onRemove={() => removeStep(step.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          {isNew ? "Create Protocol" : "Save Changes"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Step Editor (collapsible card) ────────────────────────────────

interface StepEditorProps {
  step: FollowUpProtocolStep;
  expanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onUpdate: (update: Partial<FollowUpProtocolStep>) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}

function StepEditor({
  step,
  expanded,
  isFirst,
  isLast,
  onToggle,
  onUpdate,
  onMove,
  onRemove,
}: StepEditorProps) {
  const [newQuestion, setNewQuestion] = useState("");

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    onUpdate({ questionsToAsk: [...step.questionsToAsk, q] });
    setNewQuestion("");
  };

  const removeQuestion = (idx: number) => {
    onUpdate({
      questionsToAsk: step.questionsToAsk.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card>
      <CardContent className="p-3">
        {/* Collapsed header */}
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-0.5 pt-0.5">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={isFirst}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <GripVertical className="text-muted-foreground size-3.5" />
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={isLast}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="hover:bg-muted/40 flex flex-1 items-center gap-3 rounded-md p-1.5 text-left"
          >
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {step.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {step.title || (
                  <span className="text-muted-foreground italic">
                    Untitled step
                  </span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {formatScheduleHint(step)} · {step.contactMethod.replace("_", " ")}
              </p>
            </div>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive size-8"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Step Title *</Label>
              <Input
                value={step.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="e.g. 24-hour wellness check-in"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Short Description</Label>
              <Input
                value={step.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="One sentence shown on the daily task list"
              />
            </div>

            {/* Schedule + Contact + Assignee */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Days After</Label>
                <Input
                  type="number"
                  min={0}
                  value={step.daysAfterIncident}
                  onChange={(e) =>
                    onUpdate({
                      daysAfterIncident: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hours After</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={step.hoursAfterIncident}
                  onChange={(e) =>
                    onUpdate({
                      hoursAfterIncident: Math.max(
                        0,
                        Math.min(23, Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Method</Label>
                <Select
                  value={step.contactMethod}
                  onValueChange={(v) =>
                    onUpdate({ contactMethod: v as ContactMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned To</Label>
                <Select
                  value={step.assigneeRole}
                  onValueChange={(v) =>
                    onUpdate({ assigneeRole: v as AssigneeRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {step.assigneeRole === "specific" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Specific staff name
                </Label>
                <Input
                  value={step.assigneeName ?? ""}
                  onChange={(e) =>
                    onUpdate({ assigneeName: e.target.value })
                  }
                  placeholder="e.g. Emma Wilson"
                />
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Step-by-Step Instructions
              </Label>
              <Textarea
                value={step.instructions}
                onChange={(e) => onUpdate({ instructions: e.target.value })}
                placeholder={`What should the staff member do? Be specific.\n\n1) Open with...\n2) Confirm pet's status...\n3) Ask...`}
                rows={5}
              />
            </div>

            {/* Questions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <HelpCircle className="size-3.5" />
                Questions to Ask
                <span className="text-muted-foreground font-normal">
                  ({step.questionsToAsk.length})
                </span>
              </Label>
              {step.questionsToAsk.length > 0 && (
                <ul className="space-y-1.5">
                  {step.questionsToAsk.map((q, idx) => (
                    <li
                      key={idx}
                      className="bg-muted/40 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
                    >
                      <span className="text-muted-foreground text-xs">
                        {idx + 1}.
                      </span>
                      <span className="flex-1">{q}</span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                  placeholder="Type a question and press Enter"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  disabled={!newQuestion.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={step.requiresClientResponse}
                  onCheckedChange={(v) =>
                    onUpdate({ requiresClientResponse: Boolean(v) })
                  }
                />
                Requires client response
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={step.requiresPhoto}
                  onCheckedChange={(v) =>
                    onUpdate({ requiresPhoto: Boolean(v) })
                  }
                />
                Requires photo proof
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Label className="text-xs">Escalate after</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-16"
                  value={step.escalateAfterAttempts ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      escalateAfterAttempts: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
                <span className="text-muted-foreground text-xs">
                  failed attempts
                </span>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px]">
              Step #{step.order} · scheduled {formatScheduleHint(step)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatScheduleHint(step: FollowUpProtocolStep): string {
  const { daysAfterIncident: d, hoursAfterIncident: h } = step;
  if (d === 0 && h === 0) return "immediately after incident";
  const parts = [];
  if (d > 0) parts.push(`${d} day${d === 1 ? "" : "s"}`);
  if (h > 0) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  return `${parts.join(" ")} after incident`;
}
