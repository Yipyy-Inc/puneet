/**
 * The demo facility's people, animals, rooms and services — as the app's own
 * types, so they pass through the app's own row mappers on the way in.
 *
 * Deterministic: the same run produces the same rows, and every row carries a
 * `demoSeedKey`, so a second run skips what the first wrote and the teardown
 * can find exactly what the seed put there (and nothing the client created).
 */
import type { Client } from "../../src/types/client";
import type { Pet } from "../../src/types/pet";
import { SEED_PREFIX } from "./config";

// ── People ────────────────────────────────────────────────────────────────
// Montréal, both languages, the way a Plateau / Laval / Rive-Sud client list
// actually reads. Names only — every contact detail is fiction by construction.

type Owner = {
  first: string;
  last: string;
  lang: "fr" | "en";
  city: string;
  street: string;
  zip: string;
};

const OWNERS: Owner[] = [
  {
    first: "Émilie",
    last: "Tremblay",
    lang: "fr",
    city: "Montréal",
    street: "4521 rue Saint-Denis",
    zip: "H2J 2L4",
  },
  {
    first: "Marc-André",
    last: "Gagnon",
    lang: "fr",
    city: "Montréal",
    street: "1188 avenue du Mont-Royal Est",
    zip: "H2J 1Y5",
  },
  {
    first: "Sophie",
    last: "Roy",
    lang: "fr",
    city: "Laval",
    street: "2350 boulevard Le Carrefour",
    zip: "H7T 2K6",
  },
  {
    first: "Jean-François",
    last: "Côté",
    lang: "fr",
    city: "Longueuil",
    street: "825 rue Saint-Charles Ouest",
    zip: "J4H 1E6",
  },
  {
    first: "Olivia",
    last: "Bennett",
    lang: "en",
    city: "Montréal",
    street: "3470 rue Jeanne-Mance",
    zip: "H2X 2K1",
  },
  {
    first: "Nathalie",
    last: "Bouchard",
    lang: "fr",
    city: "Montréal",
    street: "5210 boulevard Saint-Laurent",
    zip: "H2T 1S1",
  },
  {
    first: "David",
    last: "Chen",
    lang: "en",
    city: "Montréal",
    street: "2100 rue Sainte-Catherine Ouest",
    zip: "H3H 1M6",
  },
  {
    first: "Isabelle",
    last: "Morin",
    lang: "fr",
    city: "Laval",
    street: "1600 boulevard Saint-Martin Ouest",
    zip: "H7S 1M9",
  },
  {
    first: "Priya",
    last: "Sharma",
    lang: "en",
    city: "Laval",
    street: "3035 boulevard Le Carrefour",
    zip: "H7T 1C8",
  },
  {
    first: "Mathieu",
    last: "Lavoie",
    lang: "fr",
    city: "Longueuil",
    street: "150 rue Saint-Laurent Ouest",
    zip: "J4H 1M1",
  },
  {
    first: "Chloé",
    last: "Pelletier",
    lang: "fr",
    city: "Montréal",
    street: "6780 rue Saint-Hubert",
    zip: "H2S 2M6",
  },
  {
    first: "Ryan",
    last: "O'Connor",
    lang: "en",
    city: "Montréal",
    street: "4190 rue Notre-Dame Ouest",
    zip: "H4C 1R6",
  },
  {
    first: "Geneviève",
    last: "Fortin",
    lang: "fr",
    city: "Montréal",
    street: "965 rue Rachel Est",
    zip: "H2J 2J3",
  },
  {
    first: "Karim",
    last: "Haddad",
    lang: "fr",
    city: "Laval",
    street: "4500 boulevard Samson",
    zip: "H7W 2G9",
  },
  {
    first: "Laura",
    last: "Mitchell",
    lang: "en",
    city: "Longueuil",
    street: "2255 chemin de Chambly",
    zip: "J4J 3Y2",
  },
  {
    first: "Alexandre",
    last: "Bélanger",
    lang: "fr",
    city: "Montréal",
    street: "3825 rue Masson",
    zip: "H1X 1S3",
  },
  {
    first: "Camille",
    last: "Leblanc",
    lang: "fr",
    city: "Montréal",
    street: "1455 rue Beaubien Est",
    zip: "H2G 1L2",
  },
  {
    first: "Daniel",
    last: "Nguyen",
    lang: "en",
    city: "Montréal",
    street: "5600 chemin de la Côte-des-Neiges",
    zip: "H3T 1Y8",
  },
  {
    first: "Julie",
    last: "Girard",
    lang: "fr",
    city: "Longueuil",
    street: "610 boulevard Roland-Therrien",
    zip: "J4H 3V9",
  },
  {
    first: "Samuel",
    last: "Poirier",
    lang: "fr",
    city: "Laval",
    street: "1870 boulevard Curé-Labelle",
    zip: "H7T 1R1",
  },
  {
    first: "Megan",
    last: "Walsh",
    lang: "en",
    city: "Montréal",
    street: "2425 rue Centre",
    zip: "H3K 1J5",
  },
  {
    first: "Louis",
    last: "Caron",
    lang: "fr",
    city: "Montréal",
    street: "7240 rue Saint-Denis",
    zip: "H2R 2E2",
  },
  {
    first: "Amélie",
    last: "Dubé",
    lang: "fr",
    city: "Longueuil",
    street: "3100 boulevard Taschereau",
    zip: "J4V 2H5",
  },
  {
    first: "Thomas",
    last: "Wright",
    lang: "en",
    city: "Laval",
    street: "955 boulevard des Laurentides",
    zip: "H7G 2V9",
  },
];

