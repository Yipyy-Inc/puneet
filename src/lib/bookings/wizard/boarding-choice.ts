import type { BoardingDefaultAddOn } from "@/lib/pricing/boarding-default-addons";

/**
 * A boarding service as the wizard's Room type step chose it (the client's
 * mock, 2026-10-01): its row, name and price, the lodging types it may be
 * booked into, what a stay of it includes, and the rate for each pet after the
 * first sharing one room. Moved here from the old boarding details screen when
 * that screen was deleted (2026-10-02).
 */
export interface ChosenBoardingService {
  rowId: string;
  name: string;
  price: number;
  unit: "night" | "day";
  lodgingTypeIds: string[];
  /** What a stay of it gets by its length, billed as add-on lines. */
  defaultAddOns: BoardingDefaultAddOn[];
  /** Each pet after the first sharing one room; null = the room, once. */
  additionalPetPrice?: number | null;
}
