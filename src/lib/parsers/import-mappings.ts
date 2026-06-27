// Built-in column parsers. MoeGo and Gingr are implemented first; the other
// platforms fall back to manual mapping (their parsers land in Task 44).
//
// Each map keys a source export column header (lower-cased) to a Yipyy field id.

export const MOEGO_COLUMN_MAP: Record<string, string> = {
  "customer name": "customer.name",
  email: "customer.email",
  phone: "customer.phone",
  "phone number": "customer.phone",
  address: "customer.address",
  "pet name": "pet.name",
  "pet type": "pet.species",
  breed: "pet.breed",
  weight: "pet.weight",
  "grooming notes": "pet.notes",
  service: "booking.service",
  "appointment date": "booking.startDate",
  groomer: "booking.staff",
  status: "booking.status",
  price: "booking.price",
};

export const GINGR_COLUMN_MAP: Record<string, string> = {
  "owner name": "customer.name",
  "owner email": "customer.email",
  "owner phone": "customer.phone",
  "owner address": "customer.address",
  "animal name": "pet.name",
  "animal type": "pet.species",
  breed: "pet.breed",
  "weight (lbs)": "pet.weight",
  notes: "pet.notes",
  "reservation type": "booking.service",
  "check in date": "booking.startDate",
  staff: "booking.staff",
  "reservation status": "booking.status",
  total: "booking.price",
};

// PawPartner — grooming-centric exports (client / pet / appointment).
export const PAWPARTNER_COLUMN_MAP: Record<string, string> = {
  "client name": "customer.name",
  "client email": "customer.email",
  "client phone": "customer.phone",
  "client address": "customer.address",
  "pet name": "pet.name",
  species: "pet.species",
  breed: "pet.breed",
  weight: "pet.weight",
  "pet notes": "pet.notes",
  "appointment type": "booking.service",
  "scheduled date": "booking.startDate",
  specialist: "booking.staff",
  "appointment status": "booking.status",
  "amount due": "booking.price",
};

// ProPetware — boarding/daycare exports (owner / animal / reservation).
export const PROPETWARE_COLUMN_MAP: Record<string, string> = {
  "owner full name": "customer.name",
  "owner email": "customer.email",
  "owner mobile": "customer.phone",
  "owner address": "customer.address",
  "animal name": "pet.name",
  "animal species": "pet.species",
  breed: "pet.breed",
  "weight (kg)": "pet.weight",
  "care notes": "pet.notes",
  "reservation type": "booking.service",
  "arrival date": "booking.startDate",
  "assigned staff": "booking.staff",
  "reservation status": "booking.status",
  rate: "booking.price",
};

// Generic CSV — broad synonym dictionary so arbitrary exports auto-map.
export const GENERIC_COLUMN_MAP: Record<string, string> = {
  // Customer
  name: "customer.name",
  "full name": "customer.name",
  "customer name": "customer.name",
  customer: "customer.name",
  "client name": "customer.name",
  client: "customer.name",
  "owner name": "customer.name",
  owner: "customer.name",
  email: "customer.email",
  "e-mail": "customer.email",
  "email address": "customer.email",
  phone: "customer.phone",
  "phone number": "customer.phone",
  cell: "customer.phone",
  mobile: "customer.phone",
  telephone: "customer.phone",
  address: "customer.address",
  // Pet
  pet: "pet.name",
  "pet name": "pet.name",
  animal: "pet.name",
  "animal name": "pet.name",
  species: "pet.species",
  "pet type": "pet.species",
  "animal type": "pet.species",
  kind: "pet.species",
  breed: "pet.breed",
  weight: "pet.weight",
  notes: "pet.notes",
  "pet notes": "pet.notes",
  // Booking
  service: "booking.service",
  "service type": "booking.service",
  visit: "booking.service",
  appointment: "booking.service",
  booking: "booking.service",
  reservation: "booking.service",
  date: "booking.startDate",
  when: "booking.startDate",
  "appointment date": "booking.startDate",
  "start date": "booking.startDate",
  "check in date": "booking.startDate",
  staff: "booking.staff",
  groomer: "booking.staff",
  employee: "booking.staff",
  status: "booking.status",
  price: "booking.price",
  amount: "booking.price",
  total: "booking.price",
  cost: "booking.price",
};

const PARSER_MAPS: Record<string, Record<string, string>> = {
  moego: MOEGO_COLUMN_MAP,
  gingr: GINGR_COLUMN_MAP,
  pawpartner: PAWPARTNER_COLUMN_MAP,
  propetware: PROPETWARE_COLUMN_MAP,
  "generic-csv": GENERIC_COLUMN_MAP,
};

/**
 * Auto-map file columns to Yipyy fields for a known parser. Returns a record of
 * fileColumn → fieldId (only matched columns; unmatched are left for manual
 * mapping). Returns an empty object for unknown/manual sources.
 */
export function autoMapColumns(
  parser: string | null,
  columns: string[],
): Record<string, string> {
  if (!parser || !PARSER_MAPS[parser]) return {};
  const map = PARSER_MAPS[parser];
  const result: Record<string, string> = {};
  for (const col of columns) {
    const fieldId = map[col.trim().toLowerCase()];
    if (fieldId) result[col] = fieldId;
  }
  return result;
}
