"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Lock, ShieldCheck } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import type { EmployeeOnboardingTask } from "@/data/staff-onboarding";

type Data = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

const DAYS = [
  { dow: 1, label: "Mon" },
  { dow: 2, label: "Tue" },
  { dow: 3, label: "Wed" },
  { dow: 4, label: "Thu" },
  { dow: 5, label: "Fri" },
  { dow: 6, label: "Sat" },
  { dow: 0, label: "Sun" },
];

export interface AvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export function availabilityFromData(value: Data): AvailabilityDay[] {
  const saved = Array.isArray(value.days)
    ? (value.days as AvailabilityDay[])
    : [];
  return DAYS.map(
    ({ dow }) =>
      saved.find((d) => d.dayOfWeek === dow) ?? {
        dayOfWeek: dow,
        isAvailable: false,
        startTime: "09:00",
        endTime: "17:00",
      },
  );
}

// ── Field helpers ───────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function FileCapture({
  value,
  accept,
  onCapture,
}: {
  value: Data;
  accept?: string;
  onCapture: (file: { name: string; url: string; uploadedAt: string }) => void;
}) {
  const file = value.file as { name: string; url: string } | undefined;
  return file?.name ? (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"
    >
      <FileText className="size-4" /> {file.name}
    </a>
  ) : (
    <label className="border-muted-foreground/30 hover:bg-muted/50 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
      <Upload className="size-4" /> Choose file
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onCapture({
            name: f.name,
            url: URL.createObjectURL(f),
            uploadedAt: new Date().toISOString(),
          });
        }}
      />
    </label>
  );
}

