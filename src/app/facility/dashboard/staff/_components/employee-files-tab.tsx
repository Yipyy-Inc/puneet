"use client";

import { useState, useMemo } from "react";
import {
  FolderOpen,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  AlertTriangle,
  Shield,
  CreditCard,
  Award,
  FileText,
  File,
  Heart,
  UserCheck,
  CheckCircle2,
  Clock,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { employeeFiles as allFiles } from "@/data/employee-files";
import type { EmployeeDocument, EmployeeDocType } from "@/types/scheduling";
import type { StaffProfile } from "@/types/facility-staff";
import { fullNameOf } from "./staff-shared";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<
  EmployeeDocType,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  work_permit: {
    label: "Work Permit",
    icon: Shield,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  id_document: {
    label: "ID Document",
    icon: CreditCard,
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  certification: {
    label: "Certification",
    icon: Award,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  contract: {
    label: "Contract",
    icon: FileText,
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  tax_form: {
    label: "Tax Form",
    icon: File,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  emergency_contact: {
    label: "Emergency Contact",
    icon: UserCheck,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
  },
  health_record: {
    label: "Health Record",
    icon: Heart,
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
  },
  other: {
    label: "Other",
    icon: File,
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
  },
};

// Left-border accent per document type
const TYPE_BORDER: Record<EmployeeDocType, string> = {
  work_permit: "border-l-violet-400",
  id_document: "border-l-blue-400",
  certification: "border-l-emerald-400",
  contract: "border-l-indigo-400",
  tax_form: "border-l-amber-400",
  emergency_contact: "border-l-rose-400",
  health_record: "border-l-pink-400",
  other: "border-l-slate-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isExpired(date?: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 90;
}

// ── Document card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  isManager,
  onToggleVisibility,
  onDelete,
}: {
  doc: EmployeeDocument;
  isManager: boolean;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[doc.type];
  const Icon = meta.icon;
  const expired = isExpired(doc.expiresAt);
  const expiring = isExpiringSoon(doc.expiresAt);

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 overflow-hidden border-border/50",
        TYPE_BORDER[doc.type],
      )}
    >
      <div className="space-y-2 p-3">
        {/* Header row */}
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              meta.bg,
            )}
          >
            <Icon className={cn("size-4", meta.text)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{doc.name}</span>
              <Badge className={cn("border-0 text-[10px]", meta.bg, meta.text)}>
                {meta.label}
              </Badge>
              {expired && (
                <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
                  <AlertTriangle className="mr-0.5 size-2.5" /> Expired
                </Badge>
              )}
              {expiring && !expired && (
                <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                  <Clock className="mr-0.5 size-2.5" /> Expiring soon
                </Badge>
              )}
            </div>

            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px]">
              <span className="flex items-center gap-1">
                <Calendar className="size-2.5" /> Uploaded {doc.uploadedAt}
              </span>
              {doc.expiresAt && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    expired && "text-red-500 dark:text-red-400",
                    expiring && !expired && "text-amber-500 dark:text-amber-400",
                  )}
                >
                  Expires {doc.expiresAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action row — manager only */}
        {isManager && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onToggleVisibility(doc.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                doc.visibleToEmployee
                  ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {doc.visibleToEmployee ? (
                <>
                  <Eye className="size-3" /> Visible to employee
                </>
              ) : (
                <>
                  <EyeOff className="size-3" /> Hidden from employee
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onDelete(doc.id)}
              className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
              aria-label="Delete document"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface EmployeeFilesTabProps {
  profile: StaffProfile;
}

export function EmployeeFilesTab({ profile }: EmployeeFilesTabProps) {
  const fullName = fullNameOf(profile);
  const { can, viewerId } = useFacilityRbac();
  const isManager = can("manage_staff");
  const isOwnProfile = viewerId === profile.id;

  const [files, setFiles] = useState<EmployeeDocument[]>(() => {
    const all = allFiles.filter((d) => d.employeeId === profile.id);
    // Employees only see visible documents
    return isManager ? all : all.filter((d) => d.visibleToEmployee);
  });

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<EmployeeDocType>("other");
  const [docExpires, setDocExpires] = useState("");
  const [docVisible, setDocVisible] = useState(true);

  const stats = useMemo(() => {
    const total = files.length;
    const expiring = files.filter((d) => isExpiringSoon(d.expiresAt)).length;
    const expired = files.filter((d) => isExpired(d.expiresAt)).length;
    return { total, expiring, expired };
  }, [files]);

  // Non-managers can only view their own files
  if (!isManager && !isOwnProfile) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
          <LockKeyhole className="text-muted-foreground size-5" />
        </div>
        <p className="text-sm font-semibold">Employee files are private</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-xs">
          You can only view your own file history, not a colleague&apos;s.
        </p>
      </div>
    );
  }

  const openUpload = () => {
    setDocName("");
    setDocType("other");
    setDocExpires("");
    setDocVisible(true);
    setUploadOpen(true);
  };

  const handleUpload = () => {
    if (!docName.trim()) return;
    const newDoc: EmployeeDocument = {
      id: `ef-${Date.now()}`,
      employeeId: profile.id,
      employeeName: fullName,
      name: docName.trim(),
      type: docType,
      fileUrl: `/files/${profile.id}/${docName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      uploadedAt: new Date().toISOString().split("T")[0],
      expiresAt: docExpires || undefined,
      visibleToEmployee: docVisible,
      departmentId: profile.employment.employmentType ?? "",
    };
    setFiles((prev) => [newDoc, ...prev]);
    setUploadOpen(false);
  };

  const handleToggleVisibility = (id: string) => {
    setFiles((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, visibleToEmployee: !d.visibleToEmployee } : d,
      ),
    );
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((d) => d.id !== id));
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (files.length === 0) {
    return (
      <div className="space-y-4">
        {isManager && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={openUpload}>
              <Plus className="mr-1.5 size-3.5" /> Upload Document
            </Button>
          </div>
        )}
        <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="text-muted-foreground size-6 opacity-60" />
          </div>
          <p className="font-semibold">No documents on file</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs">
            {isManager
              ? "Upload work permits, certifications, contracts, and other employee documents."
              : "No documents have been shared with you yet."}
          </p>
        </div>
        {isManager && (
          <UploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            docName={docName}
            setDocName={setDocName}
            docType={docType}
            setDocType={setDocType}
            docExpires={docExpires}
            setDocExpires={setDocExpires}
            docVisible={docVisible}
            setDocVisible={setDocVisible}
            onUpload={handleUpload}
            employeeName={fullName}
          />
        )}
      </div>
    );
  }

  // ── Populated state ───────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Expiry alert — manager only */}
      {isManager && (stats.expired > 0 || stats.expiring > 0) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {stats.expired > 0 && `${stats.expired} expired`}
              {stats.expired > 0 && stats.expiring > 0 && " · "}
              {stats.expiring > 0 && `${stats.expiring} expiring within 90 days`}
            </p>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
              Review and renew documents to keep this employee&apos;s file up to
              date.
            </p>
          </div>
        </div>
      )}

      {/* Employee visibility notice */}
      {!isManager && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/40 dark:bg-sky-950/30">
          <Eye className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
              Your employee files
            </p>
            <p className="mt-0.5 text-xs text-sky-600/80 dark:text-sky-400/70">
              These are documents your employer has shared with you. Contact your
              manager if you believe a document is missing or incorrect.
            </p>
          </div>
        </div>
      )}

      {/* Header: stats + upload button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">
            {stats.total} document{stats.total !== 1 ? "s" : ""}
          </span>
          {stats.expired > 0 && (
            <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
              <AlertTriangle className="mr-0.5 size-2.5" /> {stats.expired} expired
            </Badge>
          )}
          {stats.expiring > 0 && (
            <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
              <Clock className="mr-0.5 size-2.5" /> {stats.expiring} expiring soon
            </Badge>
          )}
        </div>
        {isManager && (
          <Button size="sm" variant="outline" onClick={openUpload}>
            <Upload className="mr-1.5 size-3.5" /> Upload Document
          </Button>
        )}
      </div>

      {/* Document cards */}
      <div className="space-y-2">
        {files.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            isManager={isManager}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Visibility note for manager */}
      {isManager && (
        <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <CheckCircle2 className="size-3 text-emerald-500" />
          Documents marked <strong>Visible</strong> are shown to the employee in
          their own profile view.
        </p>
      )}

      {/* Upload dialog */}
      {isManager && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          docName={docName}
          setDocName={setDocName}
          docType={docType}
          setDocType={setDocType}
          docExpires={docExpires}
          setDocExpires={setDocExpires}
          docVisible={docVisible}
          setDocVisible={setDocVisible}
          onUpload={handleUpload}
          employeeName={fullName}
        />
      )}
    </div>
  );
}

// ── Upload dialog ─────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  docName: string;
  setDocName: (v: string) => void;
  docType: EmployeeDocType;
  setDocType: (v: EmployeeDocType) => void;
  docExpires: string;
  setDocExpires: (v: string) => void;
  docVisible: boolean;
  setDocVisible: (v: boolean) => void;
  onUpload: () => void;
  employeeName: string;
}

function UploadDialog({
  open,
  onOpenChange,
  docName,
  setDocName,
  docType,
  setDocType,
  docExpires,
  setDocExpires,
  docVisible,
  setDocVisible,
  onUpload,
  employeeName,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Upload Document — {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Document Name *</Label>
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g., Work Permit, First Aid Certificate"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select
              value={docType}
              onValueChange={(v) => setDocType(v as EmployeeDocType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as EmployeeDocType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TYPE_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Expiry Date (optional)</Label>
            <Input
              type="date"
              value={docExpires}
              onChange={(e) => setDocExpires(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="visible-toggle"
              checked={docVisible}
              onCheckedChange={setDocVisible}
            />
            <Label htmlFor="visible-toggle" className="cursor-pointer text-sm">
              Visible to employee
            </Label>
          </div>

          {/* Drag / drop placeholder */}
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Upload className="text-muted-foreground mx-auto mb-2 size-8 opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">
              Click or drag file to upload
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              PDF, JPG, PNG — max 10 MB
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUpload} disabled={!docName.trim()}>
            <Upload className="mr-1.5 size-3.5" /> Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
