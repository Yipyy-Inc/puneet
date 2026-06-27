import type { EnhancedAnnouncement } from "@/types/announcement";

// Seed for the enhanced announcements feature. minutesAgo offsets resolve
// against "now" on the client so dates stay fresh; the published, in-platform
// ones are also what facilities see by default (see announcement-delivery-store).

interface AnnouncementSeed extends Omit<
  EnhancedAnnouncement,
  "createdAt" | "publishedAt"
> {
  createdAgoMinutes: number;
  publishedAgoMinutes?: number;
  scheduledInMinutes?: number;
}

const SEED: AnnouncementSeed[] = [
  {
    id: "ANN-101",
    title: "Scheduled maintenance window this weekend",
    body: "<p>We'll be performing scheduled maintenance on <strong>Saturday from 2–4 AM ET</strong>. The platform may be briefly unavailable. No action is required on your end.</p>",
    priority: "Urgent",
    status: "Published",
    target: "All Facilities",
    deliveryMethod: "both",
    autoArchiveDays: 3,
    author: "Platform Admin",
    createdAgoMinutes: 90,
    publishedAgoMinutes: 80,
  },
  {
    id: "ANN-102",
    title: "New: AI call summaries are now live",
    body: "<p>Every recorded support call now generates an <strong>AI summary</strong> with sentiment and follow-up suggestions. Find it on each recording in the Calls module.</p>",
    priority: "High",
    status: "Published",
    target: "All Facilities",
    deliveryMethod: "in_platform",
    autoArchiveDays: 14,
    author: "Product Team",
    createdAgoMinutes: 1500,
    publishedAgoMinutes: 1480,
  },
  {
    id: "ANN-103",
    title: "Tip: speed up check-in with QR codes",
    body: "<p>Print a QR code for your front desk so clients can self-check-in. Enable it under <em>Settings → Check-in</em>.</p>",
    priority: "Normal",
    status: "Published",
    target: "All Facilities",
    deliveryMethod: "in_platform",
    autoArchiveDays: 30,
    author: "Customer Success",
    createdAgoMinutes: 4320,
    publishedAgoMinutes: 4300,
  },
  {
    id: "ANN-104",
    title: "Basic plan: unlock unlimited SMS with an upgrade",
    body: '<p>Facilities on the <strong>Basic</strong> plan can now upgrade to Premium for unlimited SMS and priority support. <a href="/facility/settings/billing">See plans</a>.</p>',
    priority: "High",
    status: "Published",
    target: "By Plan Tier",
    planTiers: ["Basic"],
    deliveryMethod: "both",
    autoArchiveDays: 21,
    author: "Billing Team",
    createdAgoMinutes: 700,
    publishedAgoMinutes: 690,
  },
  {
    id: "ANN-105",
    title: "Grooming module: new before/after photo gallery",
    body: "<p>Groomers can now attach before/after photos to each appointment. Clients see them in their portal.</p>",
    priority: "Normal",
    status: "Scheduled",
    target: "By Business Type",
    businessTypes: ["grooming"],
    deliveryMethod: "in_platform",
    autoArchiveDays: 30,
    author: "Product Team",
    createdAgoMinutes: 200,
    scheduledInMinutes: 2880,
  },
  {
    id: "ANN-106",
    title: "Holiday hours reminder (draft)",
    body: "<p>Reminder to set your holiday hours so clients see accurate availability over the break.</p>",
    priority: "Normal",
    status: "Draft",
    target: "All Facilities",
    deliveryMethod: "in_platform",
    autoArchiveDays: null,
    author: "Platform Admin",
    createdAgoMinutes: 45,
  },
  {
    id: "ANN-107",
    title: "Enterprise: dedicated success manager program",
    body: "<p>Enterprise facilities now get a dedicated success manager. Your manager will reach out this week.</p>",
    priority: "High",
    status: "Archived",
    target: "Specific Facilities",
    facilityIds: [1, 3],
    deliveryMethod: "both",
    autoArchiveDays: 7,
    author: "Account Management",
    createdAgoMinutes: 20000,
    publishedAgoMinutes: 19000,
  },
];

export function buildEnhancedAnnouncements(
  nowMs: number,
): EnhancedAnnouncement[] {
  return SEED.map((s) => {
    const {
      createdAgoMinutes,
      publishedAgoMinutes,
      scheduledInMinutes,
      ...rest
    } = s;
    return {
      ...rest,
      createdAt: new Date(nowMs - createdAgoMinutes * 60_000).toISOString(),
      publishedAt:
        publishedAgoMinutes != null
          ? new Date(nowMs - publishedAgoMinutes * 60_000).toISOString()
          : undefined,
      scheduledFor:
        scheduledInMinutes != null
          ? new Date(nowMs + scheduledInMinutes * 60_000).toISOString()
          : undefined,
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
