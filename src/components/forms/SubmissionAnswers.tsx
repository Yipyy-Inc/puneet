"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, File, MapPin, PenLine, X } from "lucide-react";
import type { SubmissionRow } from "@/lib/api/mappers/form";
import {
  answeredQuestions,
  isAnswered,
  questionsOf,
  sectionsOf,
} from "@/components/forms/submission-shape";
import type { FormQuestion } from "@/types/forms";

// ============================================================================
// What somebody answered, under the questions they were actually asked.
//
// Every question and every section here comes from the submission's own frozen
// version — never from the form as it stands today. The form may have been
// rewritten since, which is allowed and opens a new version; rendering the new
// wording over these answers would put a "yes" under a question nobody saw.
//
// Nothing in this file is editable. Submitted answers are refused any change by
// trigger, so an input here could only ever produce an error.
// ============================================================================

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isAddressObject(
  value: unknown,
): value is { street?: string; city?: string; state?: string; zip?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const v = value as Record<string, unknown>;
  return "street" in v || "city" in v || "state" in v || "zip" in v;
}

function formatAddress(value: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const parts: string[] = [];
  if (value.street) parts.push(value.street);
  if (value.city && value.state) {
    parts.push(
      `${value.city}, ${value.state}${value.zip ? ` ${value.zip}` : ""}`,
    );
  } else {
    const rest = [value.city, value.state, value.zip].filter(Boolean);
    if (rest.length > 0) parts.push(rest.join(", "));
  }
  return parts.join(", ") || "—";
}

export function AnswerBlock({
  question,
  value,
}: {
  question: FormQuestion;
  value: unknown;
}) {
  if (question.type === "file") {
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs font-normal">
          {question.label}
        </Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          <File className="text-muted-foreground size-3.5" />
          <span>{typeof value === "string" ? value : formatValue(value)}</span>
        </div>
      </div>
    );
  }

  if (question.type === "address" || isAddressObject(value)) {
    const addr = isAddressObject(value) ? value : null;
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs font-normal">
          {question.label}
        </Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="text-muted-foreground size-3.5" />
          <span>{addr ? formatAddress(addr) : formatValue(value)}</span>
        </div>
      </div>
    );
  }

  if (question.type === "signature") {
    const meta =
      typeof value === "object" &&
      value !== null &&
      "name" in (value as Record<string, unknown>)
        ? (value as Record<string, unknown>)
        : null;
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs font-normal">
          {question.label}
        </Label>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium italic">
            {meta ? String(meta.name) : formatValue(value)}
          </p>
          <Badge
            variant="outline"
            className="h-5 gap-1 border-violet-200 bg-violet-50 text-[10px] font-normal text-violet-700"
          >
            <PenLine className="size-2.5" />
            e-signed
          </Badge>
        </div>
        {Boolean(meta?.signedAt) && (
          <div className="text-muted-foreground mt-1.5 space-y-0.5 rounded-md border border-violet-100 bg-violet-50/50 px-2.5 py-2 text-[11px]">
            <p>
              Signed: {String(meta!.signedAt).slice(0, 19).replace("T", " ")}{" "}
              UTC
            </p>
            {Boolean(meta!.timezone) && (
              <p>Timezone: {String(meta!.timezone)}</p>
            )}
            {Boolean(meta!.userAgent) && (
              <p className="truncate">
                Device: {String(meta!.userAgent).slice(0, 80)}
                {String(meta!.userAgent).length > 80 ? "..." : ""}
              </p>
            )}
            {Boolean(meta!.agreementText) && (
              <p className="italic">
                &quot;{String(meta!.agreementText)}&quot;
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (question.type === "yes_no" || question.type === "checkbox") {
    const yes =
      value === true || value === "yes" || value === "Yes" || value === "true";
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs font-normal">
          {question.label}
        </Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          {yes ? (
            <div className="flex items-center gap-1.5 text-green-700">
              <Check className="size-4" />
              <span>Yes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-600">
              <X className="size-4" />
              <span>No</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-xs font-normal">
        {question.label}
      </Label>
      <p className="text-sm font-medium">{formatValue(value)}</p>
    </div>
  );
}

/** Answered questions grouped into the sections the version declared. */
export function SubmissionAnswers({ row }: { row: SubmissionRow }) {
  const answered = answeredQuestions(row);
  const sections = sectionsOf(row);

  if (questionsOf(row).length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {/* Not "no answers" — the difference matters when somebody is deciding
            whether a form was filled in. */}
        The version this was answered against carries no questions, so there is
        nothing to lay the answers out against.
      </p>
    );
  }

  if (answered.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Every question came back empty.
      </p>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {answered.map((q) => (
          <AnswerBlock key={q.id} question={q} value={row.answers[q.id]} />
        ))}
      </div>
    );
  }

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const known = new Set(ordered.map((s) => s.id));
  const groups = ordered
    .map((section) => ({
      section,
      questions: answered.filter((q) => q.sectionId === section.id),
    }))
    .filter((g) => g.questions.length > 0);

  // A question whose section was removed from the version still has an answer,
  // and dropping it from the page would be quietly hiding what somebody said.
  const orphans = answered.filter(
    (q) => !q.sectionId || !known.has(q.sectionId),
  );

  return (
    <div className="space-y-6">
      {groups.map(({ section, questions }) => (
        <div key={section.id} className="space-y-3">
          <h4 className="text-sm font-semibold">{section.title}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {questions.map((q) => (
              <AnswerBlock key={q.id} question={q} value={row.answers[q.id]} />
            ))}
          </div>
        </div>
      ))}
      {orphans.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Other</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {orphans.map((q) => (
              <AnswerBlock key={q.id} question={q} value={row.answers[q.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Required questions the version asked that came back empty. */
export function MissingAnswers({ row }: { row: SubmissionRow }) {
  const missing = questionsOf(row).filter(
    (q) => q.required && !isAnswered(row.answers[q.id]),
  );
  if (missing.length === 0) return null;

  return (
    <ul className="list-inside list-disc space-y-1 text-sm">
      {missing.map((q) => (
        <li key={q.id}>{q.label}</li>
      ))}
    </ul>
  );
}
