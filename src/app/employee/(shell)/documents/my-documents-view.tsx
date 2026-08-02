"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  FileSignature,
  CheckCircle2,
  Clock,
  FolderOpen,
} from "lucide-react";
import { employeeFiles } from "@/data/employee-files";
import {
  employeeDocumentTemplates,
  employeeDocumentSubmissions,
} from "@/data/scheduling";
import type { EmployeeDocumentTemplate } from "@/types/scheduling";
import { EmployeeDocumentSigningDialog } from "@/components/scheduling/EmployeeDocumentSigningDialog";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { ROLE_META, type StaffProfile } from "@/types/facility-staff";
import {
  fullNameOf,
  initialsOf,
} from "@/app/facility/dashboard/staff/_components/staff-shared";

const DOC_TYPE_LABEL: Record<string, string> = {
  work_permit: "Work permit",
  id_document: "ID document",
  certification: "Certification",
  contract: "Contract",
  tax_form: "Tax form",
  emergency_contact: "Emergency contact",
  health_record: "Health record",
  other: "Other",
};

// "My documents" means MINE, so the id cannot come from a cookie and must not
// fall back to anyone.
//
// This read `employee_staff_id` and then did `.find(...) ?? facilityStaff[0]`
// against the mock array. A session-derived id matched nothing there, so the
// fallback fired and this screen showed a COLLEAGUE'S HR file — contracts, tax
// forms, health records — under the heading "My Documents". A miss must resolve
// to nobody, never to somebody.
//
// The gate is a separate component rather than an early return because the body
// seeds `useState` from `staff.id`: mounting it before the roster resolves would
// freeze one person's signature list onto another's screen, and no later render
// would correct it.
export function MyDocumentsView() {
  const { viewer, viewerResolved } = useFacilityViewer();
  if (!viewerResolved) return null;
  return <MyDocumentsBody staff={viewer} />;
}

function MyDocumentsBody({ staff }: { staff: StaffProfile }) {
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  // My HR documents — read-only, and only those the facility marked visible.
  const myDocs = useMemo(
    () =>
      employeeFiles
        .filter((d) => d.employeeId === staff.id && d.visibleToEmployee)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [staff.id],
  );

  // Documents this staff has already signed (from the submissions store + this
  // session's new signatures).
  const [signedTemplateIds, setSignedTemplateIds] = useState<Set<string>>(
    () =>
      new Set(
        employeeDocumentSubmissions
          .filter((s) => s.employeeId === staff.id && s.status === "signed")
          .map((s) => s.templateId),
      ),
  );

  const signable = useMemo(
    () =>
      employeeDocumentTemplates.filter(
        (t) => t.isActive && t.requiresSignature,
      ),
    [],
  );

  const [signingTemplate, setSigningTemplate] =
    useState<EmployeeDocumentTemplate | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <FolderOpen className="text-primary size-6" /> My Documents
        </h1>
        <p className="text-muted-foreground text-sm">
          Your HR documents — contracts, certifications, and agreements.
        </p>
      </div>

      {/* Documents to sign */}
      {signable.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Needs your signature</h2>
          {signable.map((t) => {
            const signed = signedTemplateIds.has(t.id);
            return (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        signed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {signed ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <FileSignature className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {t.description} · v{t.version}
                      </p>
                    </div>
                  </div>
                  {signed ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                      Signed
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSigningTemplate(t)}
                    >
                      Review &amp; sign
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* My HR documents (read-only + download) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Documents on file</h2>
        {myDocs.length === 0 ? (
          <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-10 text-center">
            <FileText className="size-7 opacity-40" />
            <p className="text-sm">No documents on file yet.</p>
            <p className="text-xs">
              HR documents shared with you will appear here.
            </p>
          </div>
        ) : (
          myDocs.map((doc) => {
            const expired = !!doc.expiresAt && doc.expiresAt < today;
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <FileText className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span>{DOC_TYPE_LABEL[doc.type] ?? doc.type}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> Uploaded {doc.uploadedAt}
                        </span>
                        {doc.expiresAt && (
                          <span
                            className={cn(
                              expired
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground",
                            )}
                          >
                            {expired ? "Expired" : "Expires"} {doc.expiresAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="shrink-0"
                  >
                    <a href={doc.fileUrl} download>
                      <Download className="size-3.5" /> Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <EmployeeDocumentSigningDialog
        open={!!signingTemplate}
        onOpenChange={(v) => {
          if (!v) setSigningTemplate(null);
        }}
        template={signingTemplate ?? employeeDocumentTemplates[0]}
        employee={{
          id: staff.id,
          name: fullNameOf(staff),
          avatar: staff.avatarUrl,
          initials: initialsOf(staff),
          role: ROLE_META[staff.primaryRole].label,
        }}
        onComplete={(submission) => {
          setSignedTemplateIds((prev) =>
            new Set(prev).add(submission.templateId),
          );
          setSigningTemplate(null);
          toast.success("Document signed");
        }}
      />
    </div>
  );
}
