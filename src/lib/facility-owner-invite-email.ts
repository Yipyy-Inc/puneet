// Branded HTML/text builder for the facility-owner invitation. Pure + server-
// safe (no client imports), consumed by /api/facilities/[id]/invite-owner.
//
// Deliberately its own builder rather than a parameter on buildInviteEmail:
// this person is not joining Yipyy's team, they are being handed a business.
// The admin-team copy ("join the Yipyy admin team as Support in Operations")
// would be wrong in a way that matters on the one email that decides whether
// they trust the platform at all.
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
// whoever signs up must control this address.

interface OwnerInviteEmailInput {
  ownerName: string;
  facilityName: string;
  signUpUrl: string;
  expiresInDays: number;
  /** True when they already had a Yipyy account, so access is live right now. */
  alreadyRegistered: boolean;
}

export interface OwnerInviteEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  } = input;
  const firstName = ownerName.split(" ")[0] || ownerName;

  const subject = `${facilityName} is ready on Yipyy`;

  // The two states say different true things. Someone who already has an
  // account is not "setting one up" — telling them to would send them to a
  // screen that refuses their email, which reads as a broken invitation.
  const lead = alreadyRegistered
    ? `<strong>${escapeHtml(facilityName)}</strong> is set up on Yipyy and linked to this email address. Sign in and it will be waiting for you.`
    : `<strong>${escapeHtml(facilityName)}</strong> is set up on Yipyy and waiting for you. Create your account with this email address and you will land straight in it.`;

  const cta = alreadyRegistered ? "Sign in" : "Create your account";

  const expiryNote = alreadyRegistered
    ? ""
    : `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                  This invitation expires in <strong>${expiresInDays} days</strong>. If it does,
                  ask Yipyy to send it again.
                </p>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#d946ef);padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">Yipyy</span>
                <span style="color:#ede9fe;font-size:13px;display:block;margin-top:2px;">${escapeHtml(facilityName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Welcome, ${escapeHtml(firstName)} 👋</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
                  ${lead}
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
                  You are the owner, so you can add your team, set your services
                  and start taking bookings straight away.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="border-radius:10px;background:#059669;">
                      <a href="${signUpUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                        ${cta}
                      </a>
                    </td>
                  </tr>
                </table>
                ${expiryNote}
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                  Or paste this link into your browser:<br />${signUpUrl}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #f0f0f3;font-size:12px;color:#9ca3af;">
                You must use this email address — your access is tied to it, so
                forwarding this message gives nobody else a way in. If you were
                not expecting this, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Welcome, ${firstName}

${
  alreadyRegistered
    ? `${facilityName} is set up on Yipyy and linked to this email address. Sign in and it will be waiting for you.`
    : `${facilityName} is set up on Yipyy and waiting for you. Create your account with this email address and you will land straight in it.`
}

You are the owner, so you can add your team, set your services and start taking bookings straight away.

${cta}: ${signUpUrl}
${
  alreadyRegistered
    ? ""
    : `\nThis invitation expires in ${expiresInDays} days. If it does, ask Yipyy to send it again.\n`
}
You must use this email address — your access is tied to it, so forwarding this message gives nobody else a way in. If you were not expecting this, you can safely ignore it.`;

  return { subject, html, text };
}
