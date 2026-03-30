export interface Breed {
  name: string;
  species: "Dog" | "Cat" | "Other";
  popular?: boolean;
}

export const breeds: Breed[] = [
  // ── Dogs — Popular ──
  { name: "Golden Retriever", species: "Dog", popular: true },
  { name: "Labrador Retriever", species: "Dog", popular: true },
  { name: "German Shepherd", species: "Dog", popular: true },
  { name: "French Bulldog", species: "Dog", popular: true },
  { name: "Bulldog", species: "Dog", popular: true },
  { name: "Poodle", species: "Dog", popular: true },
  { name: "Beagle", species: "Dog", popular: true },
  { name: "Rottweiler", species: "Dog", popular: true },
  { name: "Dachshund", species: "Dog", popular: true },
  { name: "Yorkshire Terrier", species: "Dog", popular: true },
  { name: "Boxer", species: "Dog", popular: true },
  { name: "Siberian Husky", species: "Dog", popular: true },
  { name: "Cavalier King Charles Spaniel", species: "Dog", popular: true },
  { name: "Doberman Pinscher", species: "Dog", popular: true },
  { name: "Shih Tzu", species: "Dog", popular: true },
  { name: "Boston Terrier", species: "Dog", popular: true },
  { name: "Bernese Mountain Dog", species: "Dog", popular: true },
  { name: "Pomeranian", species: "Dog", popular: true },
  { name: "Havanese", species: "Dog", popular: true },
  { name: "Australian Shepherd", species: "Dog", popular: true },

  // ── Dogs — All Breeds A-Z ──
  { name: "Affenpinscher", species: "Dog" },
  { name: "Afghan Hound", species: "Dog" },
  { name: "Airedale Terrier", species: "Dog" },
  { name: "Akita", species: "Dog" },
  { name: "Alaskan Malamute", species: "Dog" },
  { name: "American Bulldog", species: "Dog" },
  { name: "American English Coonhound", species: "Dog" },
  { name: "American Eskimo Dog", species: "Dog" },
  { name: "American Foxhound", species: "Dog" },
  { name: "American Hairless Terrier", species: "Dog" },
  { name: "American Pit Bull Terrier", species: "Dog" },
  { name: "American Staffordshire Terrier", species: "Dog" },
  { name: "American Water Spaniel", species: "Dog" },
  { name: "Anatolian Shepherd Dog", species: "Dog" },
  { name: "Australian Cattle Dog", species: "Dog" },
  { name: "Australian Terrier", species: "Dog" },
  { name: "Azawakh", species: "Dog" },
  { name: "Basenji", species: "Dog" },
  { name: "Basset Hound", species: "Dog" },
  { name: "Bedlington Terrier", species: "Dog" },
  { name: "Belgian Malinois", species: "Dog" },
  { name: "Belgian Sheepdog", species: "Dog" },
  { name: "Belgian Tervuren", species: "Dog" },
  { name: "Bichon Frise", species: "Dog" },
  { name: "Black and Tan Coonhound", species: "Dog" },
  { name: "Black Russian Terrier", species: "Dog" },
  { name: "Bloodhound", species: "Dog" },
  { name: "Bluetick Coonhound", species: "Dog" },
  { name: "Border Collie", species: "Dog" },
  { name: "Border Terrier", species: "Dog" },
  { name: "Borzoi", species: "Dog" },
  { name: "Bouvier des Flandres", species: "Dog" },
  { name: "Briard", species: "Dog" },
  { name: "Brittany", species: "Dog" },
  { name: "Brussels Griffon", species: "Dog" },
  { name: "Bull Terrier", species: "Dog" },
  { name: "Bullmastiff", species: "Dog" },
  { name: "Cairn Terrier", species: "Dog" },
  { name: "Cane Corso", species: "Dog" },
  { name: "Cardigan Welsh Corgi", species: "Dog" },
  { name: "Chesapeake Bay Retriever", species: "Dog" },
  { name: "Chihuahua", species: "Dog" },
  { name: "Chinese Crested", species: "Dog" },
  { name: "Chinese Shar-Pei", species: "Dog" },
  { name: "Chow Chow", species: "Dog" },
  { name: "Clumber Spaniel", species: "Dog" },
  { name: "Cockapoo", species: "Dog" },
  { name: "Cocker Spaniel", species: "Dog" },
  { name: "Collie", species: "Dog" },
  { name: "Corgi", species: "Dog" },
  { name: "Coton de Tulear", species: "Dog" },
  { name: "Curly-Coated Retriever", species: "Dog" },
  { name: "Dalmatian", species: "Dog" },
  { name: "Dandie Dinmont Terrier", species: "Dog" },
  { name: "Dogo Argentino", species: "Dog" },
  { name: "Dogue de Bordeaux", species: "Dog" },
  { name: "Dutch Shepherd", species: "Dog" },
  { name: "English Cocker Spaniel", species: "Dog" },
  { name: "English Foxhound", species: "Dog" },
  { name: "English Setter", species: "Dog" },
  { name: "English Springer Spaniel", species: "Dog" },
  { name: "English Toy Spaniel", species: "Dog" },
  { name: "Flat-Coated Retriever", species: "Dog" },
  { name: "Fox Terrier", species: "Dog" },
  { name: "German Pinscher", species: "Dog" },
  { name: "German Shorthaired Pointer", species: "Dog" },
  { name: "German Wirehaired Pointer", species: "Dog" },
  { name: "Giant Schnauzer", species: "Dog" },
  { name: "Glen of Imaal Terrier", species: "Dog" },
  { name: "Goldendoodle", species: "Dog" },
  { name: "Gordon Setter", species: "Dog" },
  { name: "Great Dane", species: "Dog" },
  { name: "Great Pyrenees", species: "Dog" },
  { name: "Greater Swiss Mountain Dog", species: "Dog" },
  { name: "Greyhound", species: "Dog" },
  { name: "Harrier", species: "Dog" },
  { name: "Ibizan Hound", species: "Dog" },
  { name: "Icelandic Sheepdog", species: "Dog" },
  { name: "Irish Red and White Setter", species: "Dog" },
  { name: "Irish Setter", species: "Dog" },
  { name: "Irish Terrier", species: "Dog" },
  { name: "Irish Water Spaniel", species: "Dog" },
  { name: "Irish Wolfhound", species: "Dog" },
  { name: "Italian Greyhound", species: "Dog" },
  { name: "Jack Russell Terrier", species: "Dog" },
  { name: "Japanese Chin", species: "Dog" },
  { name: "Keeshond", species: "Dog" },
  { name: "Kerry Blue Terrier", species: "Dog" },
  { name: "Komondor", species: "Dog" },
  { name: "Kuvasz", species: "Dog" },
  { name: "Labradoodle", species: "Dog" },
  { name: "Lagotto Romagnolo", species: "Dog" },
  { name: "Lakeland Terrier", species: "Dog" },
  { name: "Leonberger", species: "Dog" },
  { name: "Lhasa Apso", species: "Dog" },
  { name: "Löwchen", species: "Dog" },
  { name: "Maltese", species: "Dog" },
  { name: "Maltipoo", species: "Dog" },
  { name: "Manchester Terrier", species: "Dog" },
  { name: "Mastiff", species: "Dog" },
  { name: "Miniature American Shepherd", species: "Dog" },
  { name: "Miniature Bull Terrier", species: "Dog" },
  { name: "Miniature Pinscher", species: "Dog" },
  { name: "Miniature Schnauzer", species: "Dog" },
  { name: "Mixed Breed (Dog)", species: "Dog" },
  { name: "Neapolitan Mastiff", species: "Dog" },
  { name: "Newfoundland", species: "Dog" },
  { name: "Norfolk Terrier", species: "Dog" },
  { name: "Norwegian Buhund", species: "Dog" },
  { name: "Norwegian Elkhound", species: "Dog" },
  { name: "Norwegian Lundehund", species: "Dog" },
  { name: "Norwich Terrier", species: "Dog" },
  { name: "Nova Scotia Duck Tolling Retriever", species: "Dog" },
  { name: "Old English Sheepdog", species: "Dog" },
  { name: "Otterhound", species: "Dog" },
  { name: "Papillon", species: "Dog" },
  { name: "Pekingese", species: "Dog" },
  { name: "Pembroke Welsh Corgi", species: "Dog" },
  { name: "Petit Basset Griffon Vendéen", species: "Dog" },
  { name: "Pharaoh Hound", species: "Dog" },
  { name: "Plott Hound", species: "Dog" },
  { name: "Pointer", species: "Dog" },
  { name: "Polish Lowland Sheepdog", species: "Dog" },
  { name: "Portuguese Water Dog", species: "Dog" },
  { name: "Pug", species: "Dog" },
  { name: "Puggle", species: "Dog" },
  { name: "Puli", species: "Dog" },
  { name: "Pyrenean Shepherd", species: "Dog" },
  { name: "Rat Terrier", species: "Dog" },
  { name: "Redbone Coonhound", species: "Dog" },
  { name: "Rhodesian Ridgeback", species: "Dog" },
  { name: "Saint Bernard", species: "Dog" },
  { name: "Saluki", species: "Dog" },
  { name: "Samoyed", species: "Dog" },
  { name: "Schipperke", species: "Dog" },
  { name: "Scottish Deerhound", species: "Dog" },
  { name: "Scottish Terrier", species: "Dog" },
  { name: "Sealyham Terrier", species: "Dog" },
  { name: "Shetland Sheepdog", species: "Dog" },
  { name: "Shiba Inu", species: "Dog" },
  { name: "Silky Terrier", species: "Dog" },
  { name: "Skye Terrier", species: "Dog" },
  { name: "Soft Coated Wheaten Terrier", species: "Dog" },
  { name: "Spinone Italiano", species: "Dog" },
  { name: "Staffordshire Bull Terrier", species: "Dog" },
  { name: "Standard Poodle", species: "Dog" },
  { name: "Standard Schnauzer", species: "Dog" },
  { name: "Sussex Spaniel", species: "Dog" },
  { name: "Swedish Vallhund", species: "Dog" },
  { name: "Tibetan Mastiff", species: "Dog" },
  { name: "Tibetan Spaniel", species: "Dog" },
  { name: "Tibetan Terrier", species: "Dog" },
  { name: "Toy Fox Terrier", species: "Dog" },
  { name: "Toy Poodle", species: "Dog" },
  { name: "Treeing Walker Coonhound", species: "Dog" },
  { name: "Vizsla", species: "Dog" },
  { name: "Weimaraner", species: "Dog" },
  { name: "Welsh Springer Spaniel", species: "Dog" },
  { name: "Welsh Terrier", species: "Dog" },
  { name: "West Highland White Terrier", species: "Dog" },
  { name: "Whippet", species: "Dog" },
  { name: "Wire Fox Terrier", species: "Dog" },
  { name: "Wirehaired Pointing Griffon", species: "Dog" },
  { name: "Xoloitzcuintli", species: "Dog" },

  // ── Cats — Popular ──
  { name: "Domestic Shorthair", species: "Cat", popular: true },
  { name: "Domestic Longhair", species: "Cat", popular: true },
  { name: "Maine Coon", species: "Cat", popular: true },
  { name: "Ragdoll", species: "Cat", popular: true },
  { name: "British Shorthair", species: "Cat", popular: true },
  { name: "Persian", species: "Cat", popular: true },
  { name: "Siamese", species: "Cat", popular: true },
  { name: "Bengal", species: "Cat", popular: true },
  { name: "Abyssinian", species: "Cat", popular: true },
  { name: "Scottish Fold", species: "Cat", popular: true },
  { name: "Sphynx", species: "Cat", popular: true },
  { name: "Russian Blue", species: "Cat", popular: true },
  { name: "Birman", species: "Cat", popular: true },
  { name: "Norwegian Forest Cat", species: "Cat", popular: true },
  { name: "Devon Rex", species: "Cat", popular: true },

  // ── Cats — All Breeds A-Z ──
  { name: "American Bobtail", species: "Cat" },
  { name: "American Curl", species: "Cat" },
  { name: "American Shorthair", species: "Cat" },
  { name: "American Wirehair", species: "Cat" },
  { name: "Balinese", species: "Cat" },
  { name: "Bombay", species: "Cat" },
  { name: "Burmese", species: "Cat" },
  { name: "Burmilla", species: "Cat" },
  { name: "Chartreux", species: "Cat" },
  { name: "Colorpoint Shorthair", species: "Cat" },
  { name: "Cornish Rex", species: "Cat" },
  { name: "Cymric", species: "Cat" },
  { name: "Egyptian Mau", species: "Cat" },
  { name: "European Burmese", species: "Cat" },
  { name: "Exotic Shorthair", species: "Cat" },
  { name: "Havana Brown", species: "Cat" },
  { name: "Himalayan", species: "Cat" },
  { name: "Japanese Bobtail", species: "Cat" },
  { name: "Javanese", species: "Cat" },
  { name: "Khao Manee", species: "Cat" },
  { name: "Korat", species: "Cat" },
  { name: "LaPerm", species: "Cat" },
  { name: "Lykoi", species: "Cat" },
  { name: "Manx", species: "Cat" },
  { name: "Mixed Breed (Cat)", species: "Cat" },
  { name: "Munchkin", species: "Cat" },
  { name: "Nebelung", species: "Cat" },
  { name: "Ocicat", species: "Cat" },
  { name: "Oriental", species: "Cat" },
  { name: "Pixie-Bob", species: "Cat" },
  { name: "RagaMuffin", species: "Cat" },
  { name: "Savannah", species: "Cat" },
  { name: "Selkirk Rex", species: "Cat" },
  { name: "Singapura", species: "Cat" },
  { name: "Snowshoe", species: "Cat" },
  { name: "Somali", species: "Cat" },
  { name: "Tabby", species: "Cat" },
  { name: "Tonkinese", species: "Cat" },
  { name: "Toyger", species: "Cat" },
  { name: "Turkish Angora", species: "Cat" },
  { name: "Turkish Van", species: "Cat" },

  // ── Other ──
  { name: "Holland Lop (Rabbit)", species: "Other", popular: true },
  { name: "Mini Rex (Rabbit)", species: "Other", popular: true },
  { name: "Netherland Dwarf (Rabbit)", species: "Other" },
  { name: "Flemish Giant (Rabbit)", species: "Other" },
  { name: "American Guinea Pig", species: "Other", popular: true },
  { name: "Abyssinian Guinea Pig", species: "Other" },
  { name: "Peruvian Guinea Pig", species: "Other" },
  { name: "Syrian Hamster", species: "Other", popular: true },
  { name: "Dwarf Hamster", species: "Other" },
  { name: "Fancy Rat", species: "Other" },
  { name: "Ferret", species: "Other", popular: true },
  { name: "Chinchilla", species: "Other" },
  { name: "Hedgehog", species: "Other" },
  { name: "Sugar Glider", species: "Other" },
  { name: "Cockatiel", species: "Other" },
  { name: "Budgerigar (Parakeet)", species: "Other" },
  { name: "Other / Unknown", species: "Other" },
];

