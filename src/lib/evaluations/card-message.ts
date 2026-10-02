import type { EvaluationResult } from "@/lib/evaluations/questions";

// ============================================================================
// What an owner receives when their pet's evaluation report card is sent —
// by email and text, wherever Setup turned them on and the client has an
// address (the client's mock, 2026-10-02). Pure, so the words are tested;
// lib/evaluations/deliver-card.ts does the sending.
//
// The card itself lives in the customer portal, behind the owner's sign-in,
// so the message carries the link and says how to open it — and never the
// result's detail: a text message is not the place for "not approved".
// ============================================================================

export type CardMessageLocale = "en" | "fr";

export interface CardMessageInput {
  locale: CardMessageLocale;
  facilityName: string;
  /** The facility's customer address, where the owner signs in. */
  facilityOrigin: string;
  clientName: string;
  petName: string;
  /** He/she where the record knows, they where it does not (§5r). */
  petSex: "male" | "female" | null;
  result: EvaluationResult;
  link: string;
}

const NB = " ";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

function possessive(sex: CardMessageInput["petSex"]): string {
  return sex === "male" ? "his" : sex === "female" ? "her" : "their";
}

function englishLine(input: CardMessageInput): string {
  const pet = input.petName;
  const at = input.facilityName;
  switch (input.result) {
    case "approved":
      return `${pet} passed ${possessive(input.petSex)} evaluation at ${at}! The report card is ready.`;
    case "approved_with_restrictions":
      return `${pet} is approved at ${at}, with a few notes. The report card is ready.`;
    case "needs_re_evaluation":
      return `${pet}'s evaluation at ${at} is done, and we would love to see ${pet} for one more visit. The report card is ready.`;
    case "not_approved":
      return `${pet}'s evaluation report card from ${at} is ready.`;
  }
}

function frenchLine(input: CardMessageInput): string {
  const pet = input.petName;
  const at = input.facilityName;
  // Built round "l'évaluation de…" so nothing agrees with the pet's sex.
  switch (input.result) {
    case "approved":
      return `L’évaluation de ${pet} chez ${at} est réussie${NB}! Le bulletin est prêt.`;
    case "approved_with_restrictions":
      return `L’évaluation de ${pet} chez ${at} est concluante, avec quelques notes. Le bulletin est prêt.`;
    case "needs_re_evaluation":
      return `L’évaluation de ${pet} chez ${at} est terminée, et nous aimerions prévoir une autre visite. Le bulletin est prêt.`;
    case "not_approved":
      return `Le bulletin d’évaluation de ${pet} chez ${at} est prêt.`;
  }
}

export function evaluationCardMessage(input: CardMessageInput): {
  subject: string;
  text: string;
  sms: string;
  cta: string;
} {
  const first = firstName(input.clientName);
  if (input.locale === "fr") {
    return {
      subject: `Bulletin d’évaluation de ${input.petName} — ${input.facilityName}`,
      text: [
        first ? `Bonjour ${first},` : "Bonjour,",
        "",
        frenchLine(input),
        "",
        `Consultez-le ici${NB}: ${input.link}`,
        "",
        `Pour l’ouvrir, connectez-vous à votre compte sur ${input.facilityOrigin}.`,
      ].join("\n"),
      sms: `${input.facilityName}${NB}: le bulletin d’évaluation de ${input.petName} est prêt. ${input.link}`,
      cta: "Voir le bulletin",
    };
  }
  return {
    subject: `${input.petName}'s evaluation report card from ${input.facilityName}`,
    text: [
      first ? `Hi ${first},` : "Hello,",
      "",
      englishLine(input),
      "",
      `See it here: ${input.link}`,
      "",
      `To open it, sign in to your account at ${input.facilityOrigin}.`,
    ].join("\n"),
    sms: `${input.facilityName}: ${input.petName}'s evaluation report card is ready. ${input.link}`,
    cta: "Open the report card",
  };
}
