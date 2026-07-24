"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, FileText } from "lucide-react";
import {
  EMPLOYEE_TASK_LABEL,
  EMPLOYEE_TASK_FIELDS,
  type EmployeeOnboardingTask,
  type EmployeeOnboardingTaskType,
  type CustomQuestionFormat,
} from "@/data/staff-onboarding";

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

const QUESTION_FORMATS: { value: CustomQuestionFormat; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "file", label: "File upload" },
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
    ...(type === "document_sign" ? { documentRef: "" } : {}),
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
            No employee tasks yet — add from the list below.
          </p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {EMPLOYEE_TASK_LABEL[task.type]}
                </span>
                <label className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={task.required}
                    onCheckedChange={(v) => patch(task.id, { required: v })}
                  />
                  Required
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title="Remove"
                  onClick={() => remove(task.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Document to upload — facility names it, employee uploads. */}
              {task.type === "document_upload" && (
                <div className="space-y-1">
                  <Label className="text-xs">Document name</Label>
                  <Input
                    value={task.documentName ?? ""}
                    placeholder="e.g. Government photo ID"
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
                    <Label className="text-xs">Document name</Label>
                    <Input
                      value={task.documentName ?? ""}
                      placeholder="e.g. Employment contract"
                      className="h-8"
                      onChange={(e) =>
                        patch(task.id, { documentName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Facility PDF (employee signs)
                    </Label>
                    {task.documentRef ? (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="text-muted-foreground size-4" />
                        <span className="truncate">{task.documentRef}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => patch(task.id, { documentRef: "" })}
                        >
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <label className="border-muted-foreground/30 hover:bg-muted/50 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-sm">
                        <Upload className="size-4" />
                        Upload PDF
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) =>
                            patch(task.id, {
                              documentRef: e.target.files?.[0]?.name ?? "",
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Custom question — text / multiple-choice / file. */}
              {task.type === "custom_question" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Format</Label>
                      <Select
                        value={task.question?.format ?? "text"}
                        onValueChange={(v) =>
                          patchQuestion(task, {
                            format: v as CustomQuestionFormat,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-8 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_FORMATS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={task.question?.prompt ?? ""}
                      placeholder="Question prompt"
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
                        {f.label}
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
            {EMPLOYEE_TASK_LABEL[type]}
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
  return (
    <div className="space-y-2 pl-1">
      <Label className="text-xs">Choices</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            placeholder={`Choice ${i + 1}`}
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
        Add choice
      </Button>
    </div>
  );
}
