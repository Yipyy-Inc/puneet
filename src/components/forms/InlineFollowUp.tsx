"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch, Plus, X } from "lucide-react";
import type { FormQuestion, FormCondition } from "@/types/forms";

// ========================================
// Types
// ========================================

interface InlineFollowUpProps {
  /** The parent question (must be yes_no, radio, or select with options) */
  parentQuestion: FormQuestion;
  /** All questions in the form */
  allQuestions: FormQuestion[];
  /** Callback to create a new follow-up question with pre-filled condition */
  onAddFollowUp: (
    parentId: string,
    condition: FormCondition,
    sectionId?: string,
  ) => void;
}

interface FollowUpBadgeProps {
  /** The follow-up question */
  question: FormQuestion;
  /** The parent question it depends on */
  parentQuestion: FormQuestion;
}

// ========================================
// Helper — get answer options for a question
// ========================================

function getAnswerOptions(q: FormQuestion): { value: string; label: string }[] {
  if (q.type === "yes_no") {
    return [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ];
  }
  if (
    (q.type === "radio" || q.type === "select") &&
    q.options &&
    q.options.length > 0
  ) {
    return q.options;
  }
  return [];
}

/** Check if a question type supports inline follow-ups */
export function supportsFollowUp(q: FormQuestion): boolean {
  if (q.type === "yes_no") return true;
  if (
    (q.type === "radio" || q.type === "select") &&
    q.options &&
    q.options.length > 0
  )
    return true;
  return false;
}

/** Count follow-up questions for a parent */
export function countFollowUps(
  parentId: string,
  allQuestions: FormQuestion[],
): number {
  return allQuestions.filter((q) => q.parentQuestionId === parentId).length;
}

/** Format a condition as a readable label */
export function formatFollowUpLabel(
  condition: FormCondition | undefined,
  parentQuestion: FormQuestion | undefined,
): string {
  if (!condition || !parentQuestion) return "";
  const value = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : condition.value;

  // Find the display label for the value
  const options = parentQuestion ? getAnswerOptions(parentQuestion) : [];
  const optLabel =
    options.find((o) => o.value === String(value))?.label ?? value;

  return `If "${parentQuestion.label}" = ${optLabel}`;
}

// ========================================
// Inline "Add Follow-Up" button + picker
// ========================================

export function InlineFollowUpButton({
  parentQuestion,
  allQuestions: _allQuestions,
  onAddFollowUp,
}: InlineFollowUpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");

  const options = getAnswerOptions(parentQuestion);
  if (options.length === 0) return null;

  const handleAdd = () => {
    if (!selectedValue) return;

    const condition: FormCondition = {
      questionId: parentQuestion.id,
      operator: "eq",
      value: selectedValue,
    };

    onAddFollowUp(parentQuestion.id, condition, parentQuestion.sectionId);
    setSelectedValue("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-7 gap-1.5 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <GitBranch className="size-3" />
        Add follow-up
      </Button>
    );
  }

  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md border border-dashed p-2">
      <span className="shrink-0 text-xs font-medium">When answer is</span>
      <Select value={selectedValue} onValueChange={setSelectedValue}>
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder="Pick..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={handleAdd}
        disabled={!selectedValue}
      >
        <Plus className="size-3" />
        Add
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        onClick={() => {
          setIsOpen(false);
          setSelectedValue("");
        }}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

// ========================================
// Follow-up condition badge (shown on child questions)
// ========================================

export function FollowUpConditionBadge({
  question,
  parentQuestion,
}: FollowUpBadgeProps) {
  const label = formatFollowUpLabel(question.condition, parentQuestion);
  if (!label) return null;

  return (
    <Badge
      variant="outline"
      className="border-indigo-200 bg-indigo-50 text-[10px] font-normal text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400"
    >
      <GitBranch className="mr-1 size-2.5" />
      {label}
    </Badge>
  );
}
