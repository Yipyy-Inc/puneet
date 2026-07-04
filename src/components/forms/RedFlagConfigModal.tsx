"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formQueries, formMutations } from "@/lib/api/forms";
import type { Form, RedFlagConfig, RedFlagRule } from "@/types/forms";

interface RedFlagConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
}

export function RedFlagConfigModal({
  open,
  onOpenChange,
  facilityId,
}: RedFlagConfigModalProps) {
  const config = useQuery({
    ...formQueries.redFlags(),
    enabled: open,
  });
  const forms = useQuery({
    ...formQueries.byFacility(facilityId),
    enabled: open,
  });

  const ready = config.data && forms.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-red-600" />
            Red-flag answers
          </DialogTitle>
          <DialogDescription>
            Define what counts as a red-flag answer. Matching submissions
            trigger the &ldquo;Red-flag answers detected&rdquo; staff
            notification.
          </DialogDescription>
        </DialogHeader>

        {!ready ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RedFlagEditor
            initial={config.data!}
            forms={forms.data!}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

let _ruleSeq = 0;
function newRuleId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rule-${(_ruleSeq += 1)}`;
}

function RedFlagEditor({
  initial,
  forms,
  onClose,
}: {
  initial: RedFlagConfig;
  forms: Form[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [rules, setRules] = useState<RedFlagRule[]>(initial.rules);

  const addKeyword = () => {
    const k = keywordDraft.trim();
    if (!k) return;
    if (!keywords.some((x) => x.toLowerCase() === k.toLowerCase())) {
      setKeywords([...keywords, k]);
    }
    setKeywordDraft("");
  };

  const addRule = () => {
    const first = forms[0];
    setRules([
      ...rules,
      {
        id: newRuleId(),
        formId: first?.id ?? "",
        formName: first?.name ?? "",
        questionId: "",
        questionLabel: "",
        operator: "equals",
        value: "",
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<RedFlagRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const save = useMutation({
    ...formMutations.saveRedFlags({
      keywords,
      // Keep only rules pointing at a real question with a trigger value.
      rules: rules.filter((r) => r.questionId && r.value.trim()),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", "red-flags"] });
      toast.success("Red-flag configuration saved");
      onClose();
    },
  });

  return (
    <>
      <div className="max-h-[60vh] space-y-6 overflow-y-auto py-1 pr-1">
        {/* Keywords */}
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Flag keywords</h3>
            <p className="text-muted-foreground text-xs">
              Any free-text answer containing one of these words is flagged.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.length === 0 && (
              <span className="text-muted-foreground text-xs">
                No keywords yet.
              </span>
            )}
            {keywords.map((k) => (
              <span
                key={k}
                className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
              >
                {k}
                <button
                  type="button"
                  onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                  className="hover:text-red-900"
                  aria-label={`Remove ${k}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="e.g. aggression"
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              disabled={!keywordDraft.trim()}
              onClick={addKeyword}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </section>

        {/* Question → answer rules */}
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">
              Question &amp; answer rules
            </h3>
            <p className="text-muted-foreground text-xs">
              Flag when a specific question is answered a certain way — e.g.
              &ldquo;Has your dog shown aggression?&rdquo; is &ldquo;Yes&rdquo;.
            </p>
          </div>
          {rules.length === 0 && (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
              No rules yet. Add one below.
            </p>
          )}
          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                forms={forms}
                onChange={(patch) => updateRule(rule.id, patch)}
                onRemove={() => removeRule(rule.id)}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={forms.length === 0}
            onClick={addRule}
          >
            <Plus className="size-3.5" />
            Add rule
          </Button>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save configuration"}
        </Button>
      </DialogFooter>
    </>
  );
}

function RuleRow({
  rule,
  forms,
  onChange,
  onRemove,
}: {
  rule: RedFlagRule;
  forms: Form[];
  onChange: (patch: Partial<RedFlagRule>) => void;
  onRemove: () => void;
}) {
  const selectedForm = forms.find((f) => f.id === rule.formId);
  const question = selectedForm?.questions.find(
    (q) => q.id === rule.questionId,
  );
  const valueOptions =
    question?.type === "yes_no"
      ? [
          { value: "Yes", label: "Yes" },
          { value: "No", label: "No" },
        ]
      : (question?.options ?? []);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        {/* Form */}
        <Select
          value={rule.formId}
          onValueChange={(v) => {
            const f = forms.find((x) => x.id === v);
            onChange({
              formId: v,
              formName: f?.name ?? "",
              questionId: "",
              questionLabel: "",
              value: "",
            });
          }}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Form" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-8 shrink-0"
          onClick={onRemove}
          aria-label="Remove rule"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Question */}
        <Select
          value={rule.questionId}
          onValueChange={(v) => {
            const q = selectedForm?.questions.find((x) => x.id === v);
            onChange({
              questionId: v,
              questionLabel: q?.label ?? "",
              value: "",
            });
          }}
          disabled={!selectedForm || selectedForm.questions.length === 0}
        >
          <SelectTrigger className="h-8 min-w-[180px] flex-1 text-xs">
            <SelectValue placeholder="Question" />
          </SelectTrigger>
          <SelectContent>
            {selectedForm?.questions.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator */}
        <Select
          value={rule.operator}
          onValueChange={(v) =>
            onChange({ operator: v as RedFlagRule["operator"] })
          }
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">is</SelectItem>
            <SelectItem value="contains">contains</SelectItem>
          </SelectContent>
        </Select>

        {/* Value */}
        {valueOptions.length > 0 ? (
          <Select
            value={rule.value}
            onValueChange={(v) => onChange({ value: v })}
          >
            <SelectTrigger className="h-8 min-w-[120px] flex-1 text-xs">
              <SelectValue placeholder="Answer" />
            </SelectTrigger>
            <SelectContent>
              {valueOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={rule.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Answer"
            className="h-8 min-w-[120px] flex-1 text-xs"
          />
        )}
      </div>
    </div>
  );
}