/** "Émilie Tremblay" → "emilie.tremblay@example.invalid". */
function emailFor(first: string, last: string) {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, "");
  return `${slug(first)}.${slug(last)}@example.invalid`;
}

export type SeedClient = {
  key: string;
  client: Partial<Client>;
};

export const CLIENTS: SeedClient[] = OWNERS.map((o, i) => ({
  key: `${SEED_PREFIX}-client-${String(i + 1).padStart(2, "0")}`,
  client: {
    name: `${o.first} ${o.last}`,
    email: emailFor(o.first, o.last),
    phone: `+1 ${i % 3 === 1 ? "450" : "514"} 555-01${String(i + 10).padStart(2, "0")}`,
    status: "active",
    preferredLanguage: o.lang,
    address: {
      street: o.street,
      city: o.city,
      state: "QC",
      zip: o.zip,
      country: "Canada",
    },
  },
}));

// ── Animals ───────────────────────────────────────────────────────────────

type PetSpec = Omit<Partial<Pet>, "id"> & { owner: number };

const DOG = (n: number) => `/dogs/dog-${(n % 4) + 1}.jpg`;
const CAT = (n: number) => `/cats/cat-${(n % 4) + 1}.jpg`;

const PET_SPECS: PetSpec[] = [
  {
    owner: 0,
    name: "Moka",
    type: "Dog",
    breed: "Labrador Retriever",
    age: 4,
    weight: 68,
    color: "Chocolate",
    sex: "female",
    coatType: "short",
    energyLevel: "high",
  },
  {
    owner: 0,
    name: "Pixel",
    type: "Cat",
    breed: "Domestic Shorthair",
    age: 6,
    weight: 11,
    color: "Grey tabby",
    sex: "male",
    coatType: "short",
    energyLevel: "low",
  },
  {
    owner: 1,
    name: "Rocky",
    type: "Dog",
    breed: "German Shepherd",
    age: 5,
    weight: 82,
    color: "Black and tan",
    sex: "male",
    coatType: "medium",
    energyLevel: "high",
    allergies: "Chicken",
  },
  {
    owner: 2,
    name: "Biscuit",
    type: "Dog",
    breed: "Golden Retriever",
    age: 3,
    weight: 64,
    color: "Golden",
    sex: "male",
    coatType: "long",
    energyLevel: "high",
  },
  {
    owner: 3,
    name: "Luna",
    type: "Dog",
    breed: "Bernese Mountain Dog",
    age: 2,
    weight: 88,
    color: "Tricolour",
    sex: "female",
    coatType: "long",
    energyLevel: "medium",
  },
  {
    owner: 4,
    name: "Maple",
    type: "Dog",
    breed: "Cavalier King Charles Spaniel",
    age: 7,
    weight: 17,
    color: "Blenheim",
    sex: "female",
    coatType: "long",
    energyLevel: "low",
    specialNeeds: "Heart murmur — no strenuous play",
  },
  {
    owner: 5,
    name: "Filou",
    type: "Dog",
    breed: "Miniature Poodle",
    age: 4,
    weight: 14,
    color: "Apricot",
    sex: "male",
    coatType: "curly",
    energyLevel: "medium",
  },
  {
    owner: 5,
    name: "Minou",
    type: "Cat",
    breed: "Maine Coon",
    age: 3,
    weight: 15,
    color: "Brown tabby",
    sex: "female",
    coatType: "long",
    energyLevel: "medium",
  },
  {
    owner: 6,
    name: "Mochi",
    type: "Dog",
    breed: "Shiba Inu",
    age: 3,
    weight: 22,
    color: "Red",
    sex: "female",
    coatType: "medium",
    energyLevel: "medium",
  },
  {
    owner: 7,
    name: "Charlie",
    type: "Dog",
    breed: "Beagle",
    age: 6,
    weight: 26,
    color: "Tricolour",
    sex: "male",
    coatType: "short",
    energyLevel: "high",
  },
  {
    owner: 8,
    name: "Kiwi",
    type: "Dog",
    breed: "Havanese",
    age: 2,
    weight: 11,
    color: "White",
    sex: "female",
    coatType: "long",
    energyLevel: "medium",
  },
  {
    owner: 9,
    name: "Bruno",
    type: "Dog",
    breed: "Boxer",
    age: 5,
    weight: 70,
    color: "Fawn",
    sex: "male",
    coatType: "short",
    energyLevel: "high",
  },
  {
    owner: 10,
    name: "Nala",
    type: "Dog",
    breed: "Australian Shepherd",
    age: 3,
    weight: 48,
    color: "Blue merle",
    sex: "female",
    coatType: "medium",
    energyLevel: "high",
  },
  {
    owner: 11,
    name: "Murphy",
    type: "Dog",
    breed: "Irish Setter",
    age: 4,
    weight: 62,
    color: "Red",
    sex: "male",
    coatType: "long",
    energyLevel: "high",
  },
  {
    owner: 12,
    name: "Caramel",
    type: "Dog",
    breed: "Cockapoo",
    age: 2,
    weight: 19,
    color: "Caramel",
    sex: "female",
    coatType: "curly",
    energyLevel: "high",
  },
  {
    owner: 12,
    name: "Réglisse",
    type: "Cat",
    breed: "Bombay",
    age: 5,
    weight: 10,
    color: "Black",
    sex: "male",
    coatType: "short",
    energyLevel: "low",
  },
  {
    owner: 13,
    name: "Zeus",
    type: "Dog",
    breed: "Doberman Pinscher",
    age: 6,
    weight: 78,
    color: "Black and rust",
    sex: "male",
    coatType: "short",
    energyLevel: "medium",
  },
  {
    owner: 14,
    name: "Daisy",
    type: "Dog",
    breed: "Corgi (Pembroke)",
    age: 4,
    weight: 27,
    color: "Red and white",
    sex: "female",
    coatType: "medium",
    energyLevel: "high",
  },
  {
    owner: 15,
    name: "Oscar",
    type: "Dog",
    breed: "French Bulldog",
    age: 3,
    weight: 24,
    color: "Brindle",
    sex: "male",
    coatType: "short",
    energyLevel: "low",
    specialNeeds: "Brachycephalic — keep cool, short walks",
  },
  {
    owner: 16,
    name: "Poppy",
    type: "Dog",
    breed: "Bichon Frisé",
    age: 8,
    weight: 13,
    color: "White",
    sex: "female",
    coatType: "curly",
    energyLevel: "low",
  },
  {
    owner: 17,
    name: "Teddy",
    type: "Dog",
    breed: "Goldendoodle",
    age: 2,
    weight: 55,
    color: "Cream",
    sex: "male",
    coatType: "curly",
    energyLevel: "high",
  },
  {
    owner: 18,
    name: "Chipie",
    type: "Dog",
    breed: "Jack Russell Terrier",
    age: 5,
    weight: 15,
    color: "White and tan",
    sex: "female",
    coatType: "wire",
    energyLevel: "high",
  },
  {
    owner: 19,
    name: "Max",
    type: "Dog",
    breed: "Siberian Husky",
    age: 4,
    weight: 52,
    color: "Grey and white",
    sex: "male",
    coatType: "medium",
    energyLevel: "high",
  },
  {
    owner: 20,
    name: "Hazel",
    type: "Dog",
    breed: "Border Collie",
    age: 3,
    weight: 40,
    color: "Black and white",
    sex: "female",
    coatType: "medium",
    energyLevel: "high",
  },
  {
    owner: 20,
    name: "Juniper",
    type: "Cat",
    breed: "Ragdoll",
    age: 2,
    weight: 12,
    color: "Seal point",
    sex: "female",
    coatType: "long",
    energyLevel: "low",
  },
  {
    owner: 21,
    name: "Gustave",
    type: "Dog",
    breed: "Basset Hound",
    age: 7,
    weight: 55,
    color: "Tricolour",
    sex: "male",
    coatType: "short",
    energyLevel: "low",
    allergies: "Beef",
  },
  {
    owner: 22,
    name: "Praline",
    type: "Dog",
    breed: "Shih Tzu",
    age: 6,
    weight: 12,
    color: "Gold and white",
    sex: "female",
    coatType: "long",
    energyLevel: "low",
  },
  {
    owner: 23,
    name: "Winston",
    type: "Dog",
    breed: "English Bulldog",
    age: 4,
    weight: 50,
    color: "White and fawn",
    sex: "male",
    coatType: "short",
    energyLevel: "low",
  },
];

