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
import {
  useOffboardingInstance,
  useStaffHrConfig,
  createOffboardingInstance,
  setOffboardingTaskComplete,
  addOffboardingDocument,
  type OffboardingDocumentKind,
} from "@/data/staff-onboarding";
import {
  notifyStaffLifecycle,
  maybeAnnounceOffboardingComplete,
} from "@/lib/staff-notifications";

const ASSIGNEE_LABEL: Record<string, string> = {
  manager: "Manager",
  owner: "Owner",
  hr: "HR",
};

const DOC_KIND_LABEL: Record<OffboardingDocumentKind, string> = {
  roe: "Record of Employment (ROE)",
  termination_letter: "Termination letter",
  settlement_agreement: "Settlement agreement",
  other: "Other document",
};

export function OffboardingTab({ staff }: { staff: StaffProfile }) {
  const instance = useOffboardingInstance(staff.id);
  const config = useStaffHrConfig();
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  // Legacy terminated staff (terminated before offboarding existed) have no
  // instance — offer to start one from their recorded status reason.
  if (!instance) {
    return (
      <div className="border-border/60 flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
        <UserX className="text-muted-foreground/50 size-7" />
        <p className="text-sm font-semibold">No offboarding record</p>
        <p className="text-muted-foreground max-w-xs text-xs">
          This employee was terminated without an offboarding checklist. Start
          one to track final tasks and documents.
        </p>
        <Button
          size="sm"
          className="mt-1"
          onClick={() => {
            createOffboardingInstance(
              staff.id,
              staff.statusReason ?? "Terminated",
            );
            toast.success("Offboarding started");
          }}
        >
          <Plus className="size-3.5" /> Start offboarding
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
            <span className="font-semibold">Offboarding:</span>{" "}
            <span className="text-muted-foreground">
              {done} of {tasks.length} task{tasks.length === 1 ? "" : "s"}{" "}
              complete
            </span>
          </div>
          {allComplete && (
            <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="mr-1 size-3.5" /> Offboarding complete
            </Badge>
          )}
        </div>
        <Progress value={pct} className="mt-2 h-2" />
        <p className="text-muted-foreground mt-2 text-[11px]">
          Started{" "}
          {new Date(instance.startedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" · "}reason: <span className="capitalize">{instance.reason}</span>
        </p>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          This offboarding template has no tasks.
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
      <FinalDocuments staff={staff} retentionYears={config.hrDocRetentionYears} />
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
  const [note, setNote] = useState("");
  const complete = Boolean(task.completedAt);
  const overdue = !complete && !!task.dueDate && task.dueDate < today;

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 p-3",
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
                Completed
              </Badge>
            ) : overdue ? (
              <Badge className="border-0 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
                Overdue
              </Badge>
            ) : (
              <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
                Pending
              </Badge>
            )}
            {task.required && !complete && (
              <span className="text-muted-foreground text-[10px]">Required</span>
            )}
          </div>

          {task.description && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {task.description}
            </p>
          )}

          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span>{ASSIGNEE_LABEL[task.assignedTo] ?? task.assignedTo}</span>
            {task.dueDate && (
              <span className={cn(overdue && "text-rose-600 dark:text-rose-400")}>
                · Due {task.dueDate}
              </span>
            )}
          </div>

          {/* Completed: show date + note, allow reopen */}
          {complete ? (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Completed{" "}
                {task.completedAt
                  ? new Date(task.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
                {task.completedBy ? ` by ${task.completedBy}` : ""}
              </p>
              {task.completionNote && (
                <p className="bg-muted/40 rounded-md px-2 py-1 text-xs italic">
                  “{task.completionNote}”
                </p>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-[11px] underline"
                onClick={() =>
                  setOffboardingTaskComplete(staffId, task.id, false)
                }
              >
                Reopen
              </button>
            </div>
          ) : (
            /* Pending: optional note + mark complete */
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g. ROE submitted to Service Canada July 22, ref #XYZ)"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                className="h-8 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  setOffboardingTaskComplete(
                    staffId,
                    task.id,
                    true,
                    "Manager",
                    note,
                  );
                  maybeAnnounceOffboardingComplete(staffId);
                  setNote("");
                  toast.success("Task marked complete");
                }}
              >
                <CheckCircle2 className="size-3.5" /> Mark complete
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
  const instance = useOffboardingInstance(staff.id);
  const docs = useMemo(
    () => instance?.finalDocuments ?? [],
    [instance?.finalDocuments],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OffboardingDocumentKind>("roe");
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const fileUrlRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setKind("roe");
    setName("");
    setFileName("");
    fileUrlRef.current = "";
    setOpen(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
    // Mock capture — object URL stands in for a real upload.
    fileUrlRef.current = URL.createObjectURL(file);
  };

  const handleUpload = () => {
    const label = name.trim() || DOC_KIND_LABEL[kind];
    const retain = new Date();
    retain.setFullYear(retain.getFullYear() + retentionYears);
    addOffboardingDocument(staff.id, {
      id: `off-doc-${Date.now()}`,
      kind,
      name: label,
      fileUrl:
        fileUrlRef.current ||
        `/files/${staff.id}/${label.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      uploadedAt: new Date().toISOString(),
      retainUntil: retain.toISOString().split("T")[0],
    });
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
    toast.success("Document added to the permanent record");
  };

  return (
    <div className="border-border/60 bg-card/60 space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Final documents</p>
          <p className="text-muted-foreground text-[11px]">
            ROE, termination letter, settlement — kept permanently on the
            record, retained {retentionYears} year
            {retentionYears === 1 ? "" : "s"} per HR policy.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openDialog}>
          <Upload className="mr-1.5 size-3.5" /> Add document
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
          No final documents yet. Upload the ROE, termination letter, and any
          settlement agreement.
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
                    {DOC_KIND_LABEL[doc.kind]}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px]">
                  <span>
                    Uploaded{" "}
                    {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-2.5" /> Retained until {doc.retainUntil}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add final document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as OffboardingDocumentKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(DOC_KIND_LABEL) as OffboardingDocumentKind[]
                  ).map((k) => (
                    <SelectItem key={k} value={k}>
                      {DOC_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Document name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={DOC_KIND_LABEL[kind]}
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
                  {fileName || "Click to select a file"}
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
              Once added, final documents are permanent and cannot be deleted —
              retained {retentionYears} year{retentionYears === 1 ? "" : "s"}{" "}
              per HR policy.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="mr-1.5 size-3.5" /> Add to record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
