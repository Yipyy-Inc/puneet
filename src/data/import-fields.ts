import type { YipyyField } from "@/types/import";

// Yipyy destination fields a source column can be mapped onto.
export const yipyyFields: YipyyField[] = [
  // Customer
  {
    id: "customer.name",
    label: "Customer Name",
    entity: "customer",
    required: true,
  },
  {
    id: "customer.email",
    label: "Customer Email",
    entity: "customer",
    required: true,
  },
  {
    id: "customer.phone",
    label: "Customer Phone",
    entity: "customer",
    required: false,
  },
  {
    id: "customer.address",
    label: "Customer Address",
    entity: "customer",
    required: false,
  },
  // Pet
  { id: "pet.name", label: "Pet Name", entity: "pet", required: true },
  { id: "pet.species", label: "Pet Species", entity: "pet", required: false },
  { id: "pet.breed", label: "Pet Breed", entity: "pet", required: false },
  { id: "pet.weight", label: "Pet Weight", entity: "pet", required: false },
  { id: "pet.notes", label: "Pet Notes", entity: "pet", required: false },
  // Booking
  {
    id: "booking.service",
    label: "Service / Type",
    entity: "booking",
    required: true,
  },
  {
    id: "booking.startDate",
    label: "Booking Date",
    entity: "booking",
    required: true,
  },
  {
    id: "booking.staff",
    label: "Assigned Staff",
    entity: "booking",
    required: false,
  },
  {
    id: "booking.status",
    label: "Booking Status",
    entity: "booking",
    required: false,
  },
  {
    id: "booking.price",
    label: "Booking Price",
    entity: "booking",
    required: false,
  },
];

export const SKIP_FIELD = "__skip__";

export function getYipyyField(id: string): YipyyField | undefined {
  return yipyyFields.find((f) => f.id === id);
}

export const requiredFieldIds = yipyyFields
  .filter((f) => f.required)
  .map((f) => f.id);
