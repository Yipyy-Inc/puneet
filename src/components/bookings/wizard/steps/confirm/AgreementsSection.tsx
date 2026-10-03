"use client";

import { useState } from "react";

import { toast } from "sonner";

import { WaiverContentRenderer } from "@/components/additional-features/waivers/WaiverContentRenderer";
import {
  SignaturePad,
  type SignatureResult,
} from "@/components/shared/SignaturePad";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { WaiverBlock } from "@/data/additional-features";
import { useSignWaiver, type WaiverRow } from "@/lib/api/waivers";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// "Agreements" in Confirm's checklist (the client's mock, 2026-10-01).
//
//   Customer  each unsigned agreement opens in place — its text, "I’ve read
//             and agree", the full name typed as the signature — and the
//             request waits until every one is signed.
//   Staff     a client who has not signed is sent a link to sign from the
//             customer portal; the booking can be made meanwhile and stays
//             Pending until the last one is signed. Staff may also take the
//             signature at the counter (kept from the old form).
//
// Signed in place, never in a second dialog over the wizard (§5i).
// ============================================================================

export interface SigningLinks {
  /** What was sent already, to whom. */
  sent: { email?: string; sms?: string };
  /** Null when the client has no address of that kind. */
  email: string | null;
  phone: string | null;
  send: (via: "email" | "sms") => void;
  sending: "email" | "sms" | null;
}

