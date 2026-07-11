import { defaultInvoiceTemplate } from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { Estimate } from "@/types/booking";
import { EmailShell } from "./EmailShell";
import { EstimateSummary } from "./EstimateSummary";
import {
  dateRangeOf,
  estimateViewUrl,
  fmtEmailDate,
  firstNameOf,
  petOf,
  serviceOf,
} from "./email-helpers";

interface BaseProps {
  estimate: Estimate;
  template?: InvoiceTemplate;
}

function PrimaryButton({
  href,
  accent,
  children,
}: {
  href: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
      style={{ backgroundColor: accent }}
    >
      {children}
    </a>
  );
}

/**
 * Follow-up reminder (spec). "not_viewed" nudges an unopened estimate; "viewed"
 * acknowledges the customer already took a look.
 */
export function EstimateReminderEmail({
  estimate,
  template = defaultInvoiceTemplate,
  variant,
}: BaseProps & { variant: "not_viewed" | "viewed" }) {
  const viewUrl = estimateViewUrl(estimate);
  const subject =
    variant === "viewed"
      ? `Still thinking it over? ${petOf(estimate)}'s ${serviceOf(estimate)} estimate`
      : `Reminder: your estimate for ${petOf(estimate)}'s ${serviceOf(estimate)} is waiting`;

  return (
    <EmailShell subject={subject} template={template}>
      <p className="text-sm">
        Hi {firstNameOf(estimate)},{" "}
        {variant === "viewed"
          ? "we noticed you took a look at your estimate — no rush, but it's ready whenever you are."
          : "just a friendly reminder that your estimate is waiting for you."}
      </p>

      <EstimateSummary estimate={estimate} />

      <div className="space-y-2 pt-1">
        <PrimaryButton href={viewUrl} accent={template.accentColor}>
          Accept Estimate
        </PrimaryButton>
        <a
          href={viewUrl}
          className="block rounded-lg border px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          View Full Details
        </a>
      </div>

      {estimate.expiresAt && (
        <p className="text-center text-xs text-slate-500">
          This estimate is valid until{" "}
          <span className="font-medium">
            {fmtEmailDate(estimate.expiresAt)}
          </span>
          .
        </p>
      )}
    </EmailShell>
  );
}

/** 24-hour expiry warning. Accept is the ONLY call to action. */
export function EstimateExpiryWarningEmail({
  estimate,
  template = defaultInvoiceTemplate,
}: BaseProps) {
  const viewUrl = estimateViewUrl(estimate);
  const expiry = estimate.expiresAt ? fmtEmailDate(estimate.expiresAt) : "soon";
  const subject = `Your estimate for ${petOf(estimate)} expires tomorrow — ${expiry}`;

  return (
    <EmailShell subject={subject} template={template}>
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          Your estimate expires tomorrow.
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Hi {firstNameOf(estimate)}, your estimate for {petOf(estimate)}&apos;s{" "}
          {serviceOf(estimate)} ({dateRangeOf(estimate)}) is valid only until{" "}
          <span className="font-semibold">{expiry}</span>. Accept now to secure
          your spot.
        </p>
      </div>

      <EstimateSummary estimate={estimate} />

      <div className="pt-1">
        <PrimaryButton href={viewUrl} accent={template.accentColor}>
          Accept Estimate
        </PrimaryButton>
      </div>
    </EmailShell>
  );
}

/** Confirmation email to the customer after they accept. */
export function EstimateAcceptanceEmail({
  estimate,
  template = defaultInvoiceTemplate,
}: BaseProps) {
  const subject = `Estimate accepted — ${template.facilityName}`;

  return (
    <EmailShell subject={subject} template={template}>
      <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-900">
          Thanks, {firstNameOf(estimate)} — your estimate is accepted!
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          {template.facilityName} has received your acceptance and will confirm
          your booking shortly.
        </p>
      </div>

      <EstimateSummary estimate={estimate} />

      <div className="pt-1">
        <a
          href={estimateViewUrl(estimate)}
          className="block rounded-lg border px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          View in My Account
        </a>
      </div>
    </EmailShell>
  );
}

/** Receipt email to the customer after they decline. */
export function EstimateDeclineReceiptEmail({
  estimate,
  template = defaultInvoiceTemplate,
}: BaseProps) {
  const subject = `We've received your response — ${template.facilityName}`;

  return (
    <EmailShell subject={subject} template={template}>
      <p className="text-sm">
        Hi {firstNameOf(estimate)}, we&apos;ve recorded that you declined the
        estimate for{" "}
        <span className="font-semibold">
          {petOf(estimate)}&apos;s {serviceOf(estimate)}
        </span>
        .
      </p>

      {estimate.declineReason && (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">Reason: </span>
          <span className="font-medium">{estimate.declineReason}</span>
        </div>
      )}

      <p className="text-sm text-slate-600">
        If anything changes or you&apos;d like a revised estimate, just reach
        out — we&apos;re happy to help.
      </p>

      <div className="pt-1">
        <a
          href="/customer/messages"
          className="block rounded-lg border px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          Contact {template.facilityName}
        </a>
      </div>
    </EmailShell>
  );
}
