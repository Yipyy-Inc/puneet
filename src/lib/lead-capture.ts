"use client";

import { useSyncExternalStore } from "react";
import { clients } from "@/data/clients";
import { facilityStaff } from "@/data/facility-staff";
import type { Client } from "@/types/client";
import type { StandaloneTask } from "@/data/work-tasks";
import {
  formatDateKey,
  type OperationsCalendarEvent,
} from "@/lib/operations-calendar";

// ============================================================================
// Lead Capture (spec 6.3 / Tasks 9–10, Tables 69–73)
//
// A mock helper that runs when external-calendar events are ingested. When an
// event carries a name/email/phone/pet, it:
//   1. Runs duplicate prevention against existing customers (email → phone).
//   2. Creates a Customer record ("Lead — Unverified") when no match is found
//      (flagged "Possible duplicate" when there was nothing to dedupe on).
//   3. Auto-creates a follow-up Task for Reception / the "Follow Up Leads"
//      permission holder, linked to the event + customer, Urgent if the
//      appointment is <24h away.
//
// TODO: back with a real customers table + tasks service when the API exists.
// ============================================================================

export interface CapturedLead {
  id: string;
  /** Existing customer id when matched, otherwise a synthetic lead id. */
  customerId: number;
  name: string;
  email?: string;
  phone?: string;
  petName?: string;
  service?: string;
  status: "Lead — Unverified";
  source: string;
  externalEventId: string;
  /** True when we couldn't dedupe (no email/phone) — needs human review. */
  possibleDuplicate: boolean;
  createdAt: string;
}

export interface LeadCaptureResult {
  customerId: number;
  linkedExisting: boolean;
  possibleDuplicate: boolean;
  lead?: CapturedLead;
  task: StandaloneTask;
}

// ── Store ────────────────────────────────────────────────────────────────────

const EMPTY_LEADS: CapturedLead[] = [];
const EMPTY_TASKS: StandaloneTask[] = [];
const EMPTY_EVENTS: OperationsCalendarEvent[] = [];
const EMPTY_IDS: string[] = [];

let leads: CapturedLead[] = [];
let followUpTasks: StandaloneTask[] = [];
// External events converted to native Yipyy bookings (Task 11): the source
// external chip is hidden and these booking events take its place.
let convertedBookings: OperationsCalendarEvent[] = [];
let convertedEventIds: string[] = [];
const processedEventIds = new Set<string>();
let nextLeadCustomerId = 900001;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCapturedLeads(): CapturedLead[] {
  return useSyncExternalStore(
    subscribe,
    () => leads,
    () => EMPTY_LEADS,
  );
}

export function useLeadFollowUpTasks(): StandaloneTask[] {
  return useSyncExternalStore(
    subscribe,
    () => followUpTasks,
    () => EMPTY_TASKS,
  );
}

/** Native booking events created by converting external leads (Task 11). */
export function useConvertedLeadBookings(): OperationsCalendarEvent[] {
  return useSyncExternalStore(
    subscribe,
    () => convertedBookings,
    () => EMPTY_EVENTS,
  );
}

/** External event ids that have been converted (hidden from the calendar). */
export function useConvertedLeadEventIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => convertedEventIds,
    () => EMPTY_IDS,
  );
}

/** Reads the captured lead for an external event (non-reactive lookup). */
export function getCapturedLeadForEvent(
  eventId: string,
): CapturedLead | undefined {
  return leads.find((lead) => lead.externalEventId === eventId);
}

/** Edits a captured lead's customer details (Table 72 "Edit Customer Info"). */
export function updateCapturedLead(
  leadId: string,
  patch: Partial<
    Pick<CapturedLead, "name" | "email" | "phone" | "petName" | "service">
  >,
): void {
  leads = leads.map((lead) =>
    lead.id === leadId ? { ...lead, ...patch } : lead,
  );
  emit();
}

// ── Parsing ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const PET_RE = /pets?:\s*([A-Za-z][\w'’-]*)/i;
const KNOWN_SERVICES = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "evaluation",
];

