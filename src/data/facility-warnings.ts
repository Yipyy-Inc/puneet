import type { WarningTemplate, IssuedWarning } from "@/types/facility-warnings";

export const warningTemplates: WarningTemplate[] = [
  {
    id: "wt-001",
    title: "Attendance & Punctuality Violation",
    description:
      "For repeated tardiness, unexcused absences, or no-call/no-show incidents.",
    body: `This written warning is being issued to you regarding your attendance and punctuality.

Your employment records indicate the following violations:
- Repeated tardiness without prior notice or valid justification
- Failure to adhere to your scheduled shifts
- Unexcused absences impacting team operations

Company policy requires all staff to arrive on time and notify management at least 2 hours in advance of any absence. Continued violations of this policy may result in further disciplinary action, up to and including termination of employment.

You are expected to demonstrate immediate and sustained improvement in this area. This document will remain on your employment record.`,
    defaultType: "written",
    fields: [
      {
        id: "incident_dates",
        label: "Incident Dates",
        type: "text",
        required: true,
        placeholder: "e.g., Apr 3, Apr 7, Apr 10",
      },
      {
        id: "occurrences",
        label: "Number of Occurrences",
        type: "text",
        required: true,
        placeholder: "e.g., 3 in the past 30 days",
      },
    ],
    requiresSignature: true,
    createdAt: "2025-11-15T10:00:00Z",
    createdBy: "fs-owner-01",
    active: true,
  },
  {
    id: "wt-002",
    title: "Safety Protocol Breach",
    description:
      "For failure to follow health, safety, or animal-handling protocols on the job.",
    body: `This formal warning is being issued regarding a serious breach of our workplace safety protocols.

The health and safety of our animals, clients, and team members is our highest priority. All staff are required to follow established safety, hygiene, and animal-handling procedures at all times.

Failure to comply with these standards puts everyone at risk and is considered a serious disciplinary matter. Depending on the severity and recurrence, violations may result in immediate suspension or termination of employment.

This warning serves as an official record of the incident and your acknowledgment of the required policy standards. You are expected to comply fully with all safety procedures from this point forward.`,
    defaultType: "final",
    fields: [
      {
        id: "protocol_violated",
        label: "Protocol Violated",
        type: "text",
        required: true,
        placeholder: "e.g., PPE policy, animal isolation procedure",
      },
      {
        id: "incident_description",
        label: "Incident Description",
        type: "textarea",
        required: true,
        placeholder: "Describe what happened and how the protocol was breached…",
      },
    ],
    requiresSignature: true,
    createdAt: "2025-11-20T14:30:00Z",
    createdBy: "fs-owner-01",
    active: true,
  },
  {
    id: "wt-003",
    title: "Conduct & Professionalism",
    description:
      "For inappropriate behavior, language, or interactions with clients or colleagues.",
    body: `This warning is being issued to address concerns regarding your conduct and professionalism in the workplace.

All employees are expected to maintain a respectful, professional environment for both our team members and the clients we serve. This includes appropriate communication, respectful interactions, and adherence to our code of conduct at all times.

The behavior described in this document does not meet the standards expected of our team. Please take this warning seriously and reflect on how to approach similar situations differently in the future.

Failure to maintain professional conduct standards may result in further disciplinary action, up to and including termination.`,
    defaultType: "verbal",
    fields: [
      {
        id: "behavior_description",
        label: "Description of Conduct",
        type: "textarea",
        required: true,
        placeholder: "Describe the behavior, where it occurred, and who was involved…",
      },
    ],
    requiresSignature: true,
    createdAt: "2025-12-01T09:00:00Z",
    createdBy: "fs-mgr-01",
    active: true,
  },
];

// A minimal SVG signature used as placeholder mock data
const MOCK_SIG =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMzAwIDEwMCI+PHBhdGggZD0iTTIwLDUwIEMzNSwyMCA1NSwxMCA3MCw0MCBDODASM70gMTAwLDIwIDEyMCw0MCBDMTM1LDU1IDE1MCwxNSAxNzAsNDAgQzE4NSw2MCAyMDUsMjAgMjIwLDQwIEMyMzUsNjAgMjU1LDMwIDI3MCw0NSIgc3Ryb2tlPSIjMWExYTFhIiBzdHJva2Utd2lkdGg9IjIuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";

