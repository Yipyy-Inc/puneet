import {
  daycareCheckIns,
  daycareRates,
  daycarePackages,
  daycareReportCards,
  daycareCapacity,
} from "@/data/daycare";

export const daycareQueries = {
  checkIns: () => ({
    queryKey: ["daycare", "check-ins"] as const,
    queryFn: async () => daycareCheckIns,
  }),
  currentCheckIns: () => ({
    queryKey: ["daycare", "check-ins", "current"] as const,
    queryFn: async () =>
      daycareCheckIns.filter((c) => c.status === "checked-in"),
  }),
  rates: () => ({
    queryKey: ["daycare", "rates"] as const,
    queryFn: async () => daycareRates,
  }),
  packages: () => ({
    queryKey: ["daycare", "packages"] as const,
    queryFn: async () => daycarePackages,
  }),
  reportCards: () => ({
    queryKey: ["daycare", "report-cards"] as const,
    queryFn: async () => daycareReportCards,
  }),
  reportCardsByPet: (petId: number) => ({
    queryKey: ["daycare", "report-cards", petId] as const,
    queryFn: async () => daycareReportCards.filter((r) => r.petId === petId),
  }),
  capacity: () => ({
    queryKey: ["daycare", "capacity"] as const,
    queryFn: async () => daycareCapacity,
  }),
};
