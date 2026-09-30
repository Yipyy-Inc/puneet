"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { GroomingAddOnOption } from "@/app/api/grooming/add-ons/route";
import { addOnPetFacts, offeredForPets } from "@/lib/add-ons/availability";
import { addOnRef } from "@/lib/add-ons/bookable";
import { useBookingLocationId } from "@/lib/add-ons/use-offered-add-ons";
import { breedQueries } from "@/lib/api/breeds";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import { useGroomingMenu } from "@/lib/api/grooming-catalogue";

// ============================================================================
// THE GROOMING ADD-ONS A BOOKING MAY OFFER (2026-09-26).
//
// Grooming offered add-ons from two lists once they were one table: the
// groom's own list (`/api/grooming/add-ons`) and every add-on for "grooming"
// from `useServiceAddOns`, per pet. An add-on for all services sat in both
// and could be charged twice, and only the first reached `create_booking`,
// the ready-time trigger and the server's price. So the groom has ONE list —
// the add-ons list itself — decided by the same rules as every other
// service: active, at this location, for the chosen grooming service, and
// for every pet on the booking.
//
// Each add-on is quoted at the booking LOCATION'S price and minutes, as on
// every other service, since 2026-09-30: a groom's add-on is now a bill line
// the database prices from the catalogue at the booking's location
// (`private.add_on_for_booking`), and the wizard must quote what the bill
// will say. Until then `create_booking` recorded it at its own price, so the
// override was left out here on purpose.
//
// The booking screen and its details step both call this with the same pets
// and service, so the list priced is the list offered.
// ============================================================================

/** A grooming add-on as offered, with what the owner is shown about it. */
export interface GroomingAddOnOffer extends GroomingAddOnOption {
  description: string;
  imageUrl: string | null;
}

const NO_BREEDS: { name: string; species: string }[] = [];
const NO_OFFERS: GroomingAddOnOffer[] = [];

export function useGroomingAddOnOffer({
  packageId,
  pets,
  asCustomer = false,
}: {
  /** The chosen grooming service's id as the menu names it (legacy or uuid). */
  packageId?: string | null;
  pets: readonly {
    type?: string | null;
    breed?: string | null;
    weight?: number | null;
    coatType?: string | null;
  }[];
  asCustomer?: boolean;
}): GroomingAddOnOffer[] {
  const { addOns: catalogue } = useServiceAddOns();
  const locationId = useBookingLocationId();
  // The same menu query the booking screen and the details step already
  // hold, so this costs no request. Only the row's uuid is read from it.
  const { data: menu } = useGroomingMenu({ asCustomer });
  const { data: breeds = NO_BREEDS } = useQuery(breedQueries.all());

  // A service reference names the row's uuid; the menu's id may be a legacy
  // one. Nothing chosen yet means any grooming service counts.
  const serviceId = packageId
    ? (menu?.find((p) => p.id === packageId)?.rowId ?? null)
    : null;

  return useMemo(() => {
    const offered = offeredForPets(
      catalogue,
      { careType: "grooming", serviceId, locationId, breeds },
      pets.map(addOnPetFacts),
    );
    if (offered.length === 0) return NO_OFFERS;
    return offered.map(({ addOn, terms }) => ({
      id: addOnRef(addOn),
      name: addOn.name,
      price: terms.price,
      duration: terms.durationMin,
      description: addOn.description,
      imageUrl: addOn.imageUrl,
    }));
  }, [catalogue, serviceId, locationId, breeds, pets]);
}
