"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall, CheckCircle2, XCircle, Upload, FileText,
  ChevronRight, ChevronLeft, Loader2, Bell, Clock,
  ShieldCheck, AlertTriangle, Info, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PortStatus = "idle" | "checking" | "eligible" | "ineligible";
type WizardStep = 1 | 2 | 3 | 4 | 5; // 5 = submitted/tracking

interface PortingRequest {
  phoneNumber: string;
  accountNumber: string;
  pin: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  authorizedName: string;
  file: File | null;
}

// Mock port status updates — in production these come from webhooks
const MOCK_STATUS_UPDATES = [
  { date: "2026-04-28", status: "submitted",  label: "Request submitted",          color: "text-blue-600",  bg: "bg-blue-50",  icon: FileText },
  { date: "2026-04-29", status: "approved",   label: "Approved by carrier",        color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  { date: "2026-05-01", status: "scheduled",  label: "Port scheduled for May 3rd", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
];

const STEPS = [
  { n: 1, label: "Portability Check" },
  { n: 2, label: "Account Info" },
  { n: 3, label: "Upload Bill" },
  { n: 4, label: "Authorize" },
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current }: { current: WizardStep }) {
  if (current === 5) return null;
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                done  ? "border-primary bg-primary text-white" :
                active ? "border-primary bg-primary/10 text-primary" :
                         "border-border bg-muted text-muted-foreground",
              )}>
                {done ? <CheckCircle2 className="size-3.5" /> : s.n}
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-tight text-center w-16",
                active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1 mb-4 mx-1 transition-colors", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────
