"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  Search,
  Send,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MERGE_FIELDS } from "@/lib/tiptap/merge-field";
import {
  buildAgreementDocumentWithValues,
  extractMergeTokens,
  substituteMergeFields,
} from "@/lib/agreements/merge-preview";
import { getEmailTemplate } from "@/data/email-templates";
import {
  agreementQueries,
  createSentAgreement,
  type AgreementFacilityRecipient,
  type AgreementTemplate,
} from "@/lib/api/agreements";

const STEPS = [
  "Template",
  "Facility",
  "Merge fields",
  "Expiry",
  "Preview",
  "Send",
] as const;

const TOKEN_LABELS: Record<string, string> = Object.fromEntries(
  MERGE_FIELDS.map((f) => [f.token, f.label]),
);

const EMAIL_TEMPLATE_ID = "tmpl-agreement-signature-request";

function tokenLabel(token: string): string {
  return TOKEN_LABELS[token] ?? token.replace(/_/g, " ");
}

function buildDefaultMergeValues(
  tokens: string[],
  recipient: AgreementFacilityRecipient,
  todayLabel: string,
): Record<string, string> {
  const base: Record<string, string> = {
    facility_name: recipient.name,
    owner_name: recipient.ownerName,
    plan_name: recipient.plan,
    subscription_start_date: recipient.subscriptionStart,
    monthly_amount: recipient.monthlyAmount,
    date: todayLabel,
    yipyy_rep_name: "Yipyy Representative",
  };
  const out: Record<string, string> = {};
  for (const token of tokens) out[token] = base[token] ?? "";
  return out;
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span
              className={cn(
                active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <ChevronRight className="text-muted-foreground/50 size-3" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function SendAgreementModal({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AgreementTemplate;
}) {
  const queryClient = useQueryClient();
  const { data: recipients = [], isPending } = useQuery(
    agreementQueries.recipients(),
  );

  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [mergeValues, setMergeValues] = useState<Record<string, string>>({});
  const [responseExpiresAt, setResponseExpiresAt] = useState<string | null>(
    null,
  );

  const tokens = useMemo(
    () => extractMergeTokens(template.content),
    [template.content],
  );

  const recipient = recipients.find((r) => r.id === facilityId) ?? null;

  const filtered = recipients.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      r.ownerEmail.toLowerCase().includes(q)
    );
  });

  const selectFacility = (r: AgreementFacilityRecipient) => {
    setFacilityId(r.id);
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setMergeValues(buildDefaultMergeValues(tokens, r, today));
  };

  const canAdvance = step !== 1 || recipient !== null;

  const handleSend = () => {
    if (!recipient) return;
    const id = crypto.randomUUID();
    const signingToken = crypto.randomUUID().replace(/-/g, "");

    createSentAgreement({
      id,
      templateId: template.id,
      templateVersion: template.version,
      templateName: template.name,
      documentType: template.type,
      facilityId: recipient.id,
      facilityName: recipient.name,
      ownerName: recipient.ownerName,
      ownerEmail: recipient.ownerEmail,
      sentBy: "Platform Admin",
      content: template.content,
      mergeValues,
      sentAt: new Date().toISOString(),
      responseExpiresAt,
      signingToken,
    });

    // Mock email dispatch using the new "Agreement Signature Request" template.
    queryClient.invalidateQueries({
      queryKey: agreementQueries.sent().queryKey,
    });
    toast.success(
      `Agreement sent to ${recipient.ownerName || recipient.name} · ${recipient.ownerEmail}`,
    );
    onOpenChange(false);
  };

  const emailTemplate = getEmailTemplate(EMAIL_TEMPLATE_ID);
  const emailSubject =
    emailTemplate && recipient
      ? substituteMergeFields(emailTemplate.subject, {
          facility_name: recipient.name,
          owner_name: recipient.ownerName,
          document_name: template.name,
        })
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-4rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Send className="size-4" />
            Send to Facility
          </DialogTitle>
          <div className="pt-3">
            <Stepper step={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {/* Step 1 — Template */}
          {step === 0 ? (
            <div className="space-y-4 p-5">
              <p className="text-muted-foreground text-sm">
                You are sending this template for signature:
              </p>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {template.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {template.type} · v{template.version} · {tokens.length}{" "}
                    merge field{tokens.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 2 — Facility */}
          {step === 1 ? (
            <div className="flex h-full flex-col p-5">
              <Label className="mb-2">Select facility</Label>
              <div className="relative mb-3">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search facilities or owners…"
                  className="pl-8"
                />
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded-lg border">
                <div className="divide-y">
                  {isPending ? (
                    <p className="text-muted-foreground p-4 text-sm">
                      Loading…
                    </p>
                  ) : filtered.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-sm">
                      No facilities match “{search}”.
                    </p>
                  ) : (
                    filtered.map((r) => {
                      const selected = r.id === facilityId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectFacility(r)}
                          className={cn(
                            "flex w-full items-center gap-3 p-3 text-left transition-colors",
                            selected ? "bg-primary/5" : "hover:bg-muted/50",
                          )}
                        >
                          <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                            <Building2 className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {r.name}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {r.ownerName} · {r.ownerEmail}
                            </span>
                          </span>
                          {selected ? (
                            <Check className="text-primary size-4" />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {recipient ? (
                <div className="bg-muted/40 mt-3 rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground text-xs">
                    Owner details (auto-filled)
                  </p>
                  <p className="font-medium">{recipient.ownerName}</p>
                  <p className="text-muted-foreground text-xs">
                    {recipient.ownerEmail}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Step 3 — Merge fields */}
          {step === 2 ? (
            <div className="space-y-4 p-5">
              <p className="text-muted-foreground text-sm">
                These values will be substituted into the document. Override any
                of them for this facility (e.g. custom pricing).
              </p>
              {tokens.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  This document has no merge fields.
                </p>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div
                      key={token}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3"
                    >
                      <Label htmlFor={`mf-${token}`} className="flex flex-col">
                        <span className="text-sm capitalize">
                          {tokenLabel(token)}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {`{{${token}}}`}
                        </span>
                      </Label>
                      <Input
                        id={`mf-${token}`}
                        value={mergeValues[token] ?? ""}
                        onChange={(e) =>
                          setMergeValues((prev) => ({
                            ...prev,
                            [token]: e.target.value,
                          }))
                        }
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Step 4 — Expiry */}
          {step === 3 ? (
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="response-expiry"
                  className="flex items-center gap-1.5"
                >
                  <CalendarClock className="text-muted-foreground size-4" />
                  Response deadline
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="response-expiry"
                    type="date"
                    className="max-w-xs"
                    value={responseExpiresAt ?? ""}
                    onChange={(e) =>
                      setResponseExpiresAt(e.target.value || null)
                    }
                  />
                  {responseExpiresAt ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setResponseExpiresAt(null)}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  After this date the signing link expires and a new one must be
                  sent. Leave blank for no deadline.
                </p>
              </div>
            </div>
          ) : null}

          {/* Step 5 — Preview */}
          {step === 4 ? (
            <div className="flex h-full flex-col bg-zinc-200/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  Exactly what {recipient?.ownerName || "the owner"} will see.
                </p>
                <Badge variant="outline" className="text-[10px]">
                  Merge fields filled
                </Badge>
              </div>
              <iframe
                title="Final document preview"
                srcDoc={buildAgreementDocumentWithValues(
                  template.content,
                  template.name,
                  mergeValues,
                )}
                className="min-h-0 w-full flex-1 rounded-md border bg-white shadow-sm"
                sandbox="allow-same-origin"
              />
            </div>
          ) : null}

          {/* Step 6 — Send */}
          {step === 5 ? (
            <div className="space-y-4 p-5">
              <div className="rounded-lg border">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Facility</p>
                    <p className="font-medium">{recipient?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Recipient</p>
                    <p className="font-medium">{recipient?.ownerName}</p>
                    <p className="text-muted-foreground text-xs">
                      {recipient?.ownerEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Document</p>
                    <p className="font-medium">
                      {template.name}{" "}
                      <span className="text-muted-foreground">
                        v{template.version}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Response deadline
                    </p>
                    <p className="font-medium">
                      {responseExpiresAt
                        ? new Date(responseExpiresAt).toLocaleDateString()
                        : "No deadline"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="text-muted-foreground size-4" />
                  Email: Agreement Signature Request
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Subject: {emailSubject || template.name}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  The email includes a secure, one-time signing link. The link
                  {responseExpiresAt
                    ? " expires on the response deadline."
                    : " does not expire unless a deadline is set."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              step === 0 ? onOpenChange(false) : setStep((s) => s - 1)
            }
            className="gap-1.5"
          >
            <ChevronLeft className="size-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSend} className="gap-1.5">
              <Send className="size-4" />
              Send agreement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
