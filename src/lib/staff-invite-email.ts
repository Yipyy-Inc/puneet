import {
  staffInviteCopy,
  type StaffInviteCopyInput,
} from "@/lib/staff-invite-copy";
import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";

// ============================================================================
// The staff onboarding invitation.
//
// The WORDS come from staff-invite-copy.ts, which the manager-facing preview
// (onboarding-invite-email.tsx) also imports. The copy was approved once and is
// stored once — change the wording there and both surfaces move.
//
// The MARKUP comes from src/lib/email/shell.ts. It used to be a private copy of
// the admin invite's tables, deliberately tinted a different colour, on the
// reasoning that "that one is the purple admin console, this is the facility's
// emerald". That reasoning does not survive contact with the actual brand: the
// admin console is not purple, and a person who gets one Yipyy email today and
// another tomorrow should not be able to tell they were built by different
// hands.
// ============================================================================

export interface StaffInviteEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildStaffInviteEmail(
  input: StaffInviteCopyInput & { actionUrl: string; origin: string },
): StaffInviteEmail {
  const copy = staffInviteCopy(input);

  const paragraphs = [escapeHtml(copy.welcome)];

  // Role and start date are FACTS about the job, so they belong in the panel
  // rather than buried in a sentence — this is the part a new hire re-reads.
  const panel = {
    label: "Your role",
    value: copy.roleLabel,
    note:
      copy.startDate && copy.startDate !== "—"
        ? `Starting ${copy.startDate} at ${input.facilityName}`
        : `At ${input.facilityName}`,
  };

  const cta = { label: copy.cta, url: input.actionUrl };

  const footnotes = [
    escapeHtml(copy.expiry),
    `Or paste this link into your browser:<br /><span style="color:#0ea5e9;word-break:break-all;">${input.actionUrl}</span>`,
  ];

  return {
    subject: copy.subject,
    html: renderEmail({
      preheader: copy.welcome,
      heading: copy.heading,
      paragraphs,
      panel,
      cta,
      footnotes,
      footer: escapeHtml(copy.footer),
      origin: input.origin,
    }),
    text: renderPlainText({
      heading: copy.heading,
      paragraphs,
      panel,
      cta,
      footnotes,
      footer: escapeHtml(copy.footer),
    }),
  };
}
