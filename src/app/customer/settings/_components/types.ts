import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  LogIn,
  Megaphone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { AdditionalContact } from "@/types/client";

export type NotificationChannel = "email" | "sms" | "push";

/** A channel's name, by CATALOGUE KEY in `customerPages.areas.settings`. */
export const CHANNEL_KEYS: Record<NotificationChannel, string> = {
  email: "channelEmail",
  sms: "channelSms",
  push: "channelPush",
};

export type NotificationCategoryKey =
  | "bookingConfirmations"
  | "bookingReminders"
  | "checkInOut"
  | "reportCards"
  | "paymentReceipts"
  | "emergencyAlerts"
  | "marketing";

export type NotificationCategoryGroup = "service" | "marketing";

export interface NotificationCategoryMeta {
  key: NotificationCategoryKey;
  /** Catalogue keys, not copy — the card renders them through `t`. */
  labelKey: string;
  descriptionKey: string;
  allowedChannels: NotificationChannel[];
  group: NotificationCategoryGroup;
  icon: typeof Bell;
  iconClass: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    key: "bookingConfirmations",
    labelKey: "catBookingConfirmations",
    descriptionKey: "catBookingConfirmationsHint",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarCheck,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "bookingReminders",
    labelKey: "catBookingReminders",
    descriptionKey: "catBookingRemindersHint",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarClock,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    key: "checkInOut",
    labelKey: "catCheckInOut",
    descriptionKey: "catCheckInOutHint",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: LogIn,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    key: "reportCards",
    labelKey: "catReportCards",
    descriptionKey: "catReportCardsHint",
    allowedChannels: ["email", "push"],
    group: "service",
    icon: Sparkles,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    key: "paymentReceipts",
    labelKey: "catPaymentReceipts",
    descriptionKey: "catPaymentReceiptsHint",
    allowedChannels: ["email"],
    group: "service",
    icon: CreditCard,
    iconClass: "bg-slate-100 text-slate-600",
  },
  {
    key: "emergencyAlerts",
    labelKey: "catEmergencyAlerts",
    descriptionKey: "catEmergencyAlertsHint",
    allowedChannels: ["sms", "push"],
    group: "service",
    icon: ShieldAlert,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    key: "marketing",
    labelKey: "catMarketing",
    descriptionKey: "catMarketingHint",
    allowedChannels: ["email", "sms"],
    group: "marketing",
    icon: Megaphone,
    iconClass: "bg-pink-50 text-pink-600",
  },
];

export type NotificationCategoryState = Record<
  NotificationCategoryKey,
  { enabled: boolean; channels: NotificationChannel[] }
>;

export const DEFAULT_CATEGORY_STATE: NotificationCategoryState = {
  bookingConfirmations: { enabled: true, channels: ["email", "push"] },
  bookingReminders: { enabled: true, channels: ["email", "sms", "push"] },
  checkInOut: { enabled: true, channels: ["email"] },
  reportCards: { enabled: true, channels: ["email", "push"] },
  paymentReceipts: { enabled: true, channels: ["email"] },
  emergencyAlerts: { enabled: true, channels: ["sms", "push"] },
  marketing: { enabled: false, channels: [] },
};

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  additionalContacts: AdditionalContact[];
  pickupDropoff: {
    authorizedPickupPeople: string;
    notes: string;
  };
}

export interface PaymentPreferences {
  enabled: boolean;
  type: "percentage" | "fixed";
  value: number;
}

export interface NotificationPreferences {
  categories: NotificationCategoryState;
  perPetReportCards: Record<number, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  language: string;
}

export type PhotoUsageScope = "all" | "facility" | "none";

export interface PrivacyPreferences {
  photoUsage: PhotoUsageScope;
  socialMediaTagging: boolean;
  lobbyBoardVisibility: boolean;
  crossLocationSharing: boolean;
  callRecording: boolean;
}

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  photoUsage: "facility",
  socialMediaTagging: false,
  lobbyBoardVisibility: true,
  crossLocationSharing: true,
  callRecording: true,
};
