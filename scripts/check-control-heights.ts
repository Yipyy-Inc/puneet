/**
 * Guards against a call site overriding a control primitive's own height.
 *
 *   bun run check:control-heights
 *
 * docs/design-system/design-system.md §1 sets one control height — 40px, and
 * 48px below 1024px — and §6 rule 7 says why the second number is not
 * negotiable:
 *
 *   "48px tap targets on phone and tablet. 44 is the seated floor, not ours —
 *   floor staff are standing and holding an animal. Test at 599px, not 375px."
 *
 * `Button`, `Input`, `Select`, `Textarea` and both pickers already implement
 * that. `Button`'s `size="sm"` is deliberately IDENTICAL to `default`, and its
 * own comment says why: "if it rendered smaller it would be reintroducing the
 * 32px control the redesign removes."
 *
 * ── WHY THIS GATE EXISTS ──────────────────────────────────────────────────
 *
 * On 2026-09-08 a rendering pass at 599px found 1,007 controls under 44px in
 * settings. Most were one habit, in FIVE component families that had each
 * arrived at it independently:
 *
 *   settings/_components · EvaluationBookingWizardSettings · TipSettings
 *   BookingStatusSettings · RetailSettings
 *
 * Every one wrote `className="h-8"` or `"h-9"` onto a primitive that already
 * shipped `min-h-10 max-lg:min-h-12`. It is the obvious reflex when a control
 * looks too tall, and it is always wrong here.
 *
 * ── THE PART NOBODY SEES ──────────────────────────────────────────────────
 *
 * tailwind-merge drops the primitive's `h-10` in favour of the call site's
 * `h-8`, but `max-lg:h-12` is a DIFFERENT variant and survives. So the control
 * renders 32px on a laptop and 48px on a tablet — a state nobody chose, that
 * looks correct in whichever one you happen to be testing.
 *
 * ── WHAT COUNTS ───────────────────────────────────────────────────────────
 *
 * A fixed `h-<n>` below `h-10`, in a className on one of the control
 * primitives. Three deliberate exclusions:
 *
 *   `min-h-*` is not this. It sets a FLOOR and the primitive's own responsive
 *     rule still applies on top; `min-h-8` was wrong about the number, not
 *     about the mechanism, and §5g actively wants `min-h` on anything holding
 *     a translated string.
 *
 *   `h-10` and above is the design system's own size, or a deliberate larger
 *     control (§1's one 48px prominent action per screen).
 *
 *   A NON-CONTROL element — a div, a badge, a skeleton — is not a tap target
 *     and has its own reasons to be short. Only the primitives are checked,
 *     by the element name at the call site, because that is what the rule is
 *     about.
 *
 * The fix is almost always deletion: remove the height and let the primitive
 * answer. Where a genuinely smaller box is needed for something that is NOT a
 * tap target, it is not one of these components.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
};

/**
 * PER FILE, not a total — 676 across 253 files on the day this landed.
 *
 * A flat count is the weaker shape and this repo learned that the hard way on
 * 2026-09-08: `check:ui-french` baselined a SET of file ids, and a file
 * already in it could absorb any amount of new English silently. Measured by
 * probe, it passed. A per-file count fails the moment one file grows, so the
 * number can only come down, file by file.
 *
 * ── SETTINGS IS AT ZERO, AND THAT IS THE POINT ───────────────────────────
 *
 * Not one of these 676 is under `facility/dashboard/settings`. The 599px pass
 * cleared them there — 1,007 controls under 44px down to 2, both artifacts —
 * which is what made the habit visible in the first place. The rest of the
 * product has never been measured at 599px.
 *
 * A file that improves prints a note rather than failing, the same as the
 * badge-glyph and hardcoded-locale ratchets: lower its number in the same
 * change so the grip stays tight.
 */
