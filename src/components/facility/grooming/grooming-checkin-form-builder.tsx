"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Camera,
  ToggleLeft,
  ListChecks,
  Type as TypeIcon,
  AlignLeft,
  CheckSquare,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import type {
  ExpressCheckinQuestion,
  ExpressCheckinQuestionType,
} from "@/types/grooming";

const QUESTION_TYPE_META: Record<
  ExpressCheckinQuestionType,
  { label: string; icon: React.ElementType; needsOptions: boolean }
> = {
  text: { label: "Short text", icon: TypeIcon, needsOptions: false },
  "long-text": { label: "Long text", icon: AlignLeft, needsOptions: false },
  "yes-no": { label: "Yes / No", icon: ToggleLeft, needsOptions: false },
  "single-select": {
    label: "Single select",
    icon: ListChecks,
    needsOptions: true,
  },
  "multi-select": {
    label: "Multi-select",
    icon: CheckSquare,
    needsOptions: true,
  },
  photo: { label: "Photo upload", icon: Camera, needsOptions: false },
};

const facility = facilities.find((f) => f.id === 11);
type GroomingConfig = NonNullable<
  (typeof facility & { groomingCheckinConfig?: unknown }) extends never
    ? never
    : NonNullable<
        Extract<
          typeof facility,
          { groomingCheckinConfig?: unknown }
        >["groomingCheckinConfig"]
      >
>;

function readInitialConfig() {
  const raw = (facility as { groomingCheckinConfig?: GroomingConfig })
    ?.groomingCheckinConfig;
  if (raw) return raw;
  return {
    enabled: true,
    sendBefore: 24,
    reminderHours: 6,
    requireBeforePhotos: true,
    requireAfterPhotos: true,
    questions: [] as ExpressCheckinQuestion[],
  };
}

let _qSeq = 1;
function nextQuestionId(): string {
  _qSeq += 1;
  return `q-${Date.now().toString(36)}-${_qSeq}`;
}

