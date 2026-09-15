import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";
import type { BuiltEmail } from "@/lib/yipyy-go/emails";

// ============================================================================
// The two emails a submitted facility form sends.
//
// ── TO THE FACILITY ───────────────────────────────────────────────────────
//
// Its active owners and admins hear that a form came in, when the facility's
// `form_notifications` asks for it: every submission, or only one with a
// flagged answer, or only one carrying a file. In English, as every other staff
// email in the product is.
//
// ── TO THE CUSTOMER ───────────────────────────────────────────────────────
//
// A confirmation that the facility has their answers, in the customer's
// preferred language.
// ============================================================================

export function buildStaffFormEmail(input: {
  facilityName: string;
  formName: string;
  clientName: string | null;
  flags: string[];
  hasFiles: boolean;
  inboxUrl: string;
  origin: string;
}): BuiltEmail {
  const who = input.clientName ?? "A customer";
  const flagged = input.flags.length > 0;
  const subject = flagged
    ? `Flagged answers: ${input.formName} from ${who}`
    : `${input.formName} submitted by ${who}`;
  const heading = flagged
    ? "A form answer needs attention"
    : "A form was submitted";
  const paragraphs = [
    escapeHtml(`${who} submitted ${input.formName} at ${input.facilityName}.`),
  ];
  if (flagged) {
    paragraphs.push(escapeHtml(`Flagged: ${input.flags.join("; ")}.`));
  }
  if (input.hasFiles) {
    paragraphs.push(escapeHtml("It includes an uploaded file."));
  }
  const cta = { label: "Open the submissions inbox", url: input.inboxUrl };
  const footer = escapeHtml(
    `You get this because you are an owner or admin at ${input.facilityName}.`,
  );

  return {
    subject,
    html: renderEmail({
      preheader: subject,
      heading,
      paragraphs,
      cta,
      footer,
      origin: input.origin,
    }),
    text: renderPlainText({ heading, paragraphs, cta, footer }),
  };
}

const CONFIRMATION = {
  en: {
    subject: (form: string) => `We received your ${form}`,
    heading: "Your form was received",
    body: (facility: string, form: string) =>
      `${facility} has your answers to ${form}.`,
    cta: "View your documents",
    footer: (facility: string) => `Sent by ${facility} through Yipyy.`,
  },
  fr: {
    subject: (form: string) => `Nous avons reçu votre formulaire ${form}`,
    heading: "Votre formulaire a été reçu",
    body: (facility: string, form: string) =>
      `${facility} a bien reçu vos réponses au formulaire ${form}.`,
    cta: "Voir vos documents",
    footer: (facility: string) => `Envoyé par ${facility} avec Yipyy.`,
  },
} as const;

export function buildCustomerFormConfirmation(input: {
  formName: string;
  facilityName: string;
  locale: "en" | "fr";
  documentsUrl: string;
  origin: string;
}): BuiltEmail {
  const copy = CONFIRMATION[input.locale];
  const subject = copy.subject(input.formName);
  const heading = copy.heading;
  const paragraphs = [
    escapeHtml(copy.body(input.facilityName, input.formName)),
  ];
  const cta = { label: copy.cta, url: input.documentsUrl };
  const footer = escapeHtml(copy.footer(input.facilityName));

  return {
    subject,
    html: renderEmail({
      preheader: subject,
      heading,
      paragraphs,
      cta,
      footer,
      origin: input.origin,
    }),
    text: renderPlainText({ heading, paragraphs, cta, footer }),
  };
}
