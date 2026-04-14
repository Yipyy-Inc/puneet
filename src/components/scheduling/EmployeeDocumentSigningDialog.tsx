"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignaturePad } from "@/components/shared/SignaturePad";
import type { SignatureResult } from "@/components/shared/SignaturePad";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  MapPin,
  Clock,
} from "lucide-react";
import type {
  EmployeeDocumentTemplate,
  EmployeeDocumentSubmission,
} from "@/types/scheduling";

interface EmployeeInfo {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  role?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: EmployeeDocumentTemplate;
  employee: EmployeeInfo;
  onComplete: (
    submission: Omit<EmployeeDocumentSubmission, "id" | "facilityId">,
  ) => void;
  onboardingTaskId?: string;
}

type Step = "read" | "fill" | "sign" | "done";

const templateTypeLabels: Record<string, string> = {
  employment_agreement: "Employment Agreement",
  nda: "Confidentiality / NDA",
  policy_acknowledgement: "Policy Acknowledgement",
  health_declaration: "Health Declaration",
  emergency_contact: "Emergency Contact",
  direct_deposit: "Direct Deposit",
  tax_form: "Tax Form",
  custom: "Custom Document",
};

export function EmployeeDocumentSigningDialog({
  open,
  onOpenChange,
  template,
  employee,
  onComplete,
  onboardingTaskId,
}: Props) {
  const [step, setStep] = useState<Step>("read");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signedResult, setSignedResult] = useState<SignatureResult | null>(
    null,
  );

  const hasFields = template.fields.length > 0;
  const steps: Step[] = template.requiresSignature
    ? hasFields
      ? ["read", "fill", "sign", "done"]
      : ["read", "sign", "done"]
    : hasFields
      ? ["read", "fill", "done"]
      : ["read", "done"];

  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const requiredFields = template.fields.filter((f) => f.required);
  const allRequiredFilled = requiredFields.every((f) =>
    fieldValues[f.id]?.trim(),
  );

  const stepLabel: Record<Step, string> = {
    read: "Read Document",
    fill: "Fill In Details",
    sign: "Sign",
    done: "Complete",
  };

  const handleSign = (result: SignatureResult) => {
    setSignedResult(result);
    const submission: Omit<EmployeeDocumentSubmission, "id" | "facilityId"> = {
      templateId: template.id,
      templateTitle: template.title,
      employeeId: employee.id,
      employeeName: employee.name,
      fieldValues,
      signatureData: result.signatureData,
      signedAt: result.signedAt,
      ipAddress: result.ipAddress,
      userAgent: result.userAgent,
      timezone: result.timezone,
      deviceId: result.deviceId,
      status: "signed",
      onboardingTaskId,
      submittedAt: new Date().toISOString(),
    };
    onComplete(submission);
    setStep("done");
  };

  const handleSubmitNoSignature = () => {
    onComplete({
      templateId: template.id,
      templateTitle: template.title,
      employeeId: employee.id,
      employeeName: employee.name,
      fieldValues,
      status: "signed",
      onboardingTaskId,
      submittedAt: new Date().toISOString(),
    });
    setStep("done");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("read");
      setFieldValues({});
      setSignedResult(null);
    }, 300);
  };

  const nextStep = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-[620px]">
        <DialogHeader className="shrink-0">
          {/* Document header */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base/tight">
                {template.title}
              </DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  v{template.version}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {templateTypeLabels[template.type] ?? template.type}
                </Badge>
              </div>
            </div>
            {/* Employee chip */}
            <div className="bg-muted/50 flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1">
              <Avatar className="size-6">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="bg-slate-100 text-[8px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {employee.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{employee.name}</span>
            </div>
          </div>

          {/* Step progress */}
          <div className="mt-3 space-y-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              {steps
                .filter((s) => s !== "done")
                .map((s, i) => (
                  <span
                    key={s}
                    className={
                      s === step
                        ? "text-foreground font-semibold"
                        : stepIndex > i
                          ? "text-emerald-600 dark:text-emerald-400"
                          : ""
                    }
                  >
                    {stepLabel[s]}
                  </span>
                ))}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </DialogHeader>

        {/* ── Step: Read Document ── */}
        {step === "read" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <ScrollArea className="bg-muted/20 flex-1 rounded-lg border">
              <div className="p-5">
                <pre className="text-foreground font-sans text-sm/relaxed whitespace-pre-wrap">
                  {template.content}
                </pre>
              </div>
            </ScrollArea>
            <p className="text-muted-foreground shrink-0 text-xs">
              {template.description}
            </p>
            <div className="flex shrink-0 justify-between gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={nextStep}>
                I&apos;ve Read This
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Fill Fields ── */}
        {step === "fill" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <p className="text-muted-foreground shrink-0 text-sm">
              Please fill in your information accurately. Fields marked{" "}
              <span className="text-red-500">*</span> are required.
            </p>
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-1">
                {template.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={fieldValues[field.id] ?? ""}
                        onChange={(e) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={fieldValues[field.id] ?? ""}
                        onValueChange={(v) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [field.id]: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option…" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={
                          field.type === "email"
                            ? "email"
                            : field.type === "date"
                              ? "date"
                              : field.type === "phone"
                                ? "tel"
                                : field.type === "number"
                                  ? "number"
                                  : "text"
                        }
                        value={fieldValues[field.id] ?? ""}
                        onChange={(e) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex shrink-0 justify-between gap-2">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-1 size-4" /> Back
              </Button>
              <Button
                onClick={
                  template.requiresSignature
                    ? nextStep
                    : handleSubmitNoSignature
                }
                disabled={!allRequiredFilled}
              >
                {template.requiresSignature ? (
                  <>
                    Proceed to Sign
                    <ChevronRight className="ml-1 size-4" />
                  </>
                ) : (
                  "Submit Form"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Sign ── */}
        {step === "sign" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <p className="text-muted-foreground shrink-0 text-sm">
              Review the statement below and provide your electronic signature
              to confirm acceptance.
            </p>
            <ScrollArea className="flex-1">
              <div className="pr-1">
                <SignaturePad
                  onSign={handleSign}
                  label="Employee Signature"
                  agreementText={`I, ${fieldValues.full_name ?? employee.name}, confirm that I have read, understood, and agree to the terms of the "${template.title}" as presented in this document. I acknowledge this electronic signature carries the same legal weight as a handwritten signature.`}
                />
              </div>
            </ScrollArea>
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={prevStep}>
                <ChevronLeft className="mr-1 size-3.5" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Document Completed</p>
              <p className="text-muted-foreground text-sm">
                &ldquo;{template.title}&rdquo; has been successfully{" "}
                {template.requiresSignature ? "signed" : "submitted"} and saved
                to {employee.name}&apos;s file.
              </p>
            </div>

            {/* Audit trail summary */}
            {signedResult && (
              <div className="bg-muted/30 w-full space-y-2 rounded-xl border p-4 text-left text-xs">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Audit Trail
                </p>
                <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3 shrink-0" />
                    {new Date(signedResult.signedAt).toLocaleString("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 shrink-0" />
                    IP: {signedResult.ipAddress}
                  </span>
                  <span className="col-span-2 flex items-center gap-1.5">
                    <Shield className="size-3 shrink-0" />
                    Device ID: {signedResult.deviceId} &middot;{" "}
                    {signedResult.timezone}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-muted/30 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs">
              <Shield className="size-3.5 shrink-0" />
              Signature, IP address, timestamp &amp; device fingerprint captured
            </div>

            <Button className="px-8" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