const BASELINE = new Map<string, number>([
  ["src/app/customer/training/_components/customer-homework-tab.tsx", 3],
  [
    "src/app/customer/training/_components/customer-pet-training-dashboard.tsx",
    3,
  ],
  [
    "src/app/customer/training/_components/customer-training-packages-tab.tsx",
    1,
  ],
  [
    "src/app/customer/training/_components/customer-training-series-card.tsx",
    1,
  ],
  ["src/app/customer/training/page.tsx", 1],
  [
    "src/app/dashboard/facilities/[id]/_components/module-entitlement-row.tsx",
    1,
  ],
  ["src/app/dashboard/reports/custom/_components/report-builder.tsx", 3],
  [
    "src/app/dashboard/support/agreements/_components/AgreementPreviewDialog.tsx",
    1,
  ],
  [
    "src/app/dashboard/support/agreements/_components/AgreementSettingsPanel.tsx",
    1,
  ],
  ["src/app/dashboard/support/agreements/_components/EditorToolbar.tsx", 4],
  [
    "src/app/dashboard/support/agreements/_components/SendAgreementModal.tsx",
    1,
  ],
  [
    "src/app/dashboard/support/agreements/_components/VersionHistoryPanel.tsx",
    1,
  ],
  ["src/app/dashboard/support/calling/_components/menu-options-editor.tsx", 2],
  ["src/app/dashboard/support/calling/_components/needs-review-section.tsx", 1],
  ["src/app/dashboard/support/calling/_components/recordings-tab.tsx", 1],
  ["src/app/dashboard/support/calling/_components/voicemail-row.tsx", 2],
  ["src/app/dashboard/support/chat/_components/conversation-thread.tsx", 2],
  ["src/app/dashboard/support/chat/_components/message-composer.tsx", 1],
  [
    "src/app/dashboard/support/knowledge-base/_components/kb-article-editor.tsx",
    1,
  ],
  [
    "src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx",
    1,
  ],
  ["src/app/dashboard/support/tickets/_components/assign-cell.tsx", 1],
  ["src/app/dashboard/support/tickets/[id]/_components/ticket-sidebar.tsx", 1],
  ["src/app/dashboard/system-admin/ai-settings/page.tsx", 1],
  ["src/app/facility/dashboard/clients/[id]/bookings/[bookingId]/page.tsx", 2],
  ["src/app/facility/dashboard/clients/[id]/overview/page.tsx", 3],
  ["src/app/facility/dashboard/clients/[id]/page.tsx", 2],
  ["src/app/facility/dashboard/clients/[id]/settings/page.tsx", 1],
  ["src/app/facility/dashboard/estimates/page.tsx", 2],
  [
    "src/app/facility/dashboard/gift-cards/_components/GiftCardDateRangeFilter.tsx",
    2,
  ],
  ["src/app/facility/dashboard/incidents/page.tsx", 1],
  ["src/app/facility/dashboard/services/retail/orders/page.tsx", 1],
  ["src/app/facility/dashboard/services/retail/page.tsx", 17],
  ["src/app/facility/dashboard/services/retail/products/page.tsx", 1],
  [
    "src/app/facility/dashboard/services/scheduling/availability-changes/page.tsx",
    5,
  ],
  ["src/app/facility/dashboard/services/scheduling/departments/page.tsx", 1],
  ["src/app/facility/dashboard/services/scheduling/layout.tsx", 1],
  ["src/app/facility/dashboard/services/scheduling/shift-swaps/page.tsx", 5],
  ["src/app/facility/dashboard/services/scheduling/time-off/page.tsx", 5],
  [
    "src/app/facility/dashboard/services/training/courses/_components/course-curriculum-editor.tsx",
    4,
  ],
  [
    "src/app/facility/dashboard/services/training/report-cards/_components/facility-training-report-cards.tsx",
    1,
  ],
  [
    "src/app/facility/dashboard/services/training/session/[sessionId]/_components/session-view-exercises.tsx",
    2,
  ],
  [
    "src/app/facility/dashboard/services/training/session/[sessionId]/_components/session-view-homework-prompt.tsx",
    1,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/homework-board.tsx",
    3,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-history.tsx",
    1,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-homework.tsx",
    6,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-notes.tsx",
    3,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-package-chips.tsx",
    1,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-packages-panel.tsx",
    2,
  ],
  [
    "src/app/facility/dashboard/services/training/students/_components/training-profile-report-cards.tsx",
    4,
  ],
  ["src/app/facility/dashboard/staff/_components/access-tab.tsx", 4],
  ["src/app/facility/dashboard/staff/_components/offboarding-tab.tsx", 2],
  [
    "src/app/facility/dashboard/staff/_components/onboarding-submission-view.tsx",
    1,
  ],
  [
    "src/app/facility/dashboard/staff/_components/review-activate-dialog.tsx",
    1,
  ],
  ["src/app/facility/dashboard/staff/_components/staff-form-sections.tsx", 2],
  ["src/app/facility/dashboard/staff/_components/staff-profile-sheet.tsx", 1],
  [
    "src/app/facility/dashboard/staff/_components/warning-template-builder.tsx",
    1,
  ],
  ["src/app/facility/dashboard/staff/_components/warnings-tab.tsx", 1],
  ["src/app/facility/dashboard/staff/_components/write-ups-tab.tsx", 1],
  ["src/app/facility/dashboard/staff/documents/page.tsx", 1],

  ["src/app/facility/dashboard/staff/warnings/page.tsx", 2],
  ["src/app/facility/dashboard/tasks/CareTasks.tsx", 8],
  ["src/app/onboard/[token]/section-forms.tsx", 1],
  ["src/app/sign/[token]/_components/SignaturePad.tsx", 1],
  ["src/components/admin/ModuleRequestsInbox.tsx", 3],
  ["src/components/billing/cash-drawer/CashLedgerTable.tsx", 1],
  ["src/components/billing/cash-drawer/DenominationInput.tsx", 1],
  ["src/components/billing/cash-drawer/SessionHistoryList.tsx", 1],
  ["src/components/booking/shared/AddonCard.tsx", 1],
  ["src/components/booking/shared/FeedingScheduleForm.tsx", 4],
  ["src/components/booking/shared/MedicationForm.tsx", 3],
  ["src/components/booking/shared/PetCareAutoPopulate.tsx", 4],
  ["src/components/booking/shared/SimpleFeedingForm.tsx", 1],
  ["src/components/booking/shared/SimpleMedicationForm.tsx", 4],
  ["src/components/bookings/AbandonmentRecoverySettings.tsx", 5],
  ["src/components/bookings/AddRetailItemModal.tsx", 1],
  ["src/components/bookings/BelongingsSection.tsx", 6],
  ["src/components/bookings/BookingDateRangeFilter.tsx", 2],
  ["src/components/bookings/BookingDetailActionBar.tsx", 12],
  ["src/components/bookings/FeedingSection.tsx", 6],
  ["src/components/bookings/InvoicePanel.tsx", 15],
  ["src/components/bookings/MedicationSection.tsx", 8],
  ["src/components/bookings/modals/service-details/EvaluationDetails.tsx", 3],
  ["src/components/bookings/modals/service-details/GroomingDetails.tsx", 4],
  [
    "src/components/bookings/modals/service-details/GroomingWaitlistDialog.tsx",
    5,
  ],
  ["src/components/bookings/modals/steps/ClientPetStep.tsx", 4],
  ["src/components/bookings/modals/steps/ConfirmStep.tsx", 2],
  ["src/components/bookings/QuickBooksSyncPanel.tsx", 2],
  ["src/components/bookings/SendEstimateModal.tsx", 2],
  ["src/components/bookings/TipSelector.tsx", 1],
  ["src/components/bookings/TipSplitModal.tsx", 1],
  ["src/components/bookings/UnfinishedBookingDetailSheet.tsx", 2],
  ["src/components/bookings/UnfinishedBookingsTable.tsx", 4],
  ["src/components/calling/CallAvailabilitySettings.tsx", 1],
  ["src/components/calling/CallTagSelect.tsx", 1],
  ["src/components/calling/CallTagsSettings.tsx", 2],
  ["src/components/calling/IVRBuilder.tsx", 5],
  ["src/components/calling/IVRPreview.tsx", 2],
  ["src/components/calling/RecordingsList.tsx", 1],
  ["src/components/calling/RoutingRulesBuilder.tsx", 9],
  ["src/components/calling/VoicemailInbox.tsx", 5],
  ["src/components/camera-integration/CameraAccessRulesDialog.tsx", 2],
  ["src/components/clients/AdditionalContactsManager.tsx", 1],
  ["src/components/clients/BulkActionsToolbar.tsx", 5],
  ["src/components/clients/ClientFileSidebar.tsx", 3],
  ["src/components/clients/ClientInfoStrip.tsx", 2],
  ["src/components/clients/ClientServicePreferences.tsx", 4],
  ["src/components/clients/CreateClientModal.tsx", 5],
  ["src/components/clients/filters/FilterInputs.tsx", 1],
  ["src/components/clients/OpenInvoicesSection.tsx", 1],
  ["src/components/communications/rebook/LapsedTab.tsx", 4],
  ["src/components/communications/rebook/QueueTab.tsx", 1],
  ["src/components/communications/RebookRemindersCard.tsx", 1],
  [
    "src/components/custom-services/wizard/steps/EligibilityConditionBuilder.tsx",
    4,
  ],
  ["src/components/custom-services/wizard/steps/EligibilityStep.tsx", 3],
  [
    "src/components/custom-services/wizard/steps/ServiceDependenciesSection.tsx",
    2,
  ],
  ["src/components/custom-services/wizard/steps/StaffAssignmentStep.tsx", 1],
  ["src/components/custom-services/wizard/steps/YipyyGoConfigStep.tsx", 2],
  ["src/components/customer/AddVaccinationModal.tsx", 1],
  ["src/components/customer/CareInstructionsStep.tsx", 9],
  ["src/components/customer/CustomerBookingModal.tsx", 5],
  ["src/components/customer/CustomerNotifications.tsx", 1],
  ["src/components/customer/RedeemPointsDialog.tsx", 2],
  ["src/components/daily-care/DailyCareView.tsx", 2],
  ["src/components/daily-care/PetRow.tsx", 3],
  ["src/components/daily-care/Section.tsx", 2],
  ["src/components/dashboard/facilities/ModulesTab.tsx", 1],
  ["src/components/employee/ClockInOut.tsx", 1],
  ["src/components/employee/employee-dashboard-widgets.tsx", 1],
  ["src/components/employee/EmployeeHeader.tsx", 1],
  ["src/components/employee/RegisterCloseWatcher.tsx", 1],
  ["src/components/estimates/EstimateFollowUpSettings.tsx", 9],
  ["src/components/estimates/EstimateWizard.tsx", 1],
  ["src/components/estimates/GuestContactForm.tsx", 1],
  ["src/components/evaluations/EvaluationFormBuilder.tsx", 2],
  ["src/components/evaluations/StaffEvaluationFormModal.tsx", 1],
  ["src/components/facility/announcement-banner.tsx", 1],
  ["src/components/facility/boarding/feeding-checklist.tsx", 5],
  ["src/components/facility/boarding/feeding-round-settings.tsx", 2],
  ["src/components/facility/boarding/ReservationIncidentPanel.tsx", 1],
  ["src/components/facility/boarding/ScheduleTemplates.tsx", 1],
  ["src/components/facility/CareTaskSettings.tsx", 4],
  ["src/components/facility/CheckinRequirementsSettings.tsx", 4],
  ["src/components/facility/DepartmentSettings.tsx", 3],
  ["src/components/facility/DepositRulesSettings.tsx", 1],
  ["src/components/facility/EvaluationBookingWizardSettings.tsx", 2],
  ["src/components/facility/EvaluationSettings.tsx", 4],
  ["src/components/facility/FacilityReports.tsx", 5],
  ["src/components/facility/FacilityRolesStudio.tsx", 3],
  ["src/components/facility/FeedingMedicationConfig.tsx", 3],
  ["src/components/facility/grooming/appointment-panel.tsx", 2],
  [
    "src/components/facility/grooming/certain-area-for-certain-days-panel.tsx",
    4,
  ],
  ["src/components/facility/grooming/check-in-board-column.tsx", 4],
  ["src/components/facility/grooming/check-in-board-waitlist.tsx", 1],
  ["src/components/facility/grooming/check-in-confirmation-dialog.tsx", 1],
  ["src/components/facility/grooming/client-pet-picker.tsx", 2],
  ["src/components/facility/grooming/grooming-calendar.tsx", 1],
  ["src/components/facility/grooming/grooming-check-in-forms.tsx", 1],
  ["src/components/facility/grooming/grooming-session-panel.tsx", 1],
  ["src/components/facility/grooming/live-tracking-page.tsx", 1],
  ["src/components/facility/grooming/mark-ready-dialog.tsx", 1],
  ["src/components/facility/grooming/new-appointment-dialog.tsx", 10],
  ["src/components/facility/grooming/payment-dialog.tsx", 1],
  ["src/components/facility/grooming/pre-visit-briefing.tsx", 1],
  ["src/components/facility/grooming/service-area-dialog.tsx", 2],
  ["src/components/facility/grooming/service-dialog.tsx", 9],
  ["src/components/facility/grooming/waitlist-panel.tsx", 7],
  ["src/components/facility/grooming/zone-and-tax-settings-panel.tsx", 3],
  ["src/components/facility/ImpersonationBanner.tsx", 1],
  ["src/components/facility/InvoiceTemplateSettings.tsx", 5],
  ["src/components/facility/NotificationCenter.tsx", 1],
  ["src/components/facility/operations/OperationsCalendarColorPanel.tsx", 1],
  ["src/components/facility/operations/OperationsCalendarContent.tsx", 1],
  ["src/components/facility/operations/OperationsCalendarEventDrawer.tsx", 3],
  ["src/components/facility/operations/OperationsCalendarFiltersPanel.tsx", 1],
  ["src/components/facility/operations/OperationsCalendarToolbar.tsx", 6],
  ["src/components/facility/pricing-rules/peak-surcharge-modal.tsx", 2],
  ["src/components/facility/PricingRulesPanel.tsx", 9],
  ["src/components/facility/RetailSettings.tsx", 5],
  ["src/components/facility/RouteView.tsx", 1],
  ["src/components/facility/staff-hr/EmployeeTaskEditor.tsx", 4],
  ["src/components/facility/staff-hr/TaskConfigEditor.tsx", 2],
  ["src/components/facility/staff-hr/TerminationReasonsSettings.tsx", 1],
  ["src/components/facility/StatusColorSettings.tsx", 2],
  ["src/components/facility/TaxSettings.tsx", 5],
  ["src/components/facility/tips/TipAttributionCard.tsx", 3],
  ["src/components/facility/tips/TipTierEditor.tsx", 2],
  ["src/components/facility/TipSettings.tsx", 1],
  ["src/components/facility/training/pre-session-briefing-panel.tsx", 1],
  ["src/components/facility/training/session-completion-homework.tsx", 1],
  ["src/components/facility/training/session-completion-step-two.tsx", 3],
  ["src/components/facility/training/smart-scheduling-dialog.tsx", 2],
  ["src/components/facility/training/training-calendar-sidebar.tsx", 1],
  ["src/components/facility/training/training-today-tasks.tsx", 1],
  ["src/components/facility/WeatherAlertLog.tsx", 2],
  ["src/components/facility/yipyy-pay/dashboard/TransactionsTab.tsx", 1],
  ["src/components/forms/FormAuditTrail.tsx", 3],
  ["src/components/forms/FormBuilderEditor.tsx", 5],
  ["src/components/forms/FormPhase2Settings.tsx", 8],
  ["src/components/forms/FormRequirementsSettings.tsx", 1],
  ["src/components/forms/InlineFollowUp.tsx", 3],
  ["src/components/forms/RedFlagConfigModal.tsx", 6],
  ["src/components/grooming/GroomingBookingFlow.tsx", 1],
  ["src/components/guest-journal/PetCareNoteCard.tsx", 1],
  ["src/components/hq/LastUpdated.tsx", 1],
  ["src/components/incidents/InStayCareTab.tsx", 6],
  ["src/components/integrations/quickbooks/QuickBooksErrorPanel.tsx", 4],
  ["src/components/integrations/quickbooks/QuickBooksMappingCard.tsx", 3],
  ["src/components/integrations/quickbooks/QuickBooksMappingGroup.tsx", 3],
  ["src/components/integrations/quickbooks/QuickBooksSyncLog.tsx", 6],
  ["src/components/layout/HeaderDropdown.tsx", 1],
  ["src/components/marketing/CampaignBuilderModal.tsx", 5],
  ["src/components/marketing/FacilityBrandingSection.tsx", 1],
  ["src/components/marketing/ReputationEscalationsTab.tsx", 1],
  ["src/components/marketing/ReputationRequestsTab.tsx", 1],
  ["src/components/marketing/SegmentBuilderModal.tsx", 8],
  ["src/components/messaging/ClientContextPanel.tsx", 4],
  ["src/components/messaging/ComposeBar.tsx", 5],
  ["src/components/messaging/InternalNotesTab.tsx", 3],
  ["src/components/messaging/MessagingSettingsView.tsx", 1],
  ["src/components/reports/report-range-picker.tsx", 1],
  ["src/components/reports/report-shell.tsx", 1],
  ["src/components/retail/BarcodeLabelPrint.tsx", 1],
  ["src/components/retail/BulkPriceLabelPrint.tsx", 3],
  ["src/components/retail/CameraScanner.tsx", 1],
  ["src/components/retail/InvoiceLineItemsTable.tsx", 7],
  ["src/components/rooms/CategoryFormDialog.tsx", 3],
  ["src/components/rooms/GroomingStationsClient.tsx", 9],
  ["src/components/rooms/PlayAreaCard.tsx", 3],
  ["src/components/rooms/RoomCategoryCard.tsx", 3],
  ["src/components/rooms/RoomImageUpload.tsx", 2],
  ["src/components/scheduling/AttendanceView.tsx", 2],
  ["src/components/scheduling/PostShiftOpportunityDialog.tsx", 1],
  ["src/components/scheduling/ReportsView.tsx", 2],
  ["src/components/scheduling/RosterView.tsx", 1],
  ["src/components/scheduling/ScheduleHeader.tsx", 4],
  ["src/components/scheduling/ShiftOpportunityBoard.tsx", 4],
  [
    "src/components/scheduling/ShiftOpportunityNotificationSettingsDialog.tsx",
    2,
  ],
  ["src/components/shared/AddNoteModal.tsx", 1],
  ["src/components/shared/NotesList.tsx", 1],
  ["src/components/shared/SignaturePad.tsx", 1],
  ["src/components/shared/TemplatePreviewPanel.tsx", 2],
  ["src/components/smart-insights/LocationFilter.tsx", 1],
  ["src/components/tasks/ModuleTasksPage.tsx", 3],
  ["src/components/tasks/TaskNotificationsPanel.tsx", 2],
  ["src/components/user-management/CreateAdminUserModal.tsx", 1],
  ["src/components/yipyygo/form-sections/FeedingSection.tsx", 3],
  ["src/components/yipyygo/form-sections/MedicationSection.tsx", 3],
  ["src/lib/express-checkin-reminder.tsx", 1],
  ["src/lib/schedule-notifications.tsx", 2],
  ["src/lib/task-notifications-feed.tsx", 1],
]);

