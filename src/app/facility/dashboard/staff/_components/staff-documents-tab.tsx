"use client";

import { FileText, ShieldCheck, GraduationCap, Lock } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import {
  useOnboardingInstance,
  useOnboardingTemplates,
  useOffboardingInstance,
  EMPLOYEE_TASK_LABEL,
} from "@/data/staff-onboarding";
import { EmployeeFilesTab } from "./employee-files-tab";
import { WriteUpsTab } from "./write-ups-tab";

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
  const onboarding = useOnboardingInstance(staff.id);
  const templates = useOnboardingTemplates();
  const offboarding = useOffboardingInstance(staff.id);

  const template = onboarding
    ? templates.find((t) => t.id === onboarding.templateId)
    : undefined;
  const docSections = (onboarding?.sections ?? []).filter(
    (s) => s.type === "document_upload" || s.type === "document_sign",
  );

  return (
    <div className="space-y-8">
      {/* Onboarding documents */}
      <DocSection
        title="Onboarding documents"
        hint="Uploads and signed policies from the self-serve onboarding flow."
      >
        {docSections.length === 0 ? (
          <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
            No onboarding documents yet.
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
                          Signed by {signature}
                          {data.signedAt
                            ? ` · ${new Date(str(data.signedAt)).toLocaleDateString()}`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[11px]">
                          Not signed
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
                          ? ` · ${new Date(file.uploadedAt).toLocaleDateString()}`
                          : ""}
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-[11px]">
                        Not uploaded
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
      <DocSection
        title="Employee files & certifications"
        hint="Work permits, certifications, contracts, tax forms, and other HR files."
      >
        <EmployeeFilesTab profile={staff} />
      </DocSection>

      {/* Write-ups & reviews */}
      <DocSection
        title="Write-ups & reviews"
        hint="Disciplinary records, recognitions, and performance notes."
      >
        <WriteUpsTab profile={staff} />
      </DocSection>

      {/* Offboarding final documents (terminated only) */}
      {offboarding && (offboarding.finalDocuments?.length ?? 0) > 0 && (
        <DocSection
          title="Final documents"
          hint="Permanent departure records (ROE, termination letter, settlement)."
        >
          <div className="space-y-2">
            {offboarding.finalDocuments!.map((doc) => (
              <div
                key={doc.id}
                className="border-border/50 flex items-start gap-2.5 rounded-lg border p-2.5"
              >
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{doc.name}</div>
                  <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Lock className="size-2.5" /> Retained until {doc.retainUntil}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DocSection>
      )}
    </div>
  );
}
