import { z } from "zod";

import { callTags as seedCallTags } from "@/data/calling";
import { MAX_CALL_TAGS } from "@/lib/calling/call-tags";
import {
  callForwardingModeEnum,
  callHandlingEnum,
  callTagSchema,
  dispatchModeEnum,
  ringToneEnum,
} from "@/types/calling";

// ============================================================================
// The phone system's settings, as things a facility owns rather than things a
// browser remembers.
//
// `CallingSettingsPanel` had a `handleSave` that was `setSaved(true)` followed
// by a `setTimeout` clearing it two seconds later. Every control on the screen
// worked, the button said "Saved", and nothing left the component — a reload
// restored `defaultCallingSettings` from the fixture. That included the
// recording switch, the retention period and the missed-call auto-SMS text.
//
// ── FOUR DOMAINS, NOT ONE ROW ─────────────────────────────────────────────
//
// The panel edits four unrelated groups and Save writes all of them. One row
// would mean two staff saving different sections overwrite each other, which is
// the reason `daycare_config` and `boarding_config` are separate rows rather
// than one `modules` blob (see domains.ts). They also differ in stakes:
// `calling_recording` is a legal question in some jurisdictions, and
// `calling_dispatch` is whether a phone rings on a desktop.
//
// ── AND BUSINESS HOURS IS NOT A FIFTH ─────────────────────────────────────
//
// `CallingSettings` carried its own `businessHours`, in its own shape
// (`{open, close, enabled}` against the facility's `{isOpen, openTime,
// closeTime}`), seeded from its own fixture. So a facility had TWO answers to
// "when are you open" — Settings said Sunday 09:00-17:00 and Calling said
// 08:00-18:00 — and the after-hours greeting obeyed the one nobody edited.
//
// There is one `business_hours` domain and the panel now reads it. Being open
// is a fact about the business, not a property of its phone system.
//
// ── NO CREDENTIAL LIVES HERE ──────────────────────────────────────────────
//
// `facility_settings` is readable by every member of the facility with a
// session. The provider credentials are in the deployment environment
// (`platformTwilio()`) and, per facility, Vault behind
// `private.communication_credentials`. Nothing in this file is a secret, and
// nothing added to it may be. See the "deliberately not here" note in
// domains.ts, which already says this about `integrations`.
//
// ── AND NOT TO THE FACILITY'S CUSTOMERS ───────────────────────────────────
//
// `facility_settings_read` also admits `private.client_facility_ids()` — the
// facility's own clients — because the booking modal cannot price a
// cancellation without `business_hours` and `booking_rules`. That grant is
// narrowed by `private.customer_visible_setting_domains()`
// (20260809180000), an explicit ten-name allow-list, and none of these four is
// on it. Verified rather than assumed:
//
//   select private.customer_visible_setting_domains();
//   -- business_hours, booking_rules, tip_config, booking_flow,
//   -- daycare_config, boarding_config, grooming_config, training_config,
//   -- tax_config, loyalty_config
//
// It matters most for `callForwardingNumber`, which a facility may well set to
// a staff member's mobile. The list is opt-in, so a new domain is staff-only
// until somebody names it — but if one of these ever needs to reach a customer,
// adding it there exposes the WHOLE domain, not one field.
// ============================================================================

// ── THE NUMBER ────────────────────────────────────────────────────────────

export const callingNumberPrefsSchema = z.object({
  /**
   * What outbound calls present as the caller ID.
   *
   * A preference, not a provisioned line: `communication_numbers` is where a
   * real number lives, and nothing provisions into it yet. Storing the display
   * value here lets a facility correct what the screen shows without implying
   * Yipyy bought them a number.
   */
  businessNumber: z.string().max(32),
});
export type CallingNumberPrefs = z.infer<typeof callingNumberPrefsSchema>;

/**
 * Empty, because no number is provisioned for anybody.
 *
 * The fixture shipped `+1 (514) 555-0100` with a green "Active" badge beside
 * it, on every facility. That is a Yipyy demo number presented as the
 * customer's own line — a facility could reasonably print it on a van.
 */
export const NO_CALLING_NUMBER: CallingNumberPrefs = { businessNumber: "" };

// ── HOW A CALL REACHES SOMEBODY ───────────────────────────────────────────

export const callingDispatchSchema = z.object({
  dispatchMode: dispatchModeEnum,
  ringTone: ringToneEnum,
  visualFlash: z.boolean(),
  mobileSync: z.boolean(),
  simultaneousCallHandling: callHandlingEnum,
  callForwardingMode: callForwardingModeEnum,
  callForwardingNumber: z.string().max(32),
  ringDurationSeconds: z.number().int().min(5).max(120),
});
export type CallingDispatch = z.infer<typeof callingDispatchSchema>;

