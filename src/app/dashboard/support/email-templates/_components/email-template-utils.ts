import type { EmailTemplateCategory } from "@/types/email-templates";

export const CATEGORY_ORDER: EmailTemplateCategory[] = [
  "Onboarding",
  "Trial Lifecycle",
  "Billing",
  "Account Management",
  "Support",
];

/** Sample values used to render the Preview tab realistically. */
const SAMPLE_VALUES: Record<string, string> = {
  facility_name: "Example Pet Care Facility",
  primary_admin_name: "Jordan Lee",
  admin_name: "Sarah Johnson",
  staff_name: "Alex Rivera",
  agent_name: "Michael Chen",
  plan_name: "Premium",
  days_remaining: "7",
  trial_end_date: "July 12, 2026",
  invoice_number: "INV-0312",
  amount_due: "$149.00",
  due_date: "July 1, 2026",
  days_overdue: "7",
  ticket_id: "TCK-1042",
  reply_preview: "Thanks for the details — we've shipped a fix on our end.",
  message_preview: "Hi, our online booking widget isn't loading for clients.",
  session_time: "2:14 PM ET",
  import_source: "MoeGo",
  records_imported: "1,284",
  records_skipped: "12",
};

export function humanizeTag(tag: string): string {
  return tag
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain-text (with newlines) → simple HTML paragraphs for the editor/preview. */
export function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z!/][\s\S]*>/i.test(s);
}

/** Normalize a stored body (plain seed OR edited HTML) to HTML for the editor. */
export function toEditorHtml(body: string): string {
  return looksLikeHtml(body) ? body : plainToHtml(body);
}

/** Subject preview — substitute merge tags with sample values (plain text). */
export function fillSubject(subject: string): string {
  return subject.replace(
    /\{\{(\w+)\}\}/g,
    (_, tag) => SAMPLE_VALUES[tag] ?? `[${humanizeTag(tag)}]`,
  );
}

/** Body preview — HTML with merge tags substituted (escaped) for sample values. */
export function renderBodyPreview(body: string): string {
  return toEditorHtml(body).replace(/\{\{(\w+)\}\}/g, (_, tag) =>
    escapeHtml(SAMPLE_VALUES[tag] ?? `[${humanizeTag(tag)}]`),
  );
}
