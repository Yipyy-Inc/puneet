import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";

// ============================================================================
// "Your administrator asked you to turn on two-factor authentication."
//
// This one had no HTML at all — it was a `text:` field inlined in the route,
// so it arrived as bare monospace next to three branded siblings. A security
// request that looks less official than a marketing email is the wrong way
// round: this is the message people should be MOST willing to believe is from
// us.
//
// ── NO LINK, ON PURPOSE ───────────────────────────────────────────────────
//
// There is no CTA. Enrolling in MFA means going to Settings → Security in an
// app you are already signed in to, and a "click here to set up two-factor
// authentication" button is indistinguishable from the phishing email that
// targets exactly this moment. The instruction is a path, not a link, so the
// safe habit and the convenient one are the same.
// ============================================================================

interface MfaSetupEmailInput {
  userName: string;
  /** Absolute origin, for the logo. */
  origin: string;
}

export interface MfaSetupEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildMfaSetupEmail(input: MfaSetupEmailInput): MfaSetupEmail {
  const firstName = input.userName.split(" ")[0] || input.userName;
  const heading = firstName
    ? `Set up two-factor authentication, ${escapeHtml(firstName)}`
    : "Set up two-factor authentication";

  const subject = "Finish setting up two-factor authentication";

  const paragraphs = [
    "Your administrator has asked you to turn on two-factor authentication on your Yipyy account. It adds a second step when you sign in, so a stolen password is not enough on its own.",
    "It takes about a minute and you will need your phone.",
  ];

  const panel = {
    label: "Where to go",
    value: "Settings → Security",
    note: "Sign in to Yipyy as usual, then open Settings from the menu.",
  };

  const footnotes = [
    "<strong>We will never email you a link to set this up.</strong> Navigate there yourself from inside Yipyy — that way an email pretending to be this one cannot send you anywhere.",
  ];

  const footer =
    "If you were not expecting this, contact your administrator before changing anything on your account.";

  return {
    subject,
    html: renderEmail({
      preheader:
        "Add a second step at sign-in — about a minute, from Settings → Security.",
      heading,
      paragraphs,
      panel,
      footnotes,
      footer,
      origin: input.origin,
    }),
    text: renderPlainText({
      heading,
      paragraphs,
      panel,
      footnotes,
      footer,
    }),
  };
}