export type SeedPet = { key: string; ownerKey: string; pet: Partial<Pet> };

export const PETS: SeedPet[] = PET_SPECS.map(({ owner, ...spec }, i) => ({
  key: `${SEED_PREFIX}-pet-${String(i + 1).padStart(2, "0")}`,
  ownerKey: CLIENTS[owner].key,
  pet: {
    microchip: `9820000${String(40210 + i * 37).padStart(8, "0")}`,
    allergies: "",
    specialNeeds: "",
    spayedNeutered: i % 5 !== 3,
    petStatus: "active",
    imageUrl: spec.type === "Cat" ? CAT(i) : DOG(i),
    ...spec,
  },
}));

// ── Staff (roster only — no login, no invite) ──────────────────────────────

export type SeedStaff = {
  legacyId: string;
  first: string;
  last: string;
  email: string;
  role: string;
  jobTitle: string;
};

export const STAFF: SeedStaff[] = [
  {
    first: "Valérie",
    last: "Lacroix",
    role: "manager",
    jobTitle: "Facility manager",
  },
  {
    first: "Hugo",
    last: "Martel",
    role: "groomer",
    jobTitle: "Senior groomer",
  },
  { first: "Aïcha", last: "Diallo", role: "groomer", jobTitle: "Groomer" },
  {
    first: "Kevin",
    last: "Tran",
    role: "boarding_attendant",
    jobTitle: "Boarding attendant",
  },
  {
    first: "Maude",
    last: "Gauthier",
    role: "daycare_attendant",
    jobTitle: "Daycare lead",
  },
  {
    first: "Sarah",
    last: "Lindsay",
    role: "reception",
    jobTitle: "Front desk",
  },
].map((s, i) => ({
  ...s,
  legacyId: `${SEED_PREFIX}-staff-${String(i + 1).padStart(2, "0")}`,
  email: emailFor(s.first, s.last).replace("@", `.staff@`),
}));

