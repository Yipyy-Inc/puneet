import {
  customerSegments,
  emailTemplates,
  campaigns,
  facilityBranding,
  playdateAlertConfig,
  playdateAlertLogs,
  promoCodes,
  referralNotificationTemplates,
} from "@/data/marketing";
import type {
  CustomerSegment,
  EmailTemplate,
  Campaign,
  FacilityBranding,
  PlaydateAlertConfig,
  PlaydateAlertLog,
  MarketingPromoCode,
  ReferralNotificationTemplate,
} from "@/types/marketing";

export const marketingQueries = {
  segments: () => ({
    queryKey: ["marketing", "segments"] as const,
    queryFn: async (): Promise<CustomerSegment[]> => customerSegments,
  }),
  templates: () => ({
    queryKey: ["marketing", "templates"] as const,
    queryFn: async (): Promise<EmailTemplate[]> => emailTemplates,
  }),
  campaigns: () => ({
    queryKey: ["marketing", "campaigns"] as const,
    queryFn: async (): Promise<Campaign[]> => campaigns,
  }),
  branding: () => ({
    queryKey: ["marketing", "branding"] as const,
    queryFn: async (): Promise<FacilityBranding> => facilityBranding,
  }),
  playdateConfig: () => ({
    queryKey: ["marketing", "playdate-config"] as const,
    queryFn: async (): Promise<PlaydateAlertConfig> => playdateAlertConfig,
  }),
  playdateAlertLogs: () => ({
    queryKey: ["marketing", "playdate-logs"] as const,
    queryFn: async (): Promise<PlaydateAlertLog[]> => playdateAlertLogs,
  }),
  promoCodes: () => ({
    queryKey: ["marketing", "promo-codes"] as const,
    queryFn: async (): Promise<MarketingPromoCode[]> => promoCodes,
  }),
  referralTemplates: () => ({
    queryKey: ["marketing", "referral-templates"] as const,
    queryFn: async (): Promise<ReferralNotificationTemplate[]> =>
      referralNotificationTemplates,
  }),
};
