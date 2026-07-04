"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileQuestion, Lock } from "lucide-react";
import { formQueries } from "@/lib/api/forms";
import type { FormQuestion, QuestionType } from "@/types/forms";

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  date: "Date",
  number: "Number",
  file: "File upload",
  signature: "Signature",
  yes_no: "Yes / No",
  radio: "Single choice",
  phone: "Phone",
  email: "Email",
  address: "Address",
};

interface FormPreviewSheetProps {
  formId: string;
  formName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormPreviewSheet({
  formId,
  formName,
  open,
  onOpenChange,
}: FormPreviewSheetProps) {
  const {
    data: form,
    isLoading,
    isError,
  } = useQuery({ ...formQueries.detail(formId), enabled: open && !!formId });

  const questions = form?.questions ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="pr-6">{formName}</SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <Lock className="size-3" />
            Read-only preview
            {form
              ? ` · ${questions.length} field${questions.length === 1 ? "" : "s"}`
              : ""}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-3 p-5">
            {isLoading ? (
              <PreviewSkeleton />
            ) : isError || !form ? (
              <EmptyState />
            ) : questions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                This form has no fields yet.
              </p>
            ) : (
              questions.map((q, idx) => (
                <QuestionRow key={q.id} question={q} index={idx} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function QuestionRow({
  question,
  index,
}: {
  question: FormQuestion;
  index: number;
}) {
  const options = question.options ?? [];
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {index + 1}.
          </span>
          <span className="text-sm font-medium">
            {question.label}
            {question.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </span>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {TYPE_LABELS[question.type] ?? question.type}
        </Badge>
      </div>
      {question.helpText && (
        <p className="text-muted-foreground mt-1 ml-5 text-xs">
          {question.helpText}
        </p>
      )}
      {options.length > 0 && (
        <ul className="mt-2 ml-5 space-y-1">
          {options.map((o) => (
            <li
              key={o.value}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-md border p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <FileQuestion className="text-muted-foreground/40 size-8" />
      <p className="text-muted-foreground text-sm">
        This form&apos;s fields aren&apos;t available to preview.
      </p>
      <p className="text-muted-foreground text-xs">
        It may not be published in this facility yet.
      </p>
    </div>
  );
}
