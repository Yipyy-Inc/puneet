import { admittedSpecies } from "@/lib/capacity-engine";
import { sameSpecies } from "@/lib/settings/species";
import type { RoomCategory } from "@/types/rooms";

/** Why a drop on the kennel board is refused, so the screen can say it. */
export type DropRefusal = "ineligible" | "species" | "rate" | "taken" | "full";

/**
 * Null when the occupant may be dropped into this kennel, otherwise why not.
 *
 * It was a `canDrop` returning a bare `false`, and the board ignored the drop
 * without a word — a guest dragged to the wrong kind of kennel simply sprang
 * back. The override passes everything, as it always has.
 */
export function dropRefusal({
  category,
  capacity,
  pet,
  assignedPetIds,
  allowOverride,
  takenByAnotherStay,
}: {
  category: RoomCategory | undefined;
  capacity: number;
  pet: {
    eligible: boolean;
    petType: string;
    /** The room types the occupant's rate books into; absent means any. */
    allowedCategoryIds?: readonly string[];
  };
  assignedPetIds: number[];
  allowOverride: boolean;
  takenByAnotherStay: boolean;
}): DropRefusal | null {
  if (allowOverride) return null;
  if (!pet.eligible) return "ineligible";
  const admits = admittedSpecies(category?.rules ?? []);
  if (admits && !admits.some((name) => sameSpecies(name, pet.petType))) {
    return "species";
  }
  // The rate names its room types; a kennel of another type is the override's.
  if (
    pet.allowedCategoryIds &&
    pet.allowedCategoryIds.length > 0 &&
    category &&
    !pet.allowedCategoryIds.includes(category.id)
  ) {
    return "rate";
  }
  // `assignedPetIds` only ever describes THIS booking, so this line was never
  // a capacity rule — it could not see another guest. `takenByAnotherStay`
  // comes from /api/boarding/rooms and is what the exclusion constraint on
  // boarding_stays will judge, so the board and the save agree.
  if (takenByAnotherStay) return "taken";
  if (assignedPetIds.length >= capacity) return "full";
  return null;
}
