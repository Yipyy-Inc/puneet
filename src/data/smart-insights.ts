import type { Insight } from "@/types/smart-insights";

const FACILITY_ID = 11;

const LOC = {
  plateau: { id: "loc-dv-main", name: "Doggieville – Plateau" },
  ndg: { id: "loc-dv-ouest", name: "Doggieville – NDG" },
  laval: { id: "loc-dv-laval", name: "Doggieville – Laval" },
} as const;

// Last nightly run: 2026-05-20 at 3 AM Eastern = 07:00 UTC.
const NIGHTLY = "2026-05-20T07:00:00.000Z";

// Realtime insights generated within the last 30 minutes (today is 2026-05-20).
const REALTIME = {
  inventory: "2026-05-20T13:08:00.000Z",
  shiftAlert: "2026-05-20T13:10:00.000Z",
  stations: "2026-05-20T13:18:00.000Z",
  missedCalls: "2026-05-20T13:22:00.000Z",
  voicemail: "2026-05-20T13:25:00.000Z",
};

export const smartInsightTemplates: Insight[] = [
  // ─── 3. OPERATIONS ─────────────────────────────────────────────────────────
  {
    insightId: "ins-3-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "high",
    trend: "up",
    title: "Understaffing Risk — Saturday May 24",
    description:
      "Saturday May 24 has 34 confirmed daycare bookings but only 2 staff scheduled.",
    impactText:
      "Pet-to-staff ratio of 17:1 exceeds your safe limit of 12:1 — incidents and under-supervision become likely.",
    recommendationText:
      "Schedule 1 additional staff member on Saturday May 24 to stay within safe ratio.",
    metrics: [
      { label: "Confirmed bookings", value: 34 },
      { label: "Staff scheduled", value: 2 },
      { label: "Capacity", value: 24 },
      { label: "Shortfall", value: 10 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "add_shift",
    status: "active",
  },
  {
    insightId: "ins-3-2",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "operations",
    priority: "medium",
    trend: "up",
    title: "Peak Hour Bookings — Weekday Mornings",
    description:
      "62% of weekday bookings are concentrated between 8 AM and 10 AM, but staffing is flat across the day.",
    impactText:
      "Front desk is understaffed during the surge — average customer wait climbs to 14 minutes.",
    recommendationText:
      "Add a second front-desk shift Monday through Friday from 7:30 AM to 10:30 AM.",
    metrics: [
      { label: "Peak share", value: "62%" },
      { label: "Peak window", value: "8–10 AM" },
      { label: "Avg wait", value: "14 min" },
      { label: "Days affected", value: 5 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "week_schedule_gap",
    status: "active",
  },
  {
    insightId: "ins-3-3",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "high",
    trend: "up",
    title: "Cancellations Up 31% This Week",
    description:
      "18 of 58 bookings cancelled in the past 7 days — a 31% rate vs. the 90-day average of 14%.",
    impactText:
      "$1,240 in lost service revenue this week. 12 of 18 cancellations have no reason recorded.",
    recommendationText:
      "Review this week's cancellations, and send a win-back offer to clients who cancelled.",
    metrics: [
      { label: "Cancellations", value: 18 },
      { label: "Rate", value: "31%" },
      { label: "90-day avg", value: "14%" },
      { label: "Revenue lost", value: "$1,240" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "cancellations_review",
    status: "active",
  },
  {
    insightId: "ins-3-4",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "operations",
    priority: "medium",
    trend: "up",
    title: "Grooming Tasks Being Missed at 22%",
    description:
      "22% of grooming tasks were auto-marked Missed in the past 30 days — above the 15% threshold.",
    impactText:
      "Photo for Report Card is missed 41% of the time. Clients aren't receiving the after-care photos they expect.",
    recommendationText:
      "Open Missed Tasks, identify the responsible groomers, and decide whether to retrain or shift task timing.",
    metrics: [
      { label: "Missed rate", value: "22%" },
      { label: "Threshold", value: "15%" },
      { label: "Worst task", value: "Photo for report card" },
      { label: "Worst task rate", value: "41%" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "missed_tasks_review",
    status: "active",
  },
  {
    insightId: "ins-3-5",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "medium",
    trend: "stable",
    title: "$1,820 in Uncollected Deposits Across 14 Bookings",
    description:
      "14 upcoming bookings in the next 30 days have deposit collection enabled but no deposit on file.",
    impactText:
      "If these bookings cancel or no-show, you have no buffer. Deposit policy currently has no automated enforcement.",
    recommendationText:
      "Send deposit request links to all 14 clients in one batch.",
    metrics: [
      { label: "Bookings", value: 14 },
      { label: "Outstanding", value: "$1,820" },
      { label: "Window", value: "Next 30 days" },
      { label: "Threshold", value: "$500" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "deposit_request",
    status: "active",
  },
  {
    insightId: "ins-3-6",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "operations",
    priority: "medium",
    trend: "up",
    title: "Stations Sitting in Needs Cleaning 52 Min Avg",
    description:
      "Average time stations spend in Needs Cleaning has crept above the 45-minute threshold.",
    impactText:
      "Throughput is slowing — grooming appointment slippage is rising. 4 stations were simultaneously dirty for 38 minutes yesterday.",
    recommendationText:
      "Consider assigning a dedicated cleaning role during peak grooming hours (10 AM – 2 PM).",
    metrics: [
      { label: "Avg wait", value: "52 min" },
      { label: "Threshold", value: "45 min" },
      { label: "Stations affected", value: 4 },
      { label: "Peak duration", value: "38 min" },
    ],
    generatedAt: REALTIME.stations,
    cadence: "realtime_30min",
    actionType: "stations_board",
    status: "active",
  },
  {
    insightId: "ins-3-7",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "high",
    trend: "up",
    title: "Missed Calls Up 47% This Week",
    description:
      "Missed call rate jumped from 8% to 18% over the past 7 days.",
    impactText:
      "$2,800 in estimated lost bookings. 80% of misses occur between 11 AM and 1 PM (lunch coverage gap).",
    recommendationText:
      "Add coverage during the lunch window, or send a bulk callback SMS to today's missed callers.",
    metrics: [
      { label: "Missed this week", value: 28 },
      { label: "Vs. 30-day avg", value: "+47%" },
      { label: "Peak hours", value: "11 AM – 1 PM" },
      { label: "Est. lost", value: "$2,800" },
    ],
    generatedAt: REALTIME.missedCalls,
    cadence: "realtime_30min",
    actionType: "missed_calls",
    status: "active",
  },

  // ─── 4. REVENUE ────────────────────────────────────────────────────────────
  {
    insightId: "ins-4-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "revenue",
    priority: "high",
    trend: "stable",
    title: "Grooming Upsell Conversion at 78% — Offer Rate Only 42%",
    description:
      "When grooming is offered at boarding check-in, 78% accept. But it's only being offered to 42% of boarding clients.",
    impactText:
      "Closing the gap to an 80% offer rate would add ~$3,400/mo in grooming revenue.",
    recommendationText:
      "Send a training note reminding staff to offer grooming at every boarding check-in.",
    metrics: [
      { label: "Conversion rate", value: "78%" },
      { label: "Offer rate", value: "42%" },
      { label: "Target offer rate", value: "80%" },
      { label: "Potential add", value: "$3,400/mo" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "staff_training_note",
    status: "active",
  },
  {
    insightId: "ins-4-2",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "revenue",
    priority: "medium",
    trend: "stable",
    title: "Daycare Price Has Headroom",
    description:
      "Daycare bookings stayed flat after the last 8% price increase in October. Demand model suggests another 5–10% has room.",
    impactText:
      "A modest $3/day price increase would generate ~$6,800 in additional annual revenue with low volume risk.",
    recommendationText:
      "Update the Daycare standard rate from $45 to $48 per day.",
    metrics: [
      { label: "Current price", value: "$45" },
      { label: "Recommended", value: "$48" },
      { label: "Annual impact", value: "$6,800" },
      { label: "Confidence", value: "Moderate" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "service_rate_edit",
    status: "active",
    disclaimer:
      "This is a suggestion based on 180 days of historical volume data, not a guarantee of outcome.",
  },
  {
    insightId: "ins-4-3",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "revenue",
    priority: "medium",
    trend: "up",
    title: "14 Frequent Buyers Without a Package",
    description:
      "14 clients booked the same service 4+ times in the past 90 days but never purchased a package.",
    impactText:
      "If all 14 convert to the best-fit package, you lock in ~$5,200 of forward revenue.",
    recommendationText:
      "Send a personalized package offer that shows their visit history and would-be savings.",
    metrics: [
      { label: "Eligible clients", value: 14 },
      { label: "Avg savings/client", value: "$185" },
      { label: "Lockable revenue", value: "$5,200" },
      { label: "Threshold", value: "10 clients" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "package_campaign",
    status: "active",
  },
  {
    insightId: "ins-4-4",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "revenue",
    priority: "low",
    trend: "down",
    title: "Spa Bath Add-On: Bookings Down 38%",
    description:
      "Spa Bath add-on bookings dropped 38% vs. the same 90-day period last year.",
    impactText:
      "Marginal product — currently contributing under $400/mo with no growth trend.",
    recommendationText:
      "Run a promotional campaign, adjust the price, or archive the service.",
    metrics: [
      { label: "Bookings drop", value: "-38%" },
      { label: "Current revenue", value: "$380/mo" },
      { label: "Active since", value: "Jan 2026" },
      { label: "Total bookings", value: 9 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "service_utilization",
    status: "active",
  },
  {
    insightId: "ins-4-5",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "revenue",
    priority: "high",
    trend: "up",
    title: "$1,150 Lost to No-Shows This Month",
    description:
      "No-show losses are up 28% vs. last month. 6 clients have 2+ no-shows on record.",
    impactText:
      "$1,150 in revenue gone. Six chronic no-show clients are blocking slots that could be paying customers.",
    recommendationText:
      "Enable an automatic no-show fee, and send a reminder to clients with prior no-shows who have upcoming bookings.",
    metrics: [
      { label: "No-shows", value: 19 },
      { label: "Last month", value: 15 },
      { label: "Revenue lost", value: "$1,150" },
      { label: "Chronic offenders", value: 6 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "no_show_policy",
    status: "active",
  },
  {
    insightId: "ins-4-6",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "revenue",
    priority: "high",
    trend: "down",
    title: "Revenue Down 24% vs. 4-Week Average",
    description:
      "Last week's revenue is $4,820 below the rolling 4-week average. Booking count is unchanged.",
    impactText:
      "Likely cause: unclosed invoices or unprocessed payments — bookings happened but revenue isn't recorded.",
    recommendationText:
      "Open the revenue report and reconcile open invoices for the past 7 days.",
    metrics: [
      { label: "This week", value: "$15,180" },
      { label: "4-week avg", value: "$20,000" },
      { label: "Gap", value: "$4,820" },
      { label: "Booking count", value: "Stable" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "revenue_report",
    status: "active",
  },

  // ─── 5. CUSTOMERS ──────────────────────────────────────────────────────────
  {
    insightId: "ins-5-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "customers",
    priority: "high",
    trend: "down",
    title: "12 High-Value Clients At Risk of Churn",
    description:
      "12 clients who normally book every 2 weeks haven't returned in 30+ days. All have $500+ lifetime value.",
    impactText:
      "Annual revenue at risk: $14,400 if all churn. Average tenure of these clients: 18 months.",
    recommendationText:
      "Send a personalized win-back campaign with a 15% discount on their most recent service.",
    metrics: [
      { label: "At-risk clients", value: 12 },
      { label: "Avg days since visit", value: 34 },
      { label: "Revenue at risk", value: "$14,400" },
      { label: "Most recent service", value: "Grooming" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "churn_winback_campaign",
    status: "active",
  },
  {
    insightId: "ins-5-2",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "customers",
    priority: "medium",
    trend: "stable",
    title: "18 First-Time Clients Haven't Returned",
    description:
      "18 clients made their first booking in the past 60 days and haven't booked a second time.",
    impactText:
      "The first-60-day retention window is closing. Losing them means losing the chance for repeat-client conversion.",
    recommendationText:
      "Send a welcome-back offer with a small incentive on their second visit.",
    metrics: [
      { label: "First-timers", value: 18 },
      { label: "Threshold", value: 15 },
      { label: "Window", value: "60 days" },
      { label: "Target", value: "Second booking" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "welcome_back_campaign",
    status: "active",
  },
  {
    insightId: "ins-5-3",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "customers",
    priority: "medium",
    trend: "stable",
    title: "5 Repeat No-Show Clients Have Bookings Soon",
    description:
      "5 clients with 2+ no-shows on record have bookings in the next 14 days.",
    impactText:
      "$640 in booking value at risk. Without intervention, statistically 2–3 of these will no-show again.",
    recommendationText:
      "Send personalized reminders, and consider requiring a deposit for these specific bookings.",
    metrics: [
      { label: "Flagged clients", value: 5 },
      { label: "Bookings at risk", value: 5 },
      { label: "Combined value", value: "$640" },
      { label: "Window", value: "Next 14 days" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "repeat_no_show",
    status: "active",
  },
  {
    insightId: "ins-5-4",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "customers",
    priority: "medium",
    trend: "up",
    title: "Summer Boarding Demand Spike Coming",
    description:
      "Historical data shows boarding bookings climb 78% in mid-July. No early-booking campaign has been sent yet.",
    impactText:
      "Last year, 40% of summer boarding spots were booked less than 2 weeks out — driving stress and turnaway.",
    recommendationText:
      "Send an early-booking campaign at least 6 weeks ahead of the surge.",
    metrics: [
      { label: "Forecast spike", value: "+78%" },
      { label: "Peak weeks", value: "Jul 13–26" },
      { label: "Lead time", value: "6 weeks" },
      { label: "Recipients", value: "Active 12mo" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "seasonal_campaign",
    status: "active",
  },
  {
    insightId: "ins-5-5",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "customers",
    priority: "medium",
    trend: "stable",
    title: "8 Clients Have Packages Expiring Soon",
    description:
      "8 active package holders have packages expiring in the next 30 days, with sessions remaining.",
    impactText:
      "23 paid sessions at risk of expiring unused — that's frustration that often leads to churn.",
    recommendationText:
      "Notify each client of their expiry date and remaining sessions.",
    metrics: [
      { label: "Clients", value: 8 },
      { label: "Sessions at risk", value: 23 },
      { label: "Avg days to expiry", value: 19 },
      { label: "Threshold", value: "5 clients" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "expiring_package",
    status: "active",
  },

  // ─── 6. STAFF ──────────────────────────────────────────────────────────────
  {
    insightId: "ins-6-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "staff",
    priority: "high",
    trend: "up",
    title: "Overtime Cost $1,420 Over Budget This Month",
    description:
      "Overtime hours up 28% vs. last month. Total OT cost exceeds the labor budget by $1,420.",
    impactText:
      "Labor margin compression. Top 3 staff accumulating OT: M. Tremblay (12h), J-F. Roy (9h), S. Côté (7h).",
    recommendationText:
      "Review next week's schedule and redistribute hours away from high-OT staff.",
    metrics: [
      { label: "OT hours", value: 78 },
      { label: "Last month", value: 61 },
      { label: "Over budget", value: "$1,420" },
      { label: "Top OT staff", value: 3 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "overtime_report",
    status: "active",
  },
  {
    insightId: "ins-6-2",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "staff",
    priority: "high",
    trend: "stable",
    title: "Unfilled Shift: Tomorrow 7:30 AM Front Desk",
    description:
      "Tomorrow morning's front desk shift has no assignee.",
    impactText:
      "Check-in flow will stall. Approximately 20 morning drop-offs are scheduled.",
    recommendationText:
      "Assign a staff member, post a shift swap, or message available staff.",
    metrics: [
      { label: "Days out", value: 1 },
      { label: "Role", value: "Front Desk" },
      { label: "Shift", value: "7:30 AM – 12 PM" },
      { label: "Drop-offs affected", value: 20 },
    ],
    generatedAt: REALTIME.shiftAlert,
    cadence: "realtime_30min",
    actionType: "unfilled_shift",
    status: "active",
  },
  {
    insightId: "ins-6-3",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "staff",
    priority: "medium",
    trend: "stable",
    title: "J-F Roy: Late to 7 of Last 10 Shifts",
    description:
      "J-F Roy has arrived late on 7 of the last 10 shifts. Average lateness: 12 minutes.",
    impactText:
      "Morning grooming appointments are slipping. First-appointment delay is the most visible client impact.",
    recommendationText:
      "Review the attendance record and have a one-on-one conversation.",
    metrics: [
      { label: "Late shifts", value: "7 / 10" },
      { label: "Avg minutes late", value: 12 },
      { label: "Threshold", value: "40%" },
      { label: "Current rate", value: "70%" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "staff_attendance_record",
    status: "active",
  },
  {
    insightId: "ins-6-4",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "staff",
    priority: "low",
    trend: "stable",
    title: "Amélie Dubois: Onboarding Stalled 9 Days",
    description:
      "Amélie has 3 onboarding tasks remaining; no progress in the past 9 days.",
    impactText:
      "Onboarding completion gates access to certain modules — her productivity is blocked.",
    recommendationText:
      "Send a reminder, or check in to remove any blocker.",
    metrics: [
      { label: "Days stalled", value: 9 },
      { label: "Tasks remaining", value: 3 },
      { label: "Threshold", value: "7 days" },
      { label: "Status", value: "Incomplete" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "onboarding_reminder",
    status: "active",
  },
  {
    insightId: "ins-6-5",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "staff",
    priority: "medium",
    trend: "down",
    title: "Lucas Martin: Revenue/Appt 34% Below Team Avg",
    description:
      "Lucas's 30-day revenue per appointment is 34% below the team average. Rating is also 0.6 stars lower.",
    impactText:
      "Likely cause: pricing tier mismatch, missed add-ons, or skill gap. Worth a coaching conversation.",
    recommendationText:
      "Review the full profile and decide on coaching vs. role adjustment.",
    metrics: [
      { label: "Revenue gap", value: "-34%" },
      { label: "Rating", value: "4.1 vs 4.7" },
      { label: "Cancellation rate", value: "12% vs 6%" },
      { label: "Appts/wk", value: 18 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "groomer_profile",
    status: "active",
  },

  // ─── 7. MARKETING ──────────────────────────────────────────────────────────
  {
    insightId: "ins-7-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "marketing",
    priority: "low",
    trend: "up",
    title: "Mother's Day Promo Drove 41 Bookings",
    description:
      "Your May 8 Mother's Day campaign hit a 48% open rate (2.3× your average) and drove 41 bookings.",
    impactText:
      "Revenue attributed: $2,840. The biggest single-campaign win in 90 days.",
    recommendationText:
      "Duplicate the campaign style for Father's Day in June.",
    metrics: [
      { label: "Open rate", value: "48%" },
      { label: "Your avg", value: "21%" },
      { label: "Bookings", value: 41 },
      { label: "Revenue", value: "$2,840" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "duplicate_campaign",
    status: "active",
  },
  {
    insightId: "ins-7-2",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "marketing",
    priority: "medium",
    trend: "down",
    title: "Last 3 Emails Averaged 11% Open Rate",
    description:
      "The last 3 email campaigns all opened below the 15% industry baseline.",
    impactText:
      "418 clients haven't opened any email in 90 days — list health is degrading.",
    recommendationText:
      "Segment out chronic non-openers, test a new subject line approach, and review send frequency.",
    metrics: [
      { label: "Avg open rate", value: "11%" },
      { label: "Benchmark", value: "15%" },
      { label: "Non-openers", value: 418 },
      { label: "Last campaigns", value: 3 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "list_health",
    status: "active",
  },
  {
    insightId: "ins-7-3",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "marketing",
    priority: "low",
    trend: "stable",
    title: "No Campaign in the Past 30 Days",
    description:
      "It's been 32 days since the last email or SMS campaign was sent.",
    impactText:
      "Facilities that communicate at least monthly see ~12% better retention. The gap is starting to widen.",
    recommendationText:
      "Pick one: monthly newsletter, seasonal promotion, or a 'thinking of you' check-in.",
    metrics: [
      { label: "Days silent", value: 32 },
      { label: "Threshold", value: 30 },
      { label: "Active clients", value: 612 },
      { label: "Suggested types", value: 3 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "new_campaign_suggestions",
    status: "active",
  },
  {
    insightId: "ins-7-4",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "marketing",
    priority: "low",
    trend: "up",
    title: "SMS Open Rate 2.4× Higher Than Email",
    description:
      "Over the past 90 days, SMS campaigns averaged 94% open vs. 22% for email. Booking conversion is also 1.8× higher.",
    impactText:
      "You're underweighting your highest-performing channel.",
    recommendationText:
      "Shift more campaigns to SMS — review the full breakdown.",
    metrics: [
      { label: "SMS open", value: "94%" },
      { label: "Email open", value: "22%" },
      { label: "Conversion gap", value: "1.8×" },
      { label: "Cadence", value: "Quarterly check" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "messaging_analytics",
    status: "active",
  },

  // ─── 8. COMMUNICATION (mapped to Operations badge) ─────────────────────────
  {
    insightId: "ins-8-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "high",
    trend: "up",
    title: "8 Voicemails Waiting — 2 Older Than 48h",
    description:
      "8 unlistened voicemails. The oldest has been waiting 61 hours.",
    impactText:
      "Each missed voicemail is roughly a missed booking. Estimated lost: $480.",
    recommendationText:
      "Work through the voicemail backlog now.",
    metrics: [
      { label: "Unlistened", value: 8 },
      { label: "Oldest", value: "61 hours" },
      { label: "Threshold", value: 5 },
      { label: "Est. lost", value: "$480" },
    ],
    generatedAt: REALTIME.voicemail,
    cadence: "realtime_30min",
    actionType: "voicemail_backlog",
    status: "active",
  },
  {
    insightId: "ins-8-2",
    facilityId: FACILITY_ID,
    locationId: LOC.ndg.id,
    locationName: LOC.ndg.name,
    category: "operations",
    priority: "medium",
    trend: "up",
    title: "Inbox Response Time Now 5.2h Avg",
    description:
      "Average first-reply time over the past 7 days is 5.2 hours, up from 2.8h.",
    impactText:
      "3 conversations have been open over 24 hours without any staff reply.",
    recommendationText:
      "Review the slow-reply inbox and prioritize the oldest open conversations.",
    metrics: [
      { label: "Current avg", value: "5.2h" },
      { label: "30-day avg", value: "2.8h" },
      { label: "Threshold", value: "4h" },
      { label: "Open >24h", value: 3 },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "slow_reply_inbox",
    status: "active",
  },

  // ─── 9. INVENTORY (mapped to Operations badge) ─────────────────────────────
  {
    insightId: "ins-9-1",
    facilityId: FACILITY_ID,
    locationId: LOC.plateau.id,
    locationName: LOC.plateau.name,
    category: "operations",
    priority: "high",
    trend: "down",
    title: "4 Inventory Items Below Reorder Threshold",
    description:
      "Shampoo, conditioner, gauze, and ear-cleaning solution are all below minimum stock.",
    impactText:
      "At current usage, shampoo runs out in 3 days — grooming pipeline impact imminent.",
    recommendationText:
      "Place reorders with the suppliers shown.",
    metrics: [
      { label: "Items low", value: 4 },
      { label: "Days to stockout", value: "3 (worst)" },
      { label: "Suppliers", value: 3 },
      { label: "Est. reorder cost", value: "$620" },
    ],
    generatedAt: REALTIME.inventory,
    cadence: "realtime_30min",
    actionType: "reorder",
    status: "active",
  },
  {
    insightId: "ins-9-2",
    facilityId: FACILITY_ID,
    locationId: LOC.laval.id,
    locationName: LOC.laval.name,
    category: "operations",
    priority: "low",
    trend: "up",
    title: "Ear Cleaning Solution: Usage Up 52% This Week",
    description:
      "Weekly usage jumped 52% above the 60-day average.",
    impactText:
      "Either a new service is using it more heavily, or tracking is correct and the reorder threshold needs raising.",
    recommendationText:
      "Review item history and adjust the reorder threshold or default quantity.",
    metrics: [
      { label: "Spike vs 60-day", value: "+52%" },
      { label: "Current weekly", value: "14 bottles" },
      { label: "Avg weekly", value: "9.2 bottles" },
      { label: "Threshold", value: "+40%" },
    ],
    generatedAt: NIGHTLY,
    cadence: "nightly",
    actionType: "inventory_item_edit",
    status: "active",
  },
];