export const issuedWarnings: IssuedWarning[] = [
  {
    id: "iw-001",
    templateId: "wt-001",
    templateTitle: "Attendance & Punctuality Violation",
    employeeId: "fs-groom-02",
    employeeName: "Julien Roy",
    type: "written",
    reason: "3 late arrivals in the past 30 days without prior notice",
    body: warningTemplates[0].body,
    fieldValues: {
      incident_dates: "Apr 3, Apr 8, Apr 12",
      occurrences: "3 in the past 30 days",
    },
    managerNotes:
      "Julien was spoken to verbally on April 3rd. No improvement observed. Escalating to written warning.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-04-13T10:30:00Z",
    witnessName: "Émilie Laurent",
    departmentId: "dept-grooming",
    status: "signed",
    signedAt: "2026-04-13T11:05:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.44",
    deviceId: "fp-a3b2c1d9",
    timezone: "America/Toronto",
  },
  {
    id: "iw-002",
    templateId: "wt-003",
    templateTitle: "Conduct & Professionalism",
    employeeId: "fs-daycare-01",
    employeeName: "Sophie Gagnon",
    type: "verbal",
    reason: "Unprofessional communication with a client during drop-off",
    body: warningTemplates[2].body,
    fieldValues: {
      behavior_description:
        "Employee raised voice at a client during drop-off on April 10th. Other clients were present.",
    },
    managerNotes:
      "First incident. Client was upset. Sophie acknowledged the behavior and apologized to the client.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-04-11T14:00:00Z",
    departmentId: "dept-daycare",
    status: "pending_signature",
  },
  {
    id: "iw-003",
    templateId: "wt-002",
    templateTitle: "Safety Protocol Breach",
    employeeId: "fs-board-01",
    employeeName: "Dominic Levesque",
    type: "final",
    reason: "Failure to isolate a symptomatic dog — kennel cough exposure risk",
    body: warningTemplates[1].body,
    fieldValues: {
      protocol_violated: "Animal isolation / quarantine procedure",
      incident_description:
        "Failed to isolate a dog showing kennel cough symptoms. The dog remained in the general boarding area for 3+ hours, exposing 6 other dogs.",
    },
    managerNotes:
      "Second safety-related incident this quarter. This is a final warning. Any further violations will result in immediate termination review.",
    issuedBy: "fs-owner-01",
    issuedByName: "Émilie Laurent",
    issuedAt: "2026-04-08T09:15:00Z",
    witnessName: "Nathalie Côté",
    departmentId: "dept-boarding",
    status: "signed",
    signedAt: "2026-04-08T10:00:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.22",
    deviceId: "fp-f9e1d3c5",
    timezone: "America/Toronto",
  },
  {
    id: "iw-004",
    templateId: "wt-001",
    templateTitle: "Attendance & Punctuality Violation",
    employeeId: "fs-groom-02",
    employeeName: "Julien Roy",
    type: "verbal",
    reason: "2 no-call/no-show incidents in February",
    body: warningTemplates[0].body,
    fieldValues: {
      incident_dates: "Feb 14, Feb 22",
      occurrences: "2 in 30 days",
    },
    managerNotes:
      "Verbal warning issued informally at the time. Documenting formally now as part of the escalation trail.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-02-24T16:00:00Z",
    departmentId: "dept-grooming",
    status: "signed",
    signedAt: "2026-02-24T16:30:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.44",
    deviceId: "fp-a3b2c1d9",
    timezone: "America/Toronto",
  },
  {
    id: "iw-005",
    templateId: "wt-003",
    templateTitle: "Conduct & Professionalism",
    employeeId: "fs-board-01",
    employeeName: "Dominic Levesque",
    type: "written",
    reason: "Disrespectful conduct toward a colleague",
    body: warningTemplates[2].body,
    fieldValues: {
      behavior_description:
        "Used demeaning language toward a junior staff member in front of other employees in the boarding area.",
    },
    managerNotes: "First conduct-related warning. Issued after a team complaint.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-03-15T11:00:00Z",
    departmentId: "dept-boarding",
    status: "signed",
    signedAt: "2026-03-15T11:45:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.22",
    deviceId: "fp-f9e1d3c5",
    timezone: "America/Toronto",
  },
  // ── iw-006: Julien Roy — 3rd warning, escalates to final ─────────────────
  {
    id: "iw-006",
    templateId: "wt-001",
    templateTitle: "Attendance & Punctuality Violation",
    employeeId: "fs-groom-02",
    employeeName: "Julien Roy",
    type: "final",
    reason: "Continued attendance violations after written warning — final notice",
    body: warningTemplates[0].body,
    fieldValues: {
      incident_dates: "Mar 2, Mar 9, Mar 19",
      occurrences: "3 in the past 30 days (7 total since Feb)",
    },
    managerNotes:
      "This is Julien's third warning. He was issued a verbal in February, a written in April, and attendance has not improved. This is a final warning — any further violation will trigger a termination review. HR has been notified.",
    issuedBy: "fs-owner-01",
    issuedByName: "Émilie Laurent",
    issuedAt: "2026-03-22T09:00:00Z",
    witnessName: "Nathalie Côté",
    departmentId: "dept-grooming",
    status: "signed",
    signedAt: "2026-03-22T09:45:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.44",
    deviceId: "fp-a3b2c1d9",
    timezone: "America/Toronto",
  },
  // ── iw-007: Marcus Bélanger — attendance written ──────────────────────────
  {
    id: "iw-007",
    templateId: "wt-001",
    templateTitle: "Attendance & Punctuality Violation",
    employeeId: "fs-train-01",
    employeeName: "Marcus Bélanger",
    type: "written",
    reason: "3 late arrivals in March without advance notice",
    body: warningTemplates[0].body,
    fieldValues: {
      incident_dates: "Mar 4, Mar 11, Mar 20",
      occurrences: "3 in the past 30 days",
    },
    managerNotes:
      "Marcus was spoken to informally after the first two incidents. A third occurrence within the same month warrants a written warning. He acknowledged the pattern and committed to improvement.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-03-24T14:30:00Z",
    departmentId: "dept-training",
    status: "pending_signature",
  },
  // ── iw-008: Amira Saleh — conduct verbal ─────────────────────────────────
  {
    id: "iw-008",
    templateId: "wt-003",
    templateTitle: "Conduct & Professionalism",
    employeeId: "fs-board-02",
    employeeName: "Amira Saleh",
    type: "verbal",
    reason: "Complaint from client about rough handling of their dog during boarding intake",
    body: warningTemplates[2].body,
    fieldValues: {
      behavior_description:
        "A client reported that Amira handled their dog roughly during the evening drop-off on Apr 2nd. Security footage was reviewed and confirms the dog was handled more forcefully than our standard requires. No injury occurred.",
    },
    managerNotes:
      "First incident. Amira was cooperative during the review and expressed remorse. Verbal warning issued and documented. Animal handling refresher training has been scheduled.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-04-04T10:00:00Z",
    witnessName: "Émilie Laurent",
    departmentId: "dept-boarding",
    status: "signed",
    signedAt: "2026-04-04T10:30:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.31",
    deviceId: "fp-b8d2e4f1",
    timezone: "America/Toronto",
  },
  // ── iw-009: Philippe Dubois — safety written ──────────────────────────────
  {
    id: "iw-009",
    templateId: "wt-002",
    templateTitle: "Safety Protocol Breach",
    employeeId: "fs-sani-01",
    employeeName: "Philippe Dubois",
    type: "written",
    reason: "Failure to complete required sanitation checklist for 4 consecutive shifts",
    body: warningTemplates[1].body,
    fieldValues: {
      protocol_violated: "Daily kennel sanitation and disinfection checklist",
      incident_description:
        "The sanitation log for Mar 28–31 shows Philippe's shifts have no completed checklist entries. When reviewed on Apr 1st, multiple kennels were found inadequately cleaned. This poses a direct risk to animal health.",
    },
    managerNotes:
      "Philippe stated he was 'too busy' and deprioritized the checklist. This is the first formal warning. He has been reminded that sanitation compliance is non-negotiable and a condition of employment.",
    issuedBy: "fs-owner-01",
    issuedByName: "Émilie Laurent",
    issuedAt: "2026-04-02T16:00:00Z",
    witnessName: "Nathalie Côté",
    departmentId: "dept-sanitation",
    status: "signed",
    signedAt: "2026-04-02T16:45:00Z",
    signatureData: MOCK_SIG,
    ipAddress: "192.168.1.55",
    deviceId: "fp-c7a1b3e9",
    timezone: "America/Toronto",
  },
  // ── iw-010: Noémie Fortin — verbal conduct ────────────────────────────────
  {
    id: "iw-010",
    templateId: "wt-003",
    templateTitle: "Conduct & Professionalism",
    employeeId: "fs-train-02",
    employeeName: "Noémie Fortin",
    type: "verbal",
    reason: "Dismissive communication with a client during a training consultation",
    body: warningTemplates[2].body,
    fieldValues: {
      behavior_description:
        "During a training consultation on Apr 7th, Noémie was observed dismissing a client's concerns about their dog's behaviour without allowing them to finish speaking. The client left feeling unheard and filed a feedback complaint the same day.",
    },
    managerNotes:
      "First incident. Noémie was receptive and acknowledged her communication could have been more patient. No prior conduct issues. Verbal warning issued as a formal record — no further escalation at this time.",
    issuedBy: "fs-mgr-01",
    issuedByName: "Nathalie Côté",
    issuedAt: "2026-04-09T11:00:00Z",
    departmentId: "dept-training",
    status: "pending_signature",
  },
];
