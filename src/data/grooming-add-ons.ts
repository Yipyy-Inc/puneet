// Mock catalogue of grooming add-ons. Consumed by the new-appointment dialog
// (the booking form) and the service-setup dialog (rule builder for default
// add-ons). The real backend would load this from the facility's add-on
// configuration; the mock is intentionally flat so both consumers can read
// the same fixed ids.

export type GroomingAddOnCatalogEntry = {
  id: string;
  name: string;
  price: number;
  /** Service-time impact in minutes (0 = no schedule impact). */
  duration: number;
};

export const GROOMING_ADD_ONS: readonly GroomingAddOnCatalogEntry[] = [
  { id: "ao-01", name: "Teeth Brushing", price: 15, duration: 10 },
  { id: "ao-02", name: "Nail Grinding", price: 12, duration: 10 },
  { id: "ao-03", name: "Blueberry Facial", price: 20, duration: 15 },
  { id: "ao-04", name: "De-shedding Treatment", price: 25, duration: 20 },
  { id: "ao-05", name: "Paw Balm Treatment", price: 10, duration: 10 },
  { id: "ao-06", name: "Anal Gland Expression", price: 18, duration: 10 },
  { id: "ao-07", name: "Flea Treatment", price: 22, duration: 15 },
  { id: "ao-08", name: "Bandana or Bow", price: 5, duration: 0 },
] as const;
