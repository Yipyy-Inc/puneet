/**
 * Six weeks of a facility's life, laid out relative to the day the seed runs:
 * finished stays and visits in the past (paid), dogs on site today, and a
 * calendar that fills up over the next three weeks.
 *
 * Every boarding stay gets its OWN room, so no two ever overlap and the
 * database's exclusion constraint (23P01) never has an opinion.
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

  for (const [petName, from, to, room, status, staff, requests] of BOARDING) {
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

  for (const [petName, day, status] of DAYCARE) {
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

  for (const [
    petName,
    day,
    time,
    service,
    status,
    groomer,
    station,
  ] of GROOMING) {
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

  // Every planned booking names a seeded client and pet.
  for (const b of out) {
    if (!CLIENTS.some((c) => c.key === b.clientKey)) {
      throw new Error(`${b.key}: unknown client ${b.clientKey}`);
    }
  }
  return out;
}
