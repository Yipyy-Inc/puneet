import { helpArticles } from "@/data/help-articles";
import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";

// Seed for the Knowledge Base admin. The existing facility Help Center FAQs
// (src/data/help-articles.ts) become Published articles here, plus a few
// Draft/Archived examples so every status is represented. View counts and
// helpfulness votes are deterministic (stable hash) — no fabricated randomness.

function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export const DEFAULT_KB_CATEGORIES = [
  "Getting Started",
  "Bookings & Scheduling",
  "Clients & Pets",
  "Payments & Invoicing",
  "Staff Management",
  "Calling & Messaging",
  "Reports",
  "Account Settings",
];

interface ExtraSeed {
  id: string;
  title: string;
  category: string;
  body: string;
  status: KbArticleStatus;
}

const EXTRAS: ExtraSeed[] = [
  {
    id: "kb-staff-roles",
    title: "Manage staff roles and permissions",
    body: "<p>Open <strong>Staff → Team</strong>, select a member, and choose their role (Owner, Manager, Front Desk or Groomer). Each role unlocks a different set of permissions across bookings, billing and reports.</p><p>To remove access for someone who has left, open their profile and switch their status to <strong>Inactive</strong> — their history stays intact.</p>",
    category: "Staff Management",
    status: "Published",
  },
  {
    id: "kb-call-forwarding",
    title: "Set up call forwarding and voicemail greetings",
    body: "<p>Under <strong>Calling → Settings</strong> you can forward calls to a mobile during busy hours and record separate greetings for business hours, after hours and holidays.</p><p>Missed calls are logged automatically, and an optional auto-response SMS can be sent to the caller so no enquiry slips through.</p>",
    category: "Calling & Messaging",
    status: "Published",
  },
  {
    id: "kb-export-reports",
    title: "Export and schedule your reports",
    body: "<p>From <strong>Reports &amp; Analytics</strong>, pick a report, set the date range, and click <strong>Export</strong> to download a PDF or CSV. Revenue, occupancy and staff-performance reports are all available.</p>",
    category: "Reports",
    status: "Published",
  },
  {
    id: "kb-promo-codes",
    title: "Run a promotion with promo codes",
    body: "<p>Create a promo code under <strong>Marketing → Promo Codes</strong>, set a discount and expiry, then share the code with clients. The discount is applied automatically at checkout and redemptions are tracked for you.</p>",
    category: "Payments & Invoicing",
    status: "Published",
  },
  {
    id: "kb-loyalty-setup",
    title: "Set up a loyalty program (draft)",
    body: "<p>Loyalty lets clients earn points per visit or per dollar spent. This article is still being written — check back soon.</p>",
    category: "Clients & Pets",
    status: "Draft",
  },
  {
    id: "kb-legacy-import",
    title: "Importing from our legacy spreadsheet tool",
    body: "<p>This walkthrough covered our retired CSV importer and has been replaced by the new Data Import wizard.</p>",
    category: "Getting Started",
    status: "Archived",
  },
];

export function buildKbArticles(nowMs: number): KbArticle[] {
  const fromFaqs: KbArticle[] = helpArticles.map((a) => ({
    id: `kb-${a.id}`,
    title: a.title,
    category: a.category,
    body: toHtml(a.answer),
    status: "Published",
    views: stableInt(`v-${a.id}`, 60, 1800),
    helpfulYes: stableInt(`hy-${a.id}`, 12, 140),
    helpfulNo: stableInt(`hn-${a.id}`, 0, 22),
    author: "Yipyy Support",
    updatedAt: new Date(
      nowMs - stableInt(`u-${a.id}`, 1, 120) * 86_400_000,
    ).toISOString(),
  }));

  const extras: KbArticle[] = EXTRAS.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    body: e.body,
    status: e.status,
    views: e.status === "Published" ? stableInt(`v-${e.id}`, 40, 900) : 0,
    helpfulYes: e.status === "Published" ? stableInt(`hy-${e.id}`, 6, 80) : 0,
    helpfulNo: e.status === "Published" ? stableInt(`hn-${e.id}`, 0, 14) : 0,
    author: "Yipyy Support",
    updatedAt: new Date(
      nowMs - stableInt(`u-${e.id}`, 1, 60) * 86_400_000,
    ).toISOString(),
  }));

  return [...fromFaqs, ...extras].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );
}
