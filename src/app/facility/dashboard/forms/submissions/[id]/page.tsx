"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSubmission,
  getSubmissionRecord,
  updateSubmissionRecordStatus,
  linkSubmissionToCustomer,
} from "@/data/form-submissions";
import { getFormAuditLog } from "@/lib/form-audit";
import { notifyCustomerSubmissionConfirmed } from "@/lib/form-customer-notifications";
import { getFormById, type FormQuestion } from "@/data/forms";
import { clients } from "@/data/clients";
import {
  ArrowLeft,
  UserPlus,
  Link2,
  CheckCircle,
  FileText,
  History,
} from "lucide-react";
import { toast } from "sonner";

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Format date for display without locale so server and client match (avoids hydration error) */
function formatSubmissionDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function AnswerBlock({ question, value }: { question: FormQuestion; value: unknown }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
      <p className="text-sm font-medium">{formatValue(value)}</p>
    </div>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const submission = getSubmission(id);
  const record = getSubmissionRecord(id);
  const form = submission ? getFormById(submission.formId) : null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">(
    submission?.customerId ?? record?.relatedCustomerId ?? ""
  );
  const [mergeRule, setMergeRule] = useState<"submitted_wins" | "existing_wins" | "ask">("submitted_wins");

  useEffect(() => {
    if (record?.status === "unread") {
      updateSubmissionRecordStatus(id, "read");
    }
  }, [id, record?.status]);

  const answers = submission?.answers ?? {};
  const visibleQuestions = useMemo(() => {
    if (!form) return [];
    return form.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "");
  }, [form, answers]);

  const emailFromAnswers = useMemo(() => {
    for (const v of Object.values(answers)) {
      const s = String(v);
      if (s.includes("@") && s.includes(".")) return s;
    }
    return "";
  }, [answers]);

  const phoneFromAnswers = useMemo(() => {
    for (const v of Object.values(answers)) {
      const s = String(v).replace(/\D/g, "");
      if (s.length >= 10) return String(v);
    }
    return "";
  }, [answers]);

  const submissionAuditEntries = useMemo(
    () => (id ? getFormAuditLog({ submissionId: id }) : []),
    [id]
  );

  const matchingCustomers = useMemo(() => {
    const out: typeof clients = [];
    const email = emailFromAnswers.trim().toLowerCase();
    const phone = phoneFromAnswers.replace(/\D/g, "");
    for (const c of clients) {
      if (email && c.email?.toLowerCase() === email) {
        out.push(c);
        continue;
      }
      if (phone && c.phone?.replace(/\D/g, "").includes(phone)) {
        out.push(c);
      }
    }
    return out;
  }, [emailFromAnswers, phoneFromAnswers]);

  const handleMarkProcessed = () => {
    if (!id || !submission) return;
    updateSubmissionRecordStatus(id, "processed");
    notifyCustomerSubmissionConfirmed({
      facilityId: submission.facilityId,
      formId: submission.formId,
      formName: form?.name ?? submission.formId,
      submissionId: submission.id,
      customerId: submission.customerId ?? record?.relatedCustomerId,
    });
    toast.success("Marked as processed");
    router.push("/facility/dashboard/forms/submissions");
  };

  const handleMatchExisting = (customerId: number) => {
    if (!id) return;
    // Audit: merge decision + overrides (overrides populated when we have diff; for now empty)
    linkSubmissionToCustomer(id, customerId, undefined, {
      mergeRule: mergeRule,
      overrides: [], // TODO: compute from submission answers vs existing profile when applying mapping
      staffUserId: "staff-demo",
      staffUserName: "Staff",
    });
    setSelectedCustomerId(customerId);
    toast.success("Linked to customer");
  };

  const handleCreateNew = () => {
    toast.info("Create New Profile would create customer + pet records (demo: not implemented)");
  };

  if (!submission || !record) {
    return (
      <div className="flex-1 p-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Submission not found.
            <Button variant="link" onClick={() => router.push("/facility/dashboard/forms/submissions")}>
              Back to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/facility/dashboard/forms/submissions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submission</h2>
          <p className="text-sm text-muted-foreground">
            {form?.name ?? submission.formId} · {formatSubmissionDate(submission.createdAt)}
          </p>
        </div>
        <Badge variant={record.status === "unread" ? "default" : "secondary"} className="ml-auto">
          {record.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Answers in form layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Answers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : (
              visibleQuestions.map((q) => (
                <AnswerBlock key={q.id} question={q} value={answers[q.id]} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Matching panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Match to profile
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Match by email/phone from answers, or create a new customer.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(emailFromAnswers || phoneFromAnswers) && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">From submission</p>
                {emailFromAnswers && <p>Email: {emailFromAnswers}</p>}
                {phoneFromAnswers && <p>Phone: {phoneFromAnswers}</p>}
              </div>
            )}

            {matchingCustomers.length > 0 ? (
              <div className="space-y-2">
                <Label>Matching customers</Label>
                <div className="space-y-2">
                  {matchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedCustomerId === c.id ? "secondary" : "outline"}
                        onClick={() => handleMatchExisting(c.id)}
                      >
                        {selectedCustomerId === c.id ? "Linked" : "Match"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No existing customer matched by email/phone.</p>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Merge rule (when merging)</Label>
              <Select value={mergeRule} onValueChange={(v: "submitted_wins" | "existing_wins" | "ask") => setMergeRule(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted_wins">Submitted overrides existing</SelectItem>
                  <SelectItem value="existing_wins">Existing wins</SelectItem>
                  <SelectItem value="ask">Ask on conflict</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCreateNew}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create new profile
              </Button>
              <Button size="sm" onClick={handleMarkProcessed}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as processed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit & compliance: timestamps, merge decision, audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit & compliance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Submission timestamps and merge decisions are logged for compliance.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Received at</Label>
              <p className="text-sm font-medium">{submission ? formatSubmissionDate(submission.createdAt) : "—"}</p>
            </div>
            {record?.submittedAt && (
              <div>
                <Label className="text-muted-foreground text-xs">Submitted at</Label>
                <p className="text-sm font-medium">{formatSubmissionDate(record.submittedAt)}</p>
              </div>
            )}
          </div>
          {record?.mergeDecision && typeof record.mergeDecision === "object" && "rule" in record.mergeDecision && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium mb-1">Merge decision</p>
              <p className="text-muted-foreground text-xs">
                Rule: {(record.mergeDecision as { rule?: string }).rule ?? "—"} · at {(record.mergeDecision as { at?: string }).at ?? "—"}
              </p>
              {Array.isArray((record.mergeDecision as { overrides?: unknown[] }).overrides) &&
                (record.mergeDecision as { overrides: { field: string; submittedValue: string; existingValue: string }[] }).overrides.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs">
                    {(record.mergeDecision as { overrides: { field: string; submittedValue: string; existingValue: string }[] }).overrides.map((o, i) => (
                      <li key={i}>{o.field}: submitted &quot;{o.submittedValue}&quot; vs existing &quot;{o.existingValue}&quot;</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
          {submissionAuditEntries.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Audit log (this submission)</Label>
              <ul className="mt-1 space-y-1 text-xs">
                {submissionAuditEntries.slice(0, 10).map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{e.timestamp.slice(0, 19).replace("T", " ")}</span>
                    <span>{e.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
