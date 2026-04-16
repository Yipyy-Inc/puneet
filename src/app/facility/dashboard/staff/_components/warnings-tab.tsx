"use client";

import { useRef, useState, useMemo } from "react";
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  MessageSquare,
  FileText,
  PenLine,
  Fingerprint,
  MapPin,
  Info,
  LockKeyhole,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  issuedWarnings as allWarnings,
  warningTemplates,
} from "@/data/facility-warnings";
import {
  WARNING_TYPE_META,
  type IssuedWarning,
  type WarningType,
} from "@/types/facility-warnings";
import type { StaffProfile } from "@/types/facility-staff";
import { fullNameOf } from "./staff-shared";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";

// Left-border accent per warning severity
const TYPE_BORDER: Record<WarningType, string> = {
  verbal: "border-l-amber-400",
  written: "border-l-orange-400",
  final: "border-l-red-500",
  suspension: "border-l-red-600",
  termination: "border-l-red-900",
  custom: "border-l-slate-400",
};

// Subtle background tint per severity
const TYPE_BG: Record<WarningType, string> = {
  verbal: "bg-amber-50/60 dark:bg-amber-950/20",
  written: "bg-orange-50/60 dark:bg-orange-950/20",
  final: "bg-red-50/70 dark:bg-red-950/25",
  suspension: "bg-red-50/80 dark:bg-red-950/30",
  termination: "bg-red-100/60 dark:bg-red-950/40",
  custom: "bg-slate-50/60 dark:bg-slate-900/20",
};

// ── Signature Pad ─────────────────────────────────────────────────────────────

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getXY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getXY(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    const { x, y } = getXY(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    onChange(canvasRef.current!.toDataURL());
  };

  const onUp = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        width={480}
        height={100}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        className="w-full cursor-crosshair rounded-lg border bg-white"
        style={{ touchAction: "none" }}
      />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px]">Draw your signature above</p>
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-foreground text-[11px] underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IssuedWarning["status"] }) {
  if (status === "signed")
    return (
      <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mr-0.5 size-2.5" /> Signed
      </Badge>
    );
  if (status === "pending_signature")
    return (
      <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
        <Clock className="mr-0.5 size-2.5" /> Pending signature
      </Badge>
    );
  if (status === "appealed")
    return (
      <Badge className="border-0 bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-400">
        Appealed
      </Badge>
    );
  return (
    <Badge className="border-0 bg-slate-500/10 text-[10px] text-slate-700 dark:text-slate-400">
      Resolved
    </Badge>
  );
}

// ── Type distribution strip ───────────────────────────────────────────────────

function TypeDistribution({ warnings }: { warnings: IssuedWarning[] }) {
  const counts = useMemo(() => {
    const map = new Map<WarningType, number>();
    for (const w of warnings) map.set(w.type, (map.get(w.type) ?? 0) + 1);
    return map;
  }, [warnings]);

  const order: WarningType[] = [
    "termination",
    "suspension",
    "final",
    "written",
    "verbal",
    "custom",
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {order
        .filter((t) => counts.has(t))
        .map((t) => {
          const meta = WARNING_TYPE_META[t];
          return (
            <span
              key={t}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                meta.bg,
                meta.text,
              )}
            >
              {counts.get(t)}× {meta.label}
            </span>
          );
        })}
    </div>
  );
}

// ── Warning card ──────────────────────────────────────────────────────────────

