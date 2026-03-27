import {
  groomingAppointments,
  groomingPackages,
  groomingProducts,
  inventoryOrders,
  stylists,
  stylistAvailability,
} from "@/data/grooming";
import type {
  GroomingAppointment,
  Stylist,
  GroomingPackage,
  GroomingProduct,
  InventoryOrder,
  StylistAvailability,
} from "@/types/grooming";

export const groomingQueries = {
  appointments: () => ({
    queryKey: ["grooming", "appointments"] as const,
    queryFn: async () => groomingAppointments as GroomingAppointment[],
  }),
  appointment: (id: string) => ({
    queryKey: ["grooming", "appointments", id] as const,
    queryFn: async () =>
      groomingAppointments.find((a) => a.id === id) as
        | GroomingAppointment
        | undefined,
  }),
  appointmentsByStylist: (stylistId: string) => ({
    queryKey: ["grooming", "appointments", "by-stylist", stylistId] as const,
    queryFn: async () =>
      groomingAppointments.filter(
        (a) => a.stylistId === stylistId,
      ) as GroomingAppointment[],
  }),
  stylists: () => ({
    queryKey: ["grooming", "stylists"] as const,
    queryFn: async () => stylists as Stylist[],
  }),
  stylist: (id: string) => ({
    queryKey: ["grooming", "stylists", id] as const,
    queryFn: async () =>
      stylists.find((s) => s.id === id) as Stylist | undefined,
  }),
  stylistAvailability: (stylistId: string) => ({
    queryKey: ["grooming", "stylists", stylistId, "availability"] as const,
    queryFn: async () =>
      stylistAvailability.filter(
        (a) => a.stylistId === stylistId,
      ) as StylistAvailability[],
  }),
  packages: () => ({
    queryKey: ["grooming", "packages"] as const,
    queryFn: async () => groomingPackages as GroomingPackage[],
  }),
  products: () => ({
    queryKey: ["grooming", "products"] as const,
    queryFn: async () => groomingProducts as GroomingProduct[],
  }),
  product: (id: string) => ({
    queryKey: ["grooming", "products", id] as const,
    queryFn: async () =>
      groomingProducts.find((p) => p.id === id) as GroomingProduct | undefined,
  }),
  inventoryOrders: () => ({
    queryKey: ["grooming", "inventory-orders"] as const,
    queryFn: async () => inventoryOrders as InventoryOrder[],
  }),
};
