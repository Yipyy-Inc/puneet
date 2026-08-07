import { escapeHtml, renderEmail, renderPlainText } from "@/lib/email/shell";

// ============================================================================
// The facility-owner invitation.
//
// The one email that decides whether somebody trusts this platform with their
// business, so it says what is true and nothing more.
//
// Its own builder rather than a flag on the admin-team invite: that person is
// joining Yipyy's staff, this one is being handed a company. "You've been
// invited to join the Yipyy admin team as Support in Operations" would be
// wrong in a way that matters here.
//
// ── WHY THE LINK GOES TO /sign-up AND NOT A TOKEN ─────────────────────────
//
// There is no token to mint. Their access is already recorded as a membership
// GRANT against this email address, and the trigger on `profiles` turns it into
// a real membership the moment they sign up with it (20260807120000). So the
// link is the ordinary sign-up screen, and they choose Google or a password
// there — a token-bearing link would take that choice away and add a secret
// worth stealing for no gain.
//
// Which also means the email is not a credential. Forwarding it grants nothing:
// whoever signs up must control this address. The footer says so, because a
// person who receives this unexpectedly deserves to know it is inert.
// ============================================================================

interface OwnerInviteEmailInput {
  ownerName: string;
  facilityName: string;
  signUpUrl: string;
  expiresInDays: number;
  /** True when they already had a Yipyy account, so access is live right now. */
  alreadyRegistered: boolean;
  /** Absolute origin, for the logo. */
  origin: string;
}

export interface OwnerInviteEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildOwnerInviteEmail(
  input: OwnerInviteEmailInput,
): OwnerInviteEmail {
  const {
    ownerName,
    facilityName,
    signUpUrl,
    expiresInDays,
    alreadyRegistered,
    origin,
  } = input;

  const firstName = ownerName.split(" ")[0] || ownerName;
  const facility = escapeHtml(facilityName);

  const subject = `${facilityName} is ready on Yipyy`;

  // The two states say different true things. Telling somebody who already has
  // an account to "create" one sends them to a screen that refuses their email,
  // which reads as a broken invitation on their first contact with us.
  const paragraphs = alreadyRegistered
    ? [
        `<strong>${facility}</strong> is set up and linked to this email address. Sign in and it will be waiting for you.`,
        "You are the owner, so you can add your team, set your services and start taking bookings straight away.",
      ]
    : [
        `<strong>${facility}</strong> is set up and waiting for you. Create your account with this email address and you will land straight in it.`,
        "You are the owner, so you can add your team, set your services and start taking bookings straight away.",
      ];

  const cta = {
    label: alreadyRegistered ? "Sign in to Yipyy" : "Create your account",
    url: signUpUrl,
  };

  const panel = {
    label: "Your facility",
    value: facilityName,
    note: "You have been added as the owner.",
  };

  const footnotes = [
    ...(alreadyRegistered
      ? []
      : [
          `This invitation expires in <strong>${expiresInDays} days</strong>. If it does, ask us to send it again.`,
        ]),
    `Or paste this link into your browser:<br /><span style="color:#0ea5e9;word-break:break-all;">${signUpUrl}</span>`,
  ];

  const footer =
    "You must use this email address — your access is tied to it, so forwarding this message gives nobody else a way in. If you were not expecting this, you can safely ignore it.";

  const heading = `Welcome, ${escapeHtml(firstName)}`;

  return {
    subject,
    html: renderEmail({
      preheader: alreadyRegistered
        ? `Sign in and ${facilityName} is waiting for you.`
        : `Create your account and you will land straight in ${facilityName}.`,
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