interface ParsedLead {
  name?: string;
  email?: string;
  phone?: string;
  petName?: string;
  service?: string;
}

function parseNameFromTitle(title: string): string | undefined {
  // "New-Client Consult — Jamie Rivera" → "Jamie Rivera"
  const dashParts = title.split(/\s[—–-]\s/);
  if (dashParts.length > 1) return dashParts[dashParts.length - 1].trim();
  return undefined;
}

function parseLead(event: OperationsCalendarEvent): ParsedLead {
  const text = [event.title, event.details, event.notes, event.customerName]
    .filter(Boolean)
    .join(" \n ");

  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.trim();
  const petName = text.match(PET_RE)?.[1] ?? event.petNames?.[0];
  const name = event.customerName ?? parseNameFromTitle(event.title);

  const lowerText = text.toLowerCase();
  const service =
    event.service && event.service !== "External"
      ? event.service
      : KNOWN_SERVICES.find((candidate) => lowerText.includes(candidate));

  return { name, email, phone, petName, service };
}

// ── Duplicate prevention ─────────────────────────────────────────────────────

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function findExistingCustomer(
  email: string | undefined,
  phone: string | undefined,
): Client | undefined {
  if (email) {
    const byEmail = clients.find(
      (client) =>
        client.email && client.email.toLowerCase() === email.toLowerCase(),
    );
    if (byEmail) return byEmail;
  }
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized.length >= 7) {
      const tail = normalized.slice(-7);
      const byPhone = clients.find(
        (client) => client.phone && normalizePhone(client.phone).endsWith(tail),
      );
      if (byPhone) return byPhone;
    }
  }
  return undefined;
}

// ── Follow-up task ───────────────────────────────────────────────────────────

