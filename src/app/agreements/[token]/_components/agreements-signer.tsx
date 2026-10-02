"use client";

import { useState } from "react";
import { CircleCheck, Clock3, Link2Off } from "lucide-react";
import { toast } from "sonner";

import { WaiverContentRenderer } from "@/components/additional-features/waivers/WaiverContentRenderer";
import {
  SignaturePad,
  type SignatureResult,
} from "@/components/shared/SignaturePad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { WaiverBlock } from "@/data/additional-features";
import { formatCalendarDayLong } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import { shellText } from "@/lib/shell/text";

// ============================================================================
// Signing a facility's agreements from a link (/agreements/{token}): each
// agreement in full, "I've read and agree", a drawn signature where the
// facility asks for one, and the signer's typed name — the panel the booking
// wizard's Confirm offers a customer, in the client's own language.
//
// Every signature goes through /api/agreements/{token}/sign, which records it
// with consent and confirms any booking that was waiting for it.
// ============================================================================

interface Agreement {
  id: string;
  name: string;
  body: string;
  blocks: unknown[];
  requiresDigitalSignature: boolean;
  requiresWitness: boolean;
  signed: boolean;
}

export interface AgreementLink {
  facilityName: string;
  clientFirstName: string;
  locale: string;
  expiresAt: string | null;
  agreements: Agreement[];
}

export function AgreementsSigner({
  token,
  link,
}: {
  token: string;
  link: AgreementLink | null;
}) {
  const locale: AppLocale = link?.locale?.startsWith("fr") ? "fr" : "en";
  const t = (key: string) => shellText(locale, "booking", key);
  const [signed, setSigned] = useState<ReadonlySet<string>>(
    () => new Set(link?.agreements.filter((a) => a.signed).map((a) => a.id)),
  );

  if (!link) {
    return (
      <Page>
        <div className="border-line bg-card flex flex-col items-start gap-3 rounded-2xl border p-6">
          <Link2Off aria-hidden className="text-ink-tertiary size-6" />
          <h1 className="text-section text-heading">
            {t("agreeNotValidTitle")}
          </h1>
          <p className="text-body text-ink-secondary">
            {t("agreeNotValidHelp")}
          </p>
        </div>
      </Page>
    );
  }

  const left = link.agreements.filter((a) => !signed.has(a.id));

  return (
    <Page>
      <header className="flex flex-col gap-1.5">
        <p className="text-micro text-ink-tertiary uppercase">
          {link.facilityName}
        </p>
        <h1 className="text-page-title text-heading">{t("agreeTitle")}</h1>
        <p className="text-body text-ink-secondary">
          {fill(t("agreeIntro"), {
            name: link.clientFirstName,
            facility: link.facilityName,
          })}
        </p>
      </header>

      {left.length === 0 ? (
        <div
          role="status"
          className="border-line bg-card flex items-start gap-3 rounded-2xl border p-6"
        >
          <CircleCheck aria-hidden className="text-success mt-0.5 size-6" />
          <div className="flex flex-col gap-1">
            <p className="text-section text-body-ink">{t("agreeAllSigned")}</p>
            <p className="text-body text-ink-secondary">
              {fill(t("agreeAllSignedHelp"), { facility: link.facilityName })}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {link.agreements.map((agreement) => (
          <AgreementCard
            key={agreement.id}
            agreement={agreement}
            token={token}
            t={t}
            locale={locale}
            signed={signed.has(agreement.id)}
            context={{
              customerName: link.clientFirstName,
              facilityName: link.facilityName,
            }}
            onSigned={() =>
              setSigned((prev) => new Set([...prev, agreement.id]))
            }
          />
        ))}
      </div>

      {link.expiresAt ? (
        <p className="text-meta text-ink-tertiary">
          {fill(t("agreeValidUntil"), {
            date: formatCalendarDayLong(link.expiresAt.slice(0, 10), locale),
          })}
        </p>
      ) : null}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background min-h-dvh px-4 py-10">
      <div className="mx-auto flex w-full max-w-[640px] min-w-0 flex-col gap-6">
        {children}
      </div>
    </main>
  );
}

function AgreementCard({
  agreement,
  token,
  t,
  locale,
  signed,
  context,
  onSigned,
}: {
  agreement: Agreement;
  token: string;
  t: (key: string) => string;
  locale: AppLocale;
  signed: boolean;
  context: { customerName: string; facilityName: string };
  onSigned: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [witness, setWitness] = useState("");
  const [drawn, setDrawn] = useState<SignatureResult | null>(null);
  const [saving, setSaving] = useState(false);
  const ready =
    agreed &&
    name.trim().length > 1 &&
    (!agreement.requiresWitness || witness.trim().length > 1) &&
    (!agreement.requiresDigitalSignature || drawn !== null);
  const consentId = `agree-${agreement.id}`;

  const sign = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/agreements/${encodeURIComponent(token)}/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            waiverId: agreement.id,
            signatureName: name.trim(),
            signatureData: drawn?.signatureData,
            witnessName: agreement.requiresWitness ? witness.trim() : undefined,
            consent: true,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        toast.error(t("agreementNotSigned"), { description: body?.error });
        return;
      }
      toast.success(
        t("agreementSignedToast").replace("{name}", agreement.name),
      );
      onSigned();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label={agreement.name}
      className="border-line bg-card flex min-w-0 flex-col gap-4 rounded-2xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section text-body-ink min-w-0 wrap-break-word">
          {agreement.name}
        </h2>
        {signed ? (
          <Badge variant="confirmed">
            <CircleCheck aria-hidden />
            {t("wizSigned")}
          </Badge>
        ) : (
          <Badge variant="pending">
            <Clock3 aria-hidden />
            {t("wizNotSigned")}
          </Badge>
        )}
      </div>
      {signed ? null : (
        <>
          <div
            tabIndex={0}
            aria-label={agreement.name}
            className="border-line bg-surface-inset text-meta text-ink-secondary max-h-72 overflow-auto rounded-xl border px-4 py-3"
          >
            <WaiverContentRenderer
              blocks={agreement.blocks as WaiverBlock[]}
              content={agreement.body}
              context={context}
            />
          </div>
          <label
            htmlFor={consentId}
            className="text-meta text-body-ink flex cursor-pointer items-center gap-2.5"
          >
            <Checkbox
              id={consentId}
              checked={agreed}
              onCheckedChange={(value) => setAgreed(value === true)}
            />
            {fill(t("wizAgreeTo"), { name: agreement.name })}
          </label>
          {agreement.requiresDigitalSignature ? (
            <SignaturePad
              compact
              locale={locale}
              onSign={setDrawn}
              onClear={() => setDrawn(null)}
            />
          ) : null}
          {agreement.requiresWitness ? (
            <Input
              value={witness}
              onChange={(event) => setWitness(event.target.value)}
              placeholder={t("wizWitnessName")}
              aria-label={t("wizWitnessName")}
            />
          ) : null}
          <div className="flex flex-wrap gap-2.5">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("wizTypeFullName")}
              aria-label={t("wizTypeFullName")}
              autoComplete="name"
              className="min-w-[200px] flex-1 italic"
            />
            <Button
              type="button"
              disabled={!ready}
              loading={saving}
              onClick={() => void sign()}
            >
              {fill(t("agreeSignName"), { name: agreement.name })}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
