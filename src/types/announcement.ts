// Enhanced platform announcement (admin → facilities). Distinct from the older
// src/data/announcements.ts model — adds Urgent priority, a Scheduled status,
// tier/type/specific targeting, delivery method, scheduling, and auto-archive.

export type AnnouncementPriority = "Normal" | "High" | "Urgent";

export type AnnouncementStatus =
  | "Draft"
  | "Scheduled"
  | "Published"
  | "Archived";

export type AnnouncementTarget =
  | "All Facilities"
  | "By Plan Tier"
  | "By Business Type"
  | "Specific Facilities";

export type DeliveryMethod = "in_platform" | "email" | "both";

export interface EnhancedAnnouncement {
  id: string;
  title: string;
  /** Rich HTML body (from the composer's contentEditable editor). */
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target: AnnouncementTarget;
  /** Plan tiers for "By Plan Tier" (e.g. ["Basic", "Premium"]). */
  planTiers?: string[];
  /** Service/business types for "By Business Type" (e.g. ["grooming"]). */
  businessTypes?: string[];
  /** Facility ids for "Specific Facilities". */
  facilityIds?: number[];
  deliveryMethod: DeliveryMethod;
  /** ISO datetime the announcement is scheduled to publish (Scheduled status). */
  scheduledFor?: string;
  /** Auto-archive this many days after publish (null/undefined = manual only). */
  autoArchiveDays?: number | null;
  author: string;
  createdAt: string;
  publishedAt?: string;
}