/** The primitives that own their own height. */
const CONTROLS = ["Button", "Input", "Select", "SelectTrigger", "Textarea"];

/** `<Button … className="… h-8 …">` — the opening tag and its class list. */
const TAG = new RegExp(`<(${CONTROLS.join("|")})\\b([^>]*?)(?:/>|>)`, "gs");

/** A FIXED height below 40px. `min-h-*` is deliberately not matched. */
const SHORT = /(?<!min-)\bh-([0-9]+(?:\.[0-9]+)?)\b/g;

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") tsxFiles(path, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

const findings: { file: string; line: number; tag: string; cls: string }[] = [];

for (const file of tsxFiles("src")) {
  // The primitives themselves are where the heights are SUPPOSED to live.
  if (file.includes(join("components", "ui"))) continue;
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(TAG)) {
    const [whole, tag, attrs] = match;
    if (!attrs) continue;
    const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(attrs);
    const value = cls?.[1] ?? cls?.[2];
    if (!value) continue;

    const short = [...value.matchAll(SHORT)]
      .map((m) => Number(m[1]))
      .filter((n) => n < 10);
    if (short.length === 0) continue;

    findings.push({
      file,
      line: source.slice(0, match.index!).split("\n").length,
      tag: tag!,
      cls: value.replace(/\s+/g, " ").slice(0, 120),
    });
    void whole;
  }
}

