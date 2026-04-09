"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CUSTOM_SERVICE_ADDON_LIBRARY,
  getModuleWorkflowQuestionnaire,
} from "@/data/custom-services";
import type {
  CustomServiceModule,
  FacilityResource,
  CustomServiceTaskTemplateQuestionnaireItem,
} from "@/types/facility";

type WorkflowState = NonNullable<CustomServiceModule["workflow"]>;

interface WorkflowQuestionnaireStepProps {
  data: CustomServiceModule;
  resources: FacilityResource[];
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

function QuestionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function YesNoControl({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={value ? "default" : "outline"}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="sm"
        variant={!value ? "default" : "outline"}
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  );
}

function nextWorkflowState(
  current: WorkflowState,
  updates: Partial<WorkflowState>,
): WorkflowState {
  return {
    ...current,
    ...updates,
    questionnaireCompleted: updates.questionnaireCompleted ?? false,
    questionnaireCompletedAt:
      updates.questionnaireCompletedAt ??
      (updates.questionnaireCompleted ? current.questionnaireCompletedAt : undefined),
  };
}

export function WorkflowQuestionnaireStep({
  data,
  resources,
  onChange,
}: WorkflowQuestionnaireStepProps) {
  const workflow = getModuleWorkflowQuestionnaire(data);

  const updateWorkflow = (updates: Partial<WorkflowState>) => {
    const next = nextWorkflowState(workflow, updates);

    onChange({
      workflow: next,
      calendar: {
        ...data.calendar,
        enabled: next.appearsOnCalendar,
        assignedTo: next.requiresResource
          ? data.calendar.assignedTo === "staff"
            ? "resource"
            : data.calendar.assignedTo
          : data.calendar.assignedTo,
        assignedResourceIds: next.requiresResource
          ? next.resourceIds
          : data.calendar.assignedResourceIds,
      },
      checkInOut: {
        ...data.checkInOut,
        enabled: next.requiresCheckInOut,
      },
      onlineBooking: {
        ...data.onlineBooking,
        enabled: next.bookableOnline,
      },
      capacity: {
        enabled: next.affectsCapacityHeatmap,
        maxPerSlot:
          next.capacityCeilingPerHour ?? data.capacity?.maxPerSlot ?? 1,
        slotDurationMinutes: data.capacity?.slotDurationMinutes ?? 60,
        resources: data.capacity?.resources ?? [],
        waitlistEnabled: data.capacity?.waitlistEnabled ?? false,
        maxWaitlist: data.capacity?.maxWaitlist ?? 0,
        autoPromote: data.capacity?.autoPromote ?? false,
        notifyOnAvailability: data.capacity?.notifyOnAvailability ?? false,
      },
      staffAssignment: {
        ...data.staffAssignment,
        taskGeneration: next.generatesTasks
          ? data.staffAssignment.taskGeneration
          : [],
      },
    });
  };

  const resourceOptions = resources.filter(
    (resource) =>
      workflow.resourceType === "custom" ||
      workflow.resourceType === "other" ||
      !workflow.resourceType
        ? true
        : resource.type === workflow.resourceType,
  );

  const addTaskTemplate = () => {
    const template: CustomServiceTaskTemplateQuestionnaireItem = {
      id: `workflow-task-${Date.now()}`,
      taskName: "",
      taskType: "care",
      timingRule: "before_start",
      offsetMinutes: 15,
      assignedStaffRole: data.staffAssignment.requiredRole || "general",
      requiresCompletionNote: false,
      requiresPhotoProof: false,
    };

    updateWorkflow({
      taskTemplates: [...workflow.taskTemplates, template],
    });
  };

  const updateTaskTemplate = (
    templateId: string,
    updates: Partial<CustomServiceTaskTemplateQuestionnaireItem>,
  ) => {
    updateWorkflow({
      taskTemplates: workflow.taskTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              ...updates,
            }
          : template,
      ),
    });
  };

  const removeTaskTemplate = (templateId: string) => {
    updateWorkflow({
      taskTemplates: workflow.taskTemplates.filter(
        (template) => template.id !== templateId,
      ),
    });
  };

  const toggleResource = (resourceId: string) => {
    const hasResource = workflow.resourceIds.includes(resourceId);
    updateWorkflow({
      resourceIds: hasResource
        ? workflow.resourceIds.filter((id) => id !== resourceId)
        : [...workflow.resourceIds, resourceId],
    });
  };

  const toggleAddOn = (addOnId: string) => {
    const selected = workflow.allowedAddOnIds.includes(addOnId);
    updateWorkflow({
      allowedAddOnIds: selected
        ? workflow.allowedAddOnIds.filter((id) => id !== addOnId)
        : [...workflow.allowedAddOnIds, addOnId],
    });
  };

  const hasRequiredFollowUps =
    (!workflow.appearsOnCalendar ||
      Boolean(workflow.calendarColor) && Boolean(workflow.calendarCardDisplayMode)) &&
    (!workflow.requiresResource ||
      (Boolean(workflow.resourceType) && workflow.resourceIds.length > 0)) &&
    (!workflow.generatesTasks ||
      workflow.taskTemplates.length > 0) &&
    (!workflow.allowsAddOns || workflow.allowedAddOnIds.length > 0) &&
    (!workflow.affectsCapacityHeatmap ||
      (workflow.capacityCeilingPerHour ?? 0) > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
        Every custom service must complete this setup before activation. The answers
        automatically configure calendar, booking, task, resource, online, and
        reporting behavior.
      </div>

      <QuestionCard title="Question 1 — Does this service appear on the Calendar?">
        <YesNoControl
          value={workflow.appearsOnCalendar}
          onChange={(value) => updateWorkflow({ appearsOnCalendar: value })}
        />
        {workflow.appearsOnCalendar && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Calendar color</Label>
              <Input
                type="color"
                value={workflow.calendarColor}
                onChange={(event) =>
                  updateWorkflow({ calendarColor: event.target.value })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default card display mode</Label>
              <Select
                value={workflow.calendarCardDisplayMode}
                onValueChange={(value) =>
                  updateWorkflow({
                    calendarCardDisplayMode:
                      value as WorkflowState["calendarCardDisplayMode"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-block">Full block</SelectItem>
                  <SelectItem value="compact-block">Compact block</SelectItem>
                  <SelectItem value="icon-only">Icon-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </QuestionCard>

      <QuestionCard title="Question 2 — Does it require time slots?">
        <YesNoControl
          value={workflow.requiresTimeSlots}
          onChange={(value) => updateWorkflow({ requiresTimeSlots: value })}
        />
      </QuestionCard>

      <QuestionCard title="Question 3 — Does it require a resource?">
        <YesNoControl
          value={workflow.requiresResource}
          onChange={(value) =>
            updateWorkflow({
              requiresResource: value,
              resourceIds: value ? workflow.resourceIds : [],
            })
          }
        />
        {workflow.requiresResource && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Resource type</Label>
              <Select
                value={workflow.resourceType}
                onValueChange={(value) =>
                  updateWorkflow({
                    resourceType: value as WorkflowState["resourceType"],
                    resourceIds: [],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="pool">Pool</SelectItem>
                  <SelectItem value="van">Vehicle</SelectItem>
                  <SelectItem value="yard">Yard</SelectItem>
                  <SelectItem value="custom">Custom resource</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {resourceOptions.map((resource) => (
                <label
                  key={resource.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
                >
                  <Checkbox
                    checked={workflow.resourceIds.includes(resource.id)}
                    onCheckedChange={() => toggleResource(resource.id)}
                  />
                  <span className="text-xs text-slate-700">{resource.name}</span>
                </label>
              ))}
              {resourceOptions.length === 0 && (
                <p className="text-xs text-slate-500">
                  No resources match this type yet. Add resources in facility settings.
                </p>
              )}
            </div>
          </div>
        )}
      </QuestionCard>

      <QuestionCard title="Question 4 — Does it require check-in / check-out?">
        <YesNoControl
          value={workflow.requiresCheckInOut}
          onChange={(value) =>
            updateWorkflow({
              requiresCheckInOut: value,
            })
          }
        />
      </QuestionCard>

      <QuestionCard title="Question 5 — Does it generate tasks?">
        <YesNoControl
          value={workflow.generatesTasks}
          onChange={(value) =>
            updateWorkflow({
              generatesTasks: value,
              taskTemplates: value ? workflow.taskTemplates : [],
            })
          }
        />

        {workflow.generatesTasks && (
          <div className="space-y-2">
            {workflow.taskTemplates.map((template) => (
              <div
                key={template.id}
                className="space-y-2 rounded-md border border-slate-200 p-3"
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={template.taskName}
                    onChange={(event) =>
                      updateTaskTemplate(template.id, {
                        taskName: event.target.value,
                      })
                    }
                    placeholder="Task name"
                  />
                  <Input
                    value={template.assignedStaffRole}
                    onChange={(event) =>
                      updateTaskTemplate(template.id, {
                        assignedStaffRole: event.target.value,
                      })
                    }
                    placeholder="Assigned staff role"
                  />
                  <Select
                    value={template.taskType}
                    onValueChange={(value) =>
                      updateTaskTemplate(template.id, {
                        taskType:
                          value as CustomServiceTaskTemplateQuestionnaireItem["taskType"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="care">Care</SelectItem>
                      <SelectItem value="feeding">Feeding</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="cleanup">Cleanup</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={template.timingRule}
                    onValueChange={(value) =>
                      updateTaskTemplate(template.id, {
                        timingRule:
                          value as CustomServiceTaskTemplateQuestionnaireItem["timingRule"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_start">Before service start</SelectItem>
                      <SelectItem value="at_check_in">At check-in</SelectItem>
                      <SelectItem value="after_check_out">After check-out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={template.offsetMinutes}
                    onChange={(event) =>
                      updateTaskTemplate(template.id, {
                        offsetMinutes: Number(event.target.value) || 0,
                      })
                    }
                    placeholder="Offset minutes"
                  />
                  <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
                    Requires note
                    <Switch
                      checked={template.requiresCompletionNote}
                      onCheckedChange={(checked) =>
                        updateTaskTemplate(template.id, {
                          requiresCompletionNote: checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
                    Requires photo proof
                    <Switch
                      checked={template.requiresPhotoProof}
                      onCheckedChange={(checked) =>
                        updateTaskTemplate(template.id, {
                          requiresPhotoProof: checked,
                        })
                      }
                    />
                  </label>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTaskTemplate(template.id)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Remove template
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addTaskTemplate}>
              <Plus className="mr-1 size-3.5" />
              Add task template
            </Button>
          </div>
        )}
      </QuestionCard>

      <QuestionCard title="Question 6 — Does it allow add-ons?">
        <YesNoControl
          value={workflow.allowsAddOns}
          onChange={(value) =>
            updateWorkflow({
              allowsAddOns: value,
              allowedAddOnIds: value ? workflow.allowedAddOnIds : [],
            })
          }
        />

        {workflow.allowsAddOns && (
          <div className="grid gap-2 md:grid-cols-2">
            {CUSTOM_SERVICE_ADDON_LIBRARY.map((addOn) => (
              <label
                key={addOn.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
              >
                <Checkbox
                  checked={workflow.allowedAddOnIds.includes(addOn.id)}
                  onCheckedChange={() => toggleAddOn(addOn.id)}
                />
                <span className="text-xs text-slate-700">{addOn.name}</span>
              </label>
            ))}
          </div>
        )}
      </QuestionCard>

      <QuestionCard title="Question 7 — Is it bookable online?">
        <YesNoControl
          value={workflow.bookableOnline}
          onChange={(value) => updateWorkflow({ bookableOnline: value })}
        />
        {workflow.bookableOnline && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Online booking lead time (hours, optional)</Label>
              <Input
                type="number"
                min={0}
                value={workflow.onlineLeadTimeHours ?? ""}
                onChange={(event) =>
                  updateWorkflow({
                    onlineLeadTimeHours:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Online capacity limit (optional)</Label>
              <Input
                type="number"
                min={1}
                value={workflow.onlineCapacityLimit ?? ""}
                onChange={(event) =>
                  updateWorkflow({
                    onlineCapacityLimit:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        )}
      </QuestionCard>

      <QuestionCard title="Question 8 — Does it affect capacity and coverage heatmap?">
        <YesNoControl
          value={workflow.affectsCapacityHeatmap}
          onChange={(value) =>
            updateWorkflow({
              affectsCapacityHeatmap: value,
              capacityCeilingPerHour: value
                ? workflow.capacityCeilingPerHour
                : undefined,
            })
          }
        />
        {workflow.affectsCapacityHeatmap && (
          <div className="space-y-1.5">
            <Label>Capacity ceiling per hour</Label>
            <Input
              type="number"
              min={1}
              value={workflow.capacityCeilingPerHour ?? ""}
              onChange={(event) =>
                updateWorkflow({
                  capacityCeilingPerHour:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              placeholder="Example: 3"
            />
          </div>
        )}
      </QuestionCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">Questionnaire status</span>
          {workflow.questionnaireCompleted ? (
            <Badge className="bg-emerald-100 text-emerald-700">Complete</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700">Incomplete</Badge>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!hasRequiredFollowUps}
          onClick={() =>
            updateWorkflow({
              questionnaireCompleted: true,
              questionnaireCompletedAt: new Date().toISOString(),
            })
          }
        >
          Confirm Questionnaire Responses
        </Button>
      </div>
    </div>
  );
}
