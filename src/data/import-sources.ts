import type { ImportSource } from "@/types/import";

// Source platforms admins can import from. Logos are represented as monogram
// tiles (no third-party brand assets bundled). MoeGo and Gingr have built-in
// column parsers; the rest are mapped manually (parsers land in Task 44).
export const importSources: ImportSource[] = [
  {
    id: "moego",
    name: "MoeGo",
    monogram: "MG",
    gradient: "from-indigo-500 to-blue-600",
    importableData: ["Customers", "Pets", "Appointments"],
    exportGuideUrl: "#moego-export-guide",
    separateFiles: false,
    parser: "moego",
  },
  {
    id: "gingr",
    name: "Gingr",
    monogram: "Gi",
    gradient: "from-orange-500 to-amber-600",
    importableData: ["Owners", "Animals", "Reservations"],
    exportGuideUrl: "#gingr-export-guide",
    separateFiles: true,
    parser: "gingr",
  },
  {
    id: "pawpartner",
    name: "PawPartner",
    monogram: "PP",
    gradient: "from-emerald-500 to-teal-600",
    importableData: ["Clients", "Pets", "Bookings"],
    exportGuideUrl: "#pawpartner-export-guide",
    separateFiles: false,
    parser: null,
  },
  {
    id: "propetware",
    name: "ProPetware",
    monogram: "PW",
    gradient: "from-violet-500 to-purple-600",
    importableData: ["Customers", "Pets", "Appointments"],
    exportGuideUrl: "#propetware-export-guide",
    separateFiles: true,
    parser: null,
  },
  {
    id: "123petsoftware",
    name: "123Pet Software",
    monogram: "123",
    gradient: "from-rose-500 to-pink-600",
    importableData: ["Clients", "Pets", "Appointments"],
    exportGuideUrl: "#123pet-export-guide",
    separateFiles: false,
    parser: null,
  },
  {
    id: "kennelconnection",
    name: "Kennel Connection",
    monogram: "KC",
    gradient: "from-cyan-500 to-sky-600",
    importableData: ["Owners", "Pets", "Reservations"],
    exportGuideUrl: "#kennel-connection-export-guide",
    separateFiles: true,
    parser: null,
  },
  {
    id: "generic-csv",
    name: "Generic CSV",
    monogram: "CSV",
    gradient: "from-slate-500 to-slate-700",
    importableData: ["Any mapped data"],
    exportGuideUrl: "#generic-csv-guide",
    separateFiles: false,
    parser: null,
  },
  {
    id: "excel",
    name: "Excel",
    monogram: "XL",
    gradient: "from-green-600 to-emerald-700",
    importableData: ["Any mapped data"],
    exportGuideUrl: "#excel-guide",
    separateFiles: false,
    parser: null,
  },
];

export function getImportSource(id: string): ImportSource | undefined {
  return importSources.find((s) => s.id === id);
}
