// ============================================================================
// Controlled substances a pet is commonly prescribed, found in what the owner
// typed (2026-10-01). A facility that does not accept them (Settings ›
// Services › Feeding & medications) stops such a medication on the booking
// form; one that does keeps it marked for staff.
//
// Generic names and common brands, in English and French spellings, matched
// word by word with accents folded — "Gabapentine 100 mg" is gabapentin. The
// client's design names gabapentin and trazodone, which many facilities treat
// as controlled although Canada's schedules do not list them; the rest are
// scheduled drugs a vet prescribes to a dog or a cat.
// ============================================================================

const CONTROLLED: Record<string, string> = {
  gabapentin: "gabapentin",
  gabapentine: "gabapentin",
  neurontin: "gabapentin",
  trazodone: "trazodone",
  desyrel: "trazodone",
  oleptro: "trazodone",
  phenobarbital: "phenobarbital",
  phenobarbitone: "phenobarbital",
  luminal: "phenobarbital",
  tramadol: "tramadol",
  ultram: "tramadol",
  diazepam: "diazepam",
  valium: "diazepam",
  alprazolam: "alprazolam",
  xanax: "alprazolam",
  lorazepam: "lorazepam",
  ativan: "lorazepam",
  clonazepam: "clonazepam",
  klonopin: "clonazepam",
  rivotril: "clonazepam",
  clorazepate: "clorazepate",
  tranxene: "clorazepate",
  midazolam: "midazolam",
  versed: "midazolam",
  butorphanol: "butorphanol",
  torbugesic: "butorphanol",
  torbutrol: "butorphanol",
  buprenorphine: "buprenorphine",
  buprenex: "buprenorphine",
  simbadol: "buprenorphine",
  hydrocodone: "hydrocodone",
  hycodan: "hydrocodone",
  codeine: "codeine",
  morphine: "morphine",
  fentanyl: "fentanyl",
  fentanil: "fentanyl",
  recuvyra: "fentanyl",
  methadone: "methadone",
  ketamine: "ketamine",
  pregabalin: "pregabalin",
  pregabaline: "pregabalin",
  lyrica: "pregabalin",
};

/** The controlled substance a medication's name is, by its generic name — or null. */
export function controlledSubstance(name: string): string | null {
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
  for (const word of words) {
    const generic = CONTROLLED[word];
    if (generic) return generic;
  }
  return null;
}
