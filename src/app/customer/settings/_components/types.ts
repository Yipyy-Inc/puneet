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

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
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
  label: string;
  description: string;
  allowedChannels: NotificationChannel[];
  group: NotificationCategoryGroup;
  icon: typeof Bell;
  iconClass: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    key: "bookingConfirmations",
    label: "Booking confirmations",
    description:
      "Updates when a booking is confirmed, rescheduled, or cancelled.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarCheck,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "bookingReminders",
    label: "Booking reminders",
    description: "Friendly reminders 24 hours before each appointment.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarClock,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    key: "checkInOut",
    label: "Check-in & check-out",
    description: "Alerts when your pet arrives at and leaves the facility.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: LogIn,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    key: "reportCards",
    label: "Report cards & pet updates",
    description: "Photos and daily updates from the team.",
    allowedChannels: ["email", "push"],
    group: "service",
    icon: Sparkles,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    key: "paymentReceipts",
    label: "Payment receipts",
    description: "A receipt every time you’re charged.",
    allowedChannels: ["email"],
    group: "service",
    icon: CreditCard,
    iconClass: "bg-slate-100 text-slate-600",
  },
  {
    key: "emergencyAlerts",
    label: "Emergency alerts",
    description: "Critical, time-sensitive issues only.",
    allowedChannels: ["sms", "push"],
    group: "service",
    icon: ShieldAlert,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    key: "marketing",
    label: "Promotions & news",
    description:
      "Occasional offers and facility news. Standard rates may apply.",
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
