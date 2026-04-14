import { NextRequest, NextResponse } from "next/server";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { estimates } from "@/data/estimates";
import { formatBookingRef } from "@/lib/booking-id";

type SearchEntityType = "pet" | "customer" | "booking" | "estimate" | "invoice";

type SearchResult = {
  entityType: SearchEntityType;
  id: string;
  href: string;
  primaryText: string;
  secondaryText: string;
  score: number;
};

const normalize = (value: string) => value.toLowerCase().trim();

const normalizeLoose = (value: string) =>
  normalize(value).replace(/[^a-z0-9]/g, "");

const getMatchScore = (tokens: string[], query: string, looseQuery: string) => {
  let best = 0;

  for (const token of tokens) {
    const normalized = normalize(token);
    const loose = normalizeLoose(token);

    if (normalized === query || loose === looseQuery) {
      best = Math.max(best, 120);
      continue;
    }

    if (normalized.startsWith(query) || loose.startsWith(looseQuery)) {
      best = Math.max(best, 90);
      continue;
    }

    if (normalized.includes(query) || loose.includes(looseQuery)) {
      best = Math.max(best, 60);
    }
  }

  return best;
};

const parseLimit = (rawLimit: string | null) => {
  const parsed = Number(rawLimit ?? "10");
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
};

const unique = (values: Array<string | undefined | null>) =>
  Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = normalize(searchParams.get("q") ?? "");
  const looseQuery = normalizeLoose(query);
  const limit = parseLimit(searchParams.get("limit"));

  if (!query || !looseQuery) {
    return NextResponse.json({ results: [], hasMore: false });
  }

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const petById = new Map(
    clients.flatMap((client) =>
      client.pets.map((pet) => [pet.id, { pet, client }] as const),
    ),
  );

  const results: SearchResult[] = [];

  for (const client of clients) {
    const tokens = unique([
      client.name,
      client.email,
      client.phone,
      String(client.id),
      `client ${client.id}`,
      `customer ${client.id}`,
    ]);

    const score = getMatchScore(tokens, query, looseQuery);
    if (score === 0) continue;

    results.push({
      entityType: "customer",
      id: String(client.id),
      href: `/facility/dashboard/clients/${client.id}`,
      primaryText: client.name,
      secondaryText: `Customer • ${client.email} • Client ID ${client.id}`,
      score,
    });
  }

  for (const client of clients) {
    for (const pet of client.pets) {
      const tokens = unique([
        pet.name,
        pet.breed,
        pet.type,
        pet.microchip,
        String(pet.id),
        `pet ${pet.id}`,
        client.name,
      ]);

      const score = getMatchScore(tokens, query, looseQuery);
      if (score === 0) continue;

      results.push({
        entityType: "pet",
        id: String(pet.id),
        href: `/facility/dashboard/clients/${client.id}?pet=${pet.id}`,
        primaryText: pet.name,
        secondaryText: `Pet • ${pet.breed} • Owner ${client.name} • Pet ID ${pet.id}`,
        score: score + 2,
      });
    }
  }

  for (const booking of bookings) {
    const bookingRef = formatBookingRef(booking.id);
    const client = clientById.get(booking.clientId);

    const petIds = Array.isArray(booking.petId)
      ? booking.petId
      : booking.petId != null
        ? [booking.petId]
        : [];

    const petNames = petIds
      .map((petId) => petById.get(petId)?.pet.name)
      .filter((name): name is string => Boolean(name));

    const tokens = unique([
      String(booking.id),
      bookingRef,
      `booking ${booking.id}`,
      `booking ${bookingRef}`,
      booking.service,
      booking.serviceType,
      client?.name,
      ...petNames,
      booking.invoice?.id,
    ]);

    const score = getMatchScore(tokens, query, looseQuery);
    if (score > 0) {
      results.push({
        entityType: "booking",
        id: String(booking.id),
        href: `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
        primaryText: `Booking ${bookingRef}`,
        secondaryText: `${client?.name ?? `Client ${booking.clientId}`} • ${petNames.join(", ") || "No pets"} • ${booking.service}`,
        score: score + 4,
      });
    }

    if (booking.invoice?.id) {
      const invoiceTokens = unique([
        booking.invoice.id,
        `invoice ${booking.invoice.id}`,
        bookingRef,
        client?.name,
      ]);

      const invoiceScore = getMatchScore(invoiceTokens, query, looseQuery);
      if (invoiceScore === 0) continue;

      results.push({
        entityType: "invoice",
        id: booking.invoice.id,
        href: `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
        primaryText: `Invoice #${booking.invoice.id}`,
        secondaryText: `Booking ${bookingRef} • ${client?.name ?? `Client ${booking.clientId}`}`,
        score: invoiceScore + 1,
      });
    }
  }

  for (const estimate of estimates) {
    const tokens = unique([
      estimate.estimateId,
      estimate.id,
      `estimate ${estimate.estimateId}`,
      `estimate ${estimate.id}`,
      estimate.clientName,
      estimate.clientEmail,
      estimate.service,
      estimate.serviceType,
      estimate.convertedBookingId != null
        ? String(estimate.convertedBookingId)
        : undefined,
      estimate.convertedBookingId != null
        ? formatBookingRef(estimate.convertedBookingId)
        : undefined,
    ]);

    const score = getMatchScore(tokens, query, looseQuery);
    if (score === 0) continue;

    results.push({
      entityType: "estimate",
      id: estimate.id,
      href: `/facility/dashboard/estimates?q=${encodeURIComponent(estimate.estimateId)}`,
      primaryText: `Estimate ${estimate.estimateId}`,
      secondaryText: `${estimate.clientName} • ${estimate.service} • ${estimate.status}`,
      score: score + 3,
    });
  }

  const sorted = results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.primaryText.localeCompare(b.primaryText);
  });

  const paged = sorted.slice(0, limit);
  return NextResponse.json({
    results: paged.map(({ score, ...result }) => result),
    hasMore: sorted.length > limit,
  });
}
