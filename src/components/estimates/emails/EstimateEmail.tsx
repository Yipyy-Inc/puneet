import { defaultInvoiceTemplate } from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { Estimate } from "@/types/booking";
import { EmailShell } from "./EmailShell";
import { EstimateSummary } from "./EstimateSummary";
import {
  estimateEmailSubject,
  estimateSetupUrl,
  estimateViewUrl,
  fmtEmailDate,
  firstNameOf,
  petOf,
} from "./email-helpers";

// Estimate email templates rendered as in-app preview components (spec 6.1/6.2).
// Branding is pulled from the Invoice Template settings (Table 82).

interface EstimateEmailProps {
  estimate: Estimate;
  template?: InvoiceTemplate;
  /** Estimate portal/view URL (email link). */
  portalUrl?: string;
  /** Account-setup magic link (welcome variant only). */
  setupUrl?: string;
}

function EstimateEmailBody({
  estimate,
  template = defaultInvoiceTemplate,
  portalUrl,
  setupUrl,
  welcome,
}: EstimateEmailProps & { welcome: boolean }) {
  const accent = template.accentColor;
  const viewUrl = portalUrl ?? estimateViewUrl(estimate);
  const accountSetupUrl = setupUrl ?? estimateSetupUrl(estimate);

  return (
    <EmailShell
      subject={estimateEmailSubject(estimate, template.facilityName)}
      template={template}
    >
      {/* Welcome section (6.2 only) */}
      {welcome && (
        <div
          className="rounded-lg border-l-4 bg-slate-50 px-4 py-3"
          style={{ borderColor: accent }}
        >
          <p className="text-sm font-semibold">
            Welcome to {template.facilityName}!
          </p>
          <p className="mt-1 text-xs text-slate-600">
            We&apos;ve created an account for you so you can view this estimate,
            accept it, and manage your bookings in one place.
          </p>
        </div>
      )}

      <p className="text-sm">
        Hi {firstNameOf(estimate)}, here&apos;s the estimate you requested for{" "}
        <span className="font-semibold">{petOf(estimate)}</span>.
      </p>

      <EstimateSummary estimate={estimate} />

      {estimate.publicNote && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 italic">
          &ldquo;{estimate.publicNote}&rdquo;
        </div>
      )}

      <div className="space-y-2 pt-1">
        {welcome ? (
          <a
            href={accountSetupUrl}
            className="block rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Set Up Your Account &amp; View Estimate
          </a>
        ) : (
          <a
            href={viewUrl}
            className="block rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Accept Estimate
          </a>
        )}
        <a
          href={viewUrl}
          className="block rounded-lg border px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          View Full Details
        </a>
      </div>

      {welcome && (
        <p className="text-center text-xs text-slate-500">
          Or visit your portal at{" "}
          <span className="font-medium text-slate-700">
            {template.website || "yipyy.com"}
          </span>{" "}
          and sign in with this email.
        </p>
      )}

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

/** 6.1 — Standard estimate email for an existing customer. */
export function StandardEstimateEmail(props: EstimateEmailProps) {
  return <EstimateEmailBody {...props} welcome={false} />;
}

/**
 * 6.2 — Combined Welcome + Estimate email for a newly auto-created account.
 * Everything in 6.1 plus a welcome section, a "Set Up Your Account" magic-link
 * primary button, and portal instructions. ONE email, not two.
 */
export function WelcomeEstimateEmail(props: EstimateEmailProps) {
  return <EstimateEmailBody {...props} welcome={true} />;
}
