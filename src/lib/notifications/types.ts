import type {
  NotificationCategory,
  NotificationKind,
  NotificationPreferences,
  NotificationRoleDefaults,
  StaffRole,
} from "@/lib/notifications/catalog";

/** One notification, as /api/notifications returns it. */
export interface StaffNotification {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  urgent: boolean;
  /** The names, numbers and dates the catalogue sentence is filled with. */
  params: Record<string, string | number>;
  link: string | null;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

export interface StaffNotificationFeed {
  items: StaffNotification[];
  /** Unread and not archived, across every category. */
  unread: number;
}

/** What My notifications reads: who you are here, and what you chose. */
export interface MyNotificationSettings {
  role: StaffRole | null;
  preferences: NotificationPreferences;
  /** The facility's role defaults, or the shipped ones. */
  roleDefaults: NotificationRoleDefaults;
}