// ── Rooms and daycare areas ───────────────────────────────────────────────

export type SeedCategory = {
  legacyId: string;
  service: "boarding" | "daycare";
  name: string;
  description: string;
  color: string;
  capacity: number;
  price: number | null;
  units: number;
};

export const CATEGORIES: SeedCategory[] = [
  {
    legacyId: "cat-standard-suite",
    service: "boarding",
    name: "Standard suite",
    description: "Heated run with a raised bed and a window.",
    color: "blue",
    capacity: 1,
    price: 55,
    units: 8,
  },
  {
    legacyId: "cat-deluxe-suite",
    service: "boarding",
    name: "Deluxe suite",
    description: "Larger suite with a webcam and a private outdoor run.",
    color: "violet",
    capacity: 1,
    price: 75,
    units: 4,
  },
  {
    legacyId: "cat-small-dogs",
    service: "daycare",
    name: "Small dogs",
    description: "Up to 25 lb.",
    color: "green",
    capacity: 14,
    price: null,
    units: 1,
  },
  {
    legacyId: "cat-big-dogs",
    service: "daycare",
    name: "Big dogs",
    description: "25 lb and over.",
    color: "amber",
    capacity: 20,
    price: null,
    units: 1,
  },
];

export const DAYCARE_PRICE = 38;