/**
 * Ring everything, forward nothing.
 *
 * `ring_all` is the option most likely to get a customer answered, and the one
 * whose failure is visible: a phone that rings in the wrong place is noticed
 * immediately, where a call silently routed to one absent person is not.
 *
 * Forwarding is `disabled` rather than the fixture's `on_no_answer`, because
 * `callForwardingNumber` is empty until somebody types one — forwarding to
 * nowhere is a call that ends rather than a call that rings on.
 */
export const DEFAULT_CALLING_DISPATCH: CallingDispatch = {
  dispatchMode: "ring_all",
  ringTone: "classic",
  visualFlash: true,
  mobileSync: true,
  simultaneousCallHandling: "queue_system",
  callForwardingMode: "disabled",
  callForwardingNumber: "",
  ringDurationSeconds: 30,
};

// ── RECORDING ─────────────────────────────────────────────────────────────

export const callingRecordingSchema = z.object({
  autoRecord: z.boolean(),
  recordingStorage: z.enum(["30_days", "90_days", "unlimited"]),
  complianceNotice: z.boolean(),
  autoTranscription: z.boolean(),
  aiSummaryEnabled: z.boolean(),
});
export type CallingRecording = z.infer<typeof callingRecordingSchema>;

/**
 * Recording OFF. This is the most consequential fallback in the file, and the
 * reason it is written down rather than copied from the fixture.
 *
 * The fixture ships `autoRecord: true`. Carried over as a default, every
 * facility that never opened this screen would begin recording its customers
 * on a choice nobody made. In a one-party jurisdiction that is merely rude; in
 * a two-party one — Quebec, whose 514 area code the demo data uses throughout,
 * along with California, Florida, Illinois and eight other states — recording
 * without the consent of every party is a criminal offence. A default cannot
 * give consent on a facility's behalf.
 *
 * The same rule as `NO_TAX` and `NO_PRICING_RULES`, applied to a liability that
 * is not measured in dollars.
 *
 * `complianceNotice` stays ON, because it only costs an announcement and it is
 * the thing that makes recording lawful in most of those places. If somebody
 * turns recording on, the notice is already there.
 *
 * Transcription and AI summaries are off for a narrower reason: both send the
 * content of a customer's call to a third-party model. That is a decision a
 * facility makes, not one it discovers.
 */
export const NO_CALL_RECORDING: CallingRecording = {
  autoRecord: false,
  recordingStorage: "30_days",
  complianceNotice: true,
  autoTranscription: false,
  aiSummaryEnabled: false,
};

// ── WHAT HAPPENS AFTER A MISSED CALL ──────────────────────────────────────

export const callingFollowUpSchema = z.object({
  missedCallAutoSMS: z.boolean(),
  missedCallSMSTemplate: z.string().max(1600),
});
export type CallingFollowUp = z.infer<typeof callingFollowUpSchema>;

/**
 * No automatic SMS.
 *
 * The fixture has it on with a template naming the demo number. Adopting that
 * as a default would start texting real customers, from a number the facility
 * does not own, saying something nobody at the facility wrote.
 *
 * The template is still seeded so the editor is not empty when somebody turns
 * it on — but with a placeholder where the number was, rather than a number
 * that reaches Yipyy.
 */
export const NO_CALL_FOLLOW_UP: CallingFollowUp = {
  missedCallAutoSMS: false,
  missedCallSMSTemplate:
    "Hi {{name}}, sorry we missed your call! How can we help? Reply here and we'll get back to you.",
};

// ── THE FACILITY'S OWN CALL TAGS ──────────────────────────────────────────

/**
 * A separate domain from `calling_follow_up`, and the roadmap said otherwise.
 *
 * The reason is how they are EDITED. Every other control on the settings panel
 * is staged in a draft and written by one Save button; the tag list saves the
 * moment somebody adds, renames or deletes a row, because that is what an
 * editable list is. Sharing a row would mean a rename racing a Save — one of
 * them writing the whole object from a draft that predates the other.
 *
 * The same reasoning that keeps `daycare_config` and `boarding_config` apart.
 */
export const callingTagsSchema = z
  .array(callTagSchema)
  .max(MAX_CALL_TAGS)
  .superRefine((tags, ctx) => {
    // Ids address a tag from `callLog.tags`, so a duplicate makes an existing
    // call point at two different things.
    const seen = new Set<string>();
    for (const tag of tags) {
      if (seen.has(tag.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate tag id: ${tag.id}`,
        });
      }
      seen.add(tag.id);
    }
  });
export type CallingTags = z.infer<typeof callingTagsSchema>;

/**
 * The eight tags the fixture ships, as the documented starting vocabulary.
 *
 * NOT the NO_TAX treatment, and the difference is worth stating: an empty list
 * costs a facility the ability to categorise a call until somebody invents a
 * taxonomy, and a wrong tag charges nobody and breaks no law. The starting set
 * is a convenience with no downside, which is exactly when copying the fixture
 * is the right answer — see DEFAULT_HOURS in domains.ts, which does the same.
 */
export const DEFAULT_CALL_TAGS: CallingTags = seedCallTags;
