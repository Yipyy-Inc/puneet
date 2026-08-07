// ============================================================================
// The Yipyy email shell — one layout every transactional email sits in.
//
// Four builders had four copies of this markup (admin invite, staff invite,
// owner invite, MFA setup), which is how they drifted into three different
// widths, two different button colours and a violet gradient that appears
// nowhere in the product.
//
// ── THE BRAND, TAKEN FROM THE ACTUAL ASSETS ───────────────────────────────
//
// public/yipyy-transparent.png: a SKY-BLUE wordmark, an ORANGE dot on the "i",
// and a deep-NAVY dog in the negative space of the "p". Those three, plus the
// slate scale from globals.css, are the whole palette:
//
//   --primary  #0ea5e9   sky      the wordmark, links, the accent rule
//   --accent   #fb923c   orange   used sparingly, as it is in the mark
//   navy       #0f3f5c   the dog  headings, so text carries the brand too
//   slate      #475569   body copy, from the same scale
//
// The CTA stays EMERALD, matching every solid action button in the product
// (docs: action button palette). An email that promises a green button and
// then hands you a blue app is a small lie about where you are going.
//
// ── WHY THE HEADER IS WHITE ───────────────────────────────────────────────
//
// The dog is white negative space cut into the blue "p". On a coloured band it
// disappears and the mark reads as a smudge. The all-white logo variant exists
// for dark backgrounds, but it throws away the part of the mark people
// remember. So: white header, colour logo, and a sky rule underneath to carry
// the brand.
//
// ── WHAT MAKES IT SURVIVE REAL CLIENTS ────────────────────────────────────
//
// Tables and inline styles, because Gmail strips <style> in some contexts and
// Outlook renders through Word. A VML fallback so the button is a button in
// Outlook rather than a bare link. A preheader, so the inbox preview is a
// sentence we chose rather than the first words of the body. 600px, the width
// every client has handled for fifteen years.
// ============================================================================

export interface EmailShellInput {
  /**
   * The inbox preview line, after the subject. Without it clients scrape the
   * first body text, which here would be "Welcome, Puneet" — true and useless.
   */
  preheader: string;
  heading: string;
  /** Paragraphs of body copy, already escaped. */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** A bordered panel above the CTA — the facility, the role, the dates. */
  panel?: { label: string; value: string; note?: string };
  /** Small print under the CTA (expiry, "or paste this link"). */
  footnotes?: string[];
  /** The closing grey band. */
  footer: string;
  /** Absolute origin, so the logo resolves on preview deploys too. */
  origin: string;
}

const SKY = "#0ea5e9";
const NAVY = "#0f3f5c";
const SLATE = "#475569";
const EMERALD = "#059669";
const HAIRLINE = "#e2e8f0";
const CANVAS = "#f1f5f9";

/**
 * Repeated on EVERY text element, not set once on <body>.
 *
 * Email clients do not inherit font-family reliably — Outlook renders through
 * Word and several webmail clients strip or reset it — so an element without
 * its own stack falls back to the client default, which is usually a serif.
 * The first render of this shell had a sans heading over Times body copy for
 * exactly that reason.
 */
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(input: EmailShellInput): string {
  const {
    preheader,
    heading,
    paragraphs,
    cta,
    panel,
    footnotes,
    footer,
    origin,
  } = input;

  const body = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:${SLATE};">${text}</p>`,
    )
    .join("\n                ");

  const panelHtml = panel
    ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ${HAIRLINE};border-radius:12px;background:#f8fafc;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${SKY};">${escapeHtml(panel.label)}</p>
                      <p style="margin:0;font-family:${FONT};font-size:18px;font-weight:700;color:${NAVY};">${escapeHtml(panel.value)}</p>
                      ${panel.note ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:${SLATE};">${escapeHtml(panel.note)}</p>` : ""}
                    </td>
                  </tr>
                </table>`
    : "";

  // Bulletproof button: the VML half is what makes Outlook render a filled
  // rectangle instead of underlined text on a white background.
  const ctaHtml = cta
    ? `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td align="center" bgcolor="${EMERALD}" style="border-radius:10px;">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${cta.url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" stroke="f" fillcolor="${EMERALD}">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(cta.label)}</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-- -->
                      <a href="${cta.url}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background:${EMERALD};">${escapeHtml(cta.label)}</a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>`
    : "";

  const footnoteHtml = (footnotes ?? [])
    .map(
      (text) =>
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:1.6;color:#94a3b8;">${text}</p>`,
    )
    .join("\n                ");

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading)}</title>
    <!--[if mso]>
    <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:${FONT};-webkit-font-smoothing:antialiased;">
    <!-- Inbox preview line. The trailing entities stop the client filling the
         rest of the preview with the first words of the body. -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${CANVAS};">
      ${escapeHtml(preheader)}
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${HAIRLINE};">

            <!-- Header: white, because the mark's dog is white negative space -->
            <tr>
              <td align="center" style="padding:32px 32px 24px;">
                <img src="${origin}/yipyy-transparent.png" width="132" height="53" alt="Yipyy" style="display:block;width:132px;height:53px;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="height:3px;line-height:3px;font-size:0;background:${SKY};">&nbsp;</td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:${NAVY};font-family:${FONT};">${escapeHtml(heading)}</h1>
                ${body}
                ${panelHtml}
                ${ctaHtml}
                ${footnoteHtml}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 24px;border-top:1px solid ${HAIRLINE};background:#f8fafc;">
                <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;line-height:1.6;color:#94a3b8;">${footer}</p>
                <p style="margin:0;font-family:${FONT};font-size:12px;color:#cbd5e1;">Yipyy · pet care, run properly</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** The plain-text half. Never an afterthought — some clients only show this. */
export function renderPlainText(input: {
  heading: string;
  paragraphs: string[];
  panel?: { label: string; value: string; note?: string };
  cta?: { label: string; url: string };
  footnotes?: string[];
  footer: string;
}): string {
  const parts: string[] = [input.heading, ""];
  // Blank line BETWEEN paragraphs: without it the text half is a wall, which
  // is the half some clients and every screen reader actually use.
  parts.push(input.paragraphs.map(stripTags).join("\n\n"), "");
  if (input.panel) {
    parts.push(
      `${input.panel.label}: ${input.panel.value}`,
      ...(input.panel.note ? [input.panel.note] : []),
      "",
    );
  }
  if (input.cta) parts.push(`${input.cta.label}: ${input.cta.url}`, "");
  if (input.footnotes?.length)
    parts.push(...input.footnotes.map(stripTags), "");
  parts.push(stripTags(input.footer));
  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Body copy carries <strong> for the HTML half; the text half must not. */
function stripTags(value: string): string {
  return (
    value
      // A line break is content, not markup — dropping it silently glued
      // "…into your browser:" onto the URL that followed it.
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ")
  );
}