// ── Grooming ──────────────────────────────────────────────────────────────

export const GROOMING_SERVICES = [
  {
    legacyId: `${SEED_PREFIX}-groom-bath`,
    name: "Bath and brush",
    description: "Shampoo, blow-dry, brush-out, ears and nails.",
    price: 55,
    duration: 60,
    popular: true,
  },
  {
    legacyId: `${SEED_PREFIX}-groom-full`,
    name: "Full groom",
    description: "Bath, haircut to breed standard or your style, ears, nails.",
    price: 85,
    duration: 120,
    popular: true,
  },
  {
    legacyId: `${SEED_PREFIX}-groom-puppy`,
    name: "Puppy introduction",
    description: "A gentle first groom for puppies under 6 months.",
    price: 40,
    duration: 45,
    popular: false,
  },
  {
    legacyId: `${SEED_PREFIX}-groom-nails`,
    name: "Nail trim",
    description: "Nails clipped and filed.",
    price: 15,
    duration: 15,
    popular: false,
  },
];

export const GROOMING_ADD_ONS = [
  {
    legacyId: `${SEED_PREFIX}-addon-teeth`,
    name: "Teeth brushing",
    price: 10,
    duration: 10,
  },
  {
    legacyId: `${SEED_PREFIX}-addon-deshed`,
    name: "De-shedding treatment",
    price: 20,
    duration: 20,
  },
];

export const GROOMING_STATIONS = [
  { legacyId: `${SEED_PREFIX}-station-1`, name: "Table 1", type: "table" },
  { legacyId: `${SEED_PREFIX}-station-2`, name: "Table 2", type: "table" },
  { legacyId: `${SEED_PREFIX}-station-tub`, name: "Tub", type: "tub" },
];

// ── The business itself ───────────────────────────────────────────────────

export const FACILITY_PROFILE = {
  email: "hello.pawsco@example.invalid",
  phone: "+1 514 555-0100",
  description:
    "Boarding, daycare and grooming on the Plateau, in Laval and on the South Shore.",
  address: {
    street: "4260 rue Saint-Denis",
    city: "Montréal",
    state: "QC",
    zipCode: "H2J 2K8",
    country: "Canada",
  },
};

// ── The facility's routine: task templates per service ────────────────────
//
// What the booking page's Tasks card is generated from. Recurring ones repeat
// per night of a stay, so a week's boarding has a week of kennel cleans.

export type SeedTaskTemplate = {
  legacyId: string;
  moduleId: "boarding" | "daycare" | "grooming";
  name: string;
  description: string;
  category: "setup" | "execution" | "cleanup" | "transport" | "care" | "custom";
  timingType: "before_start" | "at_start" | "during" | "at_end" | "after_end";
  offsetMinutes?: number;
  durationMinutes: number;
  isRequired: boolean;
  recurringTimes?: string[];
};

