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
