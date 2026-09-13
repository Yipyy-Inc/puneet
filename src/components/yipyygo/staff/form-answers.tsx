"use client";

import { Image as ImageGlyph } from "lucide-react";

import { AnswersSummary } from "@/components/yipyygo/form-sections/AnswersSummary";
import type { YipyyGoSubmission } from "@/lib/api/mappers/yipyy-go";
import { formatDateLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  sectionFormFromAnswers,
  yipyyGoFormSteps,
} from "@/lib/yipyy-go/owner-form";
import { customQuestionsOf } from "@/lib/yipyy-go/validate";
import type { FormTemplateConfig } from "@/types/yipyygo";

// One dog’s form as the facility reads it: when it was sent, and who reviewed
// or completed it; every answer, named by the facility’s own template; and its
// photos. A photo’s link is signed for a minute, so it opens from here rather
// than being a link anyone keeps.
export function FormAnswers({
  petName,
  submission,
  template,
}: {
  petName: string;
  submission: YipyyGoSubmission;
  template: FormTemplateConfig;
}) {
  const { t, fill, locale } = useStaffText("yipyyGo");
  const steps = yipyyGoFormSteps(template, { contact: false, pet: false });
  const date = (value: string) => formatDateLong(value, locale);
  const meta = [
    submission.submittedAt
      ? fill("sentOn", { date: date(submission.submittedAt) })
      : null,
    submission.reviewedAt
      ? fill("reviewedBy", {
          date: date(submission.reviewedAt),
          name: submission.reviewedByName ?? "—",
        })
      : null,
    submission.completedAt
      ? fill("completedBy", {
          date: date(submission.completedAt),
          name: submission.completedByName ?? "—",
          reason: submission.completedReason ?? "",
        })
      : null,
    submission.status === "changes_requested" && submission.changesMessage
      ? fill("changesAsked", { message: submission.changesMessage })
      : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="space-y-4">
      {meta.length > 0 && (
        <ul className="text-ink-secondary space-y-0.5 text-[13.5px]">
          {meta.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <AnswersSummary
        formData={sectionFormFromAnswers(submission.answers, petName)}
        questions={customQuestionsOf(template)}
        customAnswers={submission.answers.customAnswers ?? {}}
        show={{
          feeding: steps.includes("feeding"),
          medications: steps.includes("medications"),
          behavior: steps.includes("behavior"),
        }}
      />
      {submission.photos.length > 0 && (
        <section
          aria-labelledby={`photos-${submission.id}`}
          className="space-y-2"
        >
          <h3
            id={`photos-${submission.id}`}
            className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase"
          >
            {t("photosTitle")}
          </h3>
          <ul className="flex flex-wrap gap-3">
            {submission.photos.map((photo) => (
              <li key={photo.id}>
                <a
                  href={photo.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={fill("openPhoto", { name: photo.name })}
                  className="border-line bg-surface-inset text-ink-secondary focus-visible:outline-primary flex size-24 items-center justify-center overflow-hidden rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {photo.url ? (
                    // A link signed for a minute: next/image would cache it
                    // past the moment it stops working.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageGlyph className="size-6" aria-hidden />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