function WarningCard({
  w,
  isManager,
  onSign,
}: {
  w: IssuedWarning;
  isManager: boolean;
  onSign: (w: IssuedWarning) => void;
}) {
  const meta = WARNING_TYPE_META[w.type];

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 overflow-hidden",
        TYPE_BORDER[w.type],
        TYPE_BG[w.type],
        "border-border/50",
      )}
    >
      <div className="space-y-1.5 p-2.5">
        {/* Header */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold">{w.templateTitle}</span>
          <Badge className={cn("border-0 text-[10px]", meta.bg, meta.text)}>
            {meta.label}
          </Badge>
          <StatusBadge status={w.status} />
        </div>

        {/* Reason */}
        <p className="text-muted-foreground text-[11px] leading-snug">{w.reason}</p>

        {/* Meta row */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px]">
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5" />
            {new Date(w.issuedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}
          </span>
          <span className="flex items-center gap-1">
            <User className="size-2.5" />
            {w.issuedByName}
          </span>
          {w.witnessName && (
            <span className="flex items-center gap-1">
              <User className="size-2.5" />
              Witness: {w.witnessName}
            </span>
          )}
        </div>

        {/* Manager notes */}
        {w.managerNotes && (
          <div className="bg-muted/40 rounded-md px-2 py-1.5">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1 text-[9px] font-semibold tracking-wide uppercase">
              <MessageSquare className="size-2.5" /> Manager notes
            </p>
            <p className="text-[11px] leading-snug">{w.managerNotes}</p>
          </div>
        )}

        {/* Signature record */}
        {w.status === "signed" && w.signedAt && (
          <div className="border-border/50 rounded-md border px-2 py-1.5 text-[10px]">
            <p className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-2.5" />
              Signed{" "}
              {new Date(w.signedAt).toLocaleString("en-CA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {w.ipAddress && (
                <span className="text-muted-foreground ml-1 font-normal">
                  · {w.ipAddress}
                </span>
              )}
              {w.deviceId && (
                <span className="text-muted-foreground ml-1 font-mono font-normal">
                  · {w.deviceId}
                </span>
              )}
            </p>
            {w.signatureData && (
              <div className="bg-background/60 mt-1.5 flex h-10 items-center justify-center rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.signatureData}
                  alt="Employee signature"
                  className="max-h-8 object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* Get signature (manager only, pending only) */}
        {isManager && w.status === "pending_signature" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-[11px]"
            onClick={() => onSign(w)}
          >
            <PenLine className="mr-1 size-3" /> Get Employee Signature
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WarningsTabProps {
  profile: StaffProfile;
}

export function WarningsTab({ profile }: WarningsTabProps) {
  const fullName = fullNameOf(profile);
  const { can, viewerId } = useFacilityRbac();
  const isManager = can("manage_staff");
  const isOwnProfile = viewerId === profile.id;

  // All hooks must be declared before any conditional returns (Rules of Hooks)
  const [warnings, setWarnings] = useState<IssuedWarning[]>(() =>
    allWarnings.filter((w) => w.employeeId === profile.id),
  );

  // Issue dialog state
  const [issueOpen, setIssueOpen] = useState(false);
  const [templateId, setTemplateId] = useState("ad-hoc");
  const [formType, setFormType] = useState<WarningType>("written");
  const [formReason, setFormReason] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formWitness, setFormWitness] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Sign dialog state
  const [signingWarning, setSigningWarning] = useState<IssuedWarning | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => warningTemplates.find((t) => t.id === templateId),
    [templateId],
  );

  // Non-managers can only view their own warnings
  if (!isManager && !isOwnProfile) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
          <LockKeyhole className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">Disciplinary records are private</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-xs">
          You can only view your own disciplinary history, not a colleague's.
        </p>
      </div>
    );
  }

  const pending = warnings.filter((w) => w.status === "pending_signature").length;
  const needsEscalation = warnings.length >= 3;

  const openIssue = () => {
    setTemplateId("ad-hoc");
    setFormType("written");
    setFormReason("");
    setFormBody("");
    setFormNotes("");
    setFormWitness("");
    setFieldValues({});
    setIssueOpen(true);
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const t = warningTemplates.find((x) => x.id === id);
    if (t) {
      setFormType(t.defaultType);
      setFormBody(t.body);
      setFieldValues({});
    } else {
      setFormBody("");
      setFieldValues({});
    }
  };

  const handleIssue = () => {
    if (!formReason.trim()) return;
    const w: IssuedWarning = {
      id: `iw-${Date.now()}`,
      templateId: selectedTemplate?.id,
      templateTitle: selectedTemplate?.title ?? formReason,
      employeeId: profile.id,
      employeeName: fullName,
      type: formType,
      reason: formReason,
      body: formBody,
      fieldValues,
      managerNotes: formNotes,
      issuedBy: "fs-owner-01",
      issuedByName: "Émilie Laurent",
      issuedAt: new Date().toISOString(),
      witnessName: formWitness || undefined,
      departmentId: profile.employment.employmentType ?? "",
      status: "pending_signature",
    };
    setWarnings((prev) => [w, ...prev]);
    setIssueOpen(false);
  };

  const handleSign = () => {
    if (!signingWarning || !signatureData) return;
    const now = new Date().toISOString();
    setWarnings((prev) =>
      prev.map((w) =>
        w.id === signingWarning.id
          ? {
              ...w,
              status: "signed",
              signedAt: now,
              signatureData,
              ipAddress: "192.168.1.1",
              deviceId: `fp-${Math.random().toString(36).slice(2, 10)}`,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : w,
      ),
    );
    setSigningWarning(null);
    setSignatureData(null);
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (warnings.length === 0) {
    return (
      <div className="space-y-4">
        {isManager && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={openIssue}>
              <Plus className="mr-1.5 size-3.5" /> Issue Warning
            </Button>
          </div>
        )}
        <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </div>
          <p className="font-semibold">Clean disciplinary record</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs">
            {isManager
              ? "No warnings have been issued to this staff member."
              : "You have no warnings on record. Keep up the great work!"}
          </p>
        </div>
        {isManager && (
          <IssueWarningDialog
            open={issueOpen}
            onOpenChange={setIssueOpen}
            templateId={templateId}
            onTemplateChange={handleTemplateChange}
            formType={formType}
            setFormType={setFormType}
            formReason={formReason}
            setFormReason={setFormReason}
            formBody={formBody}
            setFormBody={setFormBody}
            formNotes={formNotes}
            setFormNotes={setFormNotes}
            formWitness={formWitness}
            setFormWitness={setFormWitness}
            fieldValues={fieldValues}
            setFieldValues={setFieldValues}
            selectedTemplate={selectedTemplate}
            onIssue={handleIssue}
            employeeName={fullName}
          />
        )}
      </div>
    );
  }

  // ── Populated state ───────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Escalation banner — manager only */}
      {needsEscalation && isManager && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {warnings.length} warnings on record — review termination protocol
            </p>
            <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
              Policy requires a formal HR review before further action. Consult management
              before issuing additional warnings or initiating termination.
            </p>
          </div>
        </div>
      )}

      {/* Employee read-only notice */}
      {!isManager && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/40 dark:bg-sky-950/30">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
              Your disciplinary record
            </p>
            <p className="mt-0.5 text-xs text-sky-600/80 dark:text-sky-400/70">
              Signing a warning acknowledges receipt — not necessarily agreement. Contact
              your manager if you believe a record is inaccurate.
            </p>
          </div>
        </div>
      )}

      {/* Header: type distribution + pending badge + issue button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TypeDistribution warnings={warnings} />
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
              <Clock className="mr-0.5 size-2.5" /> {pending} pending signature
            </Badge>
          )}
          {isManager && (
            <Button size="sm" variant="outline" onClick={openIssue}>
              <Plus className="mr-1.5 size-3.5" /> Issue Warning
            </Button>
          )}
        </div>
      </div>

      {/* Warning cards */}
      <div className="space-y-2">
        {warnings.map((w) => (
          <WarningCard
            key={w.id}
            w={w}
            isManager={isManager}
            onSign={(warning) => {
              setSignatureData(null);
              setSigningWarning(warning);
            }}
          />
        ))}
      </div>

      {/* Issue Warning dialog — manager only */}
      {isManager && (
        <IssueWarningDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          templateId={templateId}
          onTemplateChange={handleTemplateChange}
          formType={formType}
          setFormType={setFormType}
          formReason={formReason}
          setFormReason={setFormReason}
          formBody={formBody}
          setFormBody={setFormBody}
          formNotes={formNotes}
          setFormNotes={setFormNotes}
          formWitness={formWitness}
          setFormWitness={setFormWitness}
          fieldValues={fieldValues}
          setFieldValues={setFieldValues}
          selectedTemplate={selectedTemplate}
          onIssue={handleIssue}
          employeeName={fullName}
        />
      )}

      {/* Sign dialog */}
      <Dialog open={!!signingWarning} onOpenChange={(v) => !v && setSigningWarning(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-4" /> Employee Signature
            </DialogTitle>
          </DialogHeader>
          {signingWarning && (
            <>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 pr-2">
                  <div className="bg-muted/20 rounded-xl border p-4">
                    <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                      Warning document
                    </p>
                    <pre className="font-sans text-xs/relaxed whitespace-pre-wrap">
                      {signingWarning.body}
                    </pre>
                  </div>
                  {Object.keys(signingWarning.fieldValues).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Incident details
                      </p>
                      {Object.entries(signingWarning.fieldValues).map(([k, v]) => (
                        <div
                          key={k}
                          className="border-border/60 flex justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                        >
                          <span className="text-muted-foreground capitalize">
                            {k.replace(/_/g, " ")}
                          </span>
                          <span className="text-right font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Employee signature
                    </p>
                    <p className="text-muted-foreground text-xs">
                      By signing below, {signingWarning.employeeName} acknowledges receipt
                      of this warning. Signing does not necessarily indicate agreement.
                    </p>
                    <SignaturePad onChange={setSignatureData} />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setSigningWarning(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={!signatureData}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" /> Confirm Signature
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Issue Warning Dialog ──────────────────────────────────────────────────────

interface IssueDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string;
  onTemplateChange: (id: string) => void;
  formType: WarningType;
  setFormType: (v: WarningType) => void;
  formReason: string;
  setFormReason: (v: string) => void;
  formBody: string;
  setFormBody: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  formWitness: string;
  setFormWitness: (v: string) => void;
  fieldValues: Record<string, string>;
  setFieldValues: (v: Record<string, string>) => void;
  selectedTemplate: ReturnType<typeof warningTemplates.find>;
  onIssue: () => void;
  employeeName: string;
}

function IssueWarningDialog({
  open,
  onOpenChange,
  templateId,
  onTemplateChange,
  formType,
  setFormType,
  formReason,
  setFormReason,
  formBody,
  setFormBody,
  formNotes,
  setFormNotes,
  formWitness,
  setFormWitness,
  fieldValues,
  setFieldValues,
  selectedTemplate,
  onIssue,
  employeeName,
}: IssueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Issue Warning — {employeeName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-2">
            {/* Template selection */}
            <div className="space-y-1.5">
              <Label>Warning Template</Label>
              <Select value={templateId} onValueChange={onTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad-hoc">
                    <span className="flex items-center gap-2">
                      <FileText className="size-3.5" /> Ad-hoc (no template)
                    </span>
                  </SelectItem>
                  {warningTemplates
                    .filter((t) => t.active)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTemplate?.description && (
                <p className="text-muted-foreground text-xs">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Warning type */}
            <div className="space-y-1.5">
              <Label>Warning Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as WarningType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WARNING_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Input
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g., Repeated tardiness, safety protocol breach"
              />
            </div>

            {/* Custom template fields */}
            {selectedTemplate && selectedTemplate.fields.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Template fields
                </p>
                {selectedTemplate.fields.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <Label>
                      {f.label}
                      {f.required && <span className="ml-1 text-red-500">*</span>}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) =>
                          setFieldValues({ ...fieldValues, [f.id]: e.target.value })
                        }
                        placeholder={f.placeholder}
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) =>
                          setFieldValues({ ...fieldValues, [f.id]: e.target.value })
                        }
                        placeholder={f.placeholder}
                        type={f.type === "date" ? "date" : "text"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Warning body */}
            <div className="space-y-1.5">
              <Label>Warning Document Body</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="The full warning text shown to the employee before signing…"
                rows={6}
                className="text-sm"
              />
            </div>

            {/* Manager notes */}
            <div className="space-y-1.5">
              <Label>Manager Notes (internal)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Context, follow-up actions, prior conversations…"
                rows={2}
              />
            </div>

            {/* Witness */}
            <div className="space-y-1.5">
              <Label>Witness Name (optional)</Label>
              <Input
                value={formWitness}
                onChange={(e) => setFormWitness(e.target.value)}
                placeholder="Name of witness present"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onIssue}
            disabled={!formReason.trim()}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            <ShieldAlert className="mr-1.5 size-3.5" /> Issue Warning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
