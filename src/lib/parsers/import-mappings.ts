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

const PARSER_MAPS: Record<string, Record<string, string>> = {
  moego: MOEGO_COLUMN_MAP,
  gingr: GINGR_COLUMN_MAP,
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
