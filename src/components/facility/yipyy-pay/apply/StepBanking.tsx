"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Info, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSaveStep, useStoreSecret } from "@/lib/api/merchant-application";
import {
  bankingStepSchema,
  CNP_QUESTIONNAIRE_THRESHOLD,
  type MerchantApplication,
} from "@/lib/merchant-application/application";
import {
  MoneyField,
  SecretField,
  StoredLast4,
  TextAreaField,
  TextField,
  fieldErrors,
  fromCents,
  toCents,
  type FieldErrors,
} from "./fields";

// ============================================================================
// Step 3 — where the money lands, and how much of it there will be.
//
// ── THE VOLUME QUESTIONS ARE NOT MARKETING ────────────────────────────────
//
// Underwriting sets a processing limit from these numbers, and a facility that
// low-balls them to look modest gets a limit that stops them taking a booking
// in August. The screen says that plainly, because the instinct to understate
// is strong and the consequence is invisible until it bites.
//
// ── AND THE ACCOUNT NUMBER IS NOT A FIELD ON THE APPLICATION ──────────────
//
// It goes to Vault in its own request and comes back as four digits. Same
// treatment as an owner's identity number, same reasoning — see `SecretField`.
// ============================================================================

interface BankingForm {
  bankAccountName: string;
  estimatedMonthlyVolume: string;
  averageTicket: string;
  highestTicket: string;
  cardNotPresentPercent: string;
  refundPolicy: string;
}

function formFrom(application: MerchantApplication): BankingForm {
  const b = application.banking;
  return {
    bankAccountName: b.bankAccountName ?? "",
    estimatedMonthlyVolume: fromCents(b.estimatedMonthlyVolumeCents),
    averageTicket: fromCents(b.averageTicketCents),
    highestTicket: fromCents(b.highestTicketCents),
    cardNotPresentPercent:
      b.cardNotPresentPercent === undefined
        ? ""
        : String(b.cardNotPresentPercent),
    refundPolicy: b.refundPolicy ?? "",
  };
}