export const TASK_TEMPLATES: SeedTaskTemplate[] = [
  {
    legacyId: `${SEED_PREFIX}-task-suite-prep`,
    moduleId: "boarding",
    name: "Prepare the suite",
    description: "Fresh bedding, water bowl, name card on the door.",
    category: "setup",
    timingType: "before_start",
    offsetMinutes: -60,
    durationMinutes: 15,
    isRequired: true,
  },
  {
    legacyId: `${SEED_PREFIX}-task-arrival-check`,
    moduleId: "boarding",
    name: "Arrival health check",
    description:
      "Eyes, ears, coat and weight; note anything the owner did not mention.",
    category: "care",
    timingType: "at_start",
    durationMinutes: 10,
    isRequired: true,
  },
  {
    legacyId: `${SEED_PREFIX}-task-suite-clean`,
    moduleId: "boarding",
    name: "Clean the suite",
    description: "Spot clean, refresh water, check the bedding.",
    category: "cleanup",
    timingType: "during",
    durationMinutes: 10,
    isRequired: false,
    recurringTimes: ["10:00"],
  },
  {
    legacyId: `${SEED_PREFIX}-task-departure-brush`,
    moduleId: "boarding",
    name: "Going-home brush",
    description: "A brush and a photo for the owner before pickup.",
    category: "execution",
    timingType: "at_end",
    offsetMinutes: -30,
    durationMinutes: 15,
    isRequired: false,
  },
  {
    legacyId: `${SEED_PREFIX}-task-temperament`,
    moduleId: "daycare",
    name: "Temperament check at drop-off",
    description: "How they greet the group decides the playgroup today.",
    category: "care",
    timingType: "at_start",
    durationMinutes: 5,
    isRequired: true,
  },
  {
    legacyId: `${SEED_PREFIX}-task-daycare-report`,
    moduleId: "daycare",
    name: "Write the day's report card",
    description: "Two lines and a photo before pickup.",
    category: "execution",
    timingType: "at_end",
    offsetMinutes: -45,
    durationMinutes: 10,
    isRequired: false,
  },
  {
    legacyId: `${SEED_PREFIX}-task-station-prep`,
    moduleId: "grooming",
    name: "Set up the station",
    description: "Blades cleaned, towels out, the right shampoo for the coat.",
    category: "setup",
    timingType: "before_start",
    offsetMinutes: -15,
    durationMinutes: 10,
    isRequired: true,
  },
  {
    legacyId: `${SEED_PREFIX}-task-after-photo`,
    moduleId: "grooming",
    name: "Take the after photo",
    description: "For the owner's report card.",
    category: "execution",
    timingType: "at_end",
    durationMinutes: 5,
    isRequired: false,
  },
];

// ── Notes staff have written ─────────────────────────────────────────────

export type SeedNote = {
  /** The pet's or the client's name in the seed; the runner resolves it. */
  about: { pet: string } | { client: string };
  subType?: "general" | "behavior" | "medical" | "feeding";
  content: string;
  pinned?: boolean;
  shared?: boolean;
  author: string;
};

export const NOTES: SeedNote[] = [
  {
    about: { pet: "Maple" },
    subType: "medical",
    content:
      "Heart murmur. Vetmedin 08:00 and 20:00 in a pill pocket — never skip. Short walks only, no group play.",
    pinned: true,
    author: "Valérie Lacroix",
  },
  {
    about: { pet: "Biscuit" },
    subType: "behavior",
    content:
      "Resource guards tennis balls. Fine with every dog otherwise; take the balls out of the yard before his group goes in.",
    pinned: true,
    author: "Valérie Lacroix",
  },
  {
    about: { pet: "Luna" },
    subType: "feeding",
    content: "Eats slowly — give her twenty minutes before you lift the bowl.",
    shared: true,
    author: "Hugo Martel",
  },
  {
    about: { client: "Isabelle Morin" },
    content:
      "Prefers a text over a call during the day. Picks up after 17:30 on weekdays.",
    author: "Valérie Lacroix",
  },
];

// ── Incidents on record ───────────────────────────────────────────────────

export type SeedIncident = {
  key: string;
  pet: string;
  kind:
    | "injury"
    | "illness"
    | "behavioral"
    | "accident"
    | "escape"
    | "fight"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  title: string;
  description: string;
  internalNotes: string;
  clientNotes: string;
  daysAgo: number;
  ownerTold: boolean;
  followUp?: { title: string; description: string; dueInDays: number };
};

