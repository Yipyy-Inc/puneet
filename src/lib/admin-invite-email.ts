import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";

// ============================================================================
// The Yipyy admin-team invitation.
//
// This is somebody joining the PLATFORM's own team, not a facility's — so the
// panel names their role and department, and the copy says "the Yipyy admin
// team" rather than "your facility".
//
// It used to carry a violet-to-fuchsia gradient header, which is where every
// other email in this codebase caught it from. Violet appears nowhere in the
// product: the mark is sky blue, orange and navy. Now on the shared shell
// (src/lib/email/shell.ts) like the rest.
//
// ── THE LINK CARRIES A TOKEN, UNLIKE THE OTHER TWO ────────────────────────
//
// The facility-owner and staff invitations point at /sign-up, because their
// access is a membership GRANT recorded against an email address and claimed
// when that person signs up. This one carries a signed setup token instead
// (lib/invitation-token.ts), so the 48-hour expiry is real and enforced by the
// token rather than by a row — and forwarding THIS email does hand over the
// invitation. The footer says so plainly for that reason.
// ============================================================================

interface InviteEmailInput {
  name: string;
  roleLabel: string;
  department: string;
  setupUrl: string;
  expiryHours: number;
  /** Absolute origin, for the logo. */
  origin: string;
}

export interface InviteEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildInviteEmail(input: InviteEmailInput): InviteEmail {
  const { name, roleLabel, department, setupUrl, expiryHours, origin } = input;
  const firstName = name.split(" ")[0] || name;

  const subject = "You've been invited to the Yipyy admin team";
  const heading = `You're invited, ${escapeHtml(firstName)}`;

  const paragraphs = [
    `You have been invited to join the <strong>Yipyy admin team</strong>. Set up your account to get started.`,
  ];

  const panel = {
    label: "Your role",
    value: roleLabel,
    note: department ? `In ${department}` : undefined,
  };

  const cta = { label: "Set up your account", url: setupUrl };

  const footnotes = [
    `This invitation link expires in <strong>${expiryHours} hours</strong>. If it expires, ask an administrator to resend it.`,
    `Or paste this link into your browser:<br /><span style="color:#0ea5e9;word-break:break-all;">${setupUrl}</span>`,
  ];

  // Deliberately different from the other invitations: this link IS the
  // credential, so "forwarding gives nobody a way in" would be false here.
  const footer =
    "This link sets up an account in your name — do not forward it. If you were not expecting this invitation, you can safely ignore this email.";

  return {
    subject,
    html: renderEmail({
      preheader: `Set up your Yipyy admin account — ${roleLabel}${department ? `, ${department}` : ""}.`,
      heading,
      paragraphs,
      panel,
      cta,
      footnotes,
      footer,
      origin,
    }),
    text: renderPlainText({
      heading,
      paragraphs,
      panel,
      cta,
      footnotes,
      footer,
    }),
  };
}