export function GroomingCheckinFormBuilder({
  isEditing,
}: {
  isEditing: boolean;
}) {
  const initial = readInitialConfig();
  const [enabled, setEnabled] = useState<boolean>(initial.enabled);
  const [sendBefore, setSendBefore] = useState<number>(initial.sendBefore);
  const [reminderHours, setReminderHours] = useState<number>(
    initial.reminderHours,
  );
  const [requireBeforePhotos, setRequireBeforePhotos] = useState<boolean>(
    initial.requireBeforePhotos,
  );
  const [requireAfterPhotos, setRequireAfterPhotos] = useState<boolean>(
    (initial as { requireAfterPhotos?: boolean }).requireAfterPhotos ?? true,
  );
  const [questions, setQuestions] = useState<ExpressCheckinQuestion[]>(
    initial.questions as ExpressCheckinQuestion[],
  );

  function updateQuestion(
    index: number,
    patch: Partial<ExpressCheckinQuestion>,
  ) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const target = index + dir;
      if (target < 0 || target >= qs.length) return qs;
      const next = qs.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        id: nextQuestionId(),
        label: "New question",
        type: "text",
        required: false,
      },
    ]);
  }

  function handleSave() {
    if (facility) {
      (facility as Record<string, unknown>).groomingCheckinConfig = {
        enabled,
        sendBefore,
        reminderHours,
        requireBeforePhotos,
        requireAfterPhotos,
        questions,
      };
    }
    toast.success("Grooming Express Check-In form saved");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/20">
        <div className="flex items-start gap-2 text-sky-900 dark:text-sky-200">
          <Send className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold">
              The grooming Express Check-In form is sent automatically before
              each appointment.
            </p>
            <p className="opacity-90">
              Clients fill in your questions ahead of arrival. The groomer sees
              every answer in the pre-visit briefing on the appointment.
            </p>
          </div>
        </div>
      </div>

      <ToggleRow
        label="Send the Express Check-In form for grooming"
        hint="Auto-emails / SMS-es the form link to the client after they book."
        checked={enabled}
        onCheckedChange={setEnabled}
        disabled={!isEditing}
      />

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Hours before appointment to send</Label>
            <Select
              value={String(sendBefore)}
              onValueChange={(v) => setSendBefore(Number(v))}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">48 hours before</SelectItem>
                <SelectItem value="72">72 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Send reminder</Label>
            <Select
              value={String(reminderHours)}
              onValueChange={(v) => setReminderHours(Number(v))}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 hours before</SelectItem>
                <SelectItem value="6">6 hours before</SelectItem>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Separator />

      <ToggleRow
        label="Require before photos during the session"
        hint="The session panel won't let the groomer Mark Ready until at least one before photo is taken. Turn off for low-effort bathing appointments."
        checked={requireBeforePhotos}
        onCheckedChange={setRequireBeforePhotos}
        disabled={!isEditing}
      />

      <ToggleRow
        label="Require after photos before marking Ready for Pickup"
        hint="The groomer must take at least one after photo before the appointment can move to Ready for Pickup. After photos attach to the Report Card alongside the before photos."
        checked={requireAfterPhotos}
        onCheckedChange={setRequireAfterPhotos}
        disabled={!isEditing}
      />

      <Separator />

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <Label className="text-sm">Form questions</Label>
            <p className="text-muted-foreground text-xs">
              Clients answer these before they arrive. The groomer sees the
              responses in the pre-visit briefing.
            </p>
          </div>
          {isEditing && (
            <Button size="sm" variant="outline" onClick={addQuestion}>
              <Plus className="mr-1.5 size-3.5" />
              Add question
            </Button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-xs">
            No questions yet. Add the first one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {questions.map((q, i) => {
              const meta = QUESTION_TYPE_META[q.type];
              const Icon = meta.icon;
              return (
                <li
                  key={q.id}
                  className="rounded-lg border bg-card px-3 py-3 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    {isEditing && (
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="size-3.5 rotate-90" />
                        </button>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="text-muted-foreground size-3.5" />
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                          {meta.label}
                        </span>
                        {q.required && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            Required
                          </span>
                        )}
                      </div>
                      <Input
                        value={q.label}
                        onChange={(e) =>
                          updateQuestion(i, { label: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="Question label"
                        className="text-sm"
                      />
                      <Input
                        value={q.helperText ?? ""}
                        onChange={(e) =>
                          updateQuestion(i, {
                            helperText: e.target.value || undefined,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Helper text (optional)"
                        className="text-muted-foreground text-xs"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Select
                          value={q.type}
                          onValueChange={(v) =>
                            updateQuestion(i, {
                              type: v as ExpressCheckinQuestionType,
                              options:
                                QUESTION_TYPE_META[
                                  v as ExpressCheckinQuestionType
                                ].needsOptions
                                  ? (q.options ?? ["Option 1", "Option 2"])
                                  : undefined,
                            })
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(
                                QUESTION_TYPE_META,
                              ) as ExpressCheckinQuestionType[]
                            ).map((t) => (
                              <SelectItem
                                key={t}
                                value={t}
                                className="text-xs"
                              >
                                {QUESTION_TYPE_META[t].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-xs">
                          <span>Required</span>
                          <Switch
                            checked={q.required}
                            onCheckedChange={(v) =>
                              updateQuestion(i, { required: v })
                            }
                            disabled={!isEditing}
                          />
                        </label>
                      </div>
                      {meta.needsOptions && (
                        <Textarea
                          value={(q.options ?? []).join("\n")}
                          onChange={(e) =>
                            updateQuestion(i, {
                              options: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          disabled={!isEditing}
                          placeholder="One option per line"
                          rows={3}
                          className="text-xs"
                        />
                      )}
                      {q.type === "photo" && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                          <ImageIcon className="size-3" />
                          Client can upload one or more photos with their
                          answer.
                        </p>
                      )}
                    </div>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0 p-0"
                        onClick={() => removeQuestion(i)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isEditing && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save form</Button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
