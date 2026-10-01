// ============================================================================
// The care instructions of pets the booking form did not load.
//
// The edit wizard opens a booking with its FIRST pet only (BookingEditDialog
// passes one pet id), and the Medications and Feeding steps book only the
// pets they show — so editing a two-pet booking sent its medications and
// feeding without the second pet's, and the save wrote that over them
// (2026-10-01). An edit keeps those items exactly as they were stored.
//
// An item with no pet belongs to the first pet shown, as the old single-pet
// form wrote it, so it is not another pet's.
// ============================================================================

export function itemsForOtherPets<T extends { petId?: number }>(
  stored: readonly T[],
  shownPetIds: readonly number[],
): T[] {
  const firstPetId = shownPetIds[0];
  return stored.filter((item) => {
    const owner = item.petId ?? firstPetId;
    return owner === undefined || !shownPetIds.includes(owner);
  });
}
