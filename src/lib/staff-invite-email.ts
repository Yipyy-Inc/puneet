import {
  staffInviteCopy,
  type StaffInviteCopyInput,
} from "@/lib/staff-invite-copy";

// ============================================================================
// Branded HTML/text builder for the staff onboarding invitation.
//
// Same shape as admin-invite-email.ts on purpose — same escaping helper, same
// {subject, html, text} return, same table-with-inline-styles markup. There is
// one email convention in this codebase and this is it; a second one would mean
// two places to fix the next time an email client mangles something.
//
// The WORDS come from staff-invite-copy.ts, which the manager-facing preview
// (onboarding-invite-email.tsx) also imports. The copy was approved once and is
// stored once.
//
// Colour differs from the admin email deliberately: that one is the purple
// admin console, this is the facility's emerald. Same structure, different
// product surface.
// ============================================================================

export interface StaffInviteEmail {
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

export function buildStaffInviteEmail(
  input: StaffInviteCopyInput & { actionUrl: string },
): StaffInviteEmail {
  const c = staffInviteCopy(input);
  const url = input.actionUrl;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#f8fafc;padding:20px 32px;border-bottom:1px solid #e5e7eb;">
                <span style="color:#0f172a;font-size:17px;font-weight:700;">${escapeHtml(input.facilityName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">${escapeHtml(c.heading)}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(c.welcome)}</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:12px 16px;font-size:12px;">
                      <span style="color:#64748b;">Role</span><br />
                      <strong style="font-size:13px;">${escapeHtml(c.roleLabel)}</strong>
                    </td>
                    <td style="padding:12px 16px;font-size:12px;">
                      <span style="color:#64748b;">Start date</span><br />
                      <strong style="font-size:13px;">${escapeHtml(c.startDate)}</strong>
                    </td>
                  </tr>
                </table>

                <a href="${escapeHtml(url)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(c.cta)}</a>

                <p style="margin:20px 0 0;font-size:12px;color:#64748b;">${escapeHtml(c.expiry)}</p>
                <p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;">${escapeHtml(c.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    c.heading,
    "",
    c.welcome,
    "",
    `Role: ${c.roleLabel}`,
    `Start date: ${c.startDate}`,
    "",
    `${c.cta}: ${url}`,
    "",
    c.expiry,
    c.footer,
  ].join("\n");

  return { subject: c.subject, html, text };
}
