"use client";

import { useState } from "react";
import {
  Check,
  CircleCheck,
  Clock3,
  Mail,
  MessageSquare,
  Send,
  TriangleAlert,
} from "lucide-react";
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
      <p className="text-body-strong text-body-ink">{t("wizAgreements")}</p>
      {applicable.map((waiver) => {
        const unsigned = pendingIds.has(waiver.id);
        const isOpen = open === waiver.id;
        return (
          <div
            key={waiver.id}
            className="border-line bg-surface-inset flex flex-col gap-2.5 rounded-lg border px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* The name keeps a line of its own on a phone: the chip and
                  the button wrap under it rather than squeezing it. */}
              <span className="flex min-w-0 flex-[1_1_120px] items-center gap-3">
                <span
                  aria-hidden
                  className={
                    unsigned
                      ? "bg-warning-dot size-[7px] shrink-0 rounded-full"
                      : "bg-success-dot size-[7px] shrink-0 rounded-full"
                  }
                />
                <span className="text-body text-body-ink min-w-0 font-medium wrap-break-word">
                  {waiver.name}
                </span>
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {!unsigned ? (
                  <Badge variant="confirmed">
                    <CircleCheck aria-hidden />
                    {justSigned.includes(waiver.id)
                      ? t("wizSignedJustNow")
                      : t("wizSigned")}
                  </Badge>
                ) : !isCustomer && linkSent ? (
                  <Badge variant="checkedIn">
                    <Send aria-hidden />
                    {t("wizLinkSent")}
                  </Badge>
                ) : (
                  <Badge variant="pending">
                    <Clock3 aria-hidden />
                    {t("wizNotSigned")}
                  </Badge>
                )}
                {unsigned && clientRef !== undefined ? (
                  <Button
                    type="button"
                    variant={isCustomer ? "default" : "outline"}
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
          className="border-warning bg-card flex flex-col gap-2.5 rounded-lg border p-3.5"
        >
          <p className="text-meta text-body-ink flex gap-2 text-pretty">
            <TriangleAlert
              aria-hidden
              className="text-warning mt-0.5 size-4 shrink-0"
            />
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
  const Glyph = via === "email" ? Mail : MessageSquare;
  if (sentTo) {
    return (
      <span className="text-meta text-success inline-flex min-h-10 items-center gap-1.5 font-semibold max-lg:min-h-12">
        <Check aria-hidden className="size-4" />
        {fill(t(via === "email" ? "wizEmailedTo" : "wizTextedTo"), {
          to: sentTo,
        })}
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      loading={busy}
      onClick={onSend}
    >
      <Glyph aria-hidden />
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
        className="border-line bg-card text-meta text-ink-secondary max-h-[110px] overflow-auto rounded-xl border px-3.5 py-3"
      >
        <WaiverContentRenderer
          blocks={waiver.blocks as WaiverBlock[]}
          content={waiver.body}
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
          className="min-w-[200px] flex-1 italic"
        />
        <Button
          type="button"
          disabled={!ready}
          loading={sign.isPending}
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