const seen = new Map<string, number>();
for (const f of findings) {
  const id = f.file.split("\\").join("/");
  seen.set(id, (seen.get(id) ?? 0) + 1);
}

const grown = [...seen.entries()]
  .filter(([id, n]) => n > (BASELINE.get(id) ?? 0))
  .sort((a, b) => a[0].localeCompare(b[0]));

const improved = [...BASELINE.entries()]
  .filter(([id, n]) => (seen.get(id) ?? 0) < n)
  .sort((a, b) => a[0].localeCompare(b[0]));

const baselineTotal = [...BASELINE.values()].reduce((s, n) => s + n, 0);

console.log(
  `${ANSI.bold}Control heights${ANSI.reset} ${ANSI.dim}(${findings.length} in ${seen.size} files, baseline ${baselineTotal} in ${BASELINE.size})${ANSI.reset}`,
);

for (const [id, n] of improved)
  console.log(
    `    ${ANSI.dim}note${ANSI.reset} ${id} is down to ${seen.get(id) ?? 0} from ${n} — lower its baseline so the ratchet keeps its grip.`,
  );

if (grown.length > 0) {
  console.log(
    `\n${ANSI.red}✗ ${grown.length} file(s) grew a control shorter than the primitive already is${ANSI.reset}\n`,
  );
  console.log(
    `  §1 sets one control height — 40px, 48 below 1024px — and these\n` +
      `  primitives already implement it. Button's size="sm" is identical to\n` +
      `  default on purpose: "if it rendered smaller it would be reintroducing\n` +
      `  the 32px control the redesign removes."\n\n` +
      `  The half nobody sees: tailwind-merge drops the primitive's h-10 for\n` +
      `  your h-8, but max-lg:h-12 is a different variant and SURVIVES. The\n` +
      `  control ends up 32px on a laptop and 48px on a tablet.\n\n` +
      `  ${ANSI.bold}The fix is deletion${ANSI.reset} — remove the height and let the primitive\n` +
      `  answer. Need a floor rather than a height? \`min-h-*\` is not flagged,\n` +
      `  and §5g wants it on anything holding a translated string.\n`,
  );
  for (const [id, n] of grown) {
    console.log(
      `    ${id}  ${ANSI.dim}${n}, baseline ${BASELINE.get(id) ?? 0}${ANSI.reset}`,
    );
    for (const f of findings.filter(
      (x) => x.file.split("\\").join("/") === id,
    )) {
      console.log(
        `      :${f.line}  <${f.tag}>  ${ANSI.dim}${f.cls}${ANSI.reset}`,
      );
    }
  }
  process.exit(1);
}

console.log(
  `${ANSI.green}✓ no control is shorter than its primitive${ANSI.reset}`,
);
process.exit(0);
