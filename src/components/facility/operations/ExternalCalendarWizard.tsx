"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EXTERNAL_PLATFORM_META,
  SYNC_FREQUENCY_OPTIONS,
  connectExternalCalendar,
  type ExternalCalendarPlatform,
  type SyncFrequency,
} from "@/lib/external-calendars";

const PLATFORMS = Object.keys(
  EXTERNAL_PLATFORM_META,
) as ExternalCalendarPlatform[];

const STEP_LABELS = ["Platform", "Authenticate", "Configure", "Confirm"];

const UNASSIGNED = "Unassigned";

export function ExternalCalendarWizard({
  open,
  onOpenChange,
  staffOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffOptions: string[];
}) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<ExternalCalendarPlatform | null>(
    null,
  );
  const [oauthConnected, setOauthConnected] = useState(false);
  const [authValue, setAuthValue] = useState("");
  const [webhook, setWebhook] = useState("");
  const [name, setName] = useState("");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("1h");
  const [leadTaskStaff, setLeadTaskStaff] = useState(UNASSIGNED);
  const [autoCreateCustomers, setAutoCreateCustomers] = useState(true);
  const [pushBookings, setPushBookings] = useState(false);

  // Reset the wizard each time it opens.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPlatform(null);
    setOauthConnected(false);
    setAuthValue("");
    setWebhook("");
    setName("");
    setSyncFrequency("1h");
    setLeadTaskStaff(UNASSIGNED);
    setAutoCreateCustomers(true);
    setPushBookings(false);
  }, [open]);

  const meta = platform ? EXTERNAL_PLATFORM_META[platform] : null;

  const selectPlatform = (next: ExternalCalendarPlatform) => {
    setPlatform(next);
    setName(EXTERNAL_PLATFORM_META[next].label);
    setOauthConnected(false);
    setAuthValue("");
    setWebhook("");
    setStep(2);
  };

  const authReady =
    meta?.authKind === "oauth" ? oauthConnected : authValue.trim().length > 0;

  const finish = () => {
    if (!platform) return;
    connectExternalCalendar({
      platform,
      name,
      authValue: meta?.authKind === "oauth" ? undefined : authValue,
      syncFrequency,
      leadTaskStaff: leadTaskStaff === UNASSIGNED ? undefined : leadTaskStaff,
      autoCreateCustomers,
      pushYipyyBookings: pushBookings,
    });
    toast.success(`${name} connected`, {
      description: "Syncing the last 7 and next 90 days…",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect External Calendar</DialogTitle>
          <DialogDescription>
            Sync appointments from another platform into your Yipyy calendar.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((label, index) => {
            const stepNumber = index + 1;
            const done = step > stepNumber;
            const active = step === stepNumber;
            return (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  {done ? <Check className="size-3" /> : stepNumber}
                </div>
                <span
                  className={cn(
                    "hidden text-[11px] font-medium sm:block",
                    active ? "text-slate-800" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
                {stepNumber < STEP_LABELS.length && (
                  <div className="h-px flex-1 bg-slate-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 — platform */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORMS.map((key) => {
              const platformMeta = EXTERNAL_PLATFORM_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPlatform(key)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-lg bg-white text-xs font-black ring-1 ring-slate-200"
                    style={{ color: platformMeta.color }}
                  >
                    {platformMeta.glyph}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {platformMeta.label}
                  </span>
                  {platformMeta.twoWay && (
                    <span className="text-[9px] font-medium text-emerald-600">
                      Two-way
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2 — authenticate */}
        {step === 2 && meta && (
          <div className="space-y-3">
            {meta.authKind === "oauth" && (
              <div className="rounded-xl border border-slate-200 p-4 text-center">
                {oauthConnected ? (
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600">
                    <Check className="size-4" />
                    Connected to {meta.label}
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-sm text-slate-600">
                      Authorize Yipyy to read {meta.label}.
                    </p>
                    <Button onClick={() => setOauthConnected(true)}>
                      Connect with {meta.label}
                    </Button>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Mock OAuth — no real authorization is performed.
                    </p>
                  </>
                )}
              </div>
            )}

            {meta.authKind === "ics-url" && (
              <div className="space-y-1.5">
                <Label htmlFor="ics-url">Public .ics URL</Label>
                <Input
                  id="ics-url"
                  value={authValue}
                  onChange={(event) => setAuthValue(event.target.value)}
                  placeholder="https://calendar.example.com/feed.ics"
                />
              </div>
            )}

            {meta.authKind === "api-key" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="api-key">API key</Label>
                  <Input
                    id="api-key"
                    value={authValue}
                    onChange={(event) => setAuthValue(event.target.value)}
                    placeholder="Paste your API key"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="webhook">Webhook URL (optional)</Label>
                  <Input
                    id="webhook"
                    value={webhook}
                    onChange={(event) => setWebhook(event.target.value)}
                    placeholder="https://hooks.yipyy.com/…"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — configure */}
        {step === 3 && meta && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-name">Calendar name</Label>
              <Input
                id="cal-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sync frequency</Label>
              <Select
                value={syncFrequency}
                onValueChange={(value) =>
                  setSyncFrequency(value as SyncFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assign lead follow-up tasks to</Label>
              <Select value={leadTaskStaff} onValueChange={setLeadTaskStaff}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>
                    Reception (default)
                  </SelectItem>
                  {staffOptions
                    .filter((staff) => staff !== UNASSIGNED)
                    .map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
              <span>
                Auto-create customers from leads
                <span className="block text-[10px] text-slate-400">
                  New attendees become Yipyy customer records
                </span>
              </span>
              <Switch
                checked={autoCreateCustomers}
                onCheckedChange={setAutoCreateCustomers}
              />
            </label>

            {meta.twoWay && (
              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
                <span>
                  Push Yipyy bookings out
                  <span className="block text-[10px] text-slate-400">
                    Two-way sync — writes confirmed bookings to {meta.label}
                  </span>
                </span>
                <Switch
                  checked={pushBookings}
                  onCheckedChange={setPushBookings}
                />
              </label>
            )}
          </div>
        )}

        {/* Step 4 — confirm */}
        {step === 4 && meta && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
            <SummaryRow label="Platform" value={meta.label} />
            <SummaryRow label="Calendar name" value={name} />
            <SummaryRow
              label="Sync frequency"
              value={
                SYNC_FREQUENCY_OPTIONS.find((o) => o.value === syncFrequency)
                  ?.label ?? syncFrequency
              }
            />
            <SummaryRow
              label="Lead tasks"
              value={leadTaskStaff === UNASSIGNED ? "Reception" : leadTaskStaff}
            />
            <SummaryRow
              label="Auto-create customers"
              value={autoCreateCustomers ? "On" : "Off"}
            />
            {meta.twoWay && (
              <SummaryRow
                label="Push Yipyy bookings"
                value={pushBookings ? "On" : "Off"}
              />
            )}
            <p className="pt-1 text-[11px] text-slate-500">
              On start, Yipyy syncs the last 7 and next 90 days.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              step === 1 ? onOpenChange(false) : setStep(step - 1)
            }
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button
              size="sm"
              disabled={(step === 1 && !platform) || (step === 2 && !authReady)}
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={finish}
            >
              Start Sync
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}