// ── Account (set password = Yipyy login) ────────────────────────────────────
export function AccountFields({
  staff,
  value,
  onChange,
}: {
  staff: StaffProfile;
  value: Data;
  onChange: (v: Data) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const pw = str(value.password);
  const confirm = str(value.confirm);
  const mismatch = confirm.length > 0 && pw !== confirm;
  return (
    <div className="space-y-4">
      <Field label="Email (your login)">
        <Input value={staff.email} readOnly className="bg-muted/40" />
      </Field>
      <Field label="Create a password" hint="At least 8 characters.">
        <Input
          type="password"
          value={pw}
          onChange={(e) => set("password", e.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm password">
        <Input
          type="password"
          value={confirm}
          onChange={(e) => set("confirm", e.target.value)}
          autoComplete="new-password"
        />
        {mismatch && (
          <p className="text-destructive text-xs">Passwords don’t match.</p>
        )}
      </Field>
    </div>
  );
}

export function isAccountValid(value: Data): boolean {
  const pw = str(value.password);
  return pw.length >= 8 && pw === str(value.confirm);
}

// ── Per-task section fields ─────────────────────────────────────────────────
export function SectionFields({
  task,
  staff,
  value,
  onChange,
}: {
  task: EmployeeOnboardingTask;
  staff: StaffProfile;
  value: Data;
  onChange: (v: Data) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });

  switch (task.type) {
    case "personal_info":
      return (
        <div className="space-y-4">
          <Field label="Legal full name">
            <Input
              value={str(value.legalName)}
              onChange={(e) => set("legalName", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={str(value.dateOfBirth)}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="SIN / SSN" hint="Encrypted — used for payroll only.">
            <Input
              value={str(value.taxId)}
              onChange={(e) => set("taxId", e.target.value)}
            />
          </Field>
        </div>
      );

    case "contact_details":
      return (
        <div className="space-y-4">
          <Field label="Email">
            <Input value={staff.email} readOnly className="bg-muted/40" />
          </Field>
          <Field label="Phone">
            <Input
              value={str(value.phone)}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Home address">
            <Textarea
              rows={2}
              value={str(value.address)}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
        </div>
      );

    case "emergency_contact":
      return (
        <div className="space-y-4">
          <Field label="Contact name">
            <Input
              value={str(value.name)}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Relationship">
            <Input
              value={str(value.relationship)}
              onChange={(e) => set("relationship", e.target.value)}
            />
          </Field>
          <Field label="Contact phone">
            <Input
              value={str(value.phone)}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </div>
      );

    case "banking":
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Encrypted and visible to your manager for payroll only. This
              section is optional — skip it if you’d rather set it up later.
            </span>
          </div>
          <Field label="Institution number">
            <Input
              value={str(value.institution)}
              onChange={(e) => set("institution", e.target.value)}
            />
          </Field>
          <Field label="Transit number">
            <Input
              value={str(value.transit)}
              onChange={(e) => set("transit", e.target.value)}
            />
          </Field>
          <Field label="Account number">
            <Input
              value={str(value.account)}
              onChange={(e) => set("account", e.target.value)}
            />
          </Field>
          <Field label="Void cheque">
            <FileCapture
              value={value}
              accept="image/*,application/pdf"
              onCapture={(f) => set("file", f)}
            />
          </Field>
        </div>
      );

    case "document_upload":
      return (
        <div className="space-y-3">
          <p className="text-sm">
            Upload: <span className="font-medium">{task.documentName}</span>
          </p>
          <FileCapture
            value={value}
            accept="image/*,application/pdf"
            onCapture={(f) => set("file", f)}
          />
        </div>
      );

    case "document_sign": {
      const agreed = value.agreed === true;
      return (
        <div className="space-y-4">
          <div className="bg-muted/30 flex h-40 flex-col items-center justify-center gap-1 rounded-md border text-sm">
            <FileText className="text-muted-foreground size-6" />
            <span className="font-medium">
              {task.documentName || "Document"}
            </span>
            <span className="text-muted-foreground text-xs">
              {task.documentRef
                ? `Preview: ${task.documentRef}`
                : "Document preview"}
            </span>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => set("agreed", v === true)}
              className="mt-0.5"
            />
            <span>I have read and agree to this document.</span>
          </label>
          <Field label="Type your full name to e-sign">
            <Input
              value={str(value.signature)}
              placeholder="Your full name"
              disabled={!agreed}
              onChange={(e) =>
                onChange({
                  ...value,
                  signature: e.target.value,
                  signedAt: e.target.value
                    ? new Date().toISOString()
                    : undefined,
                })
              }
            />
          </Field>
          {value.signedAt ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> Signed{" "}
              {new Date(String(value.signedAt)).toLocaleString()}
            </p>
          ) : null}
        </div>
      );
    }

    case "availability": {
      const days = availabilityFromData(value);
      const setDay = (dow: number, patch: Partial<AvailabilityDay>) =>
        set(
          "days",
          days.map((d) => (d.dayOfWeek === dow ? { ...d, ...patch } : d)),
        );
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Toggle the days you’re available and set your hours.
          </p>
          {DAYS.map(({ dow, label }) => {
            const d = days.find((x) => x.dayOfWeek === dow)!;
            const invalid = d.isAvailable && d.startTime >= d.endTime;
            return (
              <div
                key={dow}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-md border px-3 py-2",
                  !d.isAvailable && "bg-muted/30",
                )}
              >
                <label className="flex w-20 items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={d.isAvailable}
                    onCheckedChange={(v) => setDay(dow, { isAvailable: v })}
                  />
                  {label}
                </label>
                {d.isAvailable && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      value={d.startTime}
                      className="h-8 w-28"
                      onChange={(e) =>
                        setDay(dow, { startTime: e.target.value })
                      }
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      value={d.endTime}
                      className={cn(
                        "h-8 w-28",
                        invalid && "border-destructive",
                      )}
                      onChange={(e) => setDay(dow, { endTime: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "uniform_prefs":
      return (
        <div className="space-y-4">
          <Field label="Shirt size">
            <select
              value={str(value.shirtSize)}
              onChange={(e) => set("shirtSize", e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select…</option>
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes (optional)">
            <Textarea
              rows={2}
              value={str(value.notes)}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      );

    case "custom_question": {
      const q = task.question;
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium">{q?.prompt || task.name}</p>
          {q?.format === "multiple_choice" ? (
            <div className="space-y-1.5">
              {(q.options ?? []).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={task.id}
                    checked={str(value.answer) === opt}
                    onChange={() => set("answer", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : q?.format === "file" ? (
            <FileCapture value={value} onCapture={(f) => set("file", f)} />
          ) : (
            <Textarea
              rows={3}
              value={str(value.answer)}
              onChange={(e) => set("answer", e.target.value)}
            />
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ── Completion validation (required fields per type) ─────────────────────────
export function isSectionValid(
  task: EmployeeOnboardingTask,
  value: Data,
): boolean {
  const has = (k: string) => str(value[k]).trim().length > 0;
  switch (task.type) {
    case "personal_info":
      return has("legalName") && has("dateOfBirth") && has("taxId");
    case "contact_details":
      return has("phone") && has("address");
    case "emergency_contact":
      return has("name") && has("relationship") && has("phone");
    case "banking":
      return has("institution") && has("transit") && has("account");
    case "document_upload":
      return Boolean((value.file as { name?: string } | undefined)?.name);
    case "document_sign":
      return value.agreed === true && has("signature");
    case "availability": {
      const days = availabilityFromData(value);
      return days.every((d) => !d.isAvailable || d.startTime < d.endTime);
    }
    case "uniform_prefs":
      return has("shirtSize");
    case "custom_question":
      return task.question?.format === "file"
        ? Boolean((value.file as { name?: string } | undefined)?.name)
        : has("answer");
    default:
      return true;
  }
}
