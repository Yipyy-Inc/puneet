"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Building2,
  CalendarCheck,
  Edit2,
  Save,
  X,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  OnboardingChecklist as OnboardingChecklistType,
  OnboardingStepStatus,
  onboardingSteps,
  getOnboardingProgress,
} from "@/data/crm/onboarding";

interface OnboardingChecklistProps {
  checklist: OnboardingChecklistType;
  onStepToggle?: (stepId: string, completed: boolean) => void;
  onStepNoteUpdate?: (stepId: string, notes: string) => void;
  readonly?: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface StepItemProps {
  step: OnboardingStepStatus;
  stepInfo: (typeof onboardingSteps)[0];
  onToggle?: (completed: boolean) => void;
  onNoteUpdate?: (notes: string) => void;
  readonly?: boolean;
}

function StepItem({
  step,
  stepInfo,
  onToggle,
  onNoteUpdate,
  readonly,
}: StepItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(step.notes);

  const handleSaveNote = () => {
    onNoteUpdate?.(noteValue);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setNoteValue(step.notes);
    setIsEditing(false);
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        step.completed ? "bg-green-50 border-green-200" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          {readonly ? (
            step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )
          ) : (
            <Checkbox
              checked={step.completed}
              onCheckedChange={(checked) => onToggle?.(checked as boolean)}
              className="h-5 w-5"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4
                className={`font-medium ${
                  step.completed ? "text-green-800" : ""
                }`}
              >
                {stepInfo.title}
                {stepInfo.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stepInfo.description}
              </p>
            </div>
            {step.completed && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 shrink-0"
              >
                Completed
              </Badge>
            )}
          </div>

          {step.completed && step.completedAt && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(step.completedAt)}
              </span>
              {step.completedBy && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {step.completedBy}
                </span>
              )}
            </div>
          )}

          {/* Notes Section */}
          <div className="mt-3">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Add notes..."
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNote}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {step.notes ? (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 flex-1">
                    {step.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes
                  </p>
                )}
                {!readonly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="shrink-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingChecklist({
  checklist,
  onStepToggle,
  onStepNoteUpdate,
  readonly = false,
}: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const progress = getOnboardingProgress(checklist);
  const completedSteps = checklist.steps.filter((s) => s.completed).length;
  const totalSteps = checklist.steps.length;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {checklist.facilityName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <CalendarCheck className="h-3 w-3" />
                    Started {formatDate(checklist.startedAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {completedSteps} / {totalSteps} steps
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {progress}% complete
                  </div>
                </div>
                {checklist.completedAt ? (
                  <Badge className="bg-green-100 text-green-800">
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="secondary">In Progress</Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {checklist.steps.map((step) => {
                const stepInfo = onboardingSteps.find(
                  (s) => s.id === step.stepId,
                );
                if (!stepInfo) return null;

                return (
                  <StepItem
                    key={step.stepId}
                    step={step}
                    stepInfo={stepInfo}
                    onToggle={(completed) =>
                      onStepToggle?.(step.stepId, completed)
                    }
                    onNoteUpdate={(notes) =>
                      onStepNoteUpdate?.(step.stepId, notes)
                    }
                    readonly={readonly}
                  />
                );
              })}
            </div>

            {checklist.completedAt && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    Onboarding completed on {formatDate(checklist.completedAt)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface OnboardingChecklistListProps {
  checklists: OnboardingChecklistType[];
  onStepToggle?: (
    checklistId: string,
    stepId: string,
    completed: boolean,
  ) => void;
  onStepNoteUpdate?: (
    checklistId: string,
    stepId: string,
    notes: string,
  ) => void;
  readonly?: boolean;
}

export function OnboardingChecklistList({
  checklists,
  onStepToggle,
  onStepNoteUpdate,
  readonly = false,
}: OnboardingChecklistListProps) {
  if (checklists.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No onboarding checklists</p>
        <p className="text-sm">
          Onboarding checklists will appear here when leads are converted to
          customers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => (
        <OnboardingChecklist
          key={checklist.id}
          checklist={checklist}
          onStepToggle={
            onStepToggle
              ? (stepId, completed) =>
                  onStepToggle(checklist.id, stepId, completed)
              : undefined
          }
          onStepNoteUpdate={
            onStepNoteUpdate
              ? (stepId, notes) => onStepNoteUpdate(checklist.id, stepId, notes)
              : undefined
          }
          readonly={readonly}
        />
      ))}
    </div>
  );
}
