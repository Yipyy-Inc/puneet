"use client";

import * as React from "react";

import { BOOKING_REQUESTS, type BookingRequest } from "@/data/booking-requests";

const STORAGE_KEY = "booking_requests_store_v1";

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isBookingRequest(value: unknown): value is BookingRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.facilityId === "number" &&
    typeof v.createdAt === "string" &&
    typeof v.appointmentAt === "string" &&
    typeof v.clientId === "number" &&
    typeof v.clientName === "string" &&
    typeof v.clientContact === "string" &&
    typeof v.petId === "number" &&
    typeof v.petName === "string" &&
    Array.isArray(v.services) &&
    typeof v.status === "string"
  );
}

function loadInitial(): BookingRequest[] {
  if (typeof window === "undefined") return BOOKING_REQUESTS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return BOOKING_REQUESTS;
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return BOOKING_REQUESTS;
  const valid = parsed.filter(isBookingRequest);
  return valid.length > 0 ? valid : BOOKING_REQUESTS;
}

export function useBookingRequestsStore() {
  const [requests, setRequests] = React.useState<BookingRequest[]>(loadInitial);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch {
      // ignore write errors (e.g. storage disabled)
    }
  }, [requests]);

  return { requests, setRequests };
}

