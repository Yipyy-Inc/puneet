"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserX,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  ShieldCheck,
  Lock,
  Plus,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import type { OffboardingDocumentKind } from "@/data/staff-onboarding";
import { useStaffHrConfig } from "@/lib/api/staff-onboarding";
import {
  useOffboardingInstance,
  useSetOffboardingTask,
  useStartOffboarding,
} from "@/lib/api/offboarding-instances";
import {
  isOffboardingDoc,
  useStaffDocuments,
  useUploadStaffDocument,
} from "@/lib/api/staff-documents";
import {
  notifyStaffLifecycle,
  maybeAnnounceOffboardingComplete,
} from "@/lib/staff-notifications";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatDateLong } from "@/lib/i18n/format";

const ASSIGNEE_KEY: Record<string, string> = {
  manager: "assigneeManager",
  owner: "assigneeOwner",
  hr: "assigneeHr",
};

const DOC_KIND_KEY: Record<OffboardingDocumentKind, string> = {
  roe: "docRoe",
  termination_letter: "docTerminationLetter",
  settlement_agreement: "docSettlementAgreement",
  other: "docOther",
};

/**
 * The English a document kind used to carry, for the ONE place that must not
 * be translated: the notification body sent to the departing employee.
 *
 * That message is read by THEM, in THEIR language, and this component only
 * knows the manager's. Translating it here would send French to an employee
 * who reads English — a worse defect than the English it replaced. Recorded in
 * the debt map; the fix is server-side, where the recipient's locale is known.
 */
const DOC_KIND_EN: Record<OffboardingDocumentKind, string> = {
  roe: "Record of Employment (ROE)",
  termination_letter: "Termination letter",
  settlement_agreement: "Settlement agreement",
  other: "Other document",
};

