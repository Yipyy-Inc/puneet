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
  "src/app/facility/dashboard/services/training/students/_components/training-profile-quick-actions.tsx",
  "src/app/facility/dashboard/staff/_components/staff-audit-trail.tsx",
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
  "src/components/facility/operations/OperationsCalendarEventDrawer.tsx",

  // ── REVEALED BY MATCHING BOTH WORD ORDERS ──────────────────────────────
  //
  // The regex matched "successfully created" and not "created successfully".
  // These ten files were always claiming; they were never looked at. The
  // billing screen's three — a payment, a gift card and a credit, all over
  // console.log — were fixed rather than baselined, because they were money.
  //
  // Each of these is a real claim over a file with nothing that performs it.
  // They are recorded, not excused.
  "src/app/facility/dashboard/services/retail/inventory/page.tsx",
  "src/app/facility/dashboard/services/training/courses/page.tsx",
  "src/components/grooming/GroomingIntakeForm.tsx",
  "src/components/yipyygo/YipyyGoSettings.tsx",

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
  "src/app/facility/dashboard/online-booking/page.tsx",
  "src/app/facility/dashboard/services/custom/[slug]/rates/page.tsx",
  "src/app/facility/dashboard/services/custom/[slug]/settings/_components/FacilitySettingsEditor.tsx",
  "src/app/facility/dashboard/services/custom/page.tsx",
  "src/app/facility/dashboard/services/grooming/settings/page.tsx",
  "src/app/facility/dashboard/services/retail/products/page.tsx",
  "src/app/facility/dashboard/services/retail/settings/page.tsx",
  "src/app/facility/dashboard/services/training/rates/page.tsx",
  "src/app/facility/dashboard/services/training/report-cards/_components/facility-training-report-cards.tsx",
  "src/app/facility/dashboard/services/training/session/[sessionId]/_components/session-view-homework-prompt.tsx",
  "src/app/facility/dashboard/services/training/students/_components/homework-board.tsx",
  "src/app/facility/dashboard/services/training/students/_components/training-profile-homework.tsx",
  "src/app/facility/dashboard/services/training/students/_components/training-profile-notes.tsx",
  "src/app/facility/dashboard/services/training/students/_components/training-profile-report-cards.tsx",
  "src/app/facility/dashboard/staff/[id]/staff-profile-tabs.tsx",
  "src/app/facility/dashboard/staff/_components/custom-role-quick-create-dialog.tsx",
  "src/app/facility/dashboard/staff/_components/staff-availability-tab.tsx",
  "src/app/facility/documents/_components/facility-documents-client.tsx",
  "src/app/facility/services/memberships/_components/plans/PlanBuilderDialog.tsx",
  "src/app/facility/services/memberships/_components/plans/PlansTab.tsx",
  "src/app/facility/services/memberships/_components/subscribers/CancelSubscriptionDialog.tsx",
  "src/app/facility/services/memberships/_components/subscribers/SubscriptionDetailSheet.tsx",
  "src/app/facility/settings/billing/_components/billing-self-service-view.tsx",
  "src/components/analytics/CustomReportsManager.tsx",
  "src/components/bookings/AbandonmentRecoverySettings.tsx",
  "src/components/bookings/AutoAppliedBenefits.tsx",
  "src/components/bookings/BelongingsSection.tsx",
  "src/components/bookings/BookingActionBar.tsx",
  "src/components/bookings/BookingStatusDropdown.tsx",
  "src/components/bookings/EstimateCard.tsx",
  "src/components/bookings/EstimateDetailDrawer.tsx",
  "src/components/bookings/InvoicePanel.tsx",
  "src/components/bookings/MedicationSection.tsx",
  "src/components/bookings/SendEstimateModal.tsx",
  "src/components/bookings/UnfinishedBookingDetailSheet.tsx",
  "src/components/bookings/modals/service-details/TrainingScheduleStep.tsx",
  "src/components/camera-integration/CameraIntegrationSettings.tsx",
  "src/components/custom-services/wizard/steps/YipyyGoConfigStep.tsx",
  "src/components/customer/MessageAttachmentUpload.tsx",
  "src/components/daily-care/ShiftNotes.tsx",
  "src/components/dashboard/facilities/AgreementsTab.tsx",
  "src/components/dashboard/facilities/BillingTab.tsx",
  "src/components/dashboard/facilities/LocationsTab.tsx",
  "src/components/estimates/EstimateFollowUpSettings.tsx",
  "src/components/facility-config/TagNotesSettings.tsx",
  "src/components/facility/BookingRequestsPanel.tsx",
  "src/components/facility/BookingStatusSettings.tsx",
  "src/components/facility/CareTaskSettings.tsx",
  "src/components/facility/DepartmentSettings.tsx",
  "src/components/facility/RouteView.tsx",
  "src/components/facility/TrainingSection.tsx",
  "src/components/facility/add-ons/AddOnCategorySheet.tsx",
  "src/components/facility/add-ons/AddOnsManager.tsx",
  "src/components/facility/boarding/feeding-round-settings.tsx",
  "src/components/facility/grooming/mobile-grooming-settings.tsx",
  "src/components/facility/grooming/zone-and-tax-settings-panel.tsx",
  "src/components/facility/training/homework-edit-dialog.tsx",
  "src/components/facility/training/report-card-send-dialog.tsx",
  "src/components/facility/training/training-disciplines-manager.tsx",
  "src/components/facility/training/training-exercises-manager.tsx",
  "src/components/facility/training/training-module-settings.tsx",
  "src/components/forms/FormNotificationSettings.tsx",
  "src/components/grooming/PriceAdjustmentForm.tsx",
  "src/components/guest-journal/ReservationJournalPanel.tsx",
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
  /toast\.success\s*\([^)]*\b(?:created|sent|saved|updated|deleted|processed|issued|added|charged|refunded|removed|archived|cancelled|canceled|scheduled|assigned|applied|published|restored|duplicated|renamed|moved)\b/i;

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

type Offence = { file: string; line: number; text: string };

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

  // A file that can perform the action is not making an empty claim. This is
  // per-FILE rather than per-line on purpose: proving the claim belongs to the
  // request would need real dataflow analysis, and the cheap version already
  // catches the shape that shipped.
  if (performs(file)) continue;

  source.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (ALLOW.test(line)) return;
    if (index > 0 && ALLOW.test(source.split("\n")[index - 1] ?? "")) return;
    if (CLAIM.test(line) || CLAIM_BARE.test(line)) {
      offences.push({ file, line: index + 1, text: trimmed.slice(0, 110) });
    }
  });
}

const offending = new Set(offences.map((o) => o.file));
const introduced = offences.filter((o) => !BASELINE.has(o.file));
const fixed = [...BASELINE].filter((f) => !offending.has(f)).sort();

console.log(
  `${ANSI.bold}Success-claim guard${ANSI.reset} ${ANSI.dim}(${offending.size} file(s) claiming, ${BASELINE.size} baselined)${ANSI.reset}\n`,
);

for (const offence of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${offence.file}:${offence.line}`);
  console.log(`        ${offence.text}`);
  console.log(
    `        ${ANSI.dim}claims an action succeeded, but this file contains nothing that performs one.${ANSI.reset}`,
  );
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
