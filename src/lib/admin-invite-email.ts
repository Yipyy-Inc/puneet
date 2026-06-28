// Branded HTML/text builder for the admin-team invitation email. Pure + server-
// safe (no client imports), consumed by the /api/admin/invite route.

interface InviteEmailInput {
  name: string;
  roleLabel: string;
  department: string;
  setupUrl: string;
  expiryHours: number;
}

export interface InviteEmail {
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

export function buildInviteEmail(input: InviteEmailInput): InviteEmail {
  const { name, roleLabel, department, setupUrl, expiryHours } = input;
  const firstName = name.split(" ")[0] || name;
  const subject = "You've been invited to the Yipyy admin team";

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
                <span style="color:#ede9fe;font-size:13px;display:block;margin-top:2px;">Admin Console</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">You're invited, ${escapeHtml(firstName)} 👋</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
                  You've been invited to join the <strong>Yipyy</strong> admin team as
                  <strong>${escapeHtml(roleLabel)}</strong> in <strong>${escapeHtml(department)}</strong>.
                  Set up your account to get started.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="border-radius:10px;background:#059669;">
                      <a href="${setupUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                        Set up your account
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                  This invitation link expires in <strong>${expiryHours} hours</strong>. If it expires,
                  ask an administrator to resend it.
                </p>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                  Or paste this link into your browser:<br />${setupUrl}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #f0f0f3;font-size:12px;color:#9ca3af;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `You're invited, ${firstName}

You've been invited to join the Yipyy admin team as ${roleLabel} in ${department}.

Set up your account: ${setupUrl}

This invitation link expires in ${expiryHours} hours. If it expires, ask an administrator to resend it.

If you weren't expecting this invitation, you can safely ignore this email.`;

  return { subject, html, text };
}
