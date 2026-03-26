// ========================================
// EMAIL & SMS CAMPAIGN DATA
// ========================================

import { defaultCustomServiceModules } from "@/data/custom-services";

// ----------------------------------------
// Segment Filter System (AND/OR Groups)
// ----------------------------------------

export type SegmentFilterCategory =
  | "service"
  | "pet"
  | "frequency"
  | "booking"
  | "compliance"
  | "spending"
  | "friends";

export type SegmentFilterOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "in"
  | "not_in"
  | "between"
  | "contains"
  | "is_true"
  | "is_false";

export interface SegmentFilter {
  id: string;
  category: SegmentFilterCategory;
  field: string;
  operator: SegmentFilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface FilterGroup {
  id: string;
  filters: SegmentFilter[];
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  filterGroups: FilterGroup[];
  groupLogicOperator: "AND" | "OR";
  customerCount: number;
  isFavorite: boolean;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

// Filter field definitions for the segment builder UI
export interface SegmentFilterFieldDef {
  field: string;
  label: string;
  category: SegmentFilterCategory;
  operators: SegmentFilterOperator[];
  valueType:
    | "number"
    | "text"
    | "select"
    | "multi_select"
    | "date"
    | "date_range"
    | "boolean"
    | "pet_select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
}

// Auto-detect custom services and merge with core services
const CORE_SERVICE_OPTIONS = [
  { value: "daycare", label: "Daycare" },
  { value: "boarding", label: "Boarding" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
];
const CUSTOM_SERVICE_OPTIONS = defaultCustomServiceModules.map((m) => ({
  value: m.slug,
  label: m.name,
}));
export const ALL_SERVICE_OPTIONS = [
  ...CORE_SERVICE_OPTIONS,
  ...CUSTOM_SERVICE_OPTIONS,
];

export function getAlertStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" {
  if (status === "sent") return "default";
  if (status === "suppressed") return "secondary";
  return "destructive";
}

export function formatAlertChannel(channel: string): string {
  if (channel === "sms") return "SMS";
  if (channel === "in_app") return "In-App";
  return "Email";
}

export const SEGMENT_FILTER_FIELDS: SegmentFilterFieldDef[] = [
  // Service filters (auto-includes custom services)
  {
    field: "has_booked_service",
    label: "Has booked service",
    category: "service",
    operators: ["equals"],
    valueType: "select",
    options: ALL_SERVICE_OPTIONS,
  },
  {
    field: "booked_service_within_days",
    label: "Booked service within last X days",
    category: "service",
    operators: ["equals", "less_than", "greater_than"],
    valueType: "number",
    unit: "days",
  },
  {
    field: "last_booking_for_service",
    label: "Last booking for service",
    category: "service",
    operators: ["equals", "greater_than", "less_than"],
    valueType: "select",
    options: ALL_SERVICE_OPTIONS,
  },
  {
    field: "upcoming_booking_for_service",
    label: "Has upcoming booking for",
    category: "service",
    operators: ["equals"],
    valueType: "select",
    options: ALL_SERVICE_OPTIONS,
  },
  {
    field: "overdue_for_service",
    label: "Overdue for service (weeks)",
    category: "service",
    operators: ["greater_than"],
    valueType: "number",
    unit: "weeks",
  },
  {
    field: "recurring_customer",
    label: "Is recurring customer",
    category: "service",
    operators: ["is_true", "is_false"],
    valueType: "boolean",
  },

  // Pet filters
  {
    field: "pet_size",
    label: "Pet size",
    category: "pet",
    operators: ["equals", "in"],
    valueType: "select",
    options: [
      { value: "small", label: "Small (0-15 lbs)" },
      { value: "medium", label: "Medium (16-50 lbs)" },
      { value: "large", label: "Large (51-100 lbs)" },
      { value: "extra_large", label: "Extra Large (101+ lbs)" },
    ],
  },
  {
    field: "pet_breed",
    label: "Pet breed",
    category: "pet",
    operators: ["equals", "in", "contains"],
    valueType: "multi_select",
    options: [
      { value: "Golden Retriever", label: "Golden Retriever" },
      { value: "Labrador", label: "Labrador" },
      { value: "Beagle", label: "Beagle" },
      { value: "Poodle", label: "Poodle" },
      { value: "German Shepherd", label: "German Shepherd" },
      { value: "Collie", label: "Collie" },
      { value: "Border Collie", label: "Border Collie" },
      { value: "Corgi", label: "Corgi" },
      { value: "Husky", label: "Husky" },
      { value: "Australian Shepherd", label: "Australian Shepherd" },
      { value: "Mixed", label: "Mixed" },
      { value: "Goldendoodle", label: "Goldendoodle" },
      { value: "Labradoodle", label: "Labradoodle" },
      { value: "French Bulldog", label: "French Bulldog" },
      { value: "Bulldog", label: "Bulldog" },
      { value: "Boxer", label: "Boxer" },
      { value: "Rottweiler", label: "Rottweiler" },
      { value: "Siamese", label: "Siamese" },
      { value: "Persian", label: "Persian" },
      { value: "Bengal", label: "Bengal" },
      { value: "Maine Coon", label: "Maine Coon" },
      { value: "Ragdoll", label: "Ragdoll" },
    ],
  },
  {
    field: "pet_age_range",
    label: "Pet age range",
    category: "pet",
    operators: ["equals"],
    valueType: "select",
    options: [
      { value: "puppy", label: "Puppy (< 1 year)" },
      { value: "adult", label: "Adult (1-7 years)" },
      { value: "senior", label: "Senior (7+ years)" },
    ],
  },
  {
    field: "multi_pet_household",
    label: "Multi-pet household (2+ pets)",
    category: "pet",
    operators: ["is_true", "is_false"],
    valueType: "boolean",
  },

  // Frequency / recency filters
  {
    field: "visited_in_last_days",
    label: "Visited in last X days",
    category: "frequency",
    operators: ["equals", "less_than", "greater_than"],
    valueType: "number",
    unit: "days",
    placeholder: "e.g. 30",
  },
  {
    field: "no_visit_in_days",
    label: "No visit in X days (inactive)",
    category: "frequency",
    operators: ["greater_than"],
    valueType: "number",
    unit: "days",
    placeholder: "e.g. 60",
  },
  {
    field: "visit_count_in_days",
    label: "Number of visits in last X days",
    category: "frequency",
    operators: ["greater_than", "less_than", "equals", "between"],
    valueType: "number",
    placeholder: "e.g. 5",
  },
  {
    field: "last_booking_date_range",
    label: "Last booking date",
    category: "frequency",
    operators: ["between", "greater_than", "less_than"],
    valueType: "date_range",
  },

  // Booking filters
  {
    field: "has_upcoming_in_days",
    label: "Has upcoming booking in next X days",
    category: "booking",
    operators: ["less_than", "equals"],
    valueType: "number",
    unit: "days",
  },
  {
    field: "no_upcoming_booking",
    label: "Has no upcoming booking",
    category: "booking",
    operators: ["is_true"],
    valueType: "boolean",
  },
  {
    field: "upcoming_booking_type",
    label: "Upcoming booking type",
    category: "booking",
    operators: ["equals", "in"],
    valueType: "select",
    options: ALL_SERVICE_OPTIONS,
  },
  {
    field: "upcoming_date_range",
    label: "Upcoming booking date range",
    category: "booking",
    operators: ["between"],
    valueType: "date_range",
  },

  // Compliance filters
  {
    field: "vaccination_expiring_in_days",
    label: "Vaccination expiring in X days",
    category: "compliance",
    operators: ["less_than"],
    valueType: "number",
    unit: "days",
  },
  {
    field: "missing_vaccine_type",
    label: "Missing vaccine type",
    category: "compliance",
    operators: ["equals"],
    valueType: "select",
    options: [
      { value: "Rabies", label: "Rabies" },
      { value: "DHPP", label: "DHPP" },
      { value: "Bordetella", label: "Bordetella" },
      { value: "Leptospirosis", label: "Leptospirosis" },
      { value: "FVRCP", label: "FVRCP" },
    ],
  },
  {
    field: "evaluation_required",
    label: "Evaluation required but not done",
    category: "compliance",
    operators: ["is_true"],
    valueType: "boolean",
  },
  {
    field: "agreement_not_signed",
    label: "Agreement not signed / needs update",
    category: "compliance",
    operators: ["is_true"],
    valueType: "boolean",
  },

  // Frequency (additional)
  {
    field: "average_visits_per_month",
    label: "Average visits per month",
    category: "frequency",
    operators: ["greater_than", "less_than", "equals"],
    valueType: "number",
    placeholder: "e.g. 4",
  },

  // Spending filters
  {
    field: "spent_over_in_days",
    label: "Spent over $X in last Y days",
    category: "spending",
    operators: ["greater_than"],
    valueType: "number",
    unit: "dollars",
    placeholder: "e.g. 500",
  },
  {
    field: "top_spenders_percentage",
    label: "Top spenders (%)",
    category: "spending",
    operators: ["less_than", "equals"],
    valueType: "number",
    unit: "%",
  },

  // Friends filters
  {
    field: "friends_of_pet",
    label: "Friends of pet",
    category: "friends",
    operators: ["equals"],
    valueType: "pet_select",
  },
  {
    field: "mutual_friends",
    label: "Mutual friends only",
    category: "friends",
    operators: ["is_true"],
    valueType: "boolean",
  },
];

export const SEGMENT_CATEGORY_LABELS: Record<SegmentFilterCategory, string> = {
  service: "Service History",
  pet: "Pet Details",
  frequency: "Visit Frequency",
  booking: "Upcoming Bookings",
  compliance: "Compliance / Status",
  spending: "Spending Level",
  friends: "Pet Friends",
};

export const FIELD_DEF_MAP = new Map(
  SEGMENT_FILTER_FIELDS.map((f) => [f.field, f]),
);

// Migrated existing segments + 15 new built-in segments
export const customerSegments: CustomerSegment[] = [
  // Migrated existing
  {
    id: "seg-001",
    name: "VIP Customers",
    description: "Customers who spent over $1000 in the last year",
    filterGroups: [
      {
        id: "fg-001",
        filters: [
          {
            id: "f-001",
            category: "spending",
            field: "spent_over_in_days",
            operator: "greater_than",
            value: 1000,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 23,
    isFavorite: true,
    isBuiltIn: false,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-02-15T14:00:00Z",
  },
  {
    id: "seg-002",
    name: "Inactive Customers",
    description: "Customers who haven't booked in 90+ days",
    filterGroups: [
      {
        id: "fg-002",
        filters: [
          {
            id: "f-002",
            category: "frequency",
            field: "no_visit_in_days",
            operator: "greater_than",
            value: 90,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 47,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-02-20T09:00:00Z",
  },
  {
    id: "seg-003",
    name: "First-Time Customers",
    description: "Customers with only 1 booking",
    filterGroups: [
      {
        id: "fg-003",
        filters: [
          {
            id: "f-003",
            category: "frequency",
            field: "visit_count_in_days",
            operator: "equals",
            value: 1,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 34,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: "2024-01-20T13:00:00Z",
    updatedAt: "2024-02-10T10:00:00Z",
  },
  {
    id: "seg-004",
    name: "Dog Owners",
    description: "Customers with at least one dog",
    filterGroups: [
      {
        id: "fg-004",
        filters: [
          {
            id: "f-004",
            category: "pet",
            field: "pet_breed",
            operator: "contains",
            value: "dog",
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 156,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-02-01T09:00:00Z",
  },

  // Built-in service-based segments
  {
    id: "seg-005",
    name: "Grooming Regulars",
    description:
      "Customers who booked grooming at least once in the last 90 days",
    filterGroups: [
      {
        id: "fg-005",
        filters: [
          {
            id: "f-005",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "grooming",
          },
          {
            id: "f-005b",
            category: "service",
            field: "booked_service_within_days",
            operator: "less_than",
            value: 90,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 42,
    isFavorite: true,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-006",
    name: "Overdue for Grooming",
    description:
      "Grooming clients whose last groom was 6+ weeks ago with no upcoming booking",
    filterGroups: [
      {
        id: "fg-006",
        filters: [
          {
            id: "f-006a",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "grooming",
          },
          {
            id: "f-006b",
            category: "service",
            field: "overdue_for_service",
            operator: "greater_than",
            value: 6,
          },
          {
            id: "f-006c",
            category: "booking",
            field: "no_upcoming_booking",
            operator: "is_true",
            value: true,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 28,
    isFavorite: true,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-007",
    name: "Daycare Frequent Visitors",
    description: "Daycare clients with 8+ visits in the last 30 days",
    filterGroups: [
      {
        id: "fg-007",
        filters: [
          {
            id: "f-007a",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "daycare",
          },
          {
            id: "f-007b",
            category: "frequency",
            field: "visit_count_in_days",
            operator: "greater_than",
            value: 8,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 15,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-008",
    name: "Daycare Inactive 30 Days",
    description: "Daycare clients who haven't visited in 30+ days",
    filterGroups: [
      {
        id: "fg-008",
        filters: [
          {
            id: "f-008a",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "daycare",
          },
          {
            id: "f-008b",
            category: "frequency",
            field: "no_visit_in_days",
            operator: "greater_than",
            value: 30,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 38,
    isFavorite: true,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-009",
    name: "Boarding Seasonal Guests",
    description:
      "Customers who boarded during summer or holiday season last year",
    filterGroups: [
      {
        id: "fg-009",
        filters: [
          {
            id: "f-009a",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "boarding",
          },
          {
            id: "f-009b",
            category: "frequency",
            field: "last_booking_date_range",
            operator: "between",
            value: ["2025-06-01", "2025-09-01"],
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 19,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-010",
    name: "Upcoming Boarding This Week",
    description: "Customers with boarding check-ins in the next 7 days",
    filterGroups: [
      {
        id: "fg-010",
        filters: [
          {
            id: "f-010a",
            category: "booking",
            field: "upcoming_booking_type",
            operator: "equals",
            value: "boarding",
          },
          {
            id: "f-010b",
            category: "booking",
            field: "has_upcoming_in_days",
            operator: "less_than",
            value: 7,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 8,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },

  // Pet-based segments
  {
    id: "seg-011",
    name: "Large Dog Owners",
    description: "Customers with large or extra-large dogs",
    filterGroups: [
      {
        id: "fg-011",
        filters: [
          {
            id: "f-011",
            category: "pet",
            field: "pet_size",
            operator: "in",
            value: ["large", "extra_large"],
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 52,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-012",
    name: "Puppy Owners",
    description: "Customers with puppies under 1 year old",
    filterGroups: [
      {
        id: "fg-012",
        filters: [
          {
            id: "f-012",
            category: "pet",
            field: "pet_age_range",
            operator: "equals",
            value: "puppy",
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 18,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-013",
    name: "Senior Pet Owners",
    description: "Customers with senior pets (7+ years)",
    filterGroups: [
      {
        id: "fg-013",
        filters: [
          {
            id: "f-013",
            category: "pet",
            field: "pet_age_range",
            operator: "equals",
            value: "senior",
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 14,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-014",
    name: "Multi-Pet Households",
    description: "Customers with 2 or more pets",
    filterGroups: [
      {
        id: "fg-014",
        filters: [
          {
            id: "f-014",
            category: "pet",
            field: "multi_pet_household",
            operator: "is_true",
            value: true,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 31,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-015",
    name: "Doodle Owners",
    description: "Customers with Goldendoodle or Labradoodle breeds",
    filterGroups: [
      {
        id: "fg-015",
        filters: [
          {
            id: "f-015",
            category: "pet",
            field: "pet_breed",
            operator: "in",
            value: ["Goldendoodle", "Labradoodle"],
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 22,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },

  {
    id: "seg-021",
    name: "Doodles Overdue for Grooming",
    description: "Doodle breeds whose last groom was 8+ weeks ago",
    filterGroups: [
      {
        id: "fg-021a",
        filters: [
          {
            id: "f-021a",
            category: "pet",
            field: "pet_breed",
            operator: "in",
            value: ["Goldendoodle", "Labradoodle"],
          },
        ],
      },
      {
        id: "fg-021b",
        filters: [
          {
            id: "f-021b",
            category: "service",
            field: "overdue_for_service",
            operator: "greater_than",
            value: 8,
          },
          {
            id: "f-021c",
            category: "booking",
            field: "no_upcoming_booking",
            operator: "is_true",
            value: true,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 7,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },

  // Compliance segments
  {
    id: "seg-016",
    name: "Vaccination Due in 30 Days",
    description: "Customers with pets whose vaccinations expire within 30 days",
    filterGroups: [
      {
        id: "fg-016",
        filters: [
          {
            id: "f-016",
            category: "compliance",
            field: "vaccination_expiring_in_days",
            operator: "less_than",
            value: 30,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 12,
    isFavorite: true,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },

  // Spending segments
  {
    id: "seg-017",
    name: "Top 10% Spenders",
    description: "Your highest-spending customers",
    filterGroups: [
      {
        id: "fg-017",
        filters: [
          {
            id: "f-017",
            category: "spending",
            field: "top_spenders_percentage",
            operator: "less_than",
            value: 10,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 9,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },

  // Friends segments
  {
    id: "seg-018",
    name: "Buddy's Friends",
    description: "Owners of pets that are friends with Buddy",
    filterGroups: [
      {
        id: "fg-018",
        filters: [
          {
            id: "f-018",
            category: "friends",
            field: "friends_of_pet",
            operator: "equals",
            value: "1",
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 3,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-02-01T09:00:00Z",
  },

  // Complex multi-group segments
  {
    id: "seg-019",
    name: "Grooming Rebook - Large Dogs",
    description: "Large dogs overdue for grooming with no upcoming booking",
    filterGroups: [
      {
        id: "fg-019a",
        filters: [
          {
            id: "f-019a",
            category: "service",
            field: "has_booked_service",
            operator: "equals",
            value: "grooming",
          },
          {
            id: "f-019b",
            category: "service",
            field: "overdue_for_service",
            operator: "greater_than",
            value: 6,
          },
        ],
      },
      {
        id: "fg-019b",
        filters: [
          {
            id: "f-019c",
            category: "pet",
            field: "pet_size",
            operator: "in",
            value: ["large", "extra_large"],
          },
          {
            id: "f-019d",
            category: "booking",
            field: "no_upcoming_booking",
            operator: "is_true",
            value: true,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 11,
    isFavorite: true,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "seg-020",
    name: "Boarding Upsell - Add Grooming",
    description:
      "Customers with upcoming boarding who haven't booked grooming recently",
    filterGroups: [
      {
        id: "fg-020a",
        filters: [
          {
            id: "f-020a",
            category: "booking",
            field: "upcoming_booking_type",
            operator: "equals",
            value: "boarding",
          },
          {
            id: "f-020b",
            category: "booking",
            field: "has_upcoming_in_days",
            operator: "less_than",
            value: 14,
          },
        ],
      },
      {
        id: "fg-020b",
        filters: [
          {
            id: "f-020c",
            category: "service",
            field: "overdue_for_service",
            operator: "greater_than",
            value: 4,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: 6,
    isFavorite: false,
    isBuiltIn: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
];

// ----------------------------------------
// Email Templates
// ----------------------------------------

export type EmailTemplateUseCase =
  | "welcome"
  | "booking_reminder"
  | "vaccination_expiry"
  | "newsletter"
  | "birthday"
  | "grooming_rebook"
  | "daycare_promo"
  | "boarding_seasonal"
  | "win_back"
  | "referral_program"
  | "new_service"
  | "playdate_alert";

export const EMAIL_USE_CASE_LABELS: Record<
  EmailTemplateUseCase | "other",
  string
> = {
  welcome: "Welcome",
  booking_reminder: "Booking Reminder",
  vaccination_expiry: "Vaccination",
  newsletter: "Newsletter",
  birthday: "Birthday",
  grooming_rebook: "Grooming Rebook",
  daycare_promo: "Daycare Promo",
  boarding_seasonal: "Boarding Seasonal",
  win_back: "Win-Back",
  referral_program: "Referral",
  new_service: "New Service",
  playdate_alert: "Playdate Alert",
  other: "Other",
};

export const EMAIL_USE_CASE_OPTIONS: {
  value: EmailTemplateUseCase;
  label: string;
}[] = Object.entries(EMAIL_USE_CASE_LABELS)
  .filter(([k]) => k !== "other")
  .map(([value, label]) => ({ value: value as EmailTemplateUseCase, label }));

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "promotional" | "transactional" | "reminder" | "newsletter";
  useCase?: EmailTemplateUseCase;
  variables: string[];
  offerSection?: {
    headline: string;
    description: string;
    code?: string;
    expiryDays?: number;
  };
  buttonText?: string;
  buttonLink?: string;
  previewImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  timesUsed: number;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "tpl-001",
    name: "Welcome New Client",
    subject: "Welcome to {{facility_name}}!",
    body: `Hi {{customer_full_name}},\n\nWelcome to {{facility_name}}! We're thrilled to have you and {{pet_name}} join our family.\n\nAs a new client, you'll receive 10% off your first booking. Use code: WELCOME10\n\nBest regards,\nThe {{facility_name}} Team`,
    category: "promotional",
    useCase: "welcome",
    variables: ["customer_full_name", "pet_name", "facility_name"],
    offerSection: {
      headline: "Welcome Offer",
      description: "10% off your first booking",
      code: "WELCOME10",
    },
    buttonText: "Book Now",
    buttonLink: "{{booking_link}}",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    timesUsed: 45,
  },
  {
    id: "tpl-002",
    name: "Booking Reminder - 24 Hours",
    subject: "Reminder: {{pet_name}}'s appointment tomorrow",
    body: `Hi {{customer_full_name}},\n\nThis is a friendly reminder that {{pet_name}} has a {{service_name}} appointment tomorrow at {{booking_time}}.\n\nSee you soon!\n\nThe {{facility_name}} Team`,
    category: "reminder",
    useCase: "booking_reminder",
    variables: [
      "customer_full_name",
      "pet_name",
      "service_name",
      "booking_time",
      "facility_name",
    ],
    buttonText: "View Booking",
    buttonLink: "{{booking_link}}",
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-02-05T14:00:00Z",
    timesUsed: 234,
  },
  {
    id: "tpl-003",
    name: "Vaccination Expiry Warning",
    subject: "{{pet_name}}'s vaccinations need updating",
    body: `Hi {{customer_full_name}},\n\nOur records show that {{pet_name}}'s {{vaccine_name}} vaccination expires on {{expiry_date}}.\n\nPlease update their vaccination records to continue using our services.\n\nThank you,\n{{facility_name}}`,
    category: "reminder",
    useCase: "vaccination_expiry",
    variables: [
      "customer_full_name",
      "pet_name",
      "vaccine_name",
      "expiry_date",
      "facility_name",
    ],
    buttonText: "Upload Records",
    buttonLink: "{{portal_link}}",
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-01-20T11:00:00Z",
    timesUsed: 67,
  },
  {
    id: "tpl-004",
    name: "Monthly Newsletter",
    subject: "{{facility_name}} Monthly Update - {{month}}",
    body: `Hi {{customer_full_name}},\n\nHere's what's new at {{facility_name}} this month:\n\n- Special holiday hours\n- New grooming services\n- Pet care tips\n\nRead more on our website!\n\nBest,\nThe Team`,
    category: "newsletter",
    useCase: "newsletter",
    variables: ["customer_full_name", "facility_name", "month"],
    buttonText: "Read More",
    buttonLink: "{{website_link}}",
    createdAt: "2024-02-01T08:00:00Z",
    updatedAt: "2024-02-01T08:00:00Z",
    timesUsed: 12,
  },
  {
    id: "tpl-005",
    name: "Birthday Celebration",
    subject: "Happy Birthday {{pet_name}}!",
    body: `Hi {{customer_full_name}},\n\n{{pet_name}} is celebrating a birthday!\n\nEnjoy 20% off your next booking with code: BIRTHDAY20\n\nValid for 30 days.\n\nCheers,\n{{facility_name}}`,
    category: "promotional",
    useCase: "birthday",
    variables: ["customer_full_name", "pet_name", "facility_name"],
    offerSection: {
      headline: "Birthday Special",
      description: "20% off your next booking",
      code: "BIRTHDAY20",
      expiryDays: 30,
    },
    buttonText: "Book with Discount",
    buttonLink: "{{booking_link}}",
    createdAt: "2024-01-25T10:00:00Z",
    updatedAt: "2024-01-25T10:00:00Z",
    timesUsed: 89,
  },

  // New templates per spec
  {
    id: "tpl-006",
    name: "Grooming Rebook Reminder",
    subject: "Time for {{pet_name}}'s next grooming!",
    body: `Hi {{customer_full_name}},\n\nIt's been a while since {{pet_name}}'s last grooming session. Keeping a regular grooming schedule helps maintain a healthy coat and skin.\n\nBook now and keep {{pet_name}} looking their best!\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "grooming_rebook",
    variables: [
      "customer_full_name",
      "pet_name",
      "facility_name",
      "last_groom_date",
    ],
    offerSection: {
      headline: "Rebook Savings",
      description: "15% off if you book within 7 days",
      code: "GROOM15",
      expiryDays: 7,
    },
    buttonText: "Book Grooming",
    buttonLink: "{{booking_link}}",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    timesUsed: 56,
  },
  {
    id: "tpl-007",
    name: "Daycare Promo",
    subject: "{{pet_name}} is missing their friends at daycare!",
    body: `Hi {{customer_full_name}},\n\nWe haven't seen {{pet_name}} at daycare recently and their friends miss them!\n\nDaycare helps with socialization, exercise, and keeps your pup happy and tired. Come back for a play day!\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "daycare_promo",
    variables: ["customer_full_name", "pet_name", "facility_name"],
    offerSection: {
      headline: "Come Back Offer",
      description: "Buy 5 daycare days, get 1 free",
      code: "DAYCARE5FOR6",
    },
    buttonText: "Book Daycare",
    buttonLink: "{{booking_link}}",
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
    timesUsed: 34,
  },
  {
    id: "tpl-008",
    name: "Boarding Seasonal Promo",
    subject: "Plan ahead: Book {{pet_name}}'s holiday boarding!",
    body: `Hi {{customer_full_name}},\n\nHoliday season is approaching and boarding spots fill up fast! Reserve {{pet_name}}'s spot now to ensure they have a comfortable stay while you're away.\n\nEarly booking gets you the best rates and room selection.\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "boarding_seasonal",
    variables: ["customer_full_name", "pet_name", "facility_name", "season"],
    offerSection: {
      headline: "Early Bird Special",
      description: "10% off boarding when booked 30+ days ahead",
      code: "EARLYBIRD10",
      expiryDays: 30,
    },
    buttonText: "Reserve Boarding",
    buttonLink: "{{booking_link}}",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
    timesUsed: 21,
  },
  {
    id: "tpl-009",
    name: "Win-Back Inactive Customer",
    subject: "We miss you and {{pet_name}}, {{customer_full_name}}!",
    body: `Hi {{customer_full_name}},\n\nIt's been a while since we've seen {{pet_name}} at {{facility_name}}. We'd love to welcome you back!\n\nAs a special offer, here's a discount on your next visit. We've added new services and upgrades that {{pet_name}} will love.\n\nHope to see you soon!\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "win_back",
    variables: ["customer_full_name", "pet_name", "facility_name"],
    offerSection: {
      headline: "Welcome Back",
      description: "25% off your next booking",
      code: "COMEBACK25",
      expiryDays: 14,
    },
    buttonText: "Book Now",
    buttonLink: "{{booking_link}}",
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
    timesUsed: 43,
  },
  {
    id: "tpl-010",
    name: "Referral Program Invite",
    subject: "Share the love! Refer a friend to {{facility_name}}",
    body: `Hi {{customer_full_name}},\n\nLoving {{facility_name}}? Share the experience! Refer a friend and you both get rewarded.\n\nYour referral code: {{referral_code}}\n\nYou get $25 credit, they get $25 off their first booking. Everyone wins!\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "referral_program",
    variables: ["customer_full_name", "facility_name", "referral_code"],
    offerSection: {
      headline: "Refer & Earn",
      description: "$25 for you, $25 for them",
    },
    buttonText: "Share Your Code",
    buttonLink: "{{referral_link}}",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
    timesUsed: 18,
  },
  {
    id: "tpl-011",
    name: "New Service Announcement",
    subject: "New at {{facility_name}}: {{service_name}}!",
    body: `Hi {{customer_full_name}},\n\nWe're excited to announce a brand new service at {{facility_name}}: {{service_name}}!\n\n{{service_description}}\n\n{{pet_name}} would love it. Book now to be among the first to try it!\n\n{{facility_name}} Team`,
    category: "promotional",
    useCase: "new_service",
    variables: [
      "customer_full_name",
      "pet_name",
      "facility_name",
      "service_name",
      "service_description",
    ],
    offerSection: {
      headline: "Launch Offer",
      description: "20% off your first session",
      code: "NEWSERVICE20",
      expiryDays: 21,
    },
    buttonText: "Learn More & Book",
    buttonLink: "{{booking_link}}",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
    timesUsed: 8,
  },
  {
    id: "tpl-012",
    name: "Playdate Alert",
    subject:
      "{{friend_pet_name}} is coming to {{service_name}} on {{booking_date}}!",
    body: `Hi {{customer_full_name}},\n\nJust a heads up -- {{friend_pet_name}} ({{pet_name}}'s friend) is coming to {{service_name}} on {{booking_date}} at {{facility_name}}!\n\nWant to bring {{pet_name}} too? They can have a blast together!\n\n{{facility_name}} Team`,
    category: "transactional",
    useCase: "playdate_alert",
    variables: [
      "customer_full_name",
      "pet_name",
      "friend_pet_name",
      "service_name",
      "booking_date",
      "facility_name",
      "book_link",
    ],
    buttonText: "Book a Playdate",
    buttonLink: "{{book_link}}",
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-10T10:00:00Z",
    timesUsed: 15,
  },
];

// ----------------------------------------
// Campaigns
// ----------------------------------------

export type CampaignGoal =
  | "fill_slow_days"
  | "rebook_grooming"
  | "promote_packages"
  | "holiday_promo"
  | "new_service"
  | "general";

export const CAMPAIGN_GOALS: {
  value: CampaignGoal;
  label: string;
  description: string;
  icon: string;
  suggestedSegments: string[];
}[] = [
  {
    value: "fill_slow_days",
    label: "Fill Slow Days",
    description: "Boost bookings on quiet days",
    icon: "CalendarPlus",
    suggestedSegments: ["seg-007", "seg-008", "seg-014"],
  },
  {
    value: "rebook_grooming",
    label: "Rebook Grooming",
    description: "Get overdue clients back for grooming",
    icon: "Scissors",
    suggestedSegments: ["seg-006", "seg-019", "seg-015"],
  },
  {
    value: "promote_packages",
    label: "Promote Packages",
    description: "Sell daycare or training packages",
    icon: "Package",
    suggestedSegments: ["seg-007", "seg-012", "seg-014"],
  },
  {
    value: "holiday_promo",
    label: "Holiday Promo",
    description: "Seasonal offers and specials",
    icon: "Gift",
    suggestedSegments: ["seg-009", "seg-001", "seg-017"],
  },
  {
    value: "new_service",
    label: "New Service",
    description: "Announce a new service offering",
    icon: "Sparkles",
    suggestedSegments: ["seg-004", "seg-001", "seg-007"],
  },
  {
    value: "general",
    label: "General Campaign",
    description: "Custom campaign with any goal",
    icon: "Mail",
    suggestedSegments: [],
  },
];

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "sms";
  templateId: string;
  segmentId: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  goal?: CampaignGoal;
  scheduledAt?: string;
  sentAt?: string;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  abTest?: {
    enabled: boolean;
    variantA: string;
    variantB: string;
    splitPercentage: number;
    winner?: "A" | "B";
  };
  recurring?: {
    enabled: boolean;
    frequency: "weekly" | "biweekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  createdAt: string;
  createdBy: string;
}

export const campaigns: Campaign[] = [
  {
    id: "cmp-001",
    name: "February Newsletter",
    type: "email",
    templateId: "tpl-004",
    segmentId: "seg-004",
    status: "sent",
    goal: "general",
    scheduledAt: "2024-02-01T09:00:00Z",
    sentAt: "2024-02-01T09:05:00Z",
    stats: {
      sent: 156,
      delivered: 154,
      opened: 89,
      clicked: 34,
      bounced: 2,
      unsubscribed: 1,
    },
    createdAt: "2024-01-28T14:00:00Z",
    createdBy: "Sarah Johnson",
  },
  {
    id: "cmp-002",
    name: "Win-Back Inactive Customers",
    type: "email",
    templateId: "tpl-009",
    segmentId: "seg-002",
    status: "scheduled",
    goal: "general",
    scheduledAt: "2024-03-01T10:00:00Z",
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
    },
    abTest: {
      enabled: true,
      variantA: "tpl-009",
      variantB: "tpl-005",
      splitPercentage: 50,
    },
    createdAt: "2024-02-20T11:00:00Z",
    createdBy: "Mike Davis",
  },
  {
    id: "cmp-003",
    name: "VIP Exclusive Offer",
    type: "email",
    templateId: "tpl-005",
    segmentId: "seg-001",
    status: "sent",
    goal: "promote_packages",
    scheduledAt: "2024-02-14T08:00:00Z",
    sentAt: "2024-02-14T08:02:00Z",
    stats: {
      sent: 23,
      delivered: 23,
      opened: 21,
      clicked: 18,
      bounced: 0,
      unsubscribed: 0,
    },
    createdAt: "2024-02-12T13:00:00Z",
    createdBy: "Sarah Johnson",
  },
  {
    id: "cmp-004",
    name: "Grooming Rebook - March",
    type: "email",
    templateId: "tpl-006",
    segmentId: "seg-006",
    status: "sent",
    goal: "rebook_grooming",
    scheduledAt: "2026-03-01T09:00:00Z",
    sentAt: "2026-03-01T09:03:00Z",
    stats: {
      sent: 28,
      delivered: 27,
      opened: 19,
      clicked: 12,
      bounced: 1,
      unsubscribed: 0,
    },
    createdAt: "2026-02-25T14:00:00Z",
    createdBy: "Sarah Johnson",
  },
  {
    id: "cmp-005",
    name: "Daycare Comeback Campaign",
    type: "email",
    templateId: "tpl-007",
    segmentId: "seg-008",
    status: "sent",
    goal: "fill_slow_days",
    scheduledAt: "2026-03-10T09:00:00Z",
    sentAt: "2026-03-10T09:02:00Z",
    stats: {
      sent: 38,
      delivered: 37,
      opened: 22,
      clicked: 14,
      bounced: 1,
      unsubscribed: 2,
    },
    createdAt: "2026-03-05T10:00:00Z",
    createdBy: "Mike Davis",
  },
  {
    id: "cmp-006",
    name: "Holiday Boarding Early Bird",
    type: "email",
    templateId: "tpl-008",
    segmentId: "seg-009",
    status: "draft",
    goal: "holiday_promo",
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
    },
    createdAt: "2026-03-20T11:00:00Z",
    createdBy: "Sarah Johnson",
  },
];

// ----------------------------------------
// Facility Branding
// ----------------------------------------

export interface FacilityBranding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  fromName: string;
  replyToEmail: string;
  footerText: string;
  socialLinks: { platform: string; url: string }[];
  unsubscribeLink: string;
}

export const facilityBranding: FacilityBranding = {
  logo: "/logos/happy-paws-logo.png",
  primaryColor: "#2563eb",
  secondaryColor: "#1e40af",
  fromName: "Happy Paws Pet Care",
  replyToEmail: "hello@happypawspetcare.com",
  footerText:
    "Happy Paws Pet Care | 123 Main Street, Springfield, IL 62701 | (555) 123-4567",
  socialLinks: [
    { platform: "facebook", url: "https://facebook.com/happypawspetcare" },
    { platform: "instagram", url: "https://instagram.com/happypawspetcare" },
    { platform: "tiktok", url: "https://tiktok.com/@happypawspetcare" },
  ],
  unsubscribeLink: "{{unsubscribe_link}}",
};

// ----------------------------------------
// Playdate Alerts System
// ----------------------------------------

export interface PlaydateAlertConfig {
  enabled: boolean;
  triggerServices: string[];
  triggerMoment: "on_request" | "on_confirmation";
  channels: { sms: boolean; email: boolean; inApp: boolean };
  timing: "immediate" | "scheduled";
  beforeHours?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  rateLimitPerDay: number;
}

export interface PlaydateAlertTemplate {
  sms: string;
  email: { subject: string; body: string };
  variables: string[];
}

export interface PlaydateAlertLog {
  id: string;
  facilityId: string;
  triggerBookingId: string;
  triggerPetId: number;
  triggerPetName: string;
  recipientCustomerId: number;
  recipientCustomerName: string;
  recipientPetId: number;
  recipientPetName: string;
  channel: "sms" | "email" | "in_app";
  status: "sent" | "suppressed" | "failed";
  reasonSuppressed?: string;
  sentAt: string;
}

export const playdateAlertConfig: PlaydateAlertConfig = {
  enabled: true,
  triggerServices: ["daycare", "boarding"],
  triggerMoment: "on_confirmation",
  channels: { sms: true, email: true, inApp: true },
  timing: "immediate",
  beforeHours: undefined,
  quietHoursStart: "21:00",
  quietHoursEnd: "08:00",
  rateLimitPerDay: 1,
};

export const playdateAlertTemplate: PlaydateAlertTemplate = {
  sms: "Hi! Just a heads up -- {friend_pet_name} is coming to {service_name} on {booking_date} at {facility_name}! Want to bring {pet_name} too? Book here: {book_link}",
  email: {
    subject: "{friend_pet_name} is coming to {service_name} on {booking_date}!",
    body: `Hi {customer_full_name},\n\nJust a heads up -- {friend_pet_name} (who's {pet_name}'s friend) is coming to {service_name} on {booking_date} at {facility_name}!\n\nWant to bring {pet_name} too? They can have a blast together!\n\nBook here: {book_link}\n\n{facility_name} Team`,
  },
  variables: [
    "customer_full_name",
    "pet_name",
    "friend_pet_name",
    "friend_owner_name",
    "service_name",
    "booking_date",
    "facility_name",
    "book_link",
    "cta_text",
  ],
};

export const playdateAlertLogs: PlaydateAlertLog[] = [
  {
    id: "pal-001",
    facilityId: "facility-001",
    triggerBookingId: "bk-101",
    triggerPetId: 1,
    triggerPetName: "Buddy",
    recipientCustomerId: 16,
    recipientCustomerName: "Bob Smith",
    recipientPetId: 3,
    recipientPetName: "Max",
    channel: "email",
    status: "sent",
    sentAt: "2026-03-18T09:15:00Z",
  },
  {
    id: "pal-002",
    facilityId: "facility-001",
    triggerBookingId: "bk-101",
    triggerPetId: 1,
    triggerPetName: "Buddy",
    recipientCustomerId: 16,
    recipientCustomerName: "Bob Smith",
    recipientPetId: 3,
    recipientPetName: "Max",
    channel: "sms",
    status: "sent",
    sentAt: "2026-03-18T09:15:00Z",
  },
  {
    id: "pal-003",
    facilityId: "facility-001",
    triggerBookingId: "bk-102",
    triggerPetId: 3,
    triggerPetName: "Max",
    recipientCustomerId: 15,
    recipientCustomerName: "Alice Johnson",
    recipientPetId: 1,
    recipientPetName: "Buddy",
    channel: "email",
    status: "sent",
    sentAt: "2026-03-19T10:30:00Z",
  },
  {
    id: "pal-004",
    facilityId: "facility-001",
    triggerBookingId: "bk-102",
    triggerPetId: 3,
    triggerPetName: "Max",
    recipientCustomerId: 15,
    recipientCustomerName: "Alice Johnson",
    recipientPetId: 1,
    recipientPetName: "Buddy",
    channel: "sms",
    status: "suppressed",
    reasonSuppressed: "Rate limit exceeded (1 per day)",
    sentAt: "2026-03-19T10:30:00Z",
  },
  {
    id: "pal-005",
    facilityId: "facility-001",
    triggerBookingId: "bk-103",
    triggerPetId: 1,
    triggerPetName: "Buddy",
    recipientCustomerId: 17,
    recipientCustomerName: "Carol Williams",
    recipientPetId: 5,
    recipientPetName: "Rocky",
    channel: "email",
    status: "suppressed",
    reasonSuppressed: "Keep-apart relationship",
    sentAt: "2026-03-20T08:00:00Z",
  },
  {
    id: "pal-006",
    facilityId: "facility-001",
    triggerBookingId: "bk-104",
    triggerPetId: 3,
    triggerPetName: "Max",
    recipientCustomerId: 17,
    recipientCustomerName: "Carol Williams",
    recipientPetId: 5,
    recipientPetName: "Rocky",
    channel: "email",
    status: "sent",
    sentAt: "2026-03-21T09:00:00Z",
  },
  {
    id: "pal-007",
    facilityId: "facility-001",
    triggerBookingId: "bk-104",
    triggerPetId: 3,
    triggerPetName: "Max",
    recipientCustomerId: 17,
    recipientCustomerName: "Carol Williams",
    recipientPetId: 5,
    recipientPetName: "Rocky",
    channel: "sms",
    status: "sent",
    sentAt: "2026-03-21T09:00:00Z",
  },
  {
    id: "pal-008",
    facilityId: "facility-001",
    triggerBookingId: "bk-105",
    triggerPetId: 1,
    triggerPetName: "Buddy",
    recipientCustomerId: 18,
    recipientCustomerName: "David Lee",
    recipientPetId: 7,
    recipientPetName: "Luna",
    channel: "email",
    status: "suppressed",
    reasonSuppressed: "Customer opted out of playdate alerts",
    sentAt: "2026-03-22T11:00:00Z",
  },
  {
    id: "pal-009",
    facilityId: "facility-001",
    triggerBookingId: "bk-106",
    triggerPetId: 1,
    triggerPetName: "Buddy",
    recipientCustomerId: 16,
    recipientCustomerName: "Bob Smith",
    recipientPetId: 3,
    recipientPetName: "Max",
    channel: "in_app",
    status: "sent",
    sentAt: "2026-03-23T14:00:00Z",
  },
  {
    id: "pal-010",
    facilityId: "facility-001",
    triggerBookingId: "bk-107",
    triggerPetId: 5,
    triggerPetName: "Rocky",
    recipientCustomerId: 16,
    recipientCustomerName: "Bob Smith",
    recipientPetId: 3,
    recipientPetName: "Max",
    channel: "email",
    status: "failed",
    reasonSuppressed: "Email delivery failed",
    sentAt: "2026-03-24T09:30:00Z",
  },
];

// ========================================
// LOYALTY & REFERRALS DATA
// ========================================

/**
 * @deprecated Use FacilityLoyaltyConfig from facility-loyalty-config.ts instead
 * This interface is kept for backward compatibility
 */
export interface LoyaltySettings {
  enabled: boolean;
  pointsPerDollar: number;
  pointsValue: number;
  expirationMonths?: number;
  tiers: LoyaltyTier[];
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  benefits: string[];
  discountPercentage: number;
  color: string;
}

export const loyaltySettings: LoyaltySettings = {
  enabled: true,
  pointsPerDollar: 1,
  pointsValue: 5,
  expirationMonths: 12,
  tiers: [
    {
      id: "tier-bronze",
      name: "Bronze",
      minPoints: 0,
      benefits: ["Earn 1 point per $1 spent", "Birthday bonus"],
      discountPercentage: 0,
      color: "#CD7F32",
    },
    {
      id: "tier-silver",
      name: "Silver",
      minPoints: 500,
      benefits: [
        "Earn 1.25 points per $1 spent",
        "Priority booking",
        "Birthday bonus",
      ],
      discountPercentage: 5,
      color: "#C0C0C0",
    },
    {
      id: "tier-gold",
      name: "Gold",
      minPoints: 1500,
      benefits: [
        "Earn 1.5 points per $1 spent",
        "Priority booking",
        "Free add-ons",
        "Birthday bonus",
      ],
      discountPercentage: 10,
      color: "#FFD700",
    },
    {
      id: "tier-platinum",
      name: "Platinum",
      minPoints: 3000,
      benefits: [
        "Earn 2 points per $1 spent",
        "VIP treatment",
        "Free grooming monthly",
        "Birthday bonus",
      ],
      discountPercentage: 15,
      color: "#E5E4E2",
    },
  ],
};

export interface CustomerLoyalty {
  clientId: number;
  points: number;
  tier: string;
  lifetimePoints: number;
  pointsHistory: {
    date: string;
    points: number;
    type: "earned" | "redeemed" | "expired";
    description: string;
  }[];
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  requiredPoints: number;
  rewardType:
    | "discount_code"
    | "credit_balance"
    | "auto_apply"
    | "free_service";
  rewardValue: number | string;
  applicableServices?: string[];
  expiryDays?: number;
  terms?: string;
  isActive: boolean;
  facilityId?: number;
}

export interface PointsEarningRule {
  type: "per_dollar" | "per_visit" | "per_referral" | "bonus" | "holiday";
  description: string;
  points: number | { base: number; multiplier?: number };
  applicableServices?: string[];
  conditions?: string;
}

export const pointsEarningRules: PointsEarningRule[] = [
  { type: "per_dollar", description: "Earn 1 point per $1 spent", points: 1 },
  {
    type: "per_visit",
    description: "Earn 50 points per daycare visit",
    points: 50,
    applicableServices: ["daycare"],
  },
  {
    type: "per_referral",
    description: "Earn 200 points for referrals",
    points: 200,
  },
  {
    type: "bonus",
    description: "Earn bonus points during holidays",
    points: { base: 50, multiplier: 2 },
    conditions: "Holiday periods only",
  },
];

export const loyaltyRewards: LoyaltyReward[] = [
  {
    id: "reward-001",
    name: "$10 Credit",
    description: "Redeem points for account credit",
    requiredPoints: 500,
    rewardType: "credit_balance",
    rewardValue: 10,
    expiryDays: 90,
    terms: "Credit expires 90 days after redemption. Applies to all services.",
    isActive: true,
  },
  {
    id: "reward-002",
    name: "Free Daycare Day",
    description: "One free full-day daycare visit",
    requiredPoints: 1000,
    rewardType: "free_service",
    rewardValue: "daycare",
    applicableServices: ["daycare"],
    expiryDays: 60,
    terms: "Valid for one full-day daycare visit. Must be used within 60 days.",
    isActive: true,
  },
  {
    id: "reward-003",
    name: "10 Visits = 1 Free",
    description: "After 10 daycare visits, get 1 free",
    requiredPoints: 0,
    rewardType: "auto_apply",
    rewardValue: "daycare",
    applicableServices: ["daycare"],
    terms:
      "Automatically applied after 10th visit. Cannot be combined with other offers.",
    isActive: true,
  },
  {
    id: "reward-004",
    name: "Free Nail Trim",
    description: "Complimentary nail trimming service",
    requiredPoints: 250,
    rewardType: "discount_code",
    rewardValue: "FREE_NAIL_TRIM",
    applicableServices: ["grooming"],
    expiryDays: 30,
    terms:
      "Valid for nail trim service only. Expires 30 days after redemption.",
    isActive: true,
  },
  {
    id: "reward-005",
    name: "$25 Discount Code",
    description: "Get a $25 discount code",
    requiredPoints: 1250,
    rewardType: "discount_code",
    rewardValue: 25,
    expiryDays: 60,
    terms: "Code valid for 60 days. Minimum purchase $50 required.",
    isActive: true,
  },
];

export const customerLoyaltyData: CustomerLoyalty[] = [
  {
    clientId: 1,
    points: 1250,
    tier: "tier-silver",
    lifetimePoints: 2100,
    pointsHistory: [
      {
        date: "2024-02-20T10:00:00Z",
        points: 125,
        type: "earned",
        description: "Booking payment - $125.00",
      },
      {
        date: "2024-02-10T14:00:00Z",
        points: -500,
        type: "redeemed",
        description: "Redeemed for $25 discount",
      },
      {
        date: "2024-01-28T09:00:00Z",
        points: 200,
        type: "earned",
        description: "Booking payment - $200.00",
      },
    ],
  },
  {
    clientId: 15,
    points: 340,
    tier: "tier-silver",
    lifetimePoints: 450,
    pointsHistory: [
      {
        date: "2026-02-26T10:00:00Z",
        points: 85,
        type: "earned",
        description: "Grooming payment - $85.00",
      },
      {
        date: "2026-02-20T10:00:00Z",
        points: 50,
        type: "earned",
        description: "Daycare booking",
      },
      {
        date: "2026-02-15T10:00:00Z",
        points: -500,
        type: "redeemed",
        description: "Redeemed Free Daycare",
      },
      {
        date: "2026-02-10T10:00:00Z",
        points: 300,
        type: "earned",
        description: "Boarding stay",
      },
      {
        date: "2026-01-28T10:00:00Z",
        points: 50,
        type: "earned",
        description: "Daycare booking",
      },
      {
        date: "2026-01-25T10:00:00Z",
        points: 300,
        type: "earned",
        description: "Boarding stay",
      },
      {
        date: "2026-01-12T10:00:00Z",
        points: 50,
        type: "earned",
        description: "Daycare booking",
      },
    ],
  },
];

export interface ReferralCode {
  id: string;
  code: string;
  referrerId: number;
  referrerReward: number;
  refereeReward: number;
  timesUsed: number;
  maxUses?: number;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

export const referralCodes: ReferralCode[] = [
  {
    id: "ref-001",
    code: "SARAH-REFER",
    referrerId: 1,
    referrerReward: 25,
    refereeReward: 25,
    timesUsed: 3,
    maxUses: 10,
    createdAt: "2024-01-15T10:00:00Z",
    isActive: true,
  },
  {
    id: "ref-002",
    code: "MIKE-FRIEND",
    referrerId: 2,
    referrerReward: 25,
    refereeReward: 25,
    timesUsed: 1,
    maxUses: 10,
    createdAt: "2024-01-20T11:00:00Z",
    isActive: true,
  },
  {
    id: "ref-003",
    code: "ALICE-PET",
    referrerId: 15,
    referrerReward: 25,
    refereeReward: 25,
    timesUsed: 2,
    maxUses: 10,
    createdAt: "2026-01-15T10:00:00Z",
    isActive: true,
  },
];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type:
      | "bookings_count"
      | "total_spent"
      | "consecutive_months"
      | "referrals"
      | "reviews";
    threshold: number;
  };
  reward?: {
    type: "discount" | "points" | "freebie";
    value: number | string;
  };
}

export const badges: Badge[] = [
  {
    id: "badge-001",
    name: "Frequent Visitor",
    description: "Completed 10 bookings",
    icon: "star",
    criteria: { type: "bookings_count", threshold: 10 },
    reward: { type: "discount", value: 10 },
  },
  {
    id: "badge-002",
    name: "Big Spender",
    description: "Spent $1000+ total",
    icon: "gem",
    criteria: { type: "total_spent", threshold: 1000 },
    reward: { type: "points", value: 500 },
  },
  {
    id: "badge-003",
    name: "Loyal Friend",
    description: "Booked for 6 consecutive months",
    icon: "trophy",
    criteria: { type: "consecutive_months", threshold: 6 },
    reward: { type: "freebie", value: "Free nail trim" },
  },
  {
    id: "badge-004",
    name: "Super Referrer",
    description: "Referred 5 friends",
    icon: "target",
    criteria: { type: "referrals", threshold: 5 },
    reward: { type: "discount", value: 20 },
  },
];

// ========================================
// PROMOTIONS DATA
// ========================================

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed" | "free_service";
  value: number | string;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit?: number;
  applicableServices?: string[];
  autoApply?: boolean;
  conditions?: {
    firstTimeCustomer?: boolean;
    specificDays?: string[];
    specificServices?: string[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export const promoCodes: PromoCode[] = [
  {
    id: "promo-001",
    code: "WELCOME10",
    description: "10% off for new customers",
    type: "percentage",
    value: 10,
    maxDiscount: 50,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 45,
    perCustomerLimit: 1,
    autoApply: true,
    conditions: { firstTimeCustomer: true },
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-01T09:00:00Z",
  },
  {
    id: "promo-002",
    code: "SUMMER25",
    description: "$25 off bookings over $100",
    type: "fixed",
    value: 25,
    minPurchase: 100,
    validFrom: "2024-06-01T00:00:00Z",
    validUntil: "2024-08-31T23:59:59Z",
    usageLimit: 100,
    usedCount: 23,
    perCustomerLimit: 3,
    isActive: true,
    createdBy: "Mike Davis",
    createdAt: "2024-05-15T10:00:00Z",
  },
  {
    id: "promo-003",
    code: "MONDAY20",
    description: "20% off Monday bookings",
    type: "percentage",
    value: 20,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 67,
    autoApply: true,
    conditions: { specificDays: ["monday"] },
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-10T11:00:00Z",
  },
  {
    id: "promo-004",
    code: "FREEGROOM",
    description: "Free nail trim with grooming",
    type: "free_service",
    value: "Nail Trim",
    validFrom: "2024-02-01T00:00:00Z",
    validUntil: "2024-02-29T23:59:59Z",
    usageLimit: 50,
    usedCount: 12,
    conditions: { specificServices: ["grooming"] },
    isActive: true,
    createdBy: "Emily Brown",
    createdAt: "2024-01-28T14:00:00Z",
  },
  {
    id: "promo-005",
    code: "BIRTHDAY20",
    description: "Birthday special - 20% off",
    type: "percentage",
    value: 20,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 89,
    perCustomerLimit: 1,
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-05T09:00:00Z",
  },
];

// ============================================================================
// Referral Notification Templates
// ============================================================================

export interface ReferralNotificationTemplate {
  id: string;
  type: "referrer_reward_earned" | "referee_welcome" | "referral_milestone";
  channel: "in_app" | "email" | "sms";
  subject?: string;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
}

export const referralNotificationTemplates: ReferralNotificationTemplate[] = [
  {
    id: "notif-ref-001",
    type: "referrer_reward_earned",
    channel: "in_app",
    titleTemplate: "Reward Earned!",
    bodyTemplate:
      "You earned {{reward_amount}} {{reward_type}} for referring {{friend_name}}!",
    variables: ["reward_amount", "reward_type", "friend_name"],
  },
  {
    id: "notif-ref-002",
    type: "referrer_reward_earned",
    channel: "email",
    subject: "You've earned a referral reward from {{facility_name}}!",
    titleTemplate: "Your Referral Reward is Here!",
    bodyTemplate:
      "Great news! Your friend {{friend_name}} completed their first booking at {{facility_name}}. You've earned {{reward_amount}} {{reward_type}} as a thank you for the referral.",
    variables: ["reward_amount", "reward_type", "friend_name", "facility_name"],
  },
  {
    id: "notif-ref-003",
    type: "referee_welcome",
    channel: "in_app",
    titleTemplate: "Welcome Reward!",
    bodyTemplate:
      "Welcome! You received {{reward_amount}} {{reward_type}} from {{referrer_name}}'s referral!",
    variables: ["reward_amount", "reward_type", "referrer_name"],
  },
  {
    id: "notif-ref-004",
    type: "referral_milestone",
    channel: "in_app",
    titleTemplate: "Referral Milestone!",
    bodyTemplate:
      "You've referred {{referral_count}} friends! Keep sharing to earn more rewards.",
    variables: ["referral_count"],
  },
];
