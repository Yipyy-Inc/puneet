"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Send,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSubmitApplication } from "@/lib/api/merchant-application";
import {
  ATTESTATION_TEXT,
  attestationSchema,
  DOCUMENT_TYPES,
  stepCompletion,
  type MerchantApplication,
} from "@/lib/merchant-application/application";
import { TextField, fieldErrors, type FieldErrors } from "./fields";

// ============================================================================
// Step 5 — read it back, sign it, send it.
//
// ── THE SUMMARY IS BUILT FROM THE ROWS, NOT FROM THE FORM STATE ───────────
//
// Everything shown here is re-read from the application the server returned. A
// review screen assembled from what the wizard remembers typing would show a
// facility a version of their application that was never saved, and the first
// they would know is a rejection quoting a name they never sent.
//
// ── AND THE WORDS THEY AGREE TO ARE THE WORDS THAT GET RECORDED ───────────
//
// `ATTESTATION_TEXT` is imported from the same module the submit route copies
// onto the row. Two copies of a legal statement is one copy nobody reads and
// one copy that binds.
// ============================================================================

export function StepReview({
  application,
  onBack,
  onEditStep,
}: {
  application: MerchantApplication;
  onBack: () => void;
  onEditStep: (step: number) => void;
}) {
  const [signedName, setSignedName] = useState("");
  const [signedTitle, setSignedTitle] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = useSubmitApplication();

  const done = stepCompletion(application);
  const business = application.business;
  const banking = application.banking;
  const liveDocuments = application.documents.filter((d) => !d.purgedAt);

  const outstanding: { label: string; step: number }[] = [
    { label: "Your business details", step: 1, ok: done.business },
    {
      label: "Owners and their identity numbers",
      step: 2,
      ok: done.principals,
    },
    { label: "Banking and volume", step: 3, ok: done.banking },
    { label: "Required documents", step: 4, ok: done.documents },
  ]
    .filter((row) => !row.ok)
    .map(({ label, step }) => ({ label, step }));

  function send() {
    const parsed = attestationSchema.safeParse({
      signedName,
      signedTitle,
      agreed,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    submit.mutate(
      {
        signedName: parsed.data.signedName,
        signedTitle: parsed.data.signedTitle,
        agreed: true,
      },
      {
        onSuccess: () =>
          toast.success("Your application is on its way to underwriting."),
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">Review and sign</h3>
        <p className="text-muted-foreground text-sm/relaxed">
          Once you submit, this is locked while it is reviewed. Check it now —
          correcting it afterwards means asking us to send it back.
        </p>
      </header>

      {outstanding.length > 0 && (
        <div className="space-y-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
            Not finished yet
          </p>
          <ul className="space-y-1.5">
            {outstanding.map((row) => (
              <li
                key={row.label}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span>{row.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1.5 py-0.5"
                  onClick={() => onEditStep(row.step)}
                >
                  <Pencil className="size-3" />
                  Go to step {row.step}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Business" onEdit={() => onEditStep(1)}>
        <Row label="Legal name" value={business.legalName} />
        <Row label="Trading as" value={business.tradingName || "—"} />
        <Row label="Structure" value={business.businessStructure} />
        <Row label="Tax number" value={business.taxId} />
        <Row
          label="Address"
          value={[
            business.addressLine1,
            business.addressLine2,
            business.city,
            business.region,
            business.postalCode,
            business.country,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <Row label="Contact" value={business.businessEmail} />
      </Section>

      <Section title="Owners" onEdit={() => onEditStep(2)}>
        {application.principals.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody added.</p>
        ) : (
          <ul className="space-y-2">
            {application.principals.map((principal) => (
              <li key={principal.id} className="text-sm">
                <span className="font-medium">{principal.fullName}</span>{" "}
                <span className="text-muted-foreground">
                  — {principal.title}, {principal.ownershipPercent}%
                  {principal.isControlPerson && ", controls the business"}
                  {principal.nationalIdLast4
                    ? `, ID ending ${principal.nationalIdLast4}`
                    : ", no identity number yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Banking" onEdit={() => onEditStep(3)}>
        <Row label="Account name" value={banking.bankAccountName} />
        <Row
          label="Account number"
          value={banking.bankLast4 ? `•••• ${banking.bankLast4}` : "Not given"}
        />
        <Row
          label="Card takings a month"
          value={money(banking.estimatedMonthlyVolumeCents)}
        />
        <Row label="Average sale" value={money(banking.averageTicketCents)} />
        <Row label="Largest sale" value={money(banking.highestTicketCents)} />
        <Row
          label="Taken without the card"
          value={
            banking.cardNotPresentPercent === undefined
              ? "—"
              : `${banking.cardNotPresentPercent}%`
          }
        />
      </Section>

      <Section title="Documents" onEdit={() => onEditStep(4)}>
        {liveDocuments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing uploaded.</p>
        ) : (
          <ul className="space-y-1.5">
            {liveDocuments.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">
                  {DOCUMENT_TYPES.find((t) => t.value === document.docType)
                    ?.label ?? document.docType}
                </span>
                <span className="text-muted-foreground min-w-0 truncate">
                  {document.fileName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <section className="space-y-5 rounded-xl border p-5">
        <p className="font-semibold">Your declaration</p>
        <div className="text-muted-foreground space-y-3 text-sm/relaxed">
          {ATTESTATION_TEXT.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="signed-name"
            label="Type your full name to sign"
            value={signedName}
            error={errors.signedName}
            onChange={setSignedName}
            autoComplete="off"
          />
          <TextField
            id="signed-title"
            label="Your role in the business"
            value={signedTitle}
            error={errors.signedTitle}
            onChange={setSignedTitle}
            placeholder="Owner, Director"
          />
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="attest"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="attest" className="block text-sm/relaxed font-normal">
            I have read the above and I accept it on behalf of the business.
          </Label>
        </div>
        {errors.agreed && (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {errors.agreed}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button variant="ghost" onClick={onBack} disabled={submit.isPending}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          size="lg"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={send}
          disabled={submit.isPending || !done.readyToSubmit}
        >
          {submit.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Submit my application
        </Button>
      </div>
    </div>
  );
}

function money(cents: number | undefined): string {
  if (cents === undefined) return "—";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid gap-1 py-1 sm:grid-cols-[12rem_1fr]">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}
