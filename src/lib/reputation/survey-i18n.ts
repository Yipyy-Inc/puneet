// ============================================================================
// Micro-survey UI strings — the landing page inherits ?lang= and renders here.
// ============================================================================

export interface SurveyStrings {
  loading: string;
  invalidTitle: string;
  invalidBody: string; // {business}
  rateTitle: string; // {pet}
  rateSub: string; // {service} {business}
  poweredBy: string;
  labels: Record<1 | 2 | 3 | 4 | 5, string>;
  alreadyTitle: string;
  alreadyBody: string; // {pet} {service}
  thrilledTitle: string;
  loveQ: string; // {pet}
  gatedLoveQ: string;
  positivePlaceholder: string; // {pet}
  postPublic: string;
  orPrivate: string;
  onlyToUs: string;
  sendPrivately: string; // {business}
  shareOn: string; // {platform}
  changeRating: string;
  openNegTitle: string;
  openNegSub: string; // {pet}
  negTitle: string;
  negSub: string;
  negPlaceholder: string; // {pet}
  sendToManager: string;
  escalatedTitle: string;
  escalatedBody: string;
  sharedTitle: string;
  sharedBody: string; // {business}
  modalTitle: string;
  modalBody: string; // {platform}
  openPlatform: string; // {platform}
  done: string;
  noPlatforms: string;
}

const EN: SurveyStrings = {
  loading: "Loading your survey…",
  invalidTitle: "This link isn't valid",
  invalidBody:
    "The review link may have expired or already been used. If you believe this is a mistake, please contact {business}.",
  rateTitle: "How was {pet}'s experience today?",
  rateSub: "Your {service} visit with {business}. Tap a star to rate it.",
  poweredBy: "Powered by Yipyy Reputation Booster",
  labels: {
    1: "Very disappointing",
    2: "Below expectations",
    3: "It was okay",
    4: "Really good",
    5: "Absolutely loved it!",
  },
  alreadyTitle: "Thanks — we've got your feedback!",
  alreadyBody: "You already rated {pet}'s {service} visit.",
  thrilledTitle: "We're thrilled! 🎉",
  loveQ: "What did you love most about {pet}'s visit?",
  gatedLoveQ: "What did you love most about our service?",
  positivePlaceholder: "Tell others what made {pet}'s visit great…",
  postPublic: "Post it publicly",
  orPrivate: "Or send it straight to us",
  onlyToUs: "Send it to us",
  sendPrivately: "Send privately to {business}",
  shareOn: "Share on {platform}",
  changeRating: "← Change my rating",
  openNegTitle: "Thank you for your honesty.",
  openNegSub:
    "We're sorry we fell short with {pet}'s visit. Tell us what happened so we can make it right.",
  negTitle: "We're so sorry.",
  negSub:
    "We didn't exceed your expectations today. Please let us know what happened so we can make this right immediately.",
  negPlaceholder: "What went wrong with {pet}'s visit?",
  sendToManager: "Send feedback to the manager",
  escalatedTitle: "Thank you — we're on it.",
  escalatedBody:
    "Your feedback has gone straight to our manager, who will reach out personally to make this right. We truly appreciate the chance to fix it.",
  sharedTitle: "Thank you for sharing! 💛",
  sharedBody: "Your kind words mean the world to us and the {business} team.",
  modalTitle: "Your comment has been copied!",
  modalBody:
    "We've copied your comment to your clipboard. Simply sign into {platform} on the next screen, paste, and post — that's it!",
  openPlatform: "Open {platform}",
  done: "Done",
  noPlatforms: "No public review platforms are configured yet.",
};

const FR: SurveyStrings = {
  loading: "Chargement de votre sondage…",
  invalidTitle: "Ce lien n'est pas valide",
  invalidBody:
    "Le lien d'évaluation a peut-être expiré ou a déjà été utilisé. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter {business}.",
  rateTitle: "Comment s'est passée la visite de {pet} aujourd'hui ?",
  rateSub: "Votre visite {service} avec {business}. Touchez une étoile pour évaluer.",
  poweredBy: "Propulsé par Yipyy Reputation Booster",
  labels: {
    1: "Très décevant",
    2: "En dessous des attentes",
    3: "Correct",
    4: "Très bien",
    5: "Absolument adoré !",
  },
  alreadyTitle: "Merci — nous avons bien reçu votre avis !",
  alreadyBody: "Vous avez déjà évalué la visite {service} de {pet}.",
  thrilledTitle: "Nous sommes ravis ! 🎉",
  loveQ: "Qu'avez-vous le plus aimé de la visite de {pet} ?",
  gatedLoveQ: "Qu'avez-vous le plus aimé de notre service ?",
  positivePlaceholder: "Dites aux autres ce qui a rendu la visite de {pet} formidable…",
  postPublic: "Publiez-le publiquement",
  orPrivate: "Ou envoyez-le-nous directement",
  onlyToUs: "Envoyez-le-nous",
  sendPrivately: "Envoyer en privé à {business}",
  shareOn: "Partager sur {platform}",
  changeRating: "← Modifier ma note",
  openNegTitle: "Merci de votre honnêteté.",
  openNegSub:
    "Nous sommes désolés de ne pas avoir été à la hauteur pour la visite de {pet}. Dites-nous ce qui s'est passé afin que nous puissions corriger la situation.",
  negTitle: "Nous sommes vraiment désolés.",
  negSub:
    "Nous n'avons pas répondu à vos attentes aujourd'hui. Dites-nous ce qui s'est passé afin que nous puissions corriger la situation immédiatement.",
  negPlaceholder: "Qu'est-ce qui n'a pas fonctionné lors de la visite de {pet} ?",
  sendToManager: "Envoyer au gestionnaire",
  escalatedTitle: "Merci — nous nous en occupons.",
  escalatedBody:
    "Votre avis a été transmis directement à notre gestionnaire, qui vous contactera personnellement pour arranger les choses. Merci de nous donner l'occasion de corriger la situation.",
  sharedTitle: "Merci d'avoir partagé ! 💛",
  sharedBody: "Vos bons mots comptent énormément pour nous et l'équipe de {business}.",
  modalTitle: "Votre commentaire a été copié !",
  modalBody:
    "Nous avons copié votre commentaire dans votre presse-papiers. Connectez-vous à {platform} à l'écran suivant, collez et publiez — c'est tout !",
  openPlatform: "Ouvrir {platform}",
  done: "Terminé",
  noPlatforms: "Aucune plateforme d'avis publique n'est configurée pour le moment.",
};

const STRINGS: Record<string, SurveyStrings> = { en: EN, fr: FR };

export function surveyStrings(lang: string): SurveyStrings {
  return STRINGS[lang] ?? EN;
}

/** Substitute {pet}/{service}/{business}/{platform} placeholders. */
export function fill(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}
