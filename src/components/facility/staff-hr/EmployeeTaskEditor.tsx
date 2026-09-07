"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  EMPLOYEE_TASK_LABEL,
  EMPLOYEE_TASK_FIELDS,
  type EmployeeFieldSpec,
  type EmployeeOnboardingTask,
  type EmployeeOnboardingTaskType,
  type CustomQuestionFormat,
} from "@/data/staff-onboarding";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Types that only make sense once per template (fixed collected-field shapes).
const SINGLE_TYPES: EmployeeOnboardingTaskType[] = [
  "personal_info",
  "contact_details",
  "banking",
  "availability",
  "emergency_contact",
  "uniform_prefs",
];
// Types the facility can add many of (each names its own document / question).
const MULTI_TYPES: EmployeeOnboardingTaskType[] = [
  "document_upload",
  "document_sign",
  "custom_question",
];
const ALL_TYPES: EmployeeOnboardingTaskType[] = [
  ...SINGLE_TYPES,
  ...MULTI_TYPES,
];

const QUESTION_FORMATS: { value: CustomQuestionFormat; key: string }[] = [
  { value: "text", key: "fmtText" },
  { value: "multiple_choice", key: "fmtMultipleChoice" },
  { value: "file", key: "fmtFile" },
];

function newEmployeeTask(
  type: EmployeeOnboardingTaskType,
): EmployeeOnboardingTask {
  return {
    id: `et-${type}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    type,
    name: EMPLOYEE_TASK_LABEL[type],
    required: true,
    fields: EMPLOYEE_TASK_FIELDS[type],
    ...(type === "document_upload" || type === "document_sign"
      ? { documentName: "" }
      : {}),
    ...(type === "document_sign" ? { agreementText: "" } : {}),
    ...(type === "custom_question"
      ? { question: { format: "text" as CustomQuestionFormat, prompt: "" } }
      : {}),
  };
}

interface EmployeeTaskEditorProps {
  tasks: EmployeeOnboardingTask[];
  onChange: (tasks: EmployeeOnboardingTask[]) => void;
}

export function EmployeeTaskEditor({
  tasks,
  onChange,
}: EmployeeTaskEditorProps) {
  const t = useSettingsText().section("onboarding-templates");

  // The type's name and the fields it collects live in a src/data fixture, so
  // they cannot know a locale. The catalogue answers by key and falls back to
  // the fixture's English on a miss — a field added to the fixture later then
  // reads as English words rather than as a raw key.
  const typeLabel = (type: EmployeeOnboardingTaskType) => {
    const key = `type_${type}`;
    const label = t(key);
    return label === key ? EMPLOYEE_TASK_LABEL[type] : label;
  };
  const fieldLabel = (
    type: EmployeeOnboardingTaskType,
    field: EmployeeFieldSpec,
  ) => {
    const key = `field_${type}_${field.key}`;
    const label = t(key);
    return label === key ? field.label : label;
  };

  const patch = (id: string, p: Partial<EmployeeOnboardingTask>) =>
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const remove = (id: string) => onChange(tasks.filter((t) => t.id !== id));
  const add = (type: EmployeeOnboardingTaskType) =>
    onChange([...tasks, newEmployeeTask(type)]);

  const patchQuestion = (
    task: EmployeeOnboardingTask,
    p: Partial<NonNullable<EmployeeOnboardingTask["question"]>>,
  ) =>
    patch(task.id, {
      question: {
        format: task.question?.format ?? "text",
        prompt: task.question?.prompt ?? "",
        options: task.question?.options,
        ...p,
      },
    });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("noEmployeeTasks")}
          </p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {typeLabel(task.type)}
                </span>
                <label className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={task.required}
                    onCheckedChange={(v) => patch(task.id, { required: v })}
                  />
                  {t("required")}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title={t("remove")}
                  onClick={() => remove(task.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Document to upload — facility names it, employee uploads. */}
              {task.type === "document_upload" && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("documentName")}</Label>
                  <Input
                    value={task.documentName ?? ""}
                    placeholder={t("documentUploadPlaceholder")}
                    className="h-8"
                    onChange={(e) =>
                      patch(task.id, { documentName: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Document to read & sign — facility uploads the PDF; employee e-signs. */}
              {task.type === "document_sign" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("documentName")}</Label>
                    <Input
                      value={task.documentName ?? ""}
                      placeholder={t("documentSignPlaceholder")}
                      className="h-8"
                      onChange={(e) =>
                        patch(task.id, { documentName: e.target.value })
                      }
                    />
                  </div>
                  {/* ── THE WORDS, NOT A REFERENCE TO THEM ─────────────
                      This replaced an "Upload PDF" control that stored
                      `e.target.files[0].name` and nothing else — the FILENAME.
                      No file was ever uploaded, so a facility could attach
                      "employment-contract.pdf", see it listed, and have
                      nothing but a string.

                      The text lives here because it is what gets PROVEN.
                      `/api/staff-signatures` copies it into the signature row
                      and hashes it, so the record still says what was agreed
                      after this task is edited or deleted. A pointer to a
                      document somebody can change afterwards proves nothing,
                      which is why that route refuses to record a signature
                      against a task with no text at all. */}
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`agreement-${task.id}`}>
                      {t("agreementLabel")}
                    </Label>
                    <Textarea
                      id={`agreement-${task.id}`}
                      value={task.agreementText ?? ""}
                      rows={6}
                      placeholder={t("agreementPlaceholder")}
                      onChange={(e) =>
                        patch(task.id, { agreementText: e.target.value })
                      }
                    />
                    <p className="text-muted-foreground text-[11px]">
                      {task.agreementText?.trim()
                        ? t("agreementHelpFilled")
                        : t("agreementHelpEmpty")}
                    </p>
                  </div>
                </div>
              )}

              {/* Custom question — text / multiple-choice / file. */}
              {task.type === "custom_question" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("format")}</Label>
                      <Select
                        value={task.question?.format ?? "text"}
                        onValueChange={(v) =>
                          patchQuestion(task, {
                            format: v as CustomQuestionFormat,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="min-w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_FORMATS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {t(f.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={task.question?.prompt ?? ""}
                      placeholder={t("questionPrompt")}
                      className="h-8 flex-1"
                      onChange={(e) =>
                        patchQuestion(task, { prompt: e.target.value })
                      }
                    />
                  </div>
                  {task.question?.format === "multiple_choice" && (
                    <OptionsEditor
                      options={task.question?.options ?? []}
                      onChange={(options) => patchQuestion(task, { options })}
                    />
                  )}
                </div>
              )}

              {/* Fixed-shape sections show the fields they collect. */}
              {task.type !== "document_upload" &&
                task.type !== "document_sign" &&
                task.type !== "custom_question" && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.fields.map((f) => (
                      <Badge
                        key={f.key}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {fieldLabel(task.type, f)}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {ALL_TYPES.filter(
          (type) =>
            !(
              SINGLE_TYPES.includes(type) && tasks.some((t) => t.type === type)
            ),
        ).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => add(type)}
          >
            <Plus className="size-3.5" />
            {typeLabel(type)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (o: string[]) => void;
}) {
  const t = useSettingsText().section("onboarding-templates");

  return (
    <div className="space-y-2 pl-1">
      <Label className="text-xs">{t("choices")}</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            placeholder={t("choicePlaceholder").replace("{n}", String(i + 1))}
            className="h-8"
            onChange={(e) =>
              onChange(options.map((o, j) => (j === i ? e.target.value : o)))
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onChange([...options, ""])}
      >
        <Plus className="size-3.5" />
        {t("addChoice")}
      </Button>
    </div>
  );
}
