// A platform announcement (super-admin → facilities), stored in
// public.platform_announcements (20260918103842).

export type AnnouncementPriority = "Normal" | "High" | "Urgent";

/**
 * What the admin list shows. Only draft / published / archived are stored;
 * "Scheduled" is a published announcement whose start is still ahead, and a
 * published one past its auto-archive reads as "Archived" — both derived from
 * the clock, so nothing has to run for either to happen.
 */
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

export interface EnhancedAnnouncement {
  id: string;
  title: string;
  /** Sanitised HTML (src/lib/announcements/sanitize-html.ts). */
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target: AnnouncementTarget;
  /** subscription_tiers.id, for "By Plan Tier". */
  planTierIds: string[];
  /** facilities.business_types values, for "By Business Type". */
  businessTypes: string[];
  /** facilities.id, for "Specific Facilities". */
  facilityIds: string[];
  /** When it starts showing; absent = from the moment it is published. */
  startsAt?: string;
  /** Stops showing this many days after it starts; null = until archived. */
  autoArchiveDays: number | null;
  author: string;
  createdAt: string;
  publishedAt?: string;
}

/** What the super-admin composer's target pickers choose from. */
export interface AnnouncementOptions {
  tiers: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
}

/** One announcement as a facility member sees it. */
export interface FacilityAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  shownFrom: string;
  read: boolean;
  dismissed: boolean;
}
