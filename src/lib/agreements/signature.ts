// Signing helpers for the e-signature portal (Task 6). These run in the browser
// (they use DOMParser / Web Crypto) and are called from event handlers, never
// during SSR/render.

import { wrapAgreementDocument } from "@/lib/agreements/merge-preview";
import type { CapturedSignature, SentAgreement } from "@/lib/api/agreements";

// The signer's public IP is captured server-side from the request in a real
// deployment. This mock has no backend request, so a documentation-range
// placeholder is recorded and clearly labelled on the certificate.
export const MOCK_SIGNING_IP = "198.51.100.24 (demo)";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Open a standalone signed-document HTML string in a new tab, where the viewer
 * can read it and use the browser's Print → Save as PDF. Used by the signing
 * confirmation screen and the Super Admin agreements list.
 */
export function openSignedDocument(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  // Revoke after the new tab has had time to load.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** SHA-256 hex digest of a string, for tamper-evident document hashing. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Friendly "Browser on OS" label derived from a user-agent string. */
export function friendlyDevice(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}

export interface SignatureBlockInfo {
  id: string;
  role: string;
}

/** Read the signature blocks (id + signer role) out of a document's HTML. */
export function extractSignatureBlocks(html: string): SignatureBlockInfo[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.querySelectorAll("[data-signature-block]")].map(
    (block, i) => ({
      id: block.getAttribute("data-signature-id") ?? `block-${i}`,
      role: block.getAttribute("data-signer-role") ?? "Signature",
    }),
  );
}

/**
 * Inject captured signatures + the signed date into a document's signature
 * blocks, returning the resulting body HTML. Signatures are matched by block id.
 */
export function injectSignatures(
  html: string,
  signatures: Record<string, CapturedSignature>,
  dateLabel: string,
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const block of doc.querySelectorAll("[data-signature-block]")) {
    const id = block.getAttribute("data-signature-id") ?? "";
    const captured = signatures[id];
    if (!captured) continue;

    for (const field of block.querySelectorAll(".sig-field")) {
      const label = field.querySelector(".sig-label")?.textContent?.trim();
      const line = field.querySelector(".sig-line");
      if (!line) continue;

      if (label === "Signature") {
        const img = doc.createElement("img");
        img.setAttribute("src", captured.image);
        img.setAttribute("alt", "Signature");
        line.replaceWith(img);
      } else if (label === "Date Signed") {
        const span = doc.createElement("span");
        span.textContent = dateLabel;
        line.replaceWith(span);
      }
    }
  }
  return doc.body.innerHTML;
}

/** The signature-certificate page appended to every signed copy. */
export function buildSignatureCertificate(
  record: SentAgreement,
  audit: {
    signerEmail: string;
    ipAddress: string;
    device: string;
    signedAtUtc: string;
    documentHash: string;
  },
  signatureCount: number,
): string {
  const row = (label: string, value: string) =>
    `<tr><td>${label}</td><td>${escapeHtml(value)}</td></tr>`;
  return `<section class="sig-certificate">
    <h2>Signature Certificate</h2>
    <table>
      ${row("Document", `${record.templateName} (v${record.templateVersion})`)}
      ${row("Facility", record.facilityName)}
      ${row("Signer", record.ownerName)}
      ${row("Email", audit.signerEmail)}
      ${row("IP address", audit.ipAddress)}
      ${row("Device", audit.device)}
      ${row("Signed (UTC)", audit.signedAtUtc)}
      ${row("Signatures captured", String(signatureCount))}
      <tr><td>Document SHA-256</td><td class="mono">${escapeHtml(audit.documentHash)}</td></tr>
    </table>
    <p>This certificate evidences the electronic signature of the document above.
    The SHA-256 hash fixes the exact content signed — any later change invalidates it.</p>
  </section>`;
}

/** Compose the full standalone signed document (signed body + certificate). */
export function buildSignedDocument(
  signedBodyHtml: string,
  record: SentAgreement,
  audit: {
    signerEmail: string;
    ipAddress: string;
    device: string;
    signedAtUtc: string;
    documentHash: string;
  },
  signatureCount: number,
): string {
  const body = `${signedBodyHtml}<div class="page-break"></div>${buildSignatureCertificate(
    record,
    audit,
    signatureCount,
  )}`;
  return wrapAgreementDocument(body, `${record.templateName} — signed`);
}
