import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import { careTaskCount } from "./booking-list-columns";

/** A CSV cell: quoted, with its own quotes doubled. */
function cell(value: string | number | undefined | null): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Every booking the table matches, as a CSV the facility can hand to its
 * accountant. Headers in the reader's language; numbers as plain numbers so a
 * spreadsheet can add them (a formatted "42,50 $" is text to Excel); the
 * amount still owed beside the total, as the list shows it.
 *
 * Names come from the facility's REAL clients, passed in: this read a
 * twenty-row fixture and named the wrong person against a real booking.
 */
export function exportBookingsToCSV(
  bookings: Booking[],
  clientById: Map<number, Client>,
  t: (key: string) => string,
  moneyOf: (booking: Booking) => { balance: number; total: number },
  showMoney: boolean,
): void {
  const headers = [
    t("csvId"),
    t("csvClient"),
    t("csvPet"),
    t("csvService"),
    t("csvStart"),
    t("csvEnd"),
    t("csvStatus"),
    t("csvTasks"),
    ...(showMoney
      ? [t("csvTotal"), t("csvPaid"), t("csvOwed"), t("csvPayment")]
      : []),
    t("csvCheckIn"),
    t("csvCheckOut"),
  ];

  const rows = bookings.map((booking) => {
    const client = clientById.get(booking.clientId);
    const pet = client?.pets.find((p) => p.id === booking.petId);
    const money = moneyOf(booking);
    return [
      booking.id,
      client?.name ?? "",
      pet?.name ?? "",
      booking.service,
      booking.startDate,
      booking.endDate,
      booking.status,
      careTaskCount(booking),
      ...(showMoney
        ? [
            money.total.toFixed(2),
            Number(booking.amountPaid ?? 0).toFixed(2),
            money.balance.toFixed(2),
            booking.paymentStatus ?? "",
          ]
        : []),
      booking.checkInTime ?? "",
      booking.checkOutTime ?? "",
    ]
      .map(cell)
      .join(",");
  });

  const csv = [headers.map(cell).join(","), ...rows].join("\n");
  // A byte-order mark, so Excel reads "Réservation" as UTF-8, not "RÃ©".
  const blob = new Blob([String.fromCharCode(0xfeff), csv], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