export function StepBanking({
  application,
  onBack,
  onSaved,
}: {
  application: MerchantApplication;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<BankingForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [replacingAccount, setReplacingAccount] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  const form = draft ?? formFrom(application);
  const save = useSaveStep();
  const storeSecret = useStoreSecret();
  const busy = save.isPending || storeSecret.isPending;

  const storedLast4 = application.banking.bankLast4;
  const showSecretInput = !storedLast4 || replacingAccount;

  const set = <K extends keyof BankingForm>(key: K, value: string) =>
    setDraft({ ...form, [key]: value });

  const cnp = Number(form.cardNotPresentPercent);

  async function submit() {
    const candidate = {
      bankAccountName: form.bankAccountName,
      estimatedMonthlyVolumeCents: toCents(form.estimatedMonthlyVolume),
      averageTicketCents: toCents(form.averageTicket),
      highestTicketCents: toCents(form.highestTicket),
      cardNotPresentPercent: Number.isFinite(cnp) ? Math.round(cnp) : -1,
      refundPolicy: form.refundPolicy,
    };
    const parsed = bankingStepSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Some details still need attention.");
      return;
    }

    const secret = secretRef.current?.value.trim() ?? "";
    if (!storedLast4 && !secret) {
      setErrors({ bankAccount: "Enter the account number payouts go to." });
      return;
    }
    setErrors({});

    try {
      await save.mutateAsync({ step: "banking", values: parsed.data });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That could not be saved.",
      );
      return;
    }

    if (secret) {
      try {
        await storeSecret.mutateAsync({ kind: "bank", value: secret });
      } catch (error) {
        // The rest is saved. Say what is missing rather than what failed.
        toast.error(
          error instanceof Error
            ? `Your details were saved, but the account number was not: ${error.message}`
            : "Your details were saved, but the account number was not.",
        );
        if (secretRef.current) secretRef.current.value = "";
        return;
      }
    }

    if (secretRef.current) secretRef.current.value = "";
    setDraft(null);
    setReplacingAccount(false);
    onSaved();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">Banking and volume</h3>
        <p className="text-muted-foreground text-sm/relaxed">
          The account your payouts arrive in, and enough about your trade for
          underwriting to set a sensible limit.
        </p>
      </header>

      <section className="space-y-5">
        <h4 className="text-sm font-semibold">Payout account</h4>

        <TextField
          id="bank-account-name"
          label="Name on the account"
          value={form.bankAccountName}
          error={errors.bankAccountName}
          onChange={(v) => set("bankAccountName", v)}
          hint="It has to be the business, not a personal account. An account in a different name is refused."
        />

        {storedLast4 && !replacingAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Lock className="text-muted-foreground size-4" />
              <span className="text-sm">Account number on file</span>
              <StoredLast4 last4={storedLast4} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReplacingAccount(true)}
            >
              Replace
            </Button>
          </div>
        ) : null}

        {showSecretInput && (
          <SecretField
            id="bank-account-number"
            label="Account number"
            inputRef={secretRef}
            error={errors.bankAccount}
            placeholder="••••••••••"
            hint="Encrypted the moment it arrives and readable by nobody in Yipyy. It is deleted once your account is open, and only the last four digits are ever shown back to you."
          />
        )}
      </section>

      <section className="space-y-5 border-t pt-6">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">What you expect to process</h4>
          <p className="text-muted-foreground text-xs/relaxed">
            Estimates are fine. Aim high rather than low — these set the ceiling
            on what you can take, and a limit set from a modest guess is one
            that stops a busy week.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <MoneyField
            id="monthly-volume"
            label="Card takings a month"
            value={form.estimatedMonthlyVolume}
            error={errors.estimatedMonthlyVolumeCents}
            onChange={(v) => set("estimatedMonthlyVolume", v)}
          />
          <MoneyField
            id="average-ticket"
            label="Average sale"
            value={form.averageTicket}
            error={errors.averageTicketCents}
            onChange={(v) => set("averageTicket", v)}
          />
          <MoneyField
            id="highest-ticket"
            label="Largest likely sale"
            value={form.highestTicket}
            error={errors.highestTicketCents}
            onChange={(v) => set("highestTicket", v)}
            hint="A long boarding stay, for instance."
          />
        </div>

        <TextField
          id="cnp-percent"
          label="Share taken without the card present (%)"
          value={form.cardNotPresentPercent}
          error={errors.cardNotPresentPercent}
          onChange={(v) =>
            set("cardNotPresentPercent", v.replace(/[^0-9]/g, ""))
          }
          inputMode="numeric"
          maxLength={3}
          className="max-w-xs"
          hint="Deposits by payment link, invoices by email, cards kept on file — anything not tapped at a terminal."
        />

        {Number.isFinite(cnp) && cnp > CNP_QUESTIONNAIRE_THRESHOLD && (
          <div className="flex items-start gap-2.5 rounded-lg border p-3 text-sm">
            <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Above {CNP_QUESTIONNAIRE_THRESHOLD}%, most acquirers ask a few
              extra questions about how you take remote payments. Expect that
              rather than a refusal — it is routine, and telling you now beats
              it arriving as a surprise three days in.
            </p>
          </div>
        )}

        <TextAreaField
          id="refund-policy"
          label="Your refund policy"
          value={form.refundPolicy}
          error={errors.refundPolicy}
          onChange={(v) => set("refundPolicy", v)}
          rows={4}
          placeholder="Deposits are refundable up to 48 hours before the booking. Grooming is refunded in full if we cancel."
          hint="In your own words. Underwriting reads this to judge how likely a customer is to dispute a charge."
        />
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button size="lg" onClick={() => void submit()} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Save and continue
        </Button>
      </div>
    </div>
  );
}
