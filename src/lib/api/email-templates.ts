import { emailTemplates } from "@/data/email-templates";
import type { EmailTemplate } from "@/types/email-templates";

// Query factory for the email-template system (shared by the Email Templates
// admin page and automated senders such as dunning).
export const emailTemplateQueries = {
  list: () => ({
    queryKey: ["email-templates"] as const,
    queryFn: async (): Promise<EmailTemplate[]> => emailTemplates,
  }),
};

// ---- Email image hosting (mock CDN) --------------------------------------
//
// RULE: images in email templates are hosted on Yipyy's CDN over HTTPS and
// referenced by URL in the email HTML — NEVER embedded as base64. Base64 breaks
// most email clients and inflates size past spam thresholds. So the stored body
// only ever contains `https://cdn.yipyy.com/...` image URLs.
//
// There is no real CDN here, so `uploadEmailImage` returns a CDN URL for storage
// AND registers a session-scoped object URL so the editor/preview can render the
// just-uploaded bytes. Rendering swaps CDN → preview URL; storage keeps the CDN.

export const EMAIL_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
export const EMAIL_IMAGE_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp";
export const EMAIL_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

const EMAIL_CDN_BASE = "https://cdn.yipyy.com/email-templates";
const previewByCdnUrl = new Map<string, string>();

function extFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "png";
}

/**
 * Mock CDN upload over HTTPS. `id` is supplied by the caller (an event handler)
 * so this stays free of impure calls. Returns the CDN URL to embed plus a
 * session preview URL for rendering the image immediately.
 */
export function uploadEmailImage(
  file: File,
  id: string,
): { url: string; previewUrl: string } {
  const url = `${EMAIL_CDN_BASE}/${id}.${extFor(file.type)}`;
  const previewUrl = URL.createObjectURL(file);
  previewByCdnUrl.set(url, previewUrl);
  return { url, previewUrl };
}

/**
 * Storage form: rewrite the editor's `<img src="blob:…" data-cdn-src="https://cdn…">`
 * back to the CDN URL so the persisted body only references CDN URLs (no base64).
 */
export function serializeEmailBody(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img[data-cdn-src]").forEach((img) => {
    const cdn = img.getAttribute("data-cdn-src");
    if (cdn) {
      img.setAttribute("src", cdn);
      img.removeAttribute("data-cdn-src");
    }
  });
  return doc.body.innerHTML;
}

/**
 * Editor form: swap CDN URLs for their session preview blob (keeping the CDN URL
 * in `data-cdn-src`) so authors see the image while editing. Unregistered CDN
 * URLs (from a prior session) are left as-is.
 */
export function hydrateEmailBodyForEditor(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const preview = previewByCdnUrl.get(src);
    if (preview) {
      img.setAttribute("data-cdn-src", src);
      img.setAttribute("src", preview);
    }
  });
  return doc.body.innerHTML;
}

/** Preview form: swap CDN URLs for the session preview blob for display only. */
export function hydrateEmailBodyForPreview(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    const preview = previewByCdnUrl.get(img.getAttribute("src") ?? "");
    if (preview) img.setAttribute("src", preview);
  });
  return doc.body.innerHTML;
}
