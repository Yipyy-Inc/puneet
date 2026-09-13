"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import type {
  YipyyGoCustomAnswer,
  YipyyGoCustomAnswers,
} from "@/lib/yipyy-go/owner-form";
import type { YipyyGoMissing } from "@/lib/yipyy-go/validate";
import type { CustomQuestion } from "@/types/yipyygo";

// ============================================================================
// The questions the facility wrote for this form (§5c).
//
// The old form never asked one. The facility's words go on screen as it wrote
// them: the label above, its help text below, and when a required question is
// still empty the error replaces the help text rather than stacking under it.
// "Optional" marks the rest; a required question carries no asterisk.
// ============================================================================

interface CustomQuestionsSectionProps {
  petName: string;
  questions: CustomQuestion[];
  answers: YipyyGoCustomAnswers;
  missing: YipyyGoMissing[];
  onChange: (
    questionId: string,
    value: YipyyGoCustomAnswer | undefined,
  ) => void;
}

export function CustomQuestionsSection({
  petName,
  questions,
  answers,
  missing,
  onChange,
}: CustomQuestionsSectionProps) {
  const { t, fill } = useCustomerText("yipyygo");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("questionsTitle")}</CardTitle>
        <CardDescription>
          {fill("questionsIntro", { pet: petName })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-[18px]">
        {questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            invalid={missing.includes(`question:${question.id}`)}
            onChange={(value) => onChange(question.id, value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function QuestionField({
  question,
  value,
  invalid,
  onChange,
}: {
  question: CustomQuestion;
  value: YipyyGoCustomAnswer | undefined;
  invalid: boolean;
  onChange: (value: YipyyGoCustomAnswer | undefined) => void;
}) {
  const { t } = useCustomerText("yipyygo");
  const id = `question-${question.id}`;
  const noteId = `${id}-note`;
  const note: ReactNode = invalid ? (
    <p
      id={noteId}
      className="text-destructive flex items-center gap-1.5 text-[13px] font-medium"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {t("answerRequired")}
    </p>
  ) : question.helpText ? (
    <p id={noteId} className="text-ink-tertiary text-[13px]">
      {question.helpText}
    </p>
  ) : null;
  const describedBy = note ? noteId : undefined;
  const ariaInvalid = invalid || undefined;
  const heading = (
    <span className="flex flex-wrap items-baseline gap-2">
      {question.label}
      {!question.required && (
        <span className="text-ink-tertiary text-[13px] font-normal">
          {t("optional")}
        </span>
      )}
    </span>
  );
  const text = typeof value === "string" ? value : "";
  const options = (question.options ?? []).filter(
    (option) => option.value !== "",
  );

  switch (question.type) {
    case "file_upload":
      // Asked once the form can upload a file.
      return null;

    case "long_text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{heading}</Label>
          <Textarea
            id={id}
            value={text}
            placeholder={question.placeholder}
            rows={3}
            maxLength={2000}
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
          />
          {note}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{heading}</Label>
          {/* Uncontrolled: a controlled number field eats the decimal point
              of "1.5" while it is being typed. */}
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={question.min}
            max={question.max}
            defaultValue={typeof value === "number" ? String(value) : ""}
            placeholder={question.placeholder}
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
              )
            }
            className="max-w-48"
          />
          {note}
        </div>
      );

    case "date":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{heading}</Label>
          <DatePicker
            id={id}
            value={text || undefined}
            min={question.minDate}
            max={question.maxDate}
            placeholder={t("pickDate")}
            onValueChange={(next) => onChange(next || undefined)}
          />
          {note}
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{heading}</Label>
          <Select value={text} onValueChange={(next) => onChange(next)}>
            <SelectTrigger
              id={id}
              aria-invalid={ariaInvalid}
              aria-describedby={describedBy}
              className="w-full sm:max-w-sm"
            >
              <SelectValue
                placeholder={question.placeholder || t("chooseAnswer")}
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {note}
        </div>
      );

    case "yes_no":
      return (
        <fieldset aria-describedby={describedBy} className="space-y-1.5">
          <legend className="text-body-ink mb-1.5 text-[13.5px] font-semibold">
            {heading}
          </legend>
          <RadioGroup
            value={value === true ? "yes" : value === false ? "no" : ""}
            onValueChange={(next) => onChange(next === "yes")}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {(["yes", "no"] as const).map((choice) => (
              <div key={choice} className="flex min-h-10 items-center gap-2">
                <RadioGroupItem
                  id={`${id}-${choice}`}
                  value={choice}
                  aria-invalid={ariaInvalid}
                />
                <Label htmlFor={`${id}-${choice}`}>{t(choice)}</Label>
              </div>
            ))}
          </RadioGroup>
          {note}
        </fieldset>
      );

    case "multi_select": {
      const chosen = Array.isArray(value) ? value : [];
      return (
        <fieldset aria-describedby={describedBy} className="space-y-1.5">
          <legend className="text-body-ink mb-1.5 text-[13.5px] font-semibold">
            {heading}
          </legend>
          <div className="space-y-1">
            {options.map((option, index) => {
              const optionId = `${id}-option-${index}`;
              return (
                <div
                  key={option.value}
                  className="flex min-h-10 items-center gap-3"
                >
                  <Checkbox
                    id={optionId}
                    checked={chosen.includes(option.value)}
                    aria-invalid={ariaInvalid}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked === true
                          ? [...chosen, option.value]
                          : chosen.filter((item) => item !== option.value),
                      )
                    }
                  />
                  <Label htmlFor={optionId}>{option.label}</Label>
                </div>
              );
            })}
          </div>
          {note}
        </fieldset>
      );
    }

    case "checkbox":
      return (
        <div className="space-y-1.5">
          <div className="flex min-h-10 items-center gap-3">
            <Checkbox
              id={id}
              checked={value === true}
              aria-invalid={ariaInvalid}
              aria-describedby={describedBy}
              onCheckedChange={(checked) =>
                onChange(checked === true ? true : undefined)
              }
            />
            <Label htmlFor={id}>{heading}</Label>
          </div>
          {note}
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{heading}</Label>
          <Input
            id={id}
            value={text}
            placeholder={question.placeholder}
            maxLength={2000}
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
          />
          {note}
        </div>
      );
  }
}
