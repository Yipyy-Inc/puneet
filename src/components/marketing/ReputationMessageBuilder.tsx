"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Smartphone,
  Mail,
  Clock,
  Sparkles,
  Plus,
  X,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { businessProfile } from "@/data/settings";
import { useReputation } from "@/hooks/use-reputation";
import { describeMinutes } from "@/lib/reputation/trigger-engine";
import {
  REPUTATION_VARIABLES,
  renderTemplate,
  smsSegments,
  LOCALE_LABELS,
  localeLabel,
} from "@/lib/reputation/message-template";
import type {
  ReputationSequenceStep,
  ReputationChannel,
} from "@/types/reputation";

function touchpointLabel(i: number): string {
  return i === 0 ? "Initial Outreach Request" : `Follow-Up Reminder ${i}`;
}

const FALLBACK_STEP: ReputationSequenceStep = {
  id: "seq-initial",
  channel: "sms",
  delayMinutes: 60,
  onlyIfNoResponse: false,
};

// ─── Variable insert chips (click or drag) ───────────────────────────────────

function VariableChips({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {REPUTATION_VARIABLES.map((v) => (
        <button
          key={v.token}
          type="button"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", v.token)}
          onClick={() => onInsert(v.token)}
          title={`${v.label} — ${v.description}`}
          className="bg-muted cursor-grab rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-amber-100 active:cursor-grabbing dark:hover:bg-amber-950/40"
        >
          {v.token}
        </button>
      ))}
    </div>
  );
}

// ─── Live simulator ───────────────────────────────────────────────────────────

