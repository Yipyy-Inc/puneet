"use client";

import { useState } from "react";
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
import { useCreateRule, useUpdateRule } from "@/lib/api/automations";
import { TRIGGER_META, triggersByCategory } from "@/lib/automations/triggers";
import type {
  RealAutomationRule,
  RealMessageTemplate,
} from "@/types/automations";
import { LocationScopeField } from "./location-scope-field";

// ============================================================================
// Writing a rule.
//
// ── THE TRIGGER LIST IS GENERATED, NOT TYPED OUT ──────────────────────────
//
// `triggersByCategory()` reads `automationTriggerEnum`. The version this
// replaces hand-wrote eight options while the enum held seventeen, so nine
// seeded rules used triggers the dropdown could not display — and because a
// Radix Select with no matching item shows its placeholder, opening one of
// those rules looked like a rule with no trigger, and picking anything
// overwrote it. Generating the list means that cannot recur, and
// `bun run check:automation-triggers` covers the database half.
//
// ── THE TRIGGER IS FIXED AFTER CREATION ───────────────────────────────────
//
// On an existing rule the trigger is shown but not editable. A rule's trigger
// is its identity: changing it in place turns "Booking Confirmation" into
// something that fires on check-out while keeping its name, its send count and
// its history. The API refuses it too — this is not a UI-only guard.
//
// ── A NEW RULE IS ALWAYS CREATED SWITCHED OFF ─────────────────────────────
//
// There is no enable control here at all. It lives on the list row, where the
// person clicking it can see what the rule says first. The API refuses
// `enabled: true` on create.
// ============================================================================

export function AutomationRuleEditor({
  rule,
  templates,
  onDone,
}: {
  rule: RealAutomationRule | null;
  templates: RealMessageTemplate[];
  onDone: () => void;
}) {
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const [name, setName] = useState(rule?.name ?? "");
  const [trigger, setTrigger] = useState(rule?.trigger ?? "booking_created");
  const [emailTemplateId, setEmailTemplateId] = useState(
    rule?.emailTemplateId ?? "",
  );
  const [smsTemplateId, setSmsTemplateId] = useState(rule?.smsTemplateId ?? "");
  const [isTransactional, setIsTransactional] = useState(
    rule?.isTransactional ?? false,
  );
  const [locationIds, setLocationIds] = useState<string[]>(
    rule?.locationIds ?? [],
  );

  const emailTemplates = templates.filter((t) => t.channel === "email");
  const smsTemplates = templates.filter((t) => t.channel === "sms");

  const selectedEmail = emailTemplates.find((t) => t.id === emailTemplateId);
  const selectedSms = smsTemplates.find((t) => t.id === smsTemplateId);
  const preview = selectedEmail ?? selectedSms;

  const busy = createRule.isPending || updateRule.isPending;
  const canSave = name.trim().length > 0 && (emailTemplateId || smsTemplateId);

  function save() {
    // NONE is the sentinel for "no template on this channel". A Radix
    // SelectItem cannot carry value="" — it throws, and the modal renders as a
    // component that silently does nothing.
    const email = emailTemplateId === "NONE" ? null : emailTemplateId || null;
    const sms = smsTemplateId === "NONE" ? null : smsTemplateId || null;

    if (rule) {
      updateRule.mutate(
        {
          id: rule.id,
          patch: {
            name: name.trim(),
            emailTemplateId: email,
            smsTemplateId: sms,
            isTransactional,
            locationIds,
          },
        },
        {
          onSuccess: () => {
            toast.success("Rule updated.");
            onDone();
          },
          onError: (error: Error) => toast.error(error.message),
        },
      );
      return;
    }

    createRule.mutate(
      {
        name: name.trim(),
        trigger,
        emailTemplateId: email,
        smsTemplateId: sms,
        isTransactional,
        locationIds,
      },
      {
        onSuccess: () => {
          toast.success("Rule created — switched off. Turn it on when ready.");
          onDone();
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {rule ? "Edit Automation Rule" : "Create Automation Rule"}
        </DialogTitle>
        <DialogDescription>
          {rule
            ? "Change what this rule says. Turning it on and off is done from the list."
            : "New rules are created switched off, so you can read what they send before anyone receives it."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="space-y-2">
          <Label htmlFor="rule-name">Rule name</Label>
          <Input
            id="rule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Booking Confirmation Email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rule-trigger">When this happens</Label>
          {rule ? (
            <div className="rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">
                {TRIGGER_META[rule.trigger].label}
              </span>
              <p className="text-muted-foreground mt-1 text-xs">
                A rule&apos;s trigger cannot be changed after it is created —
                that would rewrite its history. Create a new rule instead.
              </p>
            </div>
          ) : (
            <Select
              value={trigger}
              onValueChange={(value) =>
                setTrigger(value as RealAutomationRule["trigger"])
              }
            >
              <SelectTrigger id="rule-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggersByCategory().map((group) => (
                  <SelectGroup key={group.category}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.triggers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TRIGGER_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-muted-foreground text-xs">
            {TRIGGER_META[trigger].description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TemplatePicker
            id="email-template"
            label="Email template"
            value={emailTemplateId}
            onChange={setEmailTemplateId}
            options={emailTemplates}
          />
          <TemplatePicker
            id="sms-template"
            label="Text template"
            value={smsTemplateId}
            onChange={setSmsTemplateId}
            options={smsTemplates}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          One template per channel. Set both to send an email and a text; set
          one to send only that.
        </p>

        {preview && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Preview</span>
              {preview.variables.map((v) => (
                <Badge key={v} variant="secondary" className="text-xs">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
            {preview.subject && (
              <p className="text-sm font-medium">{preview.subject}</p>
            )}
            <pre className="text-muted-foreground font-sans text-xs whitespace-pre-wrap">
              {preview.body}
            </pre>
          </div>
        )}

        <LocationScopeField value={locationIds} onChange={setLocationIds} />

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={isTransactional}
            onChange={(e) => setIsTransactional(e.target.checked)}
          />
          <span>
            This confirms something the customer asked for
            <span className="text-muted-foreground block text-xs">
              Transactional messages still reach someone who unsubscribed from
              marketing — a booking confirmation has to arrive. Leave this off
              for anything promotional.
            </span>
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={!canSave || busy}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {rule ? "Update rule" : "Create rule"}
        </Button>
      </div>
    </>
  );
}

function TemplatePicker({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: RealMessageTemplate[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || "NONE"} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          {/* "NONE", never "". Radix throws on an empty SelectItem value, and
              the symptom is a modal that opens and then does nothing. */}
          <SelectItem value="NONE">None</SelectItem>
          {options.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
