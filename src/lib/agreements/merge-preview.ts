// Merge-field substitution + document rendering for the Agreement Template
// Builder and the Send-to-Facility flow. Preview uses SAMPLE data; the send flow
// passes real, admin-customized values. Both share the same token contract and
// document shell so what the author previews matches what the owner receives.

/** Sample values keyed by merge-field token (see @/lib/tiptap/merge-field). */
export const SAMPLE_MERGE_VALUES: Record<string, string> = {
  facility_name: "Sample Facility",
  owner_name: "Jane Doe",
  plan_name: "Premium Plan",
  date: "March 1, 2026",
  subscription_start_date: "January 1, 2026",
  monthly_amount: "$149.00",
  // Used by the "Yipyy Representative" signature block.
  yipyy_rep_name: "Alex Morgan",
};

/** Extract the distinct `{{token}}` names that appear in a document, in order. */
export function extractMergeTokens(html: string): string[] {
  const seen = new Set<string>();
  for (const match of html.matchAll(/\{\{(\w+)\}\}/g)) {
    seen.add(match[1]);
  }
  return [...seen];
}

/** Replace `{{token}}` occurrences with values; unknown tokens are left as-is. */
export function substituteMergeFields(
  html: string,
  values: Record<string, string>,
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (whole, token: string) =>
    Object.prototype.hasOwnProperty.call(values, token) ? values[token] : whole,
  );
}

/**
 * Wrap already-substituted body HTML in a standalone, self-contained document.
 * Styles mirror the editor canvas (heading weights, lists, signature blocks) but
 * render merge fields as plain resolved text — i.e. the finished document look.
 */
export function wrapAgreementDocument(bodyHtml: string, title: string): string {
  const safeTitle = title.replace(/[<>&]/g, "");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #ffffff;
    color: #1f2937;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    padding: 56px 64px;
  }
  h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.2; margin: 1em 0 0.4em; }
  h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.25; margin: 0.9em 0 0.4em; }
  h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.3; margin: 0.8em 0 0.3em; }
  p { margin: 0.6em 0; }
  ul { list-style: disc; padding-left: 1.6rem; }
  ol { list-style: decimal; padding-left: 1.6rem; }
  li { margin: 0.2em 0; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 1.2rem 0; }
  a { color: #4f46e5; text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  /* Merge fields resolve to plain text in the finished document. */
  .agreement-merge-field { background: none; color: inherit; padding: 0; font-weight: inherit; }
  .agreement-signature-block {
    margin: 1.25rem 0; padding: 1rem; border: 1px dashed #d4d4d8;
    border-radius: 0.5rem; background: #fafafa;
  }
  .agreement-signature-block .sig-role {
    font-size: 0.75rem; font-weight: 600; color: #52525b; margin-bottom: 0.75rem;
  }
  .agreement-signature-block .sig-grid {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;
  }
  .agreement-signature-block .sig-field { display: flex; flex-direction: column; gap: 0.25rem; }
  .agreement-signature-block .sig-label {
    font-size: 11px; font-weight: 500; text-transform: uppercase;
    letter-spacing: 0.03em; color: #71717a;
  }
  .agreement-signature-block .sig-line { display: block; height: 2rem; border-bottom: 1px solid #a1a1aa; }
  .agreement-signature-block img { height: 44px; width: auto; }
  /* Signed-copy certificate page (Task 6). */
  .page-break { page-break-before: always; break-before: page; height: 0; }
  .sig-certificate { margin-top: 2rem; }
  .sig-certificate h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; }
  .sig-certificate table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sig-certificate td { border: 1px solid #e5e7eb; padding: 6px 10px; vertical-align: top; }
  .sig-certificate td:first-child { width: 34%; color: #6b7280; font-weight: 500; }
  .sig-certificate .mono { font-family: ui-monospace, monospace; word-break: break-all; }
  .sig-certificate p { font-size: 12px; color: #6b7280; margin-top: 0.75rem; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** Full preview document with SAMPLE data substituted (used by the editor). */
export function buildAgreementPreviewDoc(
  contentHtml: string,
  title: string,
): string {
  return wrapAgreementDocument(
    substituteMergeFields(contentHtml, SAMPLE_MERGE_VALUES),
    title,
  );
}

/** Full document with real (admin-customized) values (used by the send flow). */
export function buildAgreementDocumentWithValues(
  contentHtml: string,
  title: string,
  values: Record<string, string>,
): string {
  return wrapAgreementDocument(
    substituteMergeFields(contentHtml, values),
    title,
  );
}