function PhonePreview({
  body,
  device,
}: {
  body: string;
  device: "ios" | "android";
}) {
  const text = renderTemplate(body) || "Your message preview appears here…";
  return (
    <div
      className={cn(
        "mx-auto w-[250px] border-8 border-slate-900 bg-slate-900 shadow-xl",
        device === "ios" ? "rounded-[2.4rem]" : "rounded-[1.4rem]",
      )}
    >
      <div className="overflow-hidden rounded-[1.6rem] bg-white dark:bg-slate-950">
        <div className="border-b bg-slate-100 px-3 py-2 text-center text-xs font-semibold dark:bg-slate-900">
          {businessProfile.businessName}
        </div>
        <div className="min-h-[200px] bg-[#f4f4f6] p-3 dark:bg-slate-900/60">
          <div
            className={cn(
              "max-w-[82%] px-3 py-2 text-sm leading-snug",
              device === "ios"
                ? "rounded-2xl rounded-bl-sm bg-slate-200 text-slate-900"
                : "rounded-lg bg-emerald-100 text-emerald-950",
            )}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
            {businessProfile.businessName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {businessProfile.businessName}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              reviews@
              {businessProfile.website.replace(/^https?:\/\//, "") ||
                "yourbusiness.com"}
            </p>
          </div>
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            9:41 AM
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold">
          {renderTemplate(subject) || "(no subject)"}
        </p>
      </div>
      <div className="text-foreground p-3 text-sm leading-relaxed whitespace-pre-line">
        {renderTemplate(body) || "Your email body preview appears here…"}
      </div>
    </div>
  );
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export function ReputationMessageBuilder() {
  const { settings, patchSettings } = useReputation();
  const steps =
    settings.outreachSequence && settings.outreachSequence.length > 0
      ? settings.outreachSequence
      : [FALLBACK_STEP];

  const [selectedId, setSelectedId] = useState(steps[0].id);
  const [device, setDevice] = useState<"ios" | "android">("ios");
  const [activeLocale, setActiveLocale] = useState<string>("");

  const step = steps.find((s) => s.id === selectedId) ?? steps[0];

  const localization = settings.localization ?? {
    enabled: false,
    locales: ["en"],
  };
  const locales = localization.locales.length ? localization.locales : ["en"];
  const baseLocale = locales[0];
  const locale =
    localization.enabled && locales.includes(activeLocale)
      ? activeLocale
      : baseLocale;
  const available = Object.keys(LOCALE_LABELS).filter(
    (c) => !locales.includes(c),
  );

  function patchStep(patch: Partial<ReputationSequenceStep>) {
    patchSettings({
      outreachSequence: steps.map((s) =>
        s.id === step.id ? { ...s, ...patch } : s,
      ),
    });
  }

  // Content is per-locale: base locale uses the step's base fields; others use
  // the `localized` map. Keeps every translation (and its counter) distinct.
  const content =
    locale === baseLocale
      ? {
          smsBody: step.smsBody,
          emailSubject: step.emailSubject,
          emailBody: step.emailBody,
        }
      : (step.localized?.[locale] ?? {});

  function patchContent(patch: {
    smsBody?: string;
    emailSubject?: string;
    emailBody?: string;
  }) {
    if (locale === baseLocale) {
      patchStep(patch);
    } else {
      patchStep({
        localized: {
          ...step.localized,
          [locale]: { ...step.localized?.[locale], ...patch },
        },
      });
    }
  }

  function setLocalization(next: { enabled: boolean; locales: string[] }) {
    patchSettings({ localization: next });
  }

  const smsLen = (content.smsBody ?? "").length;

  return (
    <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_340px]">
      {/* Column 1 — Sequence & channel sidebar */}
      <div className="space-y-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Touchpoints
        </p>
        <div className="space-y-1.5">
          {steps.map((s, i) => {
            const active = s.id === step.id;
            const Icon = s.channel === "sms" ? Smartphone : Mail;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                    : "hover:bg-muted/50",
                )}
              >
                <p className="text-sm leading-tight font-medium">
                  {touchpointLabel(i)}
                </p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <Icon className="size-3" />
                  {s.channel.toUpperCase()}
                  <span className="opacity-50">·</span>
                  <Clock className="size-3" />
                  {describeMinutes(s.delayMinutes).replace(
                    " after checkout",
                    "",
                  )}
                </p>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-muted-foreground text-xs">
            Delivery medium
          </Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
            {(["sms", "email"] as ReputationChannel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => patchStep({ channel: c })}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                  step.channel === c
                    ? "bg-amber-600 text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {c === "sms" ? (
                  <Smartphone className="size-3.5" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                {c === "sms" ? "SMS" : "Email"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column 2 — Contextual content editor */}
      <div className="bg-card min-w-0 space-y-4 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {touchpointLabel(steps.indexOf(step))}
            </p>
            <p className="text-muted-foreground text-xs">
              Editing the {step.channel === "sms" ? "SMS" : "email"} content
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2">
            <Languages className="text-muted-foreground size-3.5" />
            <span className="text-muted-foreground text-xs">
              Multi-language
            </span>
            <Switch
              checked={localization.enabled}
              onCheckedChange={(v) =>
                setLocalization({ ...localization, enabled: v, locales })
              }
              aria-label="Enable multi-language"
            />
          </label>
        </div>

        {/* Side-by-side language tabs */}
        {localization.enabled && (
          <div className="flex flex-wrap items-center gap-1 border-b">
            {locales.map((code) => (
              <span key={code} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveLocale(code)}
                  className={cn(
                    "border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
                    code === locale
                      ? "text-foreground border-amber-500"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  {localeLabel(code)}
                  {code === baseLocale && (
                    <span className="text-muted-foreground/70 ml-1">
                      (default)
                    </span>
                  )}
                </button>
                {code !== baseLocale && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLocale(baseLocale);
                      setLocalization({
                        ...localization,
                        locales: locales.filter((c) => c !== code),
                      });
                    }}
                    className="text-muted-foreground/50 hover:text-destructive absolute top-0.5 -right-0.5"
                    aria-label={`Remove ${localeLabel(code)}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {available.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLocalization({
                    ...localization,
                    enabled: true,
                    locales: [...locales, code],
                  });
                  setActiveLocale(code);
                }}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1.5 text-xs"
              >
                <Plus className="size-3" /> {localeLabel(code)}
              </button>
            ))}
          </div>
        )}

        {localization.enabled && locales.length >= 2 && (
          <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-[11px]">
            <strong>Routing:</strong> clients with a saved language preference
            get that translation. Clients with no preference get a stacked
            bilingual message ({locales.map(localeLabel).join(" + ")}),
            separated by a divider line.
          </p>
        )}

        {step.channel === "sms" ? (
          <div className="space-y-2">
            <Label className="text-sm">Message</Label>
            <Textarea
              value={content.smsBody ?? ""}
              onChange={(e) => patchContent({ smsBody: e.target.value })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const token = e.dataTransfer.getData("text/plain");
                if (token)
                  patchContent({ smsBody: (content.smsBody ?? "") + token });
              }}
              placeholder="Type your SMS… drag a variable below to insert it."
              className="min-h-32 resize-none text-sm"
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  "tabular-nums",
                  smsLen > 160 ? "text-amber-600" : "text-muted-foreground",
                )}
              >
                {smsLen}/160 · {smsSegments(smsLen)} segment
                {smsSegments(smsLen) === 1 ? "" : "s"}
              </span>
            </div>
            <VariableChips
              onInsert={(t) =>
                patchContent({ smsBody: (content.smsBody ?? "") + t })
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Subject</Label>
              <Input
                value={content.emailSubject ?? ""}
                onChange={(e) => patchContent({ emailSubject: e.target.value })}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const token = e.dataTransfer.getData("text/plain");
                  if (token)
                    patchContent({
                      emailSubject: (content.emailSubject ?? "") + token,
                    });
                }}
                placeholder="Email subject line"
                className="text-sm"
              />
              <VariableChips
                onInsert={(t) =>
                  patchContent({
                    emailSubject: (content.emailSubject ?? "") + t,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Body</Label>
              <Textarea
                value={content.emailBody ?? ""}
                onChange={(e) => patchContent({ emailBody: e.target.value })}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const token = e.dataTransfer.getData("text/plain");
                  if (token)
                    patchContent({
                      emailBody: (content.emailBody ?? "") + token,
                    });
                }}
                placeholder="Write your email… drag variables in to personalize."
                className="min-h-44 resize-none text-sm"
              />
              <VariableChips
                onInsert={(t) =>
                  patchContent({ emailBody: (content.emailBody ?? "") + t })
                }
              />
            </div>
          </div>
        )}

        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Sparkles className="size-3 text-amber-500" />
          Drag a variable chip into a field, or click it to insert. Changes save
          automatically.
        </p>
      </div>

      {/* Column 3 — Live simulator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Live preview
          </p>
          {step.channel === "sms" && (
            <div className="flex gap-1 rounded-lg border p-0.5 text-[11px]">
              {(["ios", "android"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium transition-colors",
                    device === d
                      ? "bg-foreground text-background"
                      : "text-muted-foreground",
                  )}
                >
                  {d === "ios" ? "iOS" : "Android"}
                </button>
              ))}
            </div>
          )}
        </div>
        {step.channel === "sms" ? (
          <PhonePreview body={content.smsBody ?? ""} device={device} />
        ) : (
          <EmailPreview
            subject={content.emailSubject ?? ""}
            body={content.emailBody ?? ""}
          />
        )}
      </div>
    </div>
  );
}