export const INCIDENTS: SeedIncident[] = [
  {
    key: `${SEED_PREFIX}-incident-01`,
    pet: "Biscuit",
    kind: "behavioral",
    severity: "medium",
    status: "investigating",
    title: "Growled at a playmate over a ball",
    description:
      "Biscuit growled and snapped the air when a younger dog reached for his ball in the big-dog yard. No contact. Separated for ten minutes, then back in without toys.",
    internalNotes:
      "Third time with toys this month. Take balls out of the yard before his group.",
    clientNotes:
      "Biscuit had a short disagreement over a toy today — no contact, and he went back to playing happily without toys.",
    daysAgo: 2,
    ownerTold: true,
    followUp: {
      title: "Call the owner about toy guarding",
      description:
        "Ask whether it happens at home, and whether they want a trainer's opinion.",
      dueInDays: 1,
    },
  },
  {
    key: `${SEED_PREFIX}-incident-02`,
    pet: "Luna",
    kind: "injury",
    severity: "low",
    status: "resolved",
    title: "Small scratch on the left ear",
    description:
      "Found a 1 cm scratch on Luna's left ear during the afternoon round. Cleaned with saline; no swelling.",
    internalNotes:
      "Probably the fence by run 4 — maintenance asked to check it.",
    clientNotes:
      "Luna has a small scratch on her left ear. We cleaned it and it looks fine; keep an eye on it for a day or two.",
    daysAgo: 9,
    ownerTold: true,
  },
];

// ── Vaccination records ───────────────────────────────────────────────────
//
// Every animal has the facility's required vaccines on file, most of them
// current — the realistic picture — with the handful of cases a front desk
// actually meets: one expiring this month, one already lapsed, one waiting
// for somebody to look at it, one rejected and one accepted by exception.
// Vaccine names match the shipped requirement list, so "missing required"
// reads true.

export type SeedVaccination = {
  pet: string;
  vaccine: string;
  givenDaysAgo: number;
  /** Null for a record with no expiry. */
  expiresInDays: number | null;
  status: "approved" | "pending_review" | "rejected" | "exception";
  reason?: string;
  vet: string;
  clinic: string;
};

const VETS = [
  ["Dr Amélie Roy", "Clinique vétérinaire du Plateau"],
  ["Dr Marc Tessier", "Hôpital vétérinaire Rosemont"],
  ["Dr Julia Chen", "Westmount Animal Clinic"],
] as const;

const DOG_VACCINES = ["Rabies", "DHPP", "Bordetella"];
const CAT_VACCINES = ["Rabies", "FVRCP"];

/** The exceptions, by pet index and vaccine; everything else is current. */
const VACCINE_CASES: Record<
  string,
  Partial<Pick<SeedVaccination, "expiresInDays" | "status" | "reason">>
> = {
  "2:Bordetella": { expiresInDays: 12 },
  "5:Rabies": { expiresInDays: -9 },
  "7:DHPP": { status: "pending_review" },
  "9:Bordetella": {
    status: "rejected",
    reason:
      "The certificate is a photo of a screen — ask for the clinic’s PDF.",
  },
  "11:Bordetella": {
    status: "exception",
    reason:
      "Booster given three weeks ago; the clinic is sending the paperwork.",
  },
  "14:FVRCP": { expiresInDays: 21 },
};

export const VACCINATIONS: SeedVaccination[] = PETS.flatMap((p, i) => {
  const names = p.pet.type === "Cat" ? CAT_VACCINES : DOG_VACCINES;
  const [vet, clinic] = VETS[i % VETS.length];
  return names.map((vaccine, j) => {
    const special = VACCINE_CASES[`${i}:${vaccine}`] ?? {};
    const expiresInDays =
      special.expiresInDays ?? 90 + ((i * 53 + j * 71) % 600);
    return {
      pet: p.pet.name!,
      vaccine,
      givenDaysAgo: 365 - Math.min(expiresInDays, 300) + 30,
      expiresInDays,
      status: special.status ?? "approved",
      reason: special.reason,
      vet,
      clinic,
    };
  });
});

// ── Estimates ─────────────────────────────────────────────────────────────
//
// One in every state a list shows. Amounts are the facility's own seeded
// prices; the totals are recomputed by the seed exactly as the route does.

export type SeedEstimateLine = {
  label: string;
  amount: number;
  quantity: number;
};

export type SeedEstimate = {
  key: string;
  /** A client by index into CLIENTS, or a guest. */
  client?: number;
  guest?: {
    name: string;
    email: string;
    phone?: string;
    pet: { name: string; breed: string };
  };
  pets?: string[];
  service: "boarding" | "daycare" | "grooming";
  serviceType?: string;
  startInDays: number;
  nights?: number;
  lines: SeedEstimateLine[];
  discount?: number;
  discountReason?: string;
  deposit?: number;
  publicNote?: string;
  internalNote?: string;
  state:
    | "draft"
    | "sent"
    | "viewed"
    | "accepted"
    | "declined"
    | "expired"
    | "converted";
  sentDaysAgo?: number;
  declineReason?: string;
};

