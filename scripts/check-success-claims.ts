/**
 * ============================================================================
 * A screen may not claim something happened unless something happened.
 *
 *   bun run check:success-claims
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * facility-onboarding-wizard.tsx shipped this, and it reached production:
 *
 *   const handleCreate = () => {
 *     setCreated(true);
 *     toast.success("Facility created — welcome email sent to the primary admin.");
 *   };
 *
 * No request. No facility, no email, and a superadmin sent to a list with
 * nothing new in it, waiting for an invitation that could never arrive. The
 * success screen behind it repeated the claim in prose.
 *
 * A mock that renders plausibly is worse than one that renders "TODO", because
 * only the second kind gets fixed. This is the cheapest possible check for the
 * shape: a file that tells the user an action SUCCEEDED, while containing
 * nothing that could perform it.
 *
 * ── IT IS A HEURISTIC, AND IT HAS AN ESCAPE HATCH ─────────────────────────
 *
 * Plenty of components legitimately report an outcome they were HANDED — a
 * success screen taking `invite` as a prop makes no request and should not.
 * Those mark the line `// success-claim-ok: <reason>`, the same shape as
 * `rls-write-ok:` and `facility-from-request-ok:` elsewhere.
 *
 * The point is not to forbid the sentence. It is to make someone say why it is
 * true.
 * ============================================================================
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ALLOW = /success-claim-ok:/;

/**
 * Screens that already made an empty claim when this gate was written. This is
 * a mock-driven prototype, so most are features with no backend yet — the SMS
 * that is never sent, the campaign that is never created.
 *
 * Baselined by FILE, not by line: a line number is invalidated by any edit
 * above it, and a baseline that churns is one nobody trusts.
 *
 * SHRINKING LIST. Delete an entry when the file is wired to something real, or
 * when its copy stops claiming. DO NOT ADD for new code — a stale entry fails
 * too, so the set cannot quietly re-permit a file that was fixed.
 *
 * ── THE ONE EXCEPTION, ADDED DELIBERATELY ────────────────────────────────
 *
 * "Do not add" cannot hold when the DETECTOR widens, or no detector could ever
 * widen: every existing offence it newly sees would fail the build at once.
 * So an entry may be added when, and only when, it is a file the rule did not
 * previously look at — and the group below says which change revealed it.
 *
 * Nothing here was newly written. Everything here was already claiming, and
 * already lying, before the regex learned to see it.
 */
