export type FacilityRoomService =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training";

/**
 * The rules `petMatchesRules` reads, and the only ones the database admits
 * (`room_category_rules_are_read`, 20260925164457). How many pets share a
 * room is the class's `defaultCapacity`, not a rule.
 */
export type RoomRuleType = "max_weight" | "min_weight" | "pet_type";

export interface RoomRule {
  id: string;
  type: RoomRuleType;
  /**
   * Weight rules → pounds. `pet_type` → the facility's own species names,
   * one or several (see `admittedSpecies`).
   */
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
  /**
   * The row's uuid, as distinct from the app `id` above.
   *
   * `id` is `legacy_id ?? uuid`, so for every real category it is a string
   * like `cat-suite`. `boarding_services.lodging_type_ids` is a `uuid[]` —
   * Postgres cannot hold `cat-suite` in a uuid column — so a comparison
   * between the two must go through THIS field. Both are `string`, so getting
   * it wrong typechecks and matches nothing.
   *
   * Optional because a caller building a draft category has no uuid yet.
   */
  rowId?: string;
  /**
   * A LABEL, not a scope — `/api/rooms` stamps the facility's own `legacyRef`
   * here (0 for one created since the mock era), and the rows key on a uuid.
   * Optional because a caller building a draft has no number to invent: the
   * write derives the facility from the session. Never filter by it.
   */
  facilityId?: number;
  service: FacilityRoomService;
  name: string;
  description?: string;
  color: RoomCategoryColor;
  sortOrder: number;
  rules: RoomRule[];
  /**
   * MoeGo Space type: how this lodging type counts capacity.
   *
   * `room` — "Capacity is based on individual rooms. Once a pet (or pet
   * family) is assigned to a lodging, it is considered fully occupied. (Only
   * one family per room)"
   *
   * `area` — "Capacity is based on the number of pets. An area remains
   * available until the number of assigned pets reaches the maximum limit."
   *
   * Optional here and `not null default room` in Postgres, so a row read back
   * before the column existed is a room — which is what every one of them was.
   */
  spaceType?: "room" | "area";
  /**
   * MoeGo "Max # of pets per area" — pets at once, regardless of family.
   *
   * Only for an area, and REQUIRED for one: the database refuses an area
   * without it and a room that carries one (room_categories_area_max_pets),
   * so there is never a stale number here that decides nothing.
   */
  maxPetsPerArea?: number;
  /**
   * Pets per unit. For a room type this is MoeGo's "Max # of Pets (same
   * family) per room"; an area counts with `maxPetsPerArea` instead.
   */
  defaultCapacity: number;
  defaultBasePrice?: number;
  /**
   * Whether a stay in this class is charged the facility's tax.
   *
   * Optional here and `not null default true` in Postgres: absent means TAXED,
   * everywhere, in every direction. See lib/payments/service-tax.ts.
   */
  taxable?: boolean;
  /** Whether this category is shown in the client-facing booking flow */
  visibleToClients: boolean;
  /** Cover photo shown to clients in booking flow */
  imageUrl?: string;
  /**
   * Whether the category is currently offered.
   *
   * Added for daycare play areas, which close seasonally. Boarding categories
   * are all active and nothing turns one off today.
   */
  active: boolean;
  /**
   * A branch's own nightly rate for this category, replacing
   * `defaultBasePrice` for that branch only. Boarding only -- daycare shares
   * this table but has no per-location price table backing it, so this is
   * always `[]` for a daycare category.
   */
  locationPricing: { locationId: string; price: number }[];
}

export interface FacilityRoom {
  id: string;
  categoryId: string;
  /** A LABEL, not a scope — see `RoomCategory.facilityId`. */
  facilityId?: number;
  name: string;
  active: boolean;
  /** Overrides category defaultCapacity when set */
  capacity?: number;
  /** Staff-only notes (not shown to clients) */
  staffNotes?: string;
  /** Photo of this specific room unit */
  imageUrl?: string;
  /** Customer-facing description. Distinct from `staffNotes`, which is not. */
  description?: string;
  /**
   * Eligibility rules for this specific room.
   *
   * For BOARDING these live on the category and this stays empty. For DAYCARE
   * two sections of one yard admit different weights, so they belong here.
   */
  rules: RoomRule[];
  /** Swatch, for the sections of a daycare yard. */
  color?: RoomCategoryColor;
}

// ── Daycare Play Areas & Sections ─────────────────────────────────────────────

/**
 * A play area is a named location within the facility (e.g. "Indoor Park", "Outdoor Yard").
 * It contains one or more sections, each with its own capacity and eligibility rules.
 */
export interface DaycarePlayArea {
  id: string;
  /** A LABEL, not a scope — derived from the room category it reads. */
  facilityId?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * A section is a subdivision of a play area (e.g. "Small Dogs", "Big Dogs").
 * Each section has a per-day capacity and optional weight/type rules.
 */
export interface DaycareSection {
  id: string;
  playAreaId: string;
  /** A LABEL, not a scope — see `DaycarePlayArea.facilityId`. */
  facilityId?: number;
  name: string;
  /** Maximum number of pets per day */
  capacity: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  rules: RoomRule[];
  color: RoomCategoryColor;
}

// ── Grooming ──────────────────────────────────────────────────────────────────

export type GroomingStationType =
  | "table"
  | "tub"
  | "cage_dryer"
  | "stand_dryer";

export type GroomingStationStatus =
  | "available"
  | "in-use"
  | "needs-cleaning"
  | "out-of-service";

/** Canonical pet sizes used for station size eligibility. Mirrors petSizeEnum in @/types/base. */
export type GroomingStationPetSize = "small" | "medium" | "large" | "giant";

export interface GroomingStation {
  id: string;
  /**
   * Fixture-only; absent on a station read from Postgres.
   *
   * `/api/grooming/stations` used to stamp `11` onto every real row it
   * returned, for one reason: the client filtered `s.facilityId === 11`
   * afterwards, so the route had to report the number the filter expected. The
   * filter was redundant — the query is already scoped by
   * `activeFacilityIdForStaff()` and RLS — so a route was reporting a false
   * facility to satisfy a check that could not fail. Both are gone.
   */
  facilityId?: number;
  type: GroomingStationType;
  name: string;
  active: boolean;
  maxWeightLbs?: number;
  petTypes?: ("dog" | "cat")[];
  /**
   * Which pet sizes this station can accept. Empty / undefined means
   * multi-purpose (accepts every size). Booking flow filters stations by
   * this list so a Great Dane never lands on a small-dog table.
   */
  allowedPetSizes?: GroomingStationPetSize[];
  staffNotes?: string;
  /** Photo of this station */
  imageUrl?: string;
  /** Real-time station status — defaults to "available" */
  status?: GroomingStationStatus;
  /** When in-use, the pet and groomer currently at this station */
  currentPetName?: string;
  currentStylistName?: string;
  /** ISO timestamp of last status change (drives "X min ago" labels) */
  statusChangedAt?: string;
  /** ISO timestamp of the in-use appointment's expected end (drives "Done at HH:MM" on the board) */
  estimatedCompletionAt?: string;
}