export function AgreementsSection({
  isCustomer,
  applicable,
  pending,
  clientRef,
  clientName,
  clientFirstName,
  petName,
  facilityName,
  links,
}: {
  isCustomer: boolean;
  applicable: readonly WaiverRow[];
  pending: readonly WaiverRow[];
  clientRef: number | undefined;
  clientName: string;
  clientFirstName: string;
  petName?: string;
  facilityName?: string;
  /** Staff: the signing-link sender. Absent where it cannot send. */
  links?: SigningLinks;
}) {
  const t = useShellText("booking");
  const [open, setOpen] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState<string[]>([]);
  const pendingIds = new Set(pending.map((waiver) => waiver.id));
  const linkSent = Boolean(links?.sent.email || links?.sent.sms);

  return (
    <div className="flex flex-col gap-2.5 py-3">
      <p className="text-body-ink text-[14.5px] font-semibold">
        {t("wizAgreements")}
      </p>
      {applicable.map((waiver) => {
        const unsigned = pendingIds.has(waiver.id);
        const isOpen = open === waiver.id;
        return (
          <div
            key={waiver.id}
            className="flex flex-col gap-2.5 rounded-[14px] border border-(--agr-line) bg-(--agr-bg) px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* The name keeps a line of its own on a phone: the chip and
                  the button wrap under it rather than squeezing it. */}
              <span className="flex min-w-0 flex-[1_1_120px] items-center gap-3">
                <span
                  aria-hidden
                  className={
                    unsigned
                      ? "size-2 shrink-0 rounded-full bg-(--dot-warn,var(--warning-dot))"
                      : "size-2 shrink-0 rounded-full bg-(--dot-ok,var(--success-dot))"
                  }
                />
                <span className="text-body-ink min-w-0 text-[14px] font-medium wrap-break-word">
                  {waiver.name}
                </span>
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {!unsigned ? (
                  <Chip tone="success" size="sm" className="px-2.5 py-[3px]">
                    {justSigned.includes(waiver.id)
                      ? t("wizSignedJustNow")
                      : t("wizSigned")}
                  </Chip>
                ) : !isCustomer && linkSent ? (
                  <Chip tone="info" size="sm" className="px-2.5 py-[3px]">
                    {t("wizLinkSent")}
                  </Chip>
                ) : (
                  <Chip tone="warning" size="sm" className="px-2.5 py-[3px]">
                    {t("wizNotSigned")}
                  </Chip>
                )}
                {unsigned && clientRef !== undefined ? (
                  <Button
                    type="button"
                    variant={isCustomer ? "default" : "quiet"}
                    size="mock-32"
                    className="[--sh-cta:none]"
                    onClick={() => setOpen(isOpen ? null : waiver.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen
                      ? t("wizClose")
                      : isCustomer
                        ? t("wizReadAndSign")
                        : t("wizSignNow")}
                  </Button>
                ) : null}
              </span>
            </div>
            {isOpen && clientRef !== undefined ? (
              <SignPanel
                waiver={waiver}
                clientRef={clientRef}
                defaultName={isCustomer ? "" : clientName}
                context={{ customerName: clientName, petName, facilityName }}
                onSigned={() => {
                  setJustSigned((prev) => [...prev, waiver.id]);
                  setOpen(null);
                }}
              />
            ) : null}
          </div>
        );
      })}

      {!isCustomer && pending.length > 0 ? (
        <div
          role="note"
          className="flex flex-col gap-2.5 rounded-[14px] border border-(--note-line) bg-(--note-bg) p-3.5"
        >
          <p className="text-meta flex gap-2 text-pretty text-(--note-ink)">
            <span>
              {fill(t("wizNotSignedYet"), { name: clientFirstName })}{" "}
              <strong className="font-semibold">{t("wizPendingWord")}</strong>{" "}
              {t("wizNotSignedYetEnd")}
            </span>
          </p>
          {links ? (
            <div className="flex flex-wrap gap-2">
              <LinkButton
                via="email"
                sentTo={links.sent.email}
                disabled={!links.email}
                busy={links.sending === "email"}
                onSend={() => links.send("email")}
              />
              <LinkButton
                via="sms"
                sentTo={links.sent.sms}
                disabled={!links.phone}
                busy={links.sending === "sms"}
                onSend={() => links.send("sms")}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LinkButton({
  via,
  sentTo,
  disabled,
  busy,
  onSend,
}: {
  via: "email" | "sms";
  sentTo?: string;
  disabled: boolean;
  busy: boolean;
  onSend: () => void;
}) {
  const t = useShellText("booking");
  if (sentTo) {
    return (
      <span className="border-line-strong bg-card text-success inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold">
        ✓{" "}
        {fill(t(via === "email" ? "wizEmailedTo" : "wizTextedTo"), {
          to: sentTo,
        })}
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="quiet"
      size="mock-36"
      className="text-[13px]"
      disabled={disabled}
      loading={busy}
      onClick={onSend}
    >
      {t(via === "email" ? "wizEmailSigningLink" : "wizTextSigningLink")}
    </Button>
  );
}

/** One agreement, read and signed where it is listed. */
function SignPanel({
  waiver,
  clientRef,
  defaultName,
  context,
  onSigned,
}: {
  waiver: WaiverRow;
  clientRef: number;
  defaultName: string;
  context: { customerName?: string; petName?: string; facilityName?: string };
  onSigned: () => void;
}) {
  const t = useShellText("booking");
  const sign = useSignWaiver();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(defaultName);
  const [witness, setWitness] = useState("");
  const [drawn, setDrawn] = useState<SignatureResult | null>(null);
  const needsDrawing = waiver.requiresDigitalSignature;
  const ready =
    agreed &&
    name.trim().length > 1 &&
    (!waiver.requiresWitness || witness.trim().length > 1) &&
    (!needsDrawing || drawn !== null);
  const consentId = `consent-${waiver.id}`;

  return (
    <div className="border-line flex flex-col gap-2.5 border-t pt-2.5">
      <div
        tabIndex={0}
        aria-label={waiver.name}
        className="border-line bg-card text-ink-secondary max-h-[110px] overflow-auto rounded-[12px] border px-3.5 py-3 text-[13px] leading-[1.55]"
      >
        <WaiverContentRenderer
          blocks={waiver.blocks as WaiverBlock[]}
          content={waiver.body}
          context={context}
        />
      </div>
      <label
        htmlFor={consentId}
        className="text-body-ink flex cursor-pointer items-center gap-2.5 text-[13.5px]"
      >
        <Checkbox
          id={consentId}
          checked={agreed}
          onCheckedChange={(value) => setAgreed(value === true)}
        />
        {fill(t("wizAgreeTo"), { name: waiver.name })}
      </label>
      {needsDrawing ? (
        <SignaturePad
          compact
          onSign={setDrawn}
          onClear={() => setDrawn(null)}
        />
      ) : null}
      {waiver.requiresWitness ? (
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
          className="h-[42px] min-w-[200px] flex-1 text-[14px] italic max-lg:h-[42px]"
        />
        <Button
          type="button"
          disabled={!ready}
          loading={sign.isPending}
          className="[&:disabled:not([data-loading])]:bg-line h-[42px] px-5 text-[14px] [--sh-cta:none] max-lg:h-[42px]"
          onClick={() =>
            sign.mutate(
              {
                waiverId: waiver.id,
                clientRef,
                signatureName: name.trim(),
                signatureData: drawn?.signatureData,
                witnessName: waiver.requiresWitness
                  ? witness.trim()
                  : undefined,
                consent: agreed,
              },
              {
                onSuccess: () => {
                  toast.success(
                    t("agreementSignedToast").replace("{name}", waiver.name),
                  );
                  onSigned();
                },
                onError: (error) =>
                  toast.error(t("agreementNotSigned"), {
                    description: error.message,
                  }),
              },
            )
          }
        >
          {t("wizSign")}
        </Button>
      </div>
    </div>
  );
}
