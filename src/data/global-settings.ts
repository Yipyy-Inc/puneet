// Global Settings Data

export interface BrandingSettings {
  platformName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkModeEnabled: boolean;
  customCss: string;
  emailLogoUrl: string;
  emailFooterText: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
  direction: "ltr" | "rtl";
  completionPercentage: number;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  enabled: boolean;
  isDefault: boolean;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
  exchangeRate: number; // Relative to USD
}

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export interface SystemDefaults {
  defaultTimezone: string;
  defaultDateFormat: string;
  defaultTimeFormat: string;
  defaultLanguage: string;
  defaultCurrency: string;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
  minPasswordLength: number;
  requireMfa: boolean;
  allowSocialLogin: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  trialPeriodDays: number;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  defaultPaginationSize: number;
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: "transactional" | "marketing" | "system" | "reminder";
  lastModified: string;
  enabled: boolean;
}

// Branding Settings Data
export const brandingSettings: BrandingSettings = {
  platformName: "Doggieville MTL",
  tagline: "Premium Pet Care Management",
  logoUrl: "/images/logo.png",
  faviconUrl: "/favicon.ico",
  primaryColor: "#0ea5e9",
  secondaryColor: "#8b5cf6",
  accentColor: "#f59e0b",
  darkModeEnabled: true,
  customCss: "",
  emailLogoUrl: "/images/email-logo.png",
  emailFooterText: "© 2025 Doggieville MTL. All rights reserved.",
  supportEmail: "support@doggieville.com",
  supportPhone: "+1 (555) 123-4567",
  websiteUrl: "https://doggieville.com",
  socialLinks: {
    facebook: "https://facebook.com/doggieville",
    twitter: "https://twitter.com/doggieville",
    instagram: "https://instagram.com/doggieville",
    linkedin: "https://linkedin.com/company/doggieville",
  },
};

// Supported Languages
export const supportedLanguages: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    enabled: true,
    isDefault: true,
    direction: "ltr",
    completionPercentage: 100,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    enabled: true,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 98,
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    enabled: false,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 45,
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    enabled: false,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 30,
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    enabled: false,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 20,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    enabled: false,
    isDefault: false,
    direction: "rtl",
    completionPercentage: 15,
  },
  {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    enabled: false,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 10,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    enabled: false,
    isDefault: false,
    direction: "ltr",
    completionPercentage: 5,
  },
];

// Supported Currencies
export const supportedCurrencies: CurrencyOption[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    enabled: true,
    isDefault: true,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 1.0,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    enabled: true,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 1.36,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    enabled: true,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 0.92,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    enabled: true,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 0.79,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    enabled: false,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 1.53,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    enabled: false,
    isDefault: false,
    decimalPlaces: 0,
    symbolPosition: "before",
    exchangeRate: 149.5,
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    enabled: false,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 0.88,
  },
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    enabled: false,
    isDefault: false,
    decimalPlaces: 2,
    symbolPosition: "before",
    exchangeRate: 17.15,
  },
];

// Common Timezones
export const timezones: TimezoneOption[] = [
  { value: "America/New_York", label: "Eastern Time (US & Canada)", offset: "UTC-05:00", region: "Americas" },
  { value: "America/Chicago", label: "Central Time (US & Canada)", offset: "UTC-06:00", region: "Americas" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)", offset: "UTC-07:00", region: "Americas" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)", offset: "UTC-08:00", region: "Americas" },
  { value: "America/Toronto", label: "Eastern Time (Canada)", offset: "UTC-05:00", region: "Americas" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)", offset: "UTC-08:00", region: "Americas" },
  { value: "America/Montreal", label: "Eastern Time (Montreal)", offset: "UTC-05:00", region: "Americas" },
  { value: "Europe/London", label: "London", offset: "UTC+00:00", region: "Europe" },
  { value: "Europe/Paris", label: "Paris", offset: "UTC+01:00", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin", offset: "UTC+01:00", region: "Europe" },
  { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+09:00", region: "Asia" },
  { value: "Asia/Shanghai", label: "Shanghai", offset: "UTC+08:00", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney", offset: "UTC+11:00", region: "Oceania" },
  { value: "UTC", label: "Coordinated Universal Time", offset: "UTC+00:00", region: "UTC" },
];

// Date Format Options
export const dateFormatOptions = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2025)", region: "US" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2025)", region: "EU" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2025-12-31)", region: "ISO" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY (31.12.2025)", region: "DE" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD (2025/12/31)", region: "JP" },
];

