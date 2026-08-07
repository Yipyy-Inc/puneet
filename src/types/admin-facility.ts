// The shape the superadmin facilities list renders.
//
// Its own file, with no `server-only`, because the list is a client component
// and the builder (src/lib/api/admin-facilities.ts) is a server module. A type
// exported from the server module could not be imported by the screen that
// consumes it.
//
// The shape mirrors what that screen ALREADY rendered from mock data —
// `locationsList`, `usersList`, `clients`, `limits`. Not the shape I would
// design; changing it means rewriting 753 lines of filtering, sorting, columns
// and CSV export, which is the next change rather than this one.

export interface AdminFacilityRow {
  /** The uuid. The list treats it as opaque; nothing derives from it. */
  id: string;
  name: string;
  slug: string;
  /** What the status badge can express: active or not. */
  status: "active" | "inactive";
  /** The real subscription state, for anyone who needs the detail. */
  subscriptionStatus: string;
  plan: string;
  dayJoined: string;
  subscriptionEnd: string | null;
  /** Monthly-equivalent recurring revenue, whole currency units. */
  mrr: number | null;
  /** Null when nothing records it — the screen shows a dash. */
  lastLogin: string | null;
  contact: { email: string; phone: string; website: string };
  owner: { name: string; email: string; phone: string };
  locationsList: { name: string; address: string; services: string[] }[];
  usersList: { id: string }[];
  clients: { status: string }[];
  limits: { locations: number; staff: number; clients: number; pets: number };
}