export const ESTIMATES: SeedEstimate[] = [
  {
    key: `${SEED_PREFIX}-estimate-01`,
    client: 3,
    service: "boarding",
    serviceType: "Standard suite",
    startInDays: 34,
    nights: 5,
    lines: [
      { label: "Standard suite", amount: 55, quantity: 5 },
      { label: "Nightly tuck-in treat", amount: 4, quantity: 5 },
    ],
    internalNote:
      "Asked about the deluxe suite too — price it if they call back.",
    state: "draft",
  },
  {
    key: `${SEED_PREFIX}-estimate-02`,
    client: 4,
    service: "grooming",
    serviceType: "Full groom",
    startInDays: 9,
    lines: [
      { label: "Full groom", amount: 85, quantity: 1 },
      { label: "Nail grinding", amount: 15, quantity: 1 },
    ],
    state: "sent",
    sentDaysAgo: 2,
  },
  {
    key: `${SEED_PREFIX}-estimate-03`,
    client: 5,
    service: "daycare",
    serviceType: "Full day",
    startInDays: 6,
    lines: [{ label: "Daycare — full day", amount: 38, quantity: 10 }],
    discount: 38,
    discountReason: "Ten-day bundle",
    publicNote: "Ten full days to use over the next two months.",
    state: "viewed",
    sentDaysAgo: 4,
  },
  {
    key: `${SEED_PREFIX}-estimate-04`,
    client: 6,
    service: "boarding",
    serviceType: "Deluxe suite",
    startInDays: 20,
    nights: 3,
    lines: [{ label: "Deluxe suite", amount: 72, quantity: 3 }],
    deposit: 50,
    state: "accepted",
    sentDaysAgo: 6,
  },
  {
    key: `${SEED_PREFIX}-estimate-05`,
    client: 7,
    service: "boarding",
    serviceType: "Standard suite",
    startInDays: 15,
    nights: 7,
    lines: [{ label: "Standard suite", amount: 55, quantity: 7 }],
    state: "declined",
    sentDaysAgo: 12,
    declineReason: "Found a sitter closer to home.",
  },
  {
    key: `${SEED_PREFIX}-estimate-06`,
    client: 8,
    service: "grooming",
    serviceType: "Bath and brush",
    startInDays: -20,
    lines: [{ label: "Bath and brush", amount: 55, quantity: 1 }],
    state: "expired",
    sentDaysAgo: 44,
  },
  {
    key: `${SEED_PREFIX}-estimate-07`,
    guest: {
      name: "Sophie Tremblay",
      email: "sophie.tremblay@example.invalid",
      phone: "+1 514 555-0199",
      pet: { name: "Ruby", breed: "Beagle" },
    },
    service: "daycare",
    serviceType: "Trial day",
    startInDays: 3,
    lines: [
      { label: "Temperament evaluation", amount: 30, quantity: 1 },
      { label: "Daycare — full day", amount: 38, quantity: 1 },
    ],
    publicNote:
      "Ruby spends her first half day with our trainer before joining a group.",
    state: "sent",
    sentDaysAgo: 1,
  },
  {
    key: `${SEED_PREFIX}-estimate-08`,
    client: 0,
    service: "boarding",
    serviceType: "Standard suite",
    startInDays: 12,
    nights: 4,
    lines: [{ label: "Standard suite", amount: 55, quantity: 4 }],
    state: "converted",
    sentDaysAgo: 8,
  },
];

// ── Store credit ──────────────────────────────────────────────────────────

export const STORE_CREDIT = [
  {
    client: 2,
    amount: 25,
    reason: "added" as const,
    note: "Goodwill — the groom ran forty minutes late.",
    daysAgo: 16,
  },
  {
    client: 9,
    amount: 60,
    reason: "refund" as const,
    note: "Cancelled boarding night refunded as credit.",
    daysAgo: 30,
  },
  {
    client: 9,
    amount: -20,
    reason: "redeemed" as const,
    note: "Used at the till on a daycare day.",
    daysAgo: 11,
  },
];