// Time Format Options
export const timeFormatOptions = [
  { value: "12h", label: "12-hour (3:30 PM)" },
  { value: "24h", label: "24-hour (15:30)" },
];

// System Defaults
export const systemDefaults: SystemDefaults = {
  defaultTimezone: "America/Montreal",
  defaultDateFormat: "MM/DD/YYYY",
  defaultTimeFormat: "12h",
  defaultLanguage: "en",
  defaultCurrency: "USD",
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  passwordExpiryDays: 90,
  minPasswordLength: 8,
  requireMfa: false,
  allowSocialLogin: true,
  maintenanceMode: false,
  maintenanceMessage: "The system is currently undergoing scheduled maintenance. Please check back soon.",
  registrationEnabled: true,
  trialPeriodDays: 30,
  maxFileSizeMb: 10,
  allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx"],
  defaultPaginationSize: 25,
  enableNotifications: true,
  enableEmailNotifications: true,
  enableSmsNotifications: true,
  enablePushNotifications: true,
};

// Email Templates
export const emailTemplates: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{platformName}}!",
    description: "Sent to new users upon registration",
    category: "transactional",
    lastModified: "2025-11-15",
    enabled: true,
  },
  {
    id: "password-reset",
    name: "Password Reset",
    subject: "Reset Your Password",
    description: "Sent when user requests password reset",
    category: "transactional",
    lastModified: "2025-11-10",
    enabled: true,
  },
  {
    id: "booking-confirmation",
    name: "Booking Confirmation",
    subject: "Your Booking is Confirmed",
    description: "Sent when a booking is confirmed",
    category: "transactional",
    lastModified: "2025-11-20",
    enabled: true,
  },
  {
    id: "booking-reminder",
    name: "Booking Reminder",
    subject: "Reminder: Your Upcoming Appointment",
    description: "Sent 24 hours before appointment",
    category: "reminder",
    lastModified: "2025-11-18",
    enabled: true,
  },
  {
    id: "payment-receipt",
    name: "Payment Receipt",
    subject: "Payment Receipt - {{invoiceNumber}}",
    description: "Sent after successful payment",
    category: "transactional",
    lastModified: "2025-11-12",
    enabled: true,
  },
  {
    id: "vaccine-reminder",
    name: "Vaccine Reminder",
    subject: "Vaccination Reminder for {{petName}}",
    description: "Sent when pet vaccination is due",
    category: "reminder",
    lastModified: "2025-11-08",
    enabled: true,
  },
  {
    id: "trial-ending",
    name: "Trial Ending Soon",
    subject: "Your Trial Ends in {{daysRemaining}} Days",
    description: "Sent 7 days before trial expiration",
    category: "marketing",
    lastModified: "2025-11-05",
    enabled: true,
  },
  {
    id: "system-maintenance",
    name: "Scheduled Maintenance",
    subject: "Scheduled System Maintenance",
    description: "Sent before planned maintenance",
    category: "system",
    lastModified: "2025-10-25",
    enabled: true,
  },
  {
    id: "monthly-newsletter",
    name: "Monthly Newsletter",
    subject: "Your Monthly Update from {{platformName}}",
    description: "Monthly product updates and tips",
    category: "marketing",
    lastModified: "2025-11-01",
    enabled: false,
  },
];

// Color Presets for Branding
export const colorPresets = [
  { name: "Ocean Blue", primary: "#0ea5e9", secondary: "#06b6d4", accent: "#f59e0b" },
  { name: "Royal Purple", primary: "#8b5cf6", secondary: "#a855f7", accent: "#ec4899" },
  { name: "Forest Green", primary: "#22c55e", secondary: "#10b981", accent: "#f59e0b" },
  { name: "Sunset Orange", primary: "#f97316", secondary: "#fb923c", accent: "#8b5cf6" },
  { name: "Rose Pink", primary: "#ec4899", secondary: "#f472b6", accent: "#06b6d4" },
  { name: "Slate Gray", primary: "#64748b", secondary: "#475569", accent: "#0ea5e9" },
  { name: "Crimson Red", primary: "#ef4444", secondary: "#f87171", accent: "#fbbf24" },
  { name: "Emerald", primary: "#10b981", secondary: "#34d399", accent: "#f59e0b" },
];