// ========================================
// localStorage persistence for custom breeds
// ========================================

const STORAGE_KEY = "yipyy_custom_breeds";

function loadCustomBreeds(): Breed[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomBreeds(custom: Breed[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    /* ignore */
  }
}

// Removed breed names (persisted so they stay removed across reloads)
const REMOVED_KEY = "yipyy_removed_breeds";

function loadRemovedBreeds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(REMOVED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRemovedBreeds(removed: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(removed));
  } catch {
    /* ignore */
  }
}

// ========================================
// Read functions (merge defaults + custom, minus removed)
// ========================================

export function getAllBreeds(): Breed[] {
  const removed = new Set(loadRemovedBreeds());
  const base = breeds.filter((b) => !removed.has(b.name));
  const custom = loadCustomBreeds();
  return [...base, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}

export function getBreedsBySpecies(species: string): Breed[] {
  const s = species === "Dog" ? "Dog" : species === "Cat" ? "Cat" : "Other";
  return getAllBreeds().filter((b) => b.species === s);
}

export function getPopularBreeds(species: string): Breed[] {
  return getBreedsBySpecies(species).filter((b) => b.popular);
}

// ========================================
// CRUD functions
// ========================================

export function addBreed(breed: Breed): boolean {
  const all = getAllBreeds();
  if (all.some((b) => b.name.toLowerCase() === breed.name.toLowerCase())) {
    return false; // duplicate
  }
  const custom = loadCustomBreeds();
  custom.push(breed);
  saveCustomBreeds(custom);
  // If it was previously removed, un-remove it
  const removed = loadRemovedBreeds().filter(
    (n) => n.toLowerCase() !== breed.name.toLowerCase(),
  );
  saveRemovedBreeds(removed);
  return true;
}

export function updateBreed(oldName: string, updated: Breed): boolean {
  // Check if it's a custom breed
  const custom = loadCustomBreeds();
  const customIdx = custom.findIndex(
    (b) => b.name.toLowerCase() === oldName.toLowerCase(),
  );
  if (customIdx >= 0) {
    custom[customIdx] = updated;
    saveCustomBreeds(custom);
    return true;
  }
  // It's a default breed — remove the old, add the updated as custom
  const removed = loadRemovedBreeds();
  if (!removed.includes(oldName)) removed.push(oldName);
  saveRemovedBreeds(removed);
  custom.push(updated);
  saveCustomBreeds(custom);
  return true;
}

export function removeBreed(name: string): boolean {
  // Check custom first
  const custom = loadCustomBreeds();
  const customIdx = custom.findIndex(
    (b) => b.name.toLowerCase() === name.toLowerCase(),
  );
  if (customIdx >= 0) {
    custom.splice(customIdx, 1);
    saveCustomBreeds(custom);
    return true;
  }
  // It's a default breed — add to removed list
  const removed = loadRemovedBreeds();
  if (!removed.includes(name)) {
    removed.push(name);
    saveRemovedBreeds(removed);
  }
  return true;
}