/** Reception / the "Follow Up Leads" permission holder (mock: first reception). */
function leadFollowUpAssignee(): { id: string; name: string } {
  const reception = facilityStaff.find(
    (staff) =>
      staff.primaryRole === "reception" ||
      staff.additionalRoles?.includes("reception"),
  );
  if (reception) {
    return {
      id: reception.id,
      name: `${reception.firstName} ${reception.lastName}`,
    };
  }
  return { id: "reception", name: "Reception" };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function buildLeadFollowUpTask(
  event: OperationsCalendarEvent,
  parsed: ParsedLead,
  customerId: number,
  source: string,
  possibleDuplicate: boolean,
  now: Date,
): StandaloneTask {
  const assignee = leadFollowUpAssignee();
  const name = parsed.name ?? "the lead";
  const dateLabel = event.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = event.start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const servicePhrase = parsed.service
    ? `a ${parsed.service.toLowerCase()} appointment`
    : "an appointment";
  const urgent = event.start.getTime() - now.getTime() < DAY_MS;

  const description =
    `Follow up with ${name} — new lead from ${source}. ` +
    `They have ${servicePhrase} on ${dateLabel} at ${timeLabel}. ` +
    `Create a booking or confirm their visit.` +
    (possibleDuplicate
      ? " ⚠ Possible duplicate — verify against existing customers before creating."
      : "");

  const hours = `${event.start.getHours()}`.padStart(2, "0");
  const minutes = `${event.start.getMinutes()}`.padStart(2, "0");

  return {
    id: `lead-followup-${event.id}`,
    title: `Follow up with ${name} (new lead)`,
    description,
    category: "customer-service",
    priority: urgent ? "urgent" : "high",
    status: "pending",
    assignedToId: assignee.id,
    assignedToName: assignee.name,
    dueDate: formatDateKey(event.start),
    dueTime: `${hours}:${minutes}`,
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: false,
    createdAt: now.toISOString(),
    metadata: {
      phone: parsed.phone,
      leadCustomerId: customerId,
      externalEventId: event.id,
      leadSource: source,
    },
  };
}

// ── Capture entry point ──────────────────────────────────────────────────────

/**
 * Captures a lead from an ingested external-calendar event. Idempotent per
 * event id (safe to call on every ingest / re-render). Returns null when the
 * event isn't a lead or carries no contact info.
 */
export function captureLeadFromExternalEvent(
  event: OperationsCalendarEvent,
  now: Date = new Date(),
): LeadCaptureResult | null {
  if (event.type !== "external" || !event.external) return null;
  if (processedEventIds.has(event.id)) return null;

  const parsed = parseLead(event);

  // Only capture genuine leads: a flagged lead event, or one with an email.
  const isLead = event.external.leadCaptured === true || Boolean(parsed.email);
  if (!isLead || (!parsed.name && !parsed.email)) {
    processedEventIds.add(event.id);
    return null;
  }
  processedEventIds.add(event.id);

  const source = event.external.sourceLabel ?? event.external.provider;

  // 1. Duplicate prevention: match by email, else phone.
  const existing = findExistingCustomer(parsed.email, parsed.phone);

  let customerId: number;
  let linkedExisting = false;
  let possibleDuplicate = false;
  let lead: CapturedLead | undefined;

  if (existing) {
    customerId = existing.id;
    linkedExisting = true;
  } else {
    // 2. No match → create a "Lead — Unverified" customer. Flag as a possible
    //    duplicate when there was nothing (no email/phone) to dedupe on.
    possibleDuplicate = !parsed.email && !parsed.phone;
    customerId = nextLeadCustomerId++;
    lead = {
      id: `lead-${event.id}`,
      customerId,
      name: parsed.name ?? "Unknown lead",
      email: parsed.email,
      phone: parsed.phone,
      petName: parsed.petName,
      service: parsed.service,
      status: "Lead — Unverified",
      source,
      externalEventId: event.id,
      possibleDuplicate,
      createdAt: now.toISOString(),
    };
    leads = [...leads, lead];
  }

  // 3. Auto-create the follow-up task, linked to the event + customer.
  const task = buildLeadFollowUpTask(
    event,
    parsed,
    customerId,
    source,
    possibleDuplicate,
    now,
  );
  followUpTasks = [...followUpTasks, task];

  emit();

  return { customerId, linkedExisting, possibleDuplicate, lead, task };
}

/** Runs capture across a batch of ingested events (external ones are handled). */
export function ingestExternalEventsForLeads(
  events: OperationsCalendarEvent[],
  now: Date = new Date(),
): void {
  for (const event of events) {
    if (event.type === "external") {
      captureLeadFromExternalEvent(event, now);
    }
  }
}

// ── Convert to booking (Task 11 / Table 72) ──────────────────────────────────

function titleCaseWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Converts an external lead event into a native Yipyy booking event. The source
 * external event is hidden (added to `convertedEventIds`) and the returned
 * booking event takes its place on the calendar — flipping external → native.
 */
export function convertLeadToBooking(
  event: OperationsCalendarEvent,
): OperationsCalendarEvent | null {
  if (event.type !== "external") return null;
  if (convertedEventIds.includes(event.id)) return null;

  const lead = getCapturedLeadForEvent(event.id);
  const customerName = lead?.name ?? event.customerName ?? "New client";
  const petName = lead?.petName;
  const service = lead?.service ? titleCaseWord(lead.service) : "Booking";

  const bookingEvent: OperationsCalendarEvent = {
    id: `booking-lead-${event.id}`,
    sourceId: lead ? String(lead.customerId) : event.sourceId,
    type: "booking",
    subtype: "custom-service",
    title: `${service} - ${petName ?? customerName}`,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    status: "Confirmed",
    service,
    module: service,
    staff: event.staff,
    location: event.location === "Phone" ? "Front Desk" : event.location,
    unassigned: event.staff === "Unassigned",
    clientId: lead?.customerId,
    customerName,
    petNames: petName ? [petName] : [],
    // A converted lead becomes a phone/staff-created native booking.
    bookingSource: "staff",
    requiresCheckInOut: true,
    allowsAddOns: true,
    petTags: [],
    customerTags: [],
    bookingTags: [],
    addOns: [],
    href: "/facility/dashboard/bookings",
  };

  convertedBookings = [...convertedBookings, bookingEvent];
  convertedEventIds = [...convertedEventIds, event.id];
  emit();

  return bookingEvent;
}
