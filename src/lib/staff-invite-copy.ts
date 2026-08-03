// ============================================================================
// The words in a staff onboarding invitation, in one place.
//
// They were only ever in onboarding-invite-email.tsx, which is a React PREVIEW
// the manager sees before sending — Tailwind classes and a lucide icon, neither
// of which survives an email client. Rendering that component to HTML would not
// have produced a usable email; rewriting the copy for the email would have
// produced two versions of an approved message, drifting from the day they were
// written.
//
// So the strings live here and both consumers import them: the preview renders
// them as JSX, the email builder wraps them in table markup with inline styles.
// Change the wording once and both move.
//
// Pure and client-safe — no server imports — because the preview is a client
// component and the builder is a server module.
// ============================================================================

export interface StaffInviteCopyInput {
  firstName: string;
  facilityName: string;
  roleLabel: string;
  startDate: string;
  /** The facility's own welcome, from the resolved template (P1). */
  welcomeMessage?: string;
  /** From the template, NOT a constant — facilities set their own. */
  expiresInDays: number;
}

export const DEFAULT_WELCOME =
  "Welcome aboard! Please complete your onboarding so we can get you set up before your first shift.";

export function staffInviteCopy(input: StaffInviteCopyInput) {
  const welcome = input.welcomeMessage?.trim() || DEFAULT_WELCOME;
  const days = input.expiresInDays;

  return {
    subject: `Welcome to ${input.facilityName} — complete your onboarding`,
    heading: `Welcome to the team, ${input.firstName}!`,
    welcome,
    roleLabel: input.roleLabel,
    startDate: input.startDate,
    cta: "Complete your onboarding",
    expiry: `This link expires in ${days} day${days === 1 ? "" : "s"}.`,
    footer: `Sent by ${input.facilityName}. If you weren’t expecting this, you can ignore this email.`,
  };
}