// IncidentReportingSettings.tsx left with them, same day, same reason: its
// policy is in the `incident_reporting` domain now instead of localStorage.
//
// EstimateWizard.tsx and DepositRulesSettings.tsx left on 2026-09-05, by being
// wired rather than by being reworded. Deposit terms moved out of localStorage
// into the `deposit_rules` settings domain; both of these now save through it,
// so their toasts describe something that happened.
const BASELINE = new Set<string>([
  "src/app/dashboard/facilities/requests/_components/facility-requests-client.tsx",
  "src/app/dashboard/support/email-templates/_components/template-panel.tsx",
  "src/components/bookings/UnfinishedBookingsTable.tsx",
  "src/components/dashboard/facilities/AddStaffAccountModal.tsx",
  "src/components/dashboard/facilities/StaffTab.tsx",
  // CustomEmailDomainSettings.tsx left this list on 2026-09-05. It was the
  // clearest case the baseline held: a setTimeout that announced "Domain
  // Verified! Your custom email domain is now active" two seconds after a click
  // that did nothing, over DNS records naming a competitor's mail
  // infrastructure. The flow is gone and the screen now says it is not
  // available yet, which is true.
  "src/components/facility/FacilityRolesStudio.tsx",
  "src/components/facility/ImpersonationBanner.tsx",

  // ── REVEALED BY MATCHING BOTH WORD ORDERS ──────────────────────────────
  //
  // The regex matched "successfully created" and not "created successfully".
  // These ten files were always claiming; they were never looked at. The
  // billing screen's three — a payment, a gift card and a credit, all over
  // console.log — were fixed rather than baselined, because they were money.
  //
  // Each of these is a real claim over a file with nothing that performs it.
  // They are recorded, not excused.
  "src/components/grooming/GroomingIntakeForm.tsx",
  // YipyyGoSettings.tsx left on 2026-09-06, by being fixed. Its "Express
  // Check-in settings saved successfully" sat over `saveYipyyGoConfig()`,
  // which spliced a module-level array. The setup is a `facility_settings`
  // domain now and the toast follows a real mutation's onSuccess.

  // ── TEN LEFT ON 2026-09-05, AND NOT BY BEING FIXED ─────────────────────
  //
  // They were never offences. The gate could only read one file, so a screen
  // whose write lives in an imported hook — useSettings(), a query factory in
  // src/lib/api — looked identical to one that writes nowhere. Following an
  // import one level answered it: the boarding and daycare settings pages go
  // through use-settings.tsx and its .mutateAsync; PaymentMethodsTab through
  // src/lib/api/current-customer.ts. Real writes, recorded here as lies for as
  // long as this list has existed.
  //
  // That is the more useful half of this change. A baseline is read by people,
  // and false entries are what make one unreadable — which is exactly where a
  // real lie goes unnoticed.

  // ── REVEALED BY DROPPING THE ADVERB ────────────────────────────────────
  //
  // 110 files, and none of them is new. The rule wanted "successfully saved";
  // this product writes `"Kofi" updated`. Every screen below tells somebody an
  // action completed while containing — and importing — nothing that could
  // have completed it.
  //
  // The one that found it: training-disciplines-manager.tsx, whose Add / Edit
  // / Delete all end at queryClient.setQueryData. There is no
  // training_disciplines table and no route under src/app/api/training/, so a
  // discipline added here survives until the tab is reloaded and no further.
  // Its two neighbours in that folder are the same.
  //
  // Recorded, not excused. Every line below is a screen that lies today.
  "src/app/customer/bookings/_components/PastBookingCard.tsx",
  "src/app/dashboard/_components/needs-attention.tsx",
  "src/app/dashboard/commercial/credits/_components/apply-discount-modal.tsx",
  "src/app/dashboard/commercial/dunning/_components/dunning-client.tsx",
  "src/app/dashboard/commercial/invoices/_components/platform-invoices-client.tsx",
  "src/app/dashboard/commercial/trials/_components/trials-client.tsx",
  "src/app/dashboard/reports/custom/_components/report-builder.tsx",
  "src/app/dashboard/reports/custom/_components/saved-reports-list.tsx",
  "src/app/dashboard/support/agreements/_components/AgreementTemplateEditor.tsx",
  "src/app/dashboard/support/agreements/_components/SentAgreementsTab.tsx",
  "src/app/dashboard/support/announcements/_components/announcements-list-client.tsx",
  "src/app/dashboard/support/calling/_components/greeting-edit-modal.tsx",
  "src/app/dashboard/support/calling/_components/ivr-routing-tab.tsx",
  "src/app/dashboard/support/chat/_components/support-conversation-row.tsx",
  "src/app/dashboard/support/chat/scheduled/_components/edit-scheduled-modal.tsx",
  "src/app/dashboard/support/chat/scheduled/_components/scheduled-messages-client.tsx",
  "src/app/dashboard/support/email-templates/_components/saved-replies-manager.tsx",
  "src/app/dashboard/support/knowledge-base/_components/category-manager-dialog.tsx",
  "src/app/dashboard/support/knowledge-base/_components/knowledge-base-client.tsx",
  "src/app/dashboard/support/tickets/[id]/_components/ticket-sidebar.tsx",
  "src/app/dashboard/support/tickets/_components/assign-cell.tsx",
  "src/app/dashboard/system-admin/system-config/integrations/[id]/_components/update-credentials-dialog.tsx",
  "src/app/employee/(shell)/tasks/my-tasks-view.tsx",
  "src/app/facility/account/payment-method/_components/payment-method-view.tsx",
  "src/app/facility/dashboard/inventory/InventoryClient.tsx",
  "src/app/facility/dashboard/services/training/students/_components/homework-board.tsx",
  "src/app/facility/dashboard/services/training/students/_components/training-profile-homework.tsx",
  "src/app/facility/dashboard/staff/_components/custom-role-quick-create-dialog.tsx",
  "src/app/facility/dashboard/staff/_components/staff-availability-tab.tsx",
  "src/app/facility/documents/_components/facility-documents-client.tsx",
  "src/app/facility/services/memberships/_components/plans/PlanBuilderDialog.tsx",
  "src/app/facility/services/memberships/_components/subscribers/CancelSubscriptionDialog.tsx",
  "src/app/facility/settings/billing/_components/billing-self-service-view.tsx",
  "src/components/analytics/CustomReportsManager.tsx",
  "src/components/bookings/AbandonmentRecoverySettings.tsx",
  "src/components/bookings/MedicationSection.tsx",
  "src/components/bookings/UnfinishedBookingDetailSheet.tsx",
  "src/components/camera-integration/CameraIntegrationSettings.tsx",
  "src/components/custom-services/wizard/steps/YipyyGoConfigStep.tsx",
  "src/components/customer/MessageAttachmentUpload.tsx",
  "src/components/daily-care/ShiftNotes.tsx",
  "src/components/dashboard/facilities/AgreementsTab.tsx",
  "src/components/dashboard/facilities/BillingTab.tsx",
  "src/components/dashboard/facilities/LocationsTab.tsx",
  "src/components/estimates/EstimateFollowUpSettings.tsx",
  // TagNotesSettings.tsx left on 2026-09-06, and it is the clearest example of
  // this gate being a HEURISTIC rather than a proof. Its note policy moved to
  // the `tag_note_settings` domain, so the file now imports
  // `useSaveFacilitySetting` — and a `useMutation` one import away is all this
  // check looks for. The tag builder in the same file still edits `useState`.
  //
  // It is not left in the baseline because a stale entry fails too, and the
  // file genuinely does perform a save now. What stops the green from hiding
  // the rest is the copy: those toasts carry "the tag list is not stored yet,
  // so it resets when this page reloads", which is true and is the thing a
  // person actually reads.
  "src/components/facility/CareTaskSettings.tsx",
  "src/components/facility/DepartmentSettings.tsx",
  "src/components/facility/RouteView.tsx",
  "src/components/facility/TrainingSection.tsx",
  "src/components/facility/add-ons/AddOnCategorySheet.tsx",
  "src/components/facility/boarding/feeding-round-settings.tsx",
  "src/components/facility/training/homework-edit-dialog.tsx",
  "src/components/forms/FormNotificationSettings.tsx",
  "src/components/grooming/PriceAdjustmentForm.tsx",
  "src/components/messaging/CampaignsView.tsx",
  "src/components/messaging/ClientContextPanel.tsx",
  "src/components/messaging/InternalNotesTab.tsx",
  "src/components/messaging/MessagingSettingsView.tsx",
  "src/components/messaging/ScheduledMessagesView.tsx",
  "src/components/retail/InvoiceLineItemsTable.tsx",
  "src/components/rooms/DaycareAreasClient.tsx",
  "src/components/scheduling/PostShiftOpportunityDialog.tsx",
  "src/components/scheduling/SaveAsTemplateDialog.tsx",
  "src/components/scheduling/ShiftOpportunityBoard.tsx",
  "src/components/scheduling/ShiftOpportunityNotificationSettingsDialog.tsx",
  "src/components/security-compliance/compliance/retention-edit-drawer.tsx",
  "src/components/smart-insights/MaxPetsPerStaffCard.tsx",
  "src/components/system-admin/DataManagement.tsx",
  "src/components/system-admin/data-management/backup-schedule-card.tsx",
  "src/components/system-health/notification-recipients-card.tsx",
  "src/components/yipyygo/YipyyGoStaffReviewModal.tsx",
  "src/lib/express-checkin-reminder.tsx",

  // ── BACK ON 2026-09-10, BECAUSE IT NEVER SHOULD HAVE LEFT ───────────────
  //
  // Removed on 2026-09-09 when the gate reported it "no longer claims". It
  // still did. `toast.success("Task added")` had become
  // `toast.success(t("taskAdded"))`, and this gate resolved keys against the
  // settings and shell catalogues only — not `staff.areas`, where the staff
  // area had just been converted. So the claim went invisible, the ratchet
  // asked for its entry back, and it was given. Nothing had been fixed:
  // `addOnboardingTask()` still writes to an in-memory Map in
  // `src/data/staff-onboarding.ts`, and the task is gone on reload.
  //
  // The key resolver reads `staff.areas` and `customerPages.areas` now. This
  // is the detector-widened exception above, and the widening that revealed it
  // is named here. (The file's second claim, "Note saved", sits in `NotesTab`,
  // which nothing imports — dead code, recorded in the debt map.)
  "src/app/facility/dashboard/staff/[id]/staff-profile-tabs.tsx",

  // ── REVEALED ON 2026-09-12, BY THE THREE RULES ADDED THAT DAY ──────────
  //
  // Step 3 of the booking audit removed some forty lies from the booking
  // page, the calendar and the grooming board, and every one had passed this
  // gate (see the note above CLAIM_BARE for the three shapes). Widening it to
  // those shapes found these twenty-six, and none is new code. A sample of
  // what they say: "Offer sent to {owner}" over a make-up that is not stored;
  // "Receipt sent via email" as an alert over nothing; "{n} clients notified
  // of new times" from a route planner that notifies nobody; "Onboarding email
  // sent to {email}" over notifyStaffLifecycle(), which records a MOCK email;
  // an estimate the customer "accepted" with a toast and no request.
  //
  // BreedManagement.tsx is here for the claim-before-the-answer rule, and the
  // answer would not help it: both of its mutations call a module-level store
  // (breedMutations in src/lib/api/breeds.ts), so there is no server to wait
  // for. That is the gap this gate still has — a mutation whose mutationFn
  // reaches no server reads as a real write. Recorded in the debt map.
  //
  // Recorded, not excused. Step 3's remaining work removes the training,
  // grooming and guest-journal entries as it converts those screens.
  "src/app/customer/bookings/[id]/page.tsx",
  "src/app/customer/settings/_components/LoginSecurityCard.tsx",
  "src/app/customer/training/_components/customer-homework-tab.tsx",
  "src/app/customer/training/page.tsx",
  "src/app/dashboard/facilities/page.tsx",
  "src/app/dashboard/support/calling/_components/call-log-detail.tsx",
  "src/app/employee/(shell)/schedule/staff-schedule-view.tsx",
  "src/app/facility/dashboard/services/retail/page.tsx",
  "src/app/facility/dashboard/services/training/makeup/page.tsx",
  "src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx",
  "src/app/facility/dashboard/staff/_components/write-ups-tab.tsx",
  "src/app/facility/dashboard/tasks/CareTasks.tsx",
  "src/components/admin/ModuleRequestsInbox.tsx",
  "src/components/dashboard/facilities/OverviewTab.tsx",
  "src/components/employee/RegisterCloseReminder.tsx",
  "src/components/facility/BreedManagement.tsx",
  "src/components/grooming/GroomingCheckInButton.tsx",
  "src/components/guest-journal/ReservationJournalPanel.tsx",
  "src/components/support/support-chat-tab.tsx",
  "src/components/system-admin/data-management/restore-approval-modal.tsx",
]);

