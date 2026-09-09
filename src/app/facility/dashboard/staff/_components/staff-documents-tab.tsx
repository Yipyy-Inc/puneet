"use client";

import { FileText, ShieldCheck, GraduationCap, Lock } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import { EMPLOYEE_TASK_LABEL } from "@/data/staff-onboarding";
import { useOnboardingInstance } from "@/lib/api/onboarding-instances";
import { useOnboardingTemplates } from "@/lib/api/staff-onboarding";
import { isOffboardingDoc, useStaffDocuments } from "@/lib/api/staff-documents";
import { EmployeeFilesTab } from "./employee-files-tab";
import { WriteUpsTab } from "./write-ups-tab";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatDateShort } from "@/lib/i18n/format";

const str = (v: unknown) => (typeof v === "string" ? v : "");

function DocSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Consolidated HR document center — every record for one staff member in one
 * place: onboarding uploads + signed policies, employee files & certifications,
 * write-ups, and (for departed staff) final offboarding documents.
 */
export function StaffDocumentsTab({ staff }: { staff: StaffProfile }) {
  const { t, fill, locale } = useStaffText("documentsTab");
  const onboarding = useOnboardingInstance(staff.id);
  const templates = useOnboardingTemplates();
  // Final documents are ordinary staff_documents rows with a departure
  // doc_type, not a `finalDocuments` array hanging off the offboarding record
  // — so this reads the document list and filters, rather than loading an
  // instance it otherwise has no use for.
  const { data: allDocs } = useStaffDocuments(staff.id);
  const finalDocs = (allDocs ?? []).filter(isOffboardingDoc);

  const template = onboarding
    ? templates.find((t) => t.id === onboarding.templateId)
    : undefined;
  const docSections = (onboarding?.sections ?? []).filter(
    (s) => s.type === "document_upload" || s.type === "document_sign",
  );

  return (
    <div className="space-y-8">
      {/* Onboarding documents */}
      <DocSection title={t("onboardingDocs")} hint={t("onboardingDocsHint")}>
        {docSections.length === 0 ? (
          <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
            {t("noOnboardingDocs")}
          </div>
        ) : (
          <div className="space-y-2">
            {docSections.map((section) => {
              const task = template?.employeeTasks.find(
                (t) => t.id === section.taskId,
              );
              const label =
                task?.documentName ||
                (task ? EMPLOYEE_TASK_LABEL[task.type] : "Document");
              const data = section.data ?? {};
              const file = data.file as
                | { name: string; url: string; uploadedAt?: string }
                | undefined;
              const signature = str(data.signature);
              return (
                <div
                  key={section.taskId ?? section.type}
                  className="border-border/50 flex items-start gap-2.5 rounded-lg border p-2.5"
                >
                  {section.type === "document_sign" ? (
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    {section.type === "document_sign" ? (
                      signature ? (
                        <p className="text-muted-foreground text-[11px]">
                          {fill("signedBy", { who: signature })}
                          {data.signedAt
                            ? ` · ${formatDateShort(new Date(str(data.signedAt)), locale)}`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[11px]">
                          {t("notSigned")}
                        </p>
                      )
                    ) : file?.name ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-[11px] hover:underline"
                      >
                        {file.name}
                        {file.uploadedAt
                          ? ` · ${formatDateShort(new Date(file.uploadedAt), locale)}`
                          : ""}
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-[11px]">
                        {t("notUploaded")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DocSection>

      {/* Employee files & certifications — full CRUD, reused */}
      <DocSection title={t("employeeFiles")} hint={t("employeeFilesHint")}>
        <EmployeeFilesTab profile={staff} />
      </DocSection>

      {/* Write-ups & reviews */}
      <DocSection title={t("writeUps")} hint={t("writeUpsHint")}>
        <WriteUpsTab profile={staff} />
      </DocSection>

      {/* Offboarding final documents (terminated only) */}
      {finalDocs.length > 0 && (
        <DocSection title={t("finalDocs")} hint={t("finalDocsHint")}>
          <div className="space-y-2">
            {finalDocs.map((doc) => (
              <div
                key={doc.id}
                className="border-border/50 flex items-start gap-2.5 rounded-lg border p-2.5"
              >
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{doc.name}</div>
                  {doc.retainUntil && (
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <Lock className="size-2.5" />{" "}
                      {fill("retainedUntil", { date: doc.retainUntil })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DocSection>
      )}
    </div>
  );
}
