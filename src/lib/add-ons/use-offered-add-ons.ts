"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLocationContext } from "@/hooks/use-location-context";
import {
  addOnFor,
  addOnPetFacts,
  offeredForPets,
} from "@/lib/add-ons/availability";
import { breedQueries } from "@/lib/api/breeds";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import type { ServiceAddOn } from "@/types/facility";

// ============================================================================
// THE ADD-ONS A BOOKING SCREEN OFFERS, AND THE PRICES IT ADDS (2026-09-26).
//
// Two questions with two answers, both from `lib/add-ons/availability.ts`:
//
//   OFFERED — what a picker shows: active, at the booking's location, for the
//   chosen service, and for every pet on the booking. The reference's rules.
//
//   PRICED — what the total adds for a line already on the booking: every
//   live add-on for this TYPE of service, at the booking location's price.
//   The server's re-price (`lib/bookings/price-booking.ts`) applies exactly
//   this, so a booking the wizard quoted is a booking the server agrees with.
//   The narrower offer never reaches money: a picker that hides an add-on
//   cannot put it on a line, and a line that should not be there disagrees
//   with the server and stays a request.
//
// Both come back in the old `ServiceAddOn` shape the booking screens render,
// with the location's price, tax and minutes in place of the add-on's own.
// ============================================================================

const NO_BREEDS: { name: string; species: string }[] = [];

/**
 * Where a booking made on this screen lands. Staff: the switcher's location,
 * else the primary one — what `chooseLocation` does with the header the
 * booking is sent with. A pet owner: the primary one, as the add-ons route
 * reports it.
 */
export function useBookingLocationId(): string | null {
  const { currentLocation, locations } = useLocationContext();
  const { bookingLocationId } = useServiceAddOns();
  return (
    currentLocation?.id ??
    bookingLocationId ??
    locations.find((l) => l.isPrimary)?.id ??
    null
  );
}

type PetLike = {
  type?: string | null;
  breed?: string | null;
  weight?: number | null;
  coatType?: string | null;
};

/** What a picker offers. See the header. */
export function useOfferedAddOns({
  careType,
  serviceId,
  pets,
}: {
  careType: string;
  /** The chosen service's row uuid; null or absent while none is chosen. */
  serviceId?: string | null;
  pets: readonly PetLike[];
}): ServiceAddOn[] {
  const { addOns: legacy, catalogue } = useServiceAddOns();
  const locationId = useBookingLocationId();
  const { data: breeds = NO_BREEDS } = useQuery(breedQueries.all());

  return useMemo(() => {
    const byId = new Map(legacy.map((addOn) => [addOn.id, addOn]));
    return offeredForPets(
      catalogue,
      { careType, serviceId, locationId, breeds },
      pets.map(addOnPetFacts),
    ).flatMap(({ addOn, terms }) => {
      const old = byId.get(addOn.legacyId ?? addOn.id);
      return old
        ? [
            {
              ...old,
              price: terms.price,
              taxable: terms.taxable,
              duration: terms.durationMin > 0 ? terms.durationMin : undefined,
            },
          ]
        : [];
    });
  }, [legacy, catalogue, careType, serviceId, locationId, breeds, pets]);
}

/** What the total adds. See the header. */
export function usePricedAddOns(careType: string): ServiceAddOn[] {
  const { addOns: legacy, catalogue } = useServiceAddOns();
  const locationId = useBookingLocationId();

  return useMemo(() => {
    const byId = new Map(legacy.map((addOn) => [addOn.id, addOn]));
    return catalogue.flatMap((addOn) => {
      const terms = addOnFor(addOn, { careType, locationId });
      const old = byId.get(addOn.legacyId ?? addOn.id);
      return terms.unavailable === null && old
        ? [
            {
              ...old,
              price: terms.price,
              taxable: terms.taxable,
              duration: terms.durationMin > 0 ? terms.durationMin : undefined,
            },
          ]
        : [];
    });
  }, [legacy, catalogue, careType, locationId]);
}
