import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";
import type { BuiltEmail } from "@/lib/yipyy-go/emails";

// ============================================================================
// The emails a submitted facility form sends to the CUSTOMER: a confirmation
// that the facility has their answers, and a request for changes, in the
// customer's preferred language.
//
// The facility's own notice is a staff notification now
// (lib/notifications/notify-staff.ts), sent to whoever follows forms, by email
// only to those who switched email on.
// ============================================================================

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

const CHANGES = {
  en: {
    subject: (facility: string, form: string) =>
      `${facility} asked for changes to ${form}`,
    heading: "Changes requested on your form",
    body: (facility: string, form: string) =>
      `${facility} looked at your answers to ${form} and asked for changes.`,
    next: "Send the form again with the changes.",
    cta: "Update the form",
    footer: (facility: string) => `Sent by ${facility} through Yipyy.`,
  },
  fr: {
    subject: (facility: string, form: string) =>
      `${facility} demande des modifications au formulaire ${form}`,
    heading: "Modifications demandées sur votre formulaire",
    body: (facility: string, form: string) =>
      `${facility} a examiné vos réponses au formulaire ${form} et demande des modifications.`,
    next: "Envoyez de nouveau le formulaire avec les modifications.",
    cta: "Mettre à jour le formulaire",
    footer: (facility: string) => `Envoyé par ${facility} avec Yipyy.`,
  },
} as const;

/** Staff sent a submission back: what to change, and where to answer again. */
export function buildCustomerChangesRequested(input: {
  formName: string;
  facilityName: string;
  note: string;
  locale: "en" | "fr";
  formUrl: string;
  origin: string;
}): BuiltEmail {
  const copy = CHANGES[input.locale];
  const subject = copy.subject(input.facilityName, input.formName);
  const heading = copy.heading;
  const paragraphs = [
    escapeHtml(copy.body(input.facilityName, input.formName)),
    escapeHtml(input.note),
    escapeHtml(copy.next),
  ];
  const cta = { label: copy.cta, url: input.formUrl };
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
