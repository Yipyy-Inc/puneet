/**
 * Six weeks of a facility's life, laid out relative to the day the seed runs:
 * finished stays and visits in the past (paid), dogs on site today, and a
 * calendar that fills up over the next three weeks.
 *
 * No two boarding stays share a room on the same night, so the database's
 * exclusion constraint (23P01) never has an opinion: the first list gives
 * each stay its own room, and the later one reuses a room only between stays.
 */
import type { NewBooking } from "../../src/types/booking";
import { SEED_PREFIX as SEED_PREFIX_KEY } from "./config";
import { CLIENTS, GROOMING_SERVICES, PETS } from "./data";

export type PlannedBooking = {
  key: string;
  clientKey: string;
  petKeys: string[];
  booking: Partial<NewBooking>;
  grooming?: { serviceId: string; stationId: string | null };
  boarding?: { roomId: string };
  /** Past visits were paid; `cash` or `e-transfer`, recorded on the end date. */
  payment?: "cash" | "e-transfer";
  /** What the door saw: arrived, and (for finished visits) left. */
  arrived?: boolean;
  departed?: boolean;
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const petByName = (name: string) => {
  const p = PETS.find((x) => x.pet.name === name);
  if (!p) throw new Error(`No seeded pet named ${name}`);
  return p;
};

const TWICE_DAILY_KIBBLE = (petName: string, cups: string) => [
  {
    id: `feed-${petName.toLowerCase()}`,
    occasions: [
      {
        id: "am",
        label: "Breakfast",
        time: "07:30",
        components: [
          {
            id: "k",
            type: "kibble",
            name: "Own kibble",
            amount: cups,
            unit: "cups",
          },
        ],
      },
      {
        id: "pm",
        label: "Dinner",
        time: "17:30",
        components: [
          {
            id: "k",
            type: "kibble",
            name: "Own kibble",
            amount: cups,
            unit: "cups",
          },
        ],
      },
    ],
    source: "parent_brings",
    prepInstructions: ["warm_water"],
    ifRefuses: ["try_again_1hr", "skip_notify"],
    frequency: "daily",
    allergies: [],
    notes: "",
  },
];

type BoardingSpec = [
  pet: string,
  from: number,
  to: number,
  room: string,
  status: string,
  staff: string,
  requests?: string,
];
type DaycareSpec = [pet: string, day: number, status: string];
type GroomSpec = [
  pet: string,
  day: number,
  time: string,
  service: "bath" | "full" | "puppy" | "nails",
  status: string,
  groomer: string,
  station: string,
];

const BOARDING: BoardingSpec[] = [
  [
    "Moka",
    -40,
    -33,
    "cat-deluxe-suite-01",
    "completed",
    "Kevin Tran",
    "Loves the ball launcher. Picks at food the first night.",
  ],
  [
    "Rocky",
    -28,
    -24,
    "cat-standard-suite-01",
    "completed",
    "Kevin Tran",
    "Allergic to chicken — own food only.",
  ],
  ["Luna", -18, -11, "cat-deluxe-suite-02", "completed", "Kevin Tran"],
  [
    "Maple",
    -12,
    -9,
    "cat-standard-suite-02",
    "completed",
    "Kevin Tran",
    "Heart murmur: calm walks only, no group play.",
  ],
  ["Bruno", -7, -3, "cat-standard-suite-03", "completed", "Kevin Tran"],
  [
    "Biscuit",
    -3,
    2,
    "cat-deluxe-suite-03",
    "checked_in",
    "Kevin Tran",
    "Bring his blanket back from the laundry before pickup.",
  ],
  ["Zeus", -1, 4, "cat-standard-suite-04", "checked_in", "Kevin Tran"],
  ["Nala", 5, 12, "cat-deluxe-suite-04", "confirmed", "Kevin Tran"],
  ["Teddy", 9, 13, "cat-standard-suite-05", "confirmed", "Kevin Tran"],
  ["Murphy", 16, 20, "cat-standard-suite-06", "pending", "Kevin Tran"],
];

const DAYCARE: DaycareSpec[] = [
  ["Charlie", -20, "completed"],
  ["Mochi", -15, "completed"],
  ["Caramel", -10, "completed"],
  ["Daisy", -8, "completed"],
  ["Hazel", -6, "completed"],
  ["Chipie", -4, "completed"],
  ["Max", -2, "completed"],
  ["Kiwi", -1, "completed"],
  ["Charlie", 0, "checked_in"],
  ["Daisy", 0, "checked_in"],
  ["Hazel", 0, "checked_in"],
  ["Teddy", 0, "checked_in"],
  ["Mochi", 1, "confirmed"],
  ["Caramel", 2, "confirmed"],
  ["Max", 3, "confirmed"],
  ["Kiwi", 6, "request_submitted"],
];

const GROOMING: GroomSpec[] = [
  ["Filou", -21, "10:00", "full", "completed", "Hugo Martel", "1"],
  ["Poppy", -14, "13:00", "full", "completed", "Aïcha Diallo", "2"],
  ["Praline", -9, "09:30", "bath", "completed", "Aïcha Diallo", "tub"],
  ["Kiwi", -5, "11:00", "full", "completed", "Hugo Martel", "1"],
  ["Oscar", -3, "15:00", "nails", "completed", "Aïcha Diallo", "2"],
  ["Winston", -2, "10:30", "bath", "completed", "Hugo Martel", "tub"],
  ["Gustave", 0, "09:00", "bath", "in_progress", "Hugo Martel", "tub"],
  ["Caramel", 0, "13:30", "full", "confirmed", "Aïcha Diallo", "1"],
  ["Chipie", 4, "11:00", "bath", "confirmed", "Aïcha Diallo", "2"],
  ["Nala", 5, "16:00", "nails", "confirmed", "Hugo Martel", "1"],
  ["Filou", 7, "10:00", "full", "confirmed", "Hugo Martel", "1"],
  ["Poppy", 12, "14:00", "bath", "confirmed", "Aïcha Diallo", "2"],
  ["Winston", 0, "14:00", "full", "confirmed", "Hugo Martel", "1"],
  ["Kiwi", 1, "09:30", "full", "confirmed", "Hugo Martel", "1"],
  ["Praline", 1, "13:00", "bath", "confirmed", "Aïcha Diallo", "tub"],
  ["Oscar", 2, "10:00", "nails", "confirmed", "Aïcha Diallo", "2"],
  ["Gustave", 3, "15:00", "full", "confirmed", "Hugo Martel", "1"],
  ["Nala", -7, "11:00", "bath", "completed", "Aïcha Diallo", "tub"],
  ["Caramel", -12, "09:00", "full", "completed", "Hugo Martel", "1"],
];

// ── Phase 5 (2026-09-11): the clients added since, sixty days back and a
// month ahead. Rooms are reused only where their stays cannot overlap:
// standard 07 and 08 were free; the others fit between existing stays.
const MORE_BOARDING: BoardingSpec[] = [
  ["Olive", -55, -50, "cat-standard-suite-07", "completed", "Kevin Tran"],
  ["Willow", -45, -41, "cat-deluxe-suite-02", "completed", "Kevin Tran"],
  [
    "Loki",
    -36,
    -30,
    "cat-standard-suite-08",
    "completed",
    "Émile Roy",
    "Escape artist — double-check the latch.",
  ],
  ["Sasha", -22, -19, "cat-standard-suite-07", "completed", "Kevin Tran"],
  ["Rex", -14, -10, "cat-standard-suite-08", "completed", "Émile Roy"],
  ["Jasper", -2, 3, "cat-standard-suite-07", "checked_in", "Kevin Tran"],
  ["Ruby", 1, 6, "cat-standard-suite-08", "confirmed", "Kevin Tran"],
  ["Frida", 12, 16, "cat-standard-suite-02", "confirmed", "Émile Roy"],
  ["Coco", 22, 27, "cat-deluxe-suite-01", "confirmed", "Kevin Tran"],
  ["Buster", 25, 28, "cat-standard-suite-03", "pending", "Émile Roy"],
];

const MORE_DAYCARE: DaycareSpec[] = [
  ["Milo", -30, "completed"],
  ["Nova", -25, "completed"],
  ["Archie", -19, "completed"],
  ["Ziggy", -16, "completed"],
  ["Indy", -13, "completed"],
  ["Rosie", -9, "completed"],
  ["Tango", -5, "completed"],
  ["Nova", -3, "completed"],
  ["Milo", 0, "checked_in"],
  ["Nova", 0, "checked_in"],
  ["Archie", 0, "checked_in"],
  ["Indy", 1, "confirmed"],
  ["Rosie", 2, "confirmed"],
  ["Ziggy", 4, "confirmed"],
  ["Tango", 8, "confirmed"],
  ["Bella", 10, "request_submitted"],
  ["Lola", 14, "confirmed"],
  ["Milo", 21, "confirmed"],
];

const MORE_GROOMING: GroomSpec[] = [
  ["Bijou", -45, "10:00", "full", "completed", "Hugo Martel", "1"],
  ["Lola", -38, "13:00", "bath", "completed", "Aïcha Diallo", "tub"],
  ["Coco", -33, "09:30", "full", "completed", "Hugo Martel", "1"],
  ["Sasha", -26, "11:00", "bath", "completed", "Aïcha Diallo", "tub"],
  ["Toby", -17, "14:00", "nails", "completed", "Hugo Martel", "2"],
  ["Pépito", -11, "10:30", "bath", "completed", "Aïcha Diallo", "tub"],
  ["Archie", -4, "09:00", "full", "completed", "Hugo Martel", "1"],
  ["Bijou", 6, "10:00", "full", "confirmed", "Hugo Martel", "1"],
  ["Willow", 9, "11:30", "nails", "confirmed", "Aïcha Diallo", "2"],
  ["Coco", 11, "09:30", "full", "confirmed", "Hugo Martel", "1"],
  ["Rosie", 15, "13:00", "puppy", "confirmed", "Aïcha Diallo", "tub"],
  ["Sasha", 19, "10:00", "bath", "confirmed", "Hugo Martel", "tub"],
  ["Pépito", 26, "14:00", "bath", "confirmed", "Aïcha Diallo", "tub"],
];

const ROOM_PRICE: Record<string, number> = {
  "cat-standard-suite": 55,
  "cat-deluxe-suite": 75,
};

const addMinutes = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export function planBookings(today: string): PlannedBooking[] {
  const out: PlannedBooking[] = [];
  let n = 0;
  const key = () =>
    `${SEED_PREFIX_KEY}-booking-${String(++n).padStart(3, "0")}`;

  const addBoarding = (specs: BoardingSpec[]) => {
    for (const [petName, from, to, room, status, staff, requests] of specs) {
      const pet = petByName(petName);
      const nights = to - from;
      const rate = ROOM_PRICE[room.replace(/-\d+$/, "")];
      out.push({
        key: key(),
        clientKey: pet.ownerKey,
        petKeys: [pet.key],
        booking: {
          service: "boarding",
          serviceType: room.startsWith("cat-deluxe")
            ? "Deluxe suite"
            : "Standard suite",
          startDate: addDays(today, from),
          endDate: addDays(today, to),
          checkInTime: "14:00",
          checkOutTime: "11:00",
          status: status as NewBooking["status"],
          basePrice: rate,
          totalCost: rate * nights,
          assignedStaff: staff,
          specialRequests: requests,
          unitAssignment: room,
          feedingSchedule: TWICE_DAILY_KIBBLE(
            petName,
            pet.pet.weight! > 50 ? "2" : "1",
          ) as NewBooking["feedingSchedule"],
          ...(petName === "Maple"
            ? {
                medications: [
                  {
                    id: "med-maple-vetmedin",
                    name: "Vetmedin",
                    purpose: "Heart",
                    amount: "1",
                    strength: "1.25 mg",
                    form: "pill",
                    frequency: "twice_daily",
                    times: ["08:00", "20:00"],
                    adminInstructions: ["with_food"],
                    givenWith: "pill_pocket",
                    ifMissed: "call_parent",
                    isHighRisk: true,
                    notes: "",
                  },
                ] as NewBooking["medications"],
              }
            : {}),
        },
        boarding: { roomId: room },
        payment:
          status === "completed" ? (n % 2 ? "e-transfer" : "cash") : undefined,
        arrived: status === "completed" || status === "checked_in",
        departed: status === "completed",
      });
    }
  };

  const addDaycare = (specs: DaycareSpec[]) => {
    for (const [petName, day, status] of specs) {
      const pet = petByName(petName);
      const date = addDays(today, day);
      out.push({
        key: key(),
        clientKey: pet.ownerKey,
        petKeys: [pet.key],
        booking: {
          service: "daycare",
          serviceType: "Full day",
          startDate: date,
          endDate: date,
          checkInTime: "07:30",
          checkOutTime: "18:00",
          status: status as NewBooking["status"],
          basePrice: 38,
          totalCost: 38,
          assignedStaff: "Maude Gauthier",
          daycareSelectedDates: [date],
        },
        payment:
          status === "completed" ? (n % 3 ? "cash" : "e-transfer") : undefined,
        arrived: status === "completed" || status === "checked_in",
        departed: status === "completed",
      });
    }
  };

  const addGrooming = (specs: GroomSpec[]) => {
    for (const [
      petName,
      day,
      time,
      service,
      status,
      groomer,
      station,
    ] of specs) {
      const pet = petByName(petName);
      const svc = GROOMING_SERVICES.find((s) =>
        s.legacyId.endsWith(`-groom-${service}`),
      )!;
      const date = addDays(today, day);
      out.push({
        key: key(),
        clientKey: pet.ownerKey,
        petKeys: [pet.key],
        booking: {
          service: "grooming",
          serviceType: svc.legacyId,
          startDate: date,
          endDate: date,
          checkInTime: time,
          checkOutTime: addMinutes(time, svc.duration),
          status: status as NewBooking["status"],
          basePrice: svc.price,
          totalCost: svc.price,
          assignedStaff: groomer,
          stationAssignment: `${SEED_PREFIX_KEY}-station-${station}`,
        },
        grooming: {
          serviceId: svc.legacyId,
          stationId: `${SEED_PREFIX_KEY}-station-${station}`,
        },
        payment:
          status === "completed" ? (n % 2 ? "cash" : "e-transfer") : undefined,
        arrived: status === "completed" || status === "in_progress",
        departed: status === "completed",
      });
    }
  };

  // A booking's key is its position in this sequence, so the original three
  // lists run first, in their order, and anything added runs AFTER them —
  // appending to BOARDING would shift every daycare and grooming key by one.
  addBoarding(BOARDING);
  addDaycare(DAYCARE);
  addGrooming(GROOMING);
  addBoarding(MORE_BOARDING);
  addDaycare(MORE_DAYCARE);
  addGrooming(MORE_GROOMING);

  // Every planned booking names a seeded client and pet.
  for (const b of out) {
    if (!CLIENTS.some((c) => c.key === b.clientKey)) {
      throw new Error(`${b.key}: unknown client ${b.clientKey}`);
    }
  }
  return out;
}
