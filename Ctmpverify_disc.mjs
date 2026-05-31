function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function findDisciplineIdByName(className, items) {
  const normalized = normalize(className);
  const exact = items.find((item) => normalize(item.name) === normalized);
  if (exact && exact.disciplineId) return exact.disciplineId;
  const partial = items.find((item) => {
    const itemName = normalize(item.name);
    return itemName.includes(normalized) || normalized.includes(itemName);
  });
  return partial && partial.disciplineId;
}

const courseTypes = [
  { name: "Basic Obedience / Beginner Manners", disciplineId: "discipline-obedience" },
  { name: "Intermediate / Level 2 Obedience", disciplineId: "discipline-obedience" },
  { name: "Advanced Obedience", disciplineId: "discipline-obedience" },
  { name: "Reactive Rover Recovery", disciplineId: "discipline-behavior" },
  { name: "Puppy Preschool", disciplineId: "discipline-puppy" },
  { name: "Canine Good Citizen Prep", disciplineId: "discipline-obedience" },
];

const packages = [
  { name: "Puppy Starter Pack", disciplineId: "discipline-puppy" },
  { name: "Basic Obedience Package", disciplineId: "discipline-obedience" },
  { name: "Advanced Training Package", disciplineId: "discipline-obedience" },
  { name: "Agility Starter Package", disciplineId: "discipline-agility" },
  { name: "Reactive Dog Program", disciplineId: "discipline-behavior" },
  { name: "Trick Training Bundle", disciplineId: "discipline-obedience" },
  { name: "CGC Test Prep", disciplineId: "discipline-obedience" },
  { name: "Competition Agility Package", disciplineId: "discipline-agility" },
];

function resolve(className) {
  const ct = findDisciplineIdByName(className, courseTypes);
  const pk = findDisciplineIdByName(className, packages);
  const result = ct || pk;
  // determine which source matched
  let source = "none";
  if (ct) source = "courseType";
  else if (pk) source = "package";
  return { className, result: result || "undefined", source };
}

const names = [
  "Basic Obedience",
  "Advanced Obedience",
  "Trick Training",
  "Puppy Kindergarten",
  "Agility Foundations",
  "Reactive Dog Workshop",
  "Reactive Dog Private Session",
  "Private Obedience Coaching",
  // extras present in data not in finding's list of 8
  "Competition Agility",
  "Canine Good Citizen Prep",
];

for (const n of names) {
  console.log(JSON.stringify(resolve(n)));
}
