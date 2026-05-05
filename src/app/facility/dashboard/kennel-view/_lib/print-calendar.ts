import type { OccupancyKennel } from "./calendar-types";
import type { RoomCategory } from "@/types/rooms";
import { toLocalISODate, dateWithinRange } from "./calendar-helpers";

/**
 * Generates a clean, printable HTML representation of the current occupancy
 * grid and triggers the browser print dialog. Designed to be pinned at the
 * front desk or shared with staff who don't have system access.
 */
export function printOccupancyGrid({
  startDate,
  numDays,
  facilityName,
  groupedKennels,
}: {
  startDate: Date;
  numDays: number;
  facilityName: string;
  groupedKennels: Array<{
    category: RoomCategory;
    rooms: OccupancyKennel[];
  }>;
}): void {
  const dates: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  const rangeStart = toLocalISODate(dates[0]);
  const rangeEnd = toLocalISODate(dates[dates.length - 1]);

  const rows = groupedKennels
    .map(({ category, rooms }) => {
      const headerRow = `
        <tr class="cat">
          <th colspan="${numDays + 1}">${category.name} — ${rooms.length} rooms</th>
        </tr>`;
      const roomRows = rooms
        .map((room) => {
          const cells = dates
            .map((d) => {
              const ds = toLocalISODate(d);
              if (
                room.checkIn &&
                room.checkOut &&
                dateWithinRange(ds, room.checkIn, room.checkOut)
              ) {
                return `<td class="occ">${room.petName ?? "—"}</td>`;
              }
              if (room.status === "maintenance") {
                return `<td class="maint">M</td>`;
              }
              return `<td></td>`;
            })
            .join("");
          return `<tr><th class="room">${room.name}</th>${cells}</tr>`;
        })
        .join("");
      return headerRow + roomRows;
    })
    .join("");

  const dateHeader = dates
    .map((d) => {
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      return `<th>${d.getDate()}<br><small>${dayName}</small></th>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Occupancy — ${facilityName} — ${rangeStart} to ${rangeEnd}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font: 11px/1.4 -apple-system, system-ui, sans-serif;
    color: #111;
    margin: 16px;
  }
  h1 { font-size: 18px; margin: 0 0 4px 0; }
  .sub { color: #666; margin-bottom: 12px; font-size: 11px; }
  table {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    text-align: left;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  thead th { background: #f4f4f5; font-weight: 600; }
  tr.cat th {
    background: #1f2937;
    color: white;
    text-align: left;
    padding: 6px 8px;
    font-size: 11px;
  }
  th.room { background: #fafafa; font-weight: 500; width: 110px; }
  td.occ { background: #dbeafe; font-weight: 500; }
  td.maint {
    background: repeating-linear-gradient(45deg, #fee2e2 0, #fee2e2 4px, transparent 4px, transparent 8px);
    color: #991b1b;
    text-align: center;
  }
  @media print {
    @page { size: landscape; margin: 10mm; }
  }
</style>
</head>
<body>
  <h1>Occupancy — ${facilityName}</h1>
  <div class="sub">${rangeStart} → ${rangeEnd} (${numDays} days)</div>
  <table>
    <thead>
      <tr><th>Room</th>${dateHeader}</tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>{window.print();};</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
