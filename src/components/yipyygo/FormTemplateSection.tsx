"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  YipyyGoConfig,
  FormSection,
  CustomQuestion,
  CustomQuestionType,
  MultiPetBehavior,
} from "@/data/yipyygo-config";
import {
  QUESTION_TYPE_LABELS,
  MULTI_PET_BEHAVIOR_LABELS,
} from "@/data/yipyygo-config";

interface FormTemplateSectionProps {
  config: YipyyGoConfig;
  onConfigChange: (updates: Partial<YipyyGoConfig>) => void;
}

export function FormTemplateSection({
  config,
  onConfigChange,
}: FormTemplateSectionProps) {
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    const sections = { ...config.formTemplate.sections };
    const section = sections[sectionId as keyof typeof sections];
    if (section && typeof section === "object" && "enabled" in section) {
      (section as FormSection).enabled = enabled;
      onConfigChange({ formTemplate: { ...config.formTemplate, sections } });
    }
  };

  const handleSectionRequired = (sectionId: string, required: boolean) => {
    const sections = { ...config.formTemplate.sections };
    const section = sections[sectionId as keyof typeof sections];
    if (section && typeof section === "object" && "required" in section) {
      (section as FormSection).required = required;
      onConfigChange({ formTemplate: { ...config.formTemplate, sections } });
    }
  };

  const handleFeatureToggle = (feature: keyof typeof config.formTemplate.features, enabled: boolean) => {
    onConfigChange({
      formTemplate: {
        ...config.formTemplate,
        features: {
          ...config.formTemplate.features,
          [feature]: enabled,
        },
      },
    });
  };

  const handleMultiPetBehaviorChange = (behavior: MultiPetBehavior) => {
    onConfigChange({
      formTemplate: {
        ...config.formTemplate,
        multiPetBehavior: behavior,
      },
    });
  };

  const handleAddCustomQuestion = () => {
    const newQuestion: CustomQuestion = {
      id: `question-${Date.now()}`,
      type: "short_text",
      label: "",
      required: false,
      order: config.formTemplate.globalCustomQuestions.length,
    };
    setEditingQuestion(newQuestion);
    setIsQuestionDialogOpen(true);
  };

  const handleSaveQuestion = (question: CustomQuestion) => {
    if (editingQuestion?.id) {
      // Update existing
      const updated = config.formTemplate.globalCustomQuestions.map((q) =>
        q.id === editingQuestion.id ? question : q
      );
      onConfigChange({
        formTemplate: {
          ...config.formTemplate,
          globalCustomQuestions: updated,
        },
      });
    } else {
      // Add new
      onConfigChange({
        formTemplate: {
          ...config.formTemplate,
          globalCustomQuestions: [...config.formTemplate.globalCustomQuestions, question],
        },
      });
    }
    setIsQuestionDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleRemoveQuestion = (id: string) => {
    const updated = config.formTemplate.globalCustomQuestions.filter((q) => q.id !== id);
    onConfigChange({
      formTemplate: {
        ...config.formTemplate,
        globalCustomQuestions: updated,
      },
    });
  };

  const standardSections: Array<{ key: keyof typeof config.formTemplate.sections; label: string }> = [
    { key: "petInfo", label: "Pet Information" },
    { key: "careInstructions", label: "Care Instructions" },
    { key: "medications", label: "Medications" },
    { key: "feedingSchedule", label: "Feeding Schedule" },
    { key: "emergencyContact", label: "Emergency Contact" },
    { key: "specialRequests", label: "Special Requests" },
  ];

  return (
    <div className="space-y-4">
      {/* Section Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Form Sections</CardTitle>
          <CardDescription>
            Enable or disable sections and mark them as required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {standardSections.map(({ key, label }) => {
            const section = config.formTemplate.sections[key] as FormSection;
            if (!section) return null;

            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(enabled) => handleSectionToggle(key, enabled)}
                  />
                  <div className="flex-1">
                    <Label className="text-base font-medium cursor-pointer">{label}</Label>
                    {section.enabled && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={section.required}
                            onCheckedChange={(required) => handleSectionRequired(key, required)}
                          />
                          <Label className="text-sm text-muted-foreground">
                            Required
                          </Label>
                        </div>
                        {section.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Form Features</CardTitle>
          <CardDescription>
            Enable or disable additional form features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Photo Uploads</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Allow customers to upload photos with their form
              </p>
            </div>
            <Switch
              checked={config.formTemplate.features.photoUploads}
              onCheckedChange={(enabled) => handleFeatureToggle("photoUploads", enabled)}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Add-ons Section</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Show add-ons selection in the form
              </p>
            </div>
            <Switch
              checked={config.formTemplate.features.addOnsSection}
              onCheckedChange={(enabled) => handleFeatureToggle("addOnsSection", enabled)}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Tip Section</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Allow customers to add a tip in the form
              </p>
            </div>
            <Switch
              checked={config.formTemplate.features.tipSection}
              onCheckedChange={(enabled) => handleFeatureToggle("tipSection", enabled)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Multi-Pet Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Pet Behavior</CardTitle>
          <CardDescription>
            Configure how forms work for bookings with multiple pets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={config.formTemplate.multiPetBehavior}
            onValueChange={(value: MultiPetBehavior) => handleMultiPetBehaviorChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MULTI_PET_BEHAVIOR_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Questions</CardTitle>
              <CardDescription>
                Add custom questions to the form template.
              </CardDescription>
            </div>
            <Button onClick={handleAddCustomQuestion} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.formTemplate.globalCustomQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom questions. Add one to collect additional information.
            </p>
          ) : (
            config.formTemplate.globalCustomQuestions
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                        {question.required && <Badge variant="destructive">Required</Badge>}
                      </div>
                      <Label className="text-base font-medium">{question.label}</Label>
                      {question.helpText && (
                        <p className="text-sm text-muted-foreground mt-1">{question.helpText}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQuestion(question);
                          setIsQuestionDialogOpen(true);
                        }}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* Custom Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion?.id ? "Edit Question" : "Add Custom Question"}
            </DialogTitle>
            <DialogDescription>
              Configure your custom question settings.
            </DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <CustomQuestionForm
              question={editingQuestion}
              onSave={handleSaveQuestion}
              onCancel={() => {
                setIsQuestionDialogOpen(false);
                setEditingQuestion(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CustomQuestionFormProps {
  question: CustomQuestion;
  onSave: (question: CustomQuestion) => void;
  onCancel: () => void;
}

function CustomQuestionForm({ question, onSave, onCancel }: CustomQuestionFormProps) {
  const [localQuestion, setLocalQuestion] = useState<CustomQuestion>(question);

  const handleChange = (updates: Partial<CustomQuestion>) => {
    setLocalQuestion({ ...localQuestion, ...updates });
  };

  const handleSave = () => {
    if (!localQuestion.label.trim()) {
      return; // Validation
    }
    onSave(localQuestion);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question Type</Label>
        <Select
          value={localQuestion.type}
          onValueChange={(value: CustomQuestionType) => handleChange({ type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Question Label *</Label>
        <Input
          value={localQuestion.label}
          onChange={(e) => handleChange({ label: e.target.value })}
          placeholder="Enter question text"
        />
      </div>

      <div className="space-y-2">
        <Label>Placeholder (optional)</Label>
        <Input
          value={localQuestion.placeholder || ""}
          onChange={(e) => handleChange({ placeholder: e.target.value })}
          placeholder="Enter placeholder text"
        />
      </div>

      <div className="space-y-2">
        <Label>Help Text (optional)</Label>
        <Textarea
          value={localQuestion.helpText || ""}
          onChange={(e) => handleChange({ helpText: e.target.value })}
          placeholder="Additional instructions for this question"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={localQuestion.required}
          onChange={(e) => handleChange({ required: e.target.checked })}
          className="rounded"
        />
        <Label>Required field</Label>
      </div>

      {/* Type-specific options */}
      {localQuestion.type === "dropdown" && (
        <div className="space-y-2">
          <Label>Options (one per line)</Label>
          <Textarea
            value={localQuestion.options?.map((o) => o.label).join("\n") || ""}
            onChange={(e) => {
              const options = e.target.value
                .split("\n")
                .filter((line) => line.trim())
                .map((line, index) => ({
                  value: `option-${index}`,
                  label: line.trim(),
                }));
              handleChange({ options });
            }}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={4}
          />
        </div>
      )}

      {localQuestion.type === "number" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum</Label>
            <Input
              type="number"
              value={localQuestion.min || ""}
              onChange={(e) => handleChange({ min: parseInt(e.target.value, 10) || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum</Label>
            <Input
              type="number"
              value={localQuestion.max || ""}
              onChange={(e) => handleChange({ max: parseInt(e.target.value, 10) || undefined })}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!localQuestion.label.trim()}>
          Save Question
        </Button>
      </DialogFooter>
    </div>
  );
}
