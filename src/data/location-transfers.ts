import type { BookingTransfer } from "@/types/location";

export const bookingTransfers: BookingTransfer[] = [
  {
    id: "transfer-001",
    bookingId: 1001,
    fromLocationId: "loc-dv-main",
    toLocationId: "loc-dv-laval",
    initiatedBy: "Marie Tremblay",
    initiatedAt: "2026-04-18T10:32:00",
    status: "completed",
    pricingPolicy: "keep_original",
    priceDelta: 0,
    requiresCustomerApproval: false,
    completedAt: "2026-04-18T10:35:00",
    reason: "Plateau at full capacity for boarding weekend",
    customerNotified: true,
    notes: "Customer confirmed OK with transfer by phone",
  },
  {
    id: "transfer-002",
    bookingId: 1008,
    fromLocationId: "loc-dv-ouest",
    toLocationId: "loc-dv-main",
    initiatedBy: "Nathalie Bergeron",
    initiatedAt: "2026-04-20T14:15:00",
    status: "completed",
    pricingPolicy: "apply_destination",
    priceDelta: 8,
    requiresCustomerApproval: true,
    customerApprovedAt: "2026-04-20T15:02:00",
    completedAt: "2026-04-20T15:05:00",
    reason: "Client requested transfer to main location closer to workplace",
    customerNotified: true,
  },
  {
    id: "transfer-003",
    bookingId: 1015,
    fromLocationId: "loc-dv-main",
    toLocationId: "loc-dv-ouest",
    initiatedBy: "Amélie Dubois",
    initiatedAt: "2026-04-22T09:45:00",
    status: "pending_approval",
    pricingPolicy: "keep_original",
    priceDelta: -4,
    requiresCustomerApproval: true,
    reason: "Stylist preference available only at NDG",
    customerNotified: true,
  },
  {
    id: "transfer-004",
    bookingId: 1023,
    fromLocationId: "loc-dv-laval",
    toLocationId: "loc-dv-main",
    initiatedBy: "Claudine Morin",
    initiatedAt: "2026-04-23T11:00:00",
    status: "approved",
    pricingPolicy: "apply_destination",
    priceDelta: 12,
    requiresCustomerApproval: false,
    customerApprovedAt: "2026-04-23T11:00:00",
    reason: "Trainer availability shift",
    customerNotified: true,
    notes: "Trainer Lucas Martin covering Plateau this week",
  },
];

let transfersStore = [...bookingTransfers];

export function getTransfersForBooking(bookingId: number): BookingTransfer[] {
  return transfersStore.filter((t) => t.bookingId === bookingId);
}

export function getAllTransfers(): BookingTransfer[] {
  return transfersStore;
}

export function addTransfer(transfer: BookingTransfer): void {
  transfersStore = [transfer, ...transfersStore];
}

export function updateTransferStatus(
  transferId: string,
  status: BookingTransfer["status"],
  extras?: Partial<BookingTransfer>,
): void {
  transfersStore = transfersStore.map((t) =>
    t.id === transferId ? { ...t, status, ...extras } : t,
  );
}
