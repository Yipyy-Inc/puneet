// ============================================================================
// ReputationTemplate — JSON object storage model.
// ----------------------------------------------------------------------------
// Serializes a facility's outreach configuration into ONE entity that nests
// every touchpoint and all of its language variations. The automation loop and
// the message builder read content variations from here with a single lookup
// keyed by facility → touchpoint → locale, instead of walking the live config.
// ============================================================================

import type {
  ReputationSettings,
  ReputationTemplate,
  ReputationTemplateTouchpoint,
} from "@/types/reputation";

export function touchpointKey(index: number): string {
  return index === 0 ? "initial" : `followup-${index}`;
}

export function touchpointLabel(index: number): string {
  return index === 0 ? "Initial Outreach Request" : `Follow-Up Reminder ${index}`;
}

/** Compile live settings into the stored ReputationTemplate JSON object. */
export function buildReputationTemplate(
  facilityId: number,
  settings: ReputationSettings,
  updatedAt = "",
): ReputationTemplate {
  const locales =
    settings.localization?.locales && settings.localization.locales.length > 0
      ? settings.localization.locales
      : ["en"];
  const defaultLocale = locales[0];
  const steps = settings.outreachSequence ?? [];

  const touchpoints: ReputationTemplateTouchpoint[] = steps.map((step, i) => {
    const content: ReputationTemplateTouchpoint["content"] = {
      // Base fields are the default-language variation.
      [defaultLocale]: {
        smsBody: step.smsBody,
        emailSubject: step.emailSubject,
        emailBody: step.emailBody,
      },
    };
    for (const [locale, c] of Object.entries(step.localized ?? {})) {
      content[locale] = {
        smsBody: c.smsBody,
        emailSubject: c.emailSubject,
        emailBody: c.emailBody,
      };
    }
    return {
      id: step.id,
      key: touchpointKey(i),
      label: touchpointLabel(i),
      channel: step.channel,
      delayMinutes: step.delayMinutes,
      onlyIfNoResponse: step.onlyIfNoResponse,
      content,
    };
  });

  return {
    templateId: `tmpl-${facilityId}`,
    facilityId,
    defaultLocale,
    locales,
    updatedAt,
    touchpoints,
  };
}

/** Fast content lookup: touchpoint × locale, with per-field fallback to default. */
export function resolveTemplateContent(
  template: ReputationTemplate,
  touchpointId: string,
  locale?: string,
): { smsBody?: string; emailSubject?: string; emailBody?: string } {
  const tp = template.touchpoints.find((t) => t.id === touchpointId);
  if (!tp) return {};
  const base = tp.content[template.defaultLocale] ?? {};
  const loc = locale ? tp.content[locale] : undefined;
  return {
    smsBody: loc?.smsBody ?? base.smsBody,
    emailSubject: loc?.emailSubject ?? base.emailSubject,
    emailBody: loc?.emailBody ?? base.emailBody,
  };
}
