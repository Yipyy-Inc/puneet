export type FacilityRoomService = "boarding" | "daycare" | "grooming" | "training";

export type RoomRuleType =
  | "max_weight"
  | "min_weight"
  | "pet_type"
  | "max_pets"
  | "single_pet_only"
  | "size_restriction";

export interface RoomRule {
  id: string;
  type: RoomRuleType;
  /** weight rules → number (lbs) | pet_type → string | size → string | count → number */
  value: number | string | string[];
  /** Message shown to clients when this rule blocks their booking */
  clientMessage: string;
  enabled: boolean;
}

export type RoomCategoryColor =
  | "amber"
  | "violet"
  | "blue"
  | "emerald"
  | "rose"
  | "orange"
  | "indigo"
  | "slate";

export interface RoomCategory {
  id: string;
  facilityId: number;
  service: FacilityRoomService;
  name: string;
  description?: string;
  color: RoomCategoryColor;
  sortOrder: number;
  rules: RoomRule[];
  /** Default capacity per unit (can be overridden per unit) */
  defaultCapacity: number;
  defaultBasePrice?: number;
  /** Whether this category is shown in the client-facing booking flow */
  visibleToClients: boolean;
  /** Cover photo shown to clients in booking flow */
  imageUrl?: string;
}

export interface FacilityRoom {
  id: string;
  categoryId: string;
  facilityId: number;
  name: string;
  active: boolean;
  /** Overrides category defaultCapacity when set */
  capacity?: number;
  /** Staff-only notes (not shown to clients) */
  staffNotes?: string;
  /** Photo of this specific room unit */
  imageUrl?: string;
}

export type GroomingStationType = "table" | "tub" | "cage_dryer" | "stand_dryer";

export interface GroomingStation {
  id: string;
  facilityId: number;
  type: GroomingStationType;
  name: string;
  active: boolean;
  maxWeightLbs?: number;
  petTypes?: ("dog" | "cat")[];
  staffNotes?: string;
  /** Photo of this station */
  imageUrl?: string;
}