/**
 * Past-tense claims that an action COMPLETED. Deliberately narrow: "Save" and
 * "Send invitation" are labels for something about to happen and are not
 * claims. "has been sent" is.
 *
 * ── BOTH WORD ORDERS, BECAUSE ONE HAS ALREADY ESCAPED TWICE ──────────────
 *
 * This matched "successfully created" and not "created successfully". The
 * user-creation form that wrote nobody got through on exactly that — see the
 * note in facility-access-level.spec.ts, which says the gate "missed it only
 * because the words happened to be in the wrong order for the regex".
 *
 * It happened again: /facility/dashboard/billing alerted "Payment of $X
 * processed successfully!", "Gift card … issued successfully!" and "Credit of
 * $X added successfully!" over three handlers that only console.log. Same
 * blind spot, on money, on a screen in the nav. (That screen has since been
 * removed entirely — it was a fixture twin of three real ones — so the file
 * this paragraph names is gone. The blind spot it proves is not.)
 *
 * So the verb may come first or second, and `processed`, `issued`, `added`,
 * `charged` and `refunded` join the list — the words this product uses about
 * money.
 */
const CLAIM =
  /(?:toast\.success\s*\(|alert\s*\(|>\s*|["'`])[^"'`\n]*\b(?:has been sent|have been sent|was sent|email sent|invitation sent|successfully (?:created|sent|saved|updated|deleted|processed|issued|added|charged|refunded)|(?:created|sent|saved|updated|deleted|processed|issued|added|charged|refunded) successfully|created\s+—|created\s+-\s)/i;

/**
 * ── AND THE THIRD ESCAPE: NO ADVERB AT ALL ────────────────────────────────
 *
 * The rule above demands the word "successfully", or "sent", or "created —".
 * Almost nothing in this product is phrased that way. What it actually writes
 * is the bare past participle:
 *
 *   toast.success(`"${form.name.trim()}" updated`);
 *
 * That is training-disciplines-manager.tsx, and its three toasts — updated,
 * added, deleted — sit over pushDisciplines(), which calls
 * queryClient.setQueryData and NOTHING else. There is no training_disciplines
 * table, no route under src/app/api/training/, and trainingQueries returns the
 * src/data fixture. Add a discipline, read the green toast, reload, and it is
 * gone. Two neighbouring screens have the identical shape.
 *
 * The gate was green on all three, for the same reason it was green twice
 * before: the words were in a shape the regex did not know. So it is no longer
 * the adverb that makes a claim a claim — a toast.success carrying a completed
 * verb is one, however it is worded.
 */
const CLAIM_BARE =
  /toast(?:\.(?:success|info|message))?\s*\([^)]*\b(?:created|sent|saved|updated|deleted|processed|issued|added|charged|refunded|removed|archived|cancelled|canceled|scheduled|rescheduled|assigned|applied|published|restored|duplicated|renamed|moved|checked in|checked out|confirmed|completed|logged|recorded|pinned|unpinned|synced|connected|verified|enrolled|booked|paid|closed|approved|declined|redeemed|notified|queued)\b/i;

/**
 * ── AND SINCE 2026-09-12, THE THREE SHAPES STEP 3 OF THE BOOKING AUDIT FOUND ─
 *
 * Every lie removed from the booking page, the operations calendar and the
 * grooming board that week had passed this gate. Three shapes, in order of
 * how many they hid:
 *
 * 1. A FILE THAT WRITES ANYTHING WAS EXEMPT FROM EVERYTHING. The grooming
 *    check-in board saves statuses, so its "SMS sent to {owner}" was never
 *    read; the calendar drawer saved notes, so "Reminder sent" over an
 *    in-memory array was never read. A status write proves nothing about a
 *    message. So a claim that something was SENT — a text, an email, a
 *    receipt, a reminder, an offer, "notified", "will be notified" — needs
 *    something that SENDS, in the file or one import away, whatever else the
 *    file writes.
 *
 * 2. THE CLAIM BEFORE THE ANSWER. `mutate(x); toast.success("Saved")` says
 *    saved before the server has said anything, and a refusal then shows
 *    success and error together. The toast belongs in onSuccess. Only the
 *    very next statement is read, because that is the shape that shipped and
 *    anything wider started reading other handlers' toasts.
 *
 * 3. VERBS THE LIST DID NOT HAVE. "rescheduled" is not "scheduled" at a word
 *    boundary; "checked in", "confirmed", "logged", "pinned", "synced",
 *    "notified" were not there at all; and toast.info / toast() make the same
 *    claim as toast.success in a different colour.
 */
const SEND_CLAIM =
  /\b(?:(?:sms|text|email|e-mail|receipt|reminder|message|notification|invoice|link|confirmation|offer|invite|invitation)s?\s+(?:sent|queued|delivered|emailed|texted)\b|notified\b|(?:emailed|texted)\s+to\b|will be (?:notified|emailed|texted)\b|will receive (?:an? )?(?:sms|text|email))/i;

/**
 * Page text is held to less. A toast is said at the moment of an action, so
 * "notified" there is a claim about that action; on a page it is as often a
 * record's state ("Manager notified" beside an incident) or a preference ("Get
 * notified of new logins"). So in JSX text only a promise or a completion
 * counts: "will be notified", "have been notified", "Notification sent!".
 */
const SEND_CLAIM_TEXT =
  /\b(?:will be (?:notified|emailed|texted)|(?:has|have) been (?:notified|sent|emailed|texted)|(?:is|are) notified by|will receive (?:an? )?(?:sms|text|email)|sent!)/i;

/** Something that can actually send a message. */
const SENDS =
  /\/api\/[^"'`\s]*(?:message|send|notif|remind|invit|pay-link|receipt|resend|sms|email|signing)|\b(?:sendEmail|sendSms|sendMessage|useMessageClient|use\w*(?:Send|Resend|Invite|Notify|Remind)\w*)\b/i;

/** Anything that could actually perform the action being claimed. */
const PERFORMS =
  /\bfetch\s*\(|useMutation|\.mutate\b|\.mutateAsync\b|\.rpc\s*\(|supabase\.|"use server"|createServerClient/;

/**
 * ── AND IT FOLLOWS ONE IMPORT, BECAUSE A HOOK IS WHERE WRITES LIVE ────────
 *
 * The file-local test above was wrong in the other direction, and the baseline
 * was carrying the evidence. A screen that calls `const { save } = useThing()`
 * and toasts the result contains no fetch, no useMutation and no supabase — so
 * the gate called it a liar. ELEVEN of the entries baselined below were that:
 * real writes, one import away, recorded as offences because the regex could
 * only see one file at a time.
 *
 * That mattered more than the tidiness. False positives are what make a
 * baseline unreadable, and an unreadable baseline is where a real lie hides.
 *
 * One level, not two. Depth 2 removes another sixteen files and starts
 * following a component's own children, which is no longer "where does this
 * screen write" but "does anything downstream write at all" — a question that
 * is true almost everywhere and therefore worth nothing.
 */
/**
 * ── AND SINCE 2026-09-07, IT RESOLVES A TRANSLATION KEY ───────────────────
 *
 * The French conversion moved every settings toast from a literal to a
 * catalogue lookup:
 *
 *   toast.success("Care task feedback options saved");   // seen
 *   toast.success(t("feedbackSaved"));                   // the same claim
 *
 * The second one matches neither regex above. `CLAIM_BARE` wants `saved` at a
 * word boundary and `feedbackSaved` has none, so the claim went invisible the
 * moment its words moved into messages/en.json — and this gate reported the
 * file as FIXED. It was not fixed. It was translated.
 *
 * That is not one file. Every settings section converted so far took its
 * toasts through `t()`, and the ones still counted are counted by accident,
 * because their key happens to BE a bare verb (`t("saved")` contains `saved`).
 * Left alone this gate would have quietly emptied itself as the conversion
 * finished, and read as an improvement while doing it.
 *
 * So a `t("key")` argument is replaced with the ENGLISH string it resolves to
 * before the line is tested. The key is looked up across every settings section
 * and every shell group rather than against the one section this file belongs
 * to: a file's section is not knowable from the file alone, and a key that
 * names a claim in ANY catalogue is worth reading as one here.
 */
const CATALOGUE_STRINGS: Map<string, string> = (() => {
  const out = new Map<string, string>();
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
    settings?: { sections?: Record<string, Record<string, string>> };
    shell?: Record<string, Record<string, string>>;
    staff?: { areas?: Record<string, Record<string, string>> };
    customerPages?: { areas?: Record<string, Record<string, string>> };
  };
  const add = (key: string, value: unknown) => {
    if (typeof value !== "string") return;
    // Two catalogues can hold the same key. First-writer-wins would be the
    // wrong tie-break: a key that is a claim ANYWHERE should read as one, so
    // the longer string is kept — the sentence rather than the label.
    const seen = out.get(key);
    if (seen === undefined || value.length > seen.length) out.set(key, value);
  };
  for (const section of Object.values(en.settings?.sections ?? {}))
    for (const [key, value] of Object.entries(section)) add(key, value);
  for (const group of Object.values(en.shell ?? {}))
    for (const [key, value] of Object.entries(group)) add(key, value);
  // ── AND THE TWO AREA CATALOGUES, SINCE 2026-09-10 ──────────────────────
  //
  // The paragraph above says this gate would "quietly empty itself as the
  // conversion finished". It was doing exactly that, one catalogue over: the
  // staff area converted into `staff.areas` on 2026-09-09 and the customer
  // portal into `customerPages.areas` on 2026-09-10, and neither was read
  // here. The customer bookings page still fakes "Receipt sent to your email."
  // behind a TODO — and the moment that sentence moved into the catalogue, this
  // gate reported the file as fixed and asked for its baseline entry back.
  for (const area of Object.values(en.staff?.areas ?? {}))
    for (const [key, value] of Object.entries(area)) add(key, value);
  for (const area of Object.values(en.customerPages?.areas ?? {}))
    for (const [key, value] of Object.entries(area)) add(key, value);
  return out;
})();

/**
 * `t("someKey")` → `"the English sentence"`, so the regexes can read it.
 *
 * `fill("someKey", { … })` too — the staff and customer hooks put a value
 * into a sentence that way, and "Thank you! {amount} sent to the team." is as
 * much a claim with its value filled in as without. Only the KEY is replaced;
 * the values object after it is left alone.
 */
const TRANSLATE_CALL =
  /\b(?:t|text|tr)\s*\(\s*"([A-Za-z][\w.]*)"\s*\)|\bfill\s*\(\s*"([A-Za-z][\w.]*)"\s*,/g;
function resolveKeys(line: string): string {
  return line.replace(
    TRANSLATE_CALL,
    (whole, tKey: string | undefined, fillKey: string | undefined) => {
      const key = tKey ?? fillKey ?? "";
      const english = CATALOGUE_STRINGS.get(key);
      if (english === undefined) return whole;
      // A fill() keeps its trailing comma, so the call still parses as one.
      return fillKey ? `${JSON.stringify(english)},` : JSON.stringify(english);
    },
  );
}

const SOURCE_CACHE = new Map<string, string>();
function sourceOf(file: string): string {
  const hit = SOURCE_CACHE.get(file);
  if (hit !== undefined) return hit;
  const stripped = readFileSync(file, "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    (block) => block.replace(/[^\n]/g, " "),
  );
  SOURCE_CACHE.set(file, stripped);
  return stripped;
}

/** Resolve an `@/` or relative import to a file on disk, or null. */
function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) {
    const abs = resolve(dirname(from), spec).split(sep).join("/");
    const at = abs.indexOf("/src/");
    if (at === -1) return null;
    base = abs.slice(at + 1);
  } else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

const SENDS_MEMO = new Map<string, boolean>();
function sends(file: string, depth = 1): boolean {
  const key = `${file}:${depth}`;
  const hit = SENDS_MEMO.get(key);
  if (hit !== undefined) return hit;
  SENDS_MEMO.set(key, false);
  const source = sourceOf(file);
  let answer = SENDS.test(source);
  if (!answer && depth > 0) {
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const target = resolveImport(file, match[1]);
      if (target && sends(target, depth - 1)) {
        answer = true;
        break;
      }
    }
  }
  SENDS_MEMO.set(key, answer);
  return answer;
}

/** Index of the paren closing the one at `open`, skipping string contents. */
function matchParen(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i;
  }
  return -1;
}

const lineAt = (source: string, index: number) =>
  source.slice(0, index).split("\n").length;

const PERFORMS_MEMO = new Map<string, boolean>();
function performs(file: string, depth = 1): boolean {
  const key = `${file}:${depth}`;
  const hit = PERFORMS_MEMO.get(key);
  if (hit !== undefined) return hit;
  PERFORMS_MEMO.set(key, false); // cycle guard — a re-entry answers "not yet"
  const source = sourceOf(file);
  let answer = PERFORMS.test(source);
  if (!answer && depth > 0) {
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const target = resolveImport(file, match[1]);
      if (target && performs(target, depth - 1)) {
        answer = true;
        break;
      }
    }
  }
  PERFORMS_MEMO.set(key, answer);
  return answer;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(path, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(path.replace(/\\/g, "/"));
    }
  }
  return out;
}

type Rule = "performs" | "sends" | "answer";
type Offence = { file: string; line: number; text: string; rule: Rule };

const offences: Offence[] = [];

for (const file of walk("src")) {
  // Block comments come out FIRST, with their line count preserved so the
  // numbers below still point at the right place. The per-line `//` and `*`
  // skips beneath handle single-line prose, but not a JSX `{/* … */}` whose
  // continuation lines start with ordinary words — and a note explaining a
  // removed claim is written in exactly that shape. check-settings-fixture and
  // check-derived-location both strip for the same reason: prose about the bug
  // must not read as the bug.
  const source = sourceOf(file);
  const lines = source.split("\n");
  // The escape hatch is read from the file as WRITTEN: inside JSX it can only
  // be a {/* block comment */}, which sourceOf() has already blanked.
  const written = readFileSync(file, "utf8").split("\n");
  const allowed = (line: number) =>
    ALLOW.test(written[line - 1] ?? "") || ALLOW.test(written[line - 2] ?? "");
  const seen = new Set<string>();
  const report = (line: number, rule: Rule) => {
    if (allowed(line) || seen.has(`${line}:${rule}`)) return;
    const text = (lines[line - 1] ?? "").trim();
    if (text.startsWith("//") || text.startsWith("*")) return;
    seen.add(`${line}:${rule}`);
    offences.push({ file, line, text: text.slice(0, 110), rule });
  };

  // A file that can perform the action is not making an empty claim. This is
  // per-FILE rather than per-line on purpose: proving the claim belongs to the
  // request would need real dataflow analysis, and the cheap version already
  // catches the shape that shipped.
  if (!performs(file)) {
    lines.forEach((line, index) => {
      // The line as a READER sees it: a translation key resolved to its
      // English words, so a claim does not escape by being translated.
      const readable = resolveKeys(line);
      if (CLAIM.test(readable) || CLAIM_BARE.test(readable)) {
        report(index + 1, "performs");
      }
    });
  }

  // A message claimed is a message sent — whatever else the file writes.
  // Read where a reader meets it: a toast or an alert, and JSX text.
  if (!sends(file)) {
    for (const call of source.matchAll(/\b(?:toast(?:\.\w+)?|alert)\s*\(/g)) {
      const open = (call.index ?? 0) + call[0].length - 1;
      const close = matchParen(source, open);
      const args = source.slice(open, close < 0 ? open + 400 : close + 1);
      const raw = args.search(SEND_CLAIM);
      if (raw >= 0) report(lineAt(source, open + raw), "sends");
      else if (SEND_CLAIM.test(resolveKeys(args)))
        report(lineAt(source, open), "sends");
    }
    // Line comments blanked first, so a note in an expression is not text.
    const markup = source.replace(/\/\/[^\n]*/g, (c) => " ".repeat(c.length));
    for (const text of markup.matchAll(/(?<![=-])>([^<>{}`"']+)</g)) {
      const at = text[1].search(SEND_CLAIM_TEXT);
      // "Nothing has been sent from here" is the opposite of a claim.
      const denied = /\b(?:nothing|not|never|no)\b[^.!?]*$/i.test(
        text[1].slice(0, Math.max(at, 0)),
      );
      if (at >= 0 && !denied)
        report(lineAt(source, (text.index ?? 0) + 1 + at), "sends");
    }
  }

  // The claim before the answer: a toast as the very next statement after a
  // mutate() that nothing waits for.
  for (const call of source.matchAll(/\.mutate\s*\(/g)) {
    const open = (call.index ?? 0) + call[0].length - 1;
    const close = matchParen(source, open);
    if (close < 0) continue;
    const next = source
      .slice(close + 1, close + 200)
      .match(/^\s*;?\s*toast(?:\.(?:success|info|message))?\s*\(/);
    if (next) {
      report(lineAt(source, close + 1 + next[0].indexOf("toast")), "answer");
    }
  }
}

const WHY: Record<Rule, string> = {
  performs:
    "claims an action succeeded, but this file contains nothing that performs one.",
  sends:
    "claims a message was sent, but nothing in this file or one import away can send one.",
  answer:
    "claims success before the write has answered — move the toast into onSuccess.",
};

const offending = new Set(offences.map((o) => o.file));
const introduced = offences.filter((o) => !BASELINE.has(o.file));
const fixed = [...BASELINE].filter((f) => !offending.has(f)).sort();

console.log(
  `${ANSI.bold}Success-claim guard${ANSI.reset} ${ANSI.dim}(${offending.size} file(s) claiming, ${BASELINE.size} baselined)${ANSI.reset}\n`,
);

for (const offence of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${offence.file}:${offence.line}`);
  console.log(`        ${offence.text}`);
  console.log(`        ${ANSI.dim}${WHY[offence.rule]}${ANSI.reset}`);
  console.log(
    `        ${ANSI.dim}Wire it up, or — if the outcome is passed in — mark the line // success-claim-ok: <reason>.${ANSI.reset}\n`,
  );
}

if (fixed.length > 0) {
  console.log(
    `${ANSI.yellow}${fixed.length} baselined file(s) no longer claim — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const file of fixed) console.log(`  ${ANSI.dim}${file}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && fixed.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no NEW screen claims an action succeeded without something that could perform it${ANSI.reset}`,
  );
  process.exit(0);
}

// A stale baseline is a failure too: left alone it silently re-permits a file
// that was already fixed.
process.exit(1);