export function OffboardingTab({ staff }: { staff: StaffProfile }) {
  const { t, fill, locale } = useStaffText("offboarding");
  const instance = useOffboardingInstance(staff.id);
  const config = useStaffHrConfig();
  const { mutate: startOffboarding, isPending: starting } =
    useStartOffboarding();
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  // Legacy terminated staff (terminated before offboarding existed) have no
  // instance — offer to start one from their recorded status reason.
  //
  // This branch is also what renders while the request is in flight, which is
  // deliberate: the query 404s for most staff, and a spinner on a tab that is
  // usually empty is worse than the empty state it resolves to.
  if (!instance) {
    return (
      <div className="border-border/60 flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
        <UserX className="text-muted-foreground/50 size-7" />
        <p className="text-sm font-semibold">{t("noRecord")}</p>
        <p className="text-muted-foreground max-w-xs text-xs">
          {t("noRecordHelp")}
        </p>
        <Button
          size="sm"
          className="mt-1"
          disabled={starting}
          onClick={() => {
            startOffboarding(
              {
                staffId: staff.id,
                // A WRITE, not a label: the reason STORED on the offboarding
                // record, read back later by whoever opens it in either
                // language. It must not vary with the locale of the manager
                // who happened to start the departure.
                // french-ok: stored value, not rendered copy
                reason: staff.statusReason ?? "Terminated",
              },
              {
                onSuccess: () => toast.success(t("started")),
                onError: (error) =>
                  toast.error(
                    error instanceof Error ? error.message : t("startFailed"),
                  ),
              },
            );
          }}
        >
          <Plus className="size-3.5" /> {starting ? t("starting") : t("start")}
        </Button>
      </div>
    );
  }

  const tasks = instance.tasks;
  const done = tasks.filter((t) => t.completedAt).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const allComplete = tasks.length > 0 && done === tasks.length;

  return (
    <div className="space-y-4">
      {/* Completion indicator */}
      <div className="border-border/60 bg-card/60 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-semibold">{t("progressLabel")}</span>{" "}
            <span className="text-muted-foreground">
              {fill(tasks.length === 1 ? "progressOne" : "progressOther", {
                done,
                total: tasks.length,
              })}
            </span>
          </div>
          {allComplete && (
            <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="mr-1 size-3.5" /> {t("complete")}
            </Badge>
          )}
        </div>
        <Progress value={pct} className="mt-2 h-2" />
        <p className="text-muted-foreground mt-2 text-[11px]">
          {/* `reason` is NOT translated: §5q — a facility's own termination
              reasons are editable data (StaffHrConfig.terminationReasons), and
              a name somebody typed never passes through the locale layer. The
              `capitalize` on it is a separate defect, recorded rather than
              fixed here, because it title-cases a slug. */}
          {fill("startedOn", {
            date: formatDateLong(new Date(instance.startedAt), locale),
            reason: instance.reason,
          })}
        </p>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          {t("noTasks")}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <OffboardingTaskRow
              key={task.id}
              staffId={staff.id}
              task={task}
              today={today}
            />
          ))}
        </div>
      )}

      {/* Final documents */}
      <FinalDocuments
        staff={staff}
        retentionYears={config.hrDocRetentionYears}
      />
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function OffboardingTaskRow({
  staffId,
  task,
  today,
}: {
  staffId: string;
  task: {
    id: string;
    name: string;
    description: string;
    assignedTo: string;
    required: boolean;
    dueDate?: string;
    completedAt?: string;
    completedBy?: string;
    completionNote?: string;
  };
  today: string;
}) {
  const { t, fill, locale } = useStaffText("offboarding");
  const [note, setNote] = useState("");
  const { mutate: setTask, isPending } = useSetOffboardingTask();
  const complete = Boolean(task.completedAt);
  const overdue = !complete && !!task.dueDate && task.dueDate < today;

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        complete
          ? "border-l-emerald-400"
          : overdue
            ? "border-l-rose-400"
            : "border-l-amber-400",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {complete ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : overdue ? (
            <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
          ) : (
            <Clock className="text-muted-foreground size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-medium",
                complete && "text-muted-foreground line-through",
              )}
            >
              {task.name}
            </span>
            {complete ? (
              <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
                {t("taskCompleted")}
              </Badge>
            ) : overdue ? (
              <Badge className="border-0 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
                {t("taskOverdue")}
              </Badge>
            ) : (
              <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
                {t("taskPending")}
              </Badge>
            )}
            {task.required && !complete && (
              <span className="text-muted-foreground text-[10px]">
                {t("taskRequired")}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {task.description}
            </p>
          )}

          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span>
              {ASSIGNEE_KEY[task.assignedTo]
                ? t(ASSIGNEE_KEY[task.assignedTo])
                : task.assignedTo}
            </span>
            {task.dueDate && (
              <span
                className={cn(overdue && "text-rose-600 dark:text-rose-400")}
              >
                {fill("due", { date: task.dueDate })}
              </span>
            )}
          </div>

          {/* Completed: show date + note, allow reopen */}
          {complete ? (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {task.completedAt
                  ? fill("completedOn", {
                      date: formatDateLong(new Date(task.completedAt), locale),
                    })
                  : t("taskCompleted")}
                {task.completedBy
                  ? fill("completedBy", { who: task.completedBy })
                  : ""}
              </p>
              {task.completionNote && (
                <p className="bg-muted/40 rounded-md px-2 py-1 text-xs italic">
                  “{task.completionNote}”
                </p>
              )}
              <button
                type="button"
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground text-[11px] underline disabled:opacity-50"
                onClick={() =>
                  setTask(
                    { staffId, taskKey: task.id, complete: false },
                    {
                      onError: (error) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : t("reopenFailed"),
                        ),
                    },
                  )
                }
              >
                {t("reopen")}
              </button>
            </div>
          ) : (
            /* Pending: optional note + mark complete */
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                disabled={isPending}
                className="h-8 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  // The note is cleared in onSuccess, not before the call: a
                  // failed write that had already emptied the field would lose
                  // what the manager typed, and "ROE submitted, ref #XYZ" is
                  // not something to ask anyone to retype.
                  setTask(
                    { staffId, taskKey: task.id, complete: true, note },
                    {
                      onSuccess: (updated) => {
                        setNote("");
                        // The response, not local state: whether this was the
                        // last outstanding task is the server's answer.
                        maybeAnnounceOffboardingComplete(updated);
                        toast.success(t("taskMarked"));
                      },
                      onError: (error) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not update that task.",
                        ),
                    },
                  );
                }}
              >
                <CheckCircle2 className="size-3.5" />{" "}
                {isPending ? t("saving") : t("markComplete")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Final documents ───────────────────────────────────────────────────────────

function FinalDocuments({
  staff,
  retentionYears,
}: {
  staff: StaffProfile;
  retentionYears: number;
}) {
  const { t, fill, locale } = useStaffText("offboarding");
  // The offboarding kinds live in staff_documents alongside every other HR
  // document rather than in a table of their own — the only thing that did not
  // map was retention, which is one column (20260804180000). So this filters
  // the real document list rather than reading a `finalDocuments` array.
  const { data: allDocs } = useStaffDocuments(staff.id);
  const { mutate: upload, isPending: uploading } = useUploadStaffDocument();

  const docs = useMemo(
    () => (allDocs ?? []).filter(isOffboardingDoc),
    [allDocs],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OffboardingDocumentKind>("roe");
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setKind("roe");
    setName("");
    setFileName("");
    fileRef.current = null;
    setOpen(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
    // The FILE itself, held for the upload. The old object URL was a mock
    // stand-in and would not have survived a reload even as a link.
    fileRef.current = file;
  };

  const handleUpload = () => {
    const file = fileRef.current;
    if (!file) return;
    // English on purpose — see DOC_KIND_EN. This string is the body of a
    // notification the DEPARTING EMPLOYEE reads, and this component knows only
    // the manager's locale.
    const label = name.trim() || DOC_KIND_EN[kind];

    // `retainUntil` is NOT sent. The server computes it from the facility's
    // retention policy, because whoever files a document should not be the one
    // deciding when it may be destroyed.
    upload(
      { staffId: staff.id, file, docType: kind },
      {
        onSuccess: () => {
          // Table 5 — optional employee notification when an HR doc is added.
          notifyStaffLifecycle("hr_doc_added", {
            email: {
              kind: "hr_doc",
              staffId: staff.id,
              staffName: `${staff.firstName} ${staff.lastName}`.trim(),
              to: staff.email,
              subject: "A document was added to your HR file",
              body: `${label} was added to your records.`,
            },
          });
          setOpen(false);
          toast.success(t("documentAdded"));
        },
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not upload that file.",
          ),
      },
    );
  };

  return (
    <div className="border-border/60 bg-card/60 space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("docsTitle")}</p>
          <p className="text-muted-foreground text-[11px]">
            {fill(retentionYears === 1 ? "docsHelpOne" : "docsHelpOther", {
              years: retentionYears,
            })}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openDialog}>
          <Upload className="mr-1.5 size-3.5" /> {t("addDocument")}
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
          {t("docsEmpty")}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="border-border/50 flex items-start gap-2.5 rounded-lg border p-2.5"
            >
              <FileText className="mt-0.5 size-4 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{doc.name}</span>
                  <Badge className="border-0 bg-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400">
                    {t(DOC_KIND_KEY[doc.type])}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px]">
                  <span>
                    {fill("uploadedOn", {
                      date: formatDateLong(new Date(doc.uploadedAt), locale),
                    })}
                  </span>
                  {doc.retainUntil && (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-2.5" />{" "}
                      {fill("retainedUntil", { date: doc.retainUntil })}
                    </span>
                  )}
                </p>
              </div>
              {/* The URL is signed and expires in 60 seconds, so a null one is
                  a disabled control rather than a link that 404s. */}
              <Button
                size="sm"
                variant="outline"
                asChild={Boolean(doc.fileUrl)}
                disabled={!doc.fileUrl}
                className="h-7 shrink-0 text-[11px]"
              >
                {doc.fileUrl ? (
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                    {t("open")}
                  </a>
                ) : (
                  <span>{t("unavailable")}</span>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("addFinalDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("documentType")}</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as OffboardingDocumentKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_KIND_KEY) as OffboardingDocumentKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {t(DOC_KIND_KEY[k])}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("documentName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(DOC_KIND_KEY[kind])}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-border/70 hover:bg-muted/40 w-full rounded-xl border border-dashed p-6 text-center transition-colors"
              >
                <Upload className="text-muted-foreground mx-auto mb-2 size-7 opacity-60" />
                <p className="text-sm font-medium">
                  {fileName || t("selectFile")}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  PDF, JPG, PNG — max 10 MB
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            <p className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
              <Lock className="mt-0.5 size-3 shrink-0" />
              {fill(retentionYears === 1 ? "permanentOne" : "permanentOther", {
                years: retentionYears,
              })}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            {/* A file is now REQUIRED. The mock version accepted an empty
                dialog and invented a plausible-looking path, which produced a
                permanent record pointing at nothing. */}
            <Button onClick={handleUpload} disabled={!fileName || uploading}>
              <Upload className="mr-1.5 size-3.5" />{" "}
              {uploading ? t("uploading") : t("addToRecord")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
