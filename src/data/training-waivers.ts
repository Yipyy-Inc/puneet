/**
 * Training waivers — required and optional acknowledgements the client
 * signs as part of enrollment or drop-in booking.
 *
 * Eventually a Settings → Training screen will let facilities author their
 * own. For now this ships as the baseline shared across both the
 * enrollment flow and the drop-in flow.
 */

export interface TrainingWaiver {
  id: string;
  title: string;
  /** One-liner shown next to the checkbox so the owner gets the gist
   *  without expanding the full text. */
  summary: string;
  /** Full waiver text — surfaced behind a "View full text" disclosure so
   *  the dialog stays compact. */
  fullText: string;
  /** When true, the owner cannot submit until they've checked this box. */
  required: boolean;
}

export const defaultTrainingWaivers: TrainingWaiver[] = [
  {
    id: "waiver-liability",
    title: "Liability Release",
    summary:
      "I accept the inherent risks of dog training and release the facility from liability for accidents not caused by negligence.",
    fullText:
      "I acknowledge that participation in dog training involves inherent risks including bites, scratches, slips, falls, and unexpected behavior from my dog or other dogs in the class. I voluntarily assume these risks and release the facility, its trainers, and staff from any liability for injury, loss, or damage to me, my dog, or my property, except in cases of gross negligence. I agree to follow all instructions given by the trainer during the session.",
    required: true,
  },
  {
    id: "waiver-vaccines",
    title: "Vaccine Compliance",
    summary:
      "I confirm my dog is current on all vaccines required for this course (Rabies, DHPP, Bordetella).",
    fullText:
      "I attest that my dog is in good health and current on every vaccination required for the course they're enrolling in — at minimum Rabies, DHPP, and Bordetella. I will provide documentation upon request. I will not bring my dog to class if they are showing signs of illness, are within 48 hours of receiving a vaccine, or are in a state of communicable disease.",
    required: true,
  },
  {
    id: "waiver-photo",
    title: "Photo & Media Release",
    summary:
      "Optional — let the facility use photos / video of my dog in their marketing materials.",
    fullText:
      "I grant the facility permission to capture photos and video of my dog during training sessions and to use those images in promotional materials including social media, the facility website, and printed brochures. I understand this consent is optional and I can revoke it at any time by contacting the facility.",
    required: false,
  },
];

/** Returns true when every required waiver id in the catalog is present
 *  in the agreed-set. Used by both the enrollment dialog and the drop-in
 *  dialog to gate the submit button. */
export function allRequiredWaiversSigned(
  agreed: Set<string>,
  waivers: TrainingWaiver[] = defaultTrainingWaivers,
): boolean {
  for (const w of waivers) {
    if (w.required && !agreed.has(w.id)) return false;
  }
  return true;
}
