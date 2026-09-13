import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";

// ============================================================================
// The two emails a pre-arrival form sends when an owner submits it.
//
// ── TO THE FACILITY ───────────────────────────────────────────────────────
//
// When `notifyStaffEmailOnSubmit` is on, the facility's active owners and
// admins hear that a form came in, with a link to the booking. In English, as
// every other staff email in the product is; the facility has no language of
// its own to send in yet.
//
// ── TO THE OWNER ──────────────────────────────────────────────────────────
//
// When `confirmationEmail.enabled`, the owner gets the subject and message the
// facility wrote, with `{petName}` and `{date}` filled in — the only two tokens
// the settings screen offers. The facility's words go out as they wrote them,
// escaped; the frame around them follows the owner's preferred language.
//
// The old form did neither: both were console calls behind a toast that said
// "Confirmation email sent".
// ============================================================================

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildStaffSubmissionEmail(input: {
  facilityName: string;
  clientName: string;
  petName: string;
  serviceLabel: string;
  arrivalLabel: string;
  bookingUrl: string;
  origin: string;
}): BuiltEmail {
  const subject = `${input.petName}'s pre-arrival form is in`;
  const heading = "A pre-arrival form was submitted";
  const paragraphs = [
    escapeHtml(
      `${input.clientName} sent ${input.petName}'s pre-arrival form for their ${input.serviceLabel} booking at ${input.facilityName}.`,
    ),
    escapeHtml(
      "Review the belongings, feeding and medications before the dog arrives.",
    ),
  ];
  const panel = {
    label: "Arriving",
    value: escapeHtml(input.arrivalLabel),
    note: escapeHtml(`${input.petName} · ${input.clientName}`),
  };
  const cta = { label: "Review the form", url: input.bookingUrl };
  const footer = escapeHtml(
    `You get this because you are an owner or admin at ${input.facilityName}.`,
  );

  return {
    subject,
    html: renderEmail({
      preheader: `${input.clientName} sent ${input.petName}'s form.`,
      heading,
      paragraphs,
      panel,
      cta,
      footer,
      origin: input.origin,
    }),
    text: renderPlainText({ heading, paragraphs, panel, cta, footer }),
  };
}

const OWNER_COPY = {
  en: {
    heading: "Your pre-arrival form is in",
    cta: "View your booking",
    footer: (facility: string) => `Sent by ${facility} through Yipyy.`,
  },
  fr: {
    heading: "Votre formulaire préalable est bien reçu",
    cta: "Voir votre réservation",
    footer: (facility: string) => `Envoyé par ${facility} avec Yipyy.`,
  },
} as const;

/** Fills the facility's `{petName}` and `{date}` tokens. */
export function fillConfirmationTokens(
  text: string,
  values: { petName: string; date: string },
): string {
  return text
    .replace(/\{petName\}/g, values.petName)
    .replace(/\{date\}/g, values.date);
}

export function buildOwnerConfirmationEmail(input: {
  subject: string;
  message: string;
  petName: string;
  dateLabel: string;
  facilityName: string;
  bookingUrl: string;
  origin: string;
  locale: "en" | "fr";
}): BuiltEmail {
  const copy = OWNER_COPY[input.locale];
  const values = { petName: input.petName, date: input.dateLabel };
  const subject =
    fillConfirmationTokens(input.subject, values).trim() || copy.heading;
  const message = fillConfirmationTokens(input.message, values).trim();
  const paragraphs = message
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(escapeHtml);
  const cta = { label: copy.cta, url: input.bookingUrl };
  const footer = escapeHtml(copy.footer(input.facilityName));

  return {
    subject,
    html: renderEmail({
      preheader: message.slice(0, 120) || copy.heading,
      heading: copy.heading,
      paragraphs:
        paragraphs.length > 0 ? paragraphs : [escapeHtml(copy.heading)],
      cta,
      footer,
      origin: input.origin,
    }),
    text: renderPlainText({
      heading: copy.heading,
      paragraphs:
        paragraphs.length > 0 ? paragraphs : [escapeHtml(copy.heading)],
      cta,
      footer,
    }),
  };
}