export function NumberPortingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [portStatus, setPortStatus] = useState<PortStatus>("idle");
  const [form, setForm] = useState<PortingRequest>({
    phoneNumber: "", accountNumber: "", pin: "",
    serviceAddress: "", city: "", state: "", zip: "",
    authorizedName: "", file: null,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof PortingRequest, v: string | File | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const checkPortability = () => {
    if (!form.phoneNumber.trim()) return;
    setPortStatus("checking");
    // Mock API call — 1.5s delay
    setTimeout(() => {
      // Numbers ending in 0 are "ineligible" for demo
      setPortStatus(form.phoneNumber.endsWith("0") ? "ineligible" : "eligible");
    }, 1500);
  };

  const reset = () => {
    setStep(1);
    setPortStatus("idle");
    setForm({ phoneNumber: "", accountNumber: "", pin: "", serviceAddress: "", city: "", state: "", zip: "", authorizedName: "", file: null });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="size-4 text-primary" />
          Port Your Number
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Transfer your existing business number to this platform.
        </p>
      </CardHeader>
      <CardContent>
        {!open ? (
          /* ── Entry state ── */
          <div className="flex items-start gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <PhoneCall className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Keep your existing number</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Port your current business number so clients can still reach you. Takes 3–5 business days. No downtime.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Free porting", "Digital LOA", "Real-time status"].map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="size-3" />{t}
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
              Start Porting <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        ) : (
          /* ── Wizard ── */
          <div className="space-y-4">
            <StepBar current={step} />

            {/* ── Step 1: Portability Check ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-blue-50/50 border-blue-100 px-4 py-3 flex gap-2.5 text-sm text-blue-700">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <span>Enter your current business number to instantly check if it&apos;s eligible for porting.</span>
                </div>
                <div>
                  <Label className="mb-2 block">Current phone number</Label>
                  <div className="flex gap-2">
                    <Input
                      className="max-w-xs font-mono"
                      placeholder="+1 (514) 555-0100"
                      value={form.phoneNumber}
                      onChange={(e) => { set("phoneNumber", e.target.value); setPortStatus("idle"); }}
                    />
                    <Button
                      variant="outline"
                      onClick={checkPortability}
                      disabled={portStatus === "checking" || !form.phoneNumber.trim()}
                    >
                      {portStatus === "checking"
                        ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Checking…</>
                        : "Check"}
                    </Button>
                  </div>
                </div>

                {portStatus === "eligible" && (
                  <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-700 text-sm">Number is eligible for porting!</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        <span className="font-mono font-bold">{form.phoneNumber}</span> can be transferred. Continue to provide your carrier account details.
                      </p>
                    </div>
                  </div>
                )}

                {portStatus === "ineligible" && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <XCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700 text-sm">Number cannot be ported</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        This number is not eligible for porting at this time. Contact support for assistance.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <Button variant="ghost" size="sm" onClick={() => { setOpen(false); reset(); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={portStatus !== "eligible"}
                    onClick={() => setStep(2)}
                  >
                    Continue <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Account Info ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-amber-50/60 border-amber-100 px-4 py-3 flex gap-2.5 text-sm text-amber-700">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>These details must <strong>exactly match</strong> your current carrier&apos;s records or the port will be rejected.</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">Account number <span className="text-destructive">*</span></Label>
                    <Input placeholder="Found on your bill" value={form.accountNumber}
                      onChange={(e) => set("accountNumber", e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      Account PIN / Passcode
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(if applicable)</span>
                    </Label>
                    <Input type="password" placeholder="4–6 digit PIN" value={form.pin}
                      onChange={(e) => set("pin", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-2 block">Service address <span className="text-destructive">*</span></Label>
                    <Input placeholder="123 Main St" value={form.serviceAddress}
                      onChange={(e) => set("serviceAddress", e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-2 block">City <span className="text-destructive">*</span></Label>
                    <Input placeholder="Montreal" value={form.city}
                      onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-2 block">Province / State</Label>
                      <Input placeholder="QC" value={form.state}
                        onChange={(e) => set("state", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-2 block">Postal code</Label>
                      <Input placeholder="H1A 1A1" value={form.zip}
                        onChange={(e) => set("zip", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-1">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ChevronLeft className="size-3.5 mr-1" /> Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={!form.accountNumber.trim() || !form.serviceAddress.trim() || !form.city.trim()}
                    onClick={() => setStep(3)}
                  >
                    Continue <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Document Upload ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-blue-50/50 border-blue-100 px-4 py-3 flex gap-2.5 text-sm text-blue-700">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <span>Upload your most recent phone bill (within the last 30 days). PDF, JPG, or PNG — max 10 MB.</span>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => set("file", e.target.files?.[0] ?? null)}
                />

                {!form.file ? (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Click to upload your phone bill</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG — max 10 MB</p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border bg-green-50/50 border-green-200 px-4 py-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                      <FileText className="size-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{form.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(form.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => set("file", null)}
                      className="text-xs text-muted-foreground underline hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ChevronLeft className="size-3.5 mr-1" /> Back
                  </Button>
                  <Button size="sm" disabled={!form.file} onClick={() => setStep(4)}>
                    Continue <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: Digital LOA / Authorize ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                  <p className="font-semibold">Review your porting request</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Number to port</span>
                    <span className="font-mono font-semibold">{form.phoneNumber}</span>
                    <span className="text-muted-foreground">Account number</span>
                    <span className="font-mono">{form.accountNumber}</span>
                    <span className="text-muted-foreground">Service address</span>
                    <span>{form.serviceAddress}, {form.city} {form.state} {form.zip}</span>
                    <span className="text-muted-foreground">Document</span>
                    <span className="truncate">{form.file?.name}</span>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">
                    Authorized account holder name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Full legal name as on the account"
                    value={form.authorizedName}
                    onChange={(e) => set("authorizedName", e.target.value)}
                  />
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    By submitting, a <strong>Letter of Authorization (LOA)</strong> will be sent to your email for a digital signature. You authorize the transfer of the above number. No PDF required.
                  </p>
                </div>

                <div className="flex justify-between pt-1">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                    <ChevronLeft className="size-3.5 mr-1" /> Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={!form.authorizedName.trim()}
                    onClick={() => setStep(5)}
                  >
                    Submit &amp; Send LOA <ShieldCheck className="size-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 5: Submitted / Status tracking ── */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-green-100">
                    <CheckCircle2 className="size-7 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Port request submitted!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check your email for the LOA link to sign digitally. Porting typically takes 3–5 business days.
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
                    <Clock className="size-3" /> In Progress — Est. May 3, 2026
                  </Badge>
                </div>

                {/* Status timeline */}
                <div>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Bell className="size-3.5" /> Real-time status updates
                  </p>
                  <div className="space-y-2">
                    {MOCK_STATUS_UPDATES.map((u, i) => {
                      const Icon = u.icon;
                      return (
                        <div key={i} className={cn("flex items-start gap-3 rounded-xl border px-3 py-2.5", u.bg)}>
                          <Icon className={cn("size-4 shrink-0 mt-0.5", u.color)} />
                          <div className="flex-1">
                            <p className={cn("text-sm font-semibold", u.color)}>{u.label}</p>
                            <p className="text-xs text-muted-foreground">{u.date}</p>
                          </div>
                          <Badge variant="outline" className="capitalize text-[10px] shrink-0">{u.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Bell className="size-3" /> Status updates are pushed in real time via webhooks — no need to check email.
                  </p>
                </div>

                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={reset}>
                  <RotateCcw className="size-3.5" /> Start a new port request
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
