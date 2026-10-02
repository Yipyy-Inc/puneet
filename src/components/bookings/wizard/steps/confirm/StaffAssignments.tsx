"use client";

import {
  AddOnStaffSelect,
  type AddOnStaffOption,
} from "@/components/bookings/modals/steps/AddOnStaffSelect";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Who is assigned, under Confirm's details — staff only, kept from the old
// form (the client's mock has no such rows; the user chose to keep staff
// tools the mock lacks, 2026-10-01).
//
//   the booking   which attendant's column a stay or a day lands in
//   each add-on   that is set up as needing somebody
//
// Nobody is a real answer both times: the rota is often made after the
// booking, and either can be given to somebody later from the booking page.
// ============================================================================

export interface AddOnAssignment {
  key: string;
  name: string;
  staff: readonly AddOnStaffOption[];
  value: string | null;
  onChange: (staffId: string | null) => void;
}

export function StaffAssignments({
  playArea,
  station,
  booking,
  addOns,
}: {
  /** Daycare: the section the pets play in. */
  playArea?: {
    staff: readonly AddOnStaffOption[];
    value: string | null;
    onChange: (sectionId: string | null) => void;
  };
  /** Grooming: the table the pets are groomed at — one that fits them. */
  station?: {
    staff: readonly AddOnStaffOption[];
    value: string | null;
    onChange: (stationId: string | null) => void;
  };
  booking?: {
    role: string;
    staff: readonly AddOnStaffOption[];
    value: string | null;
    onChange: (staffId: string | null) => void;
  };
  addOns: readonly AddOnAssignment[];
}) {
  const t = useShellText("booking");
  if (!playArea && !station && !booking && addOns.length === 0) return null;
  return (
    <div className="border-line flex flex-col gap-3 border-t px-5 pt-3.5 pb-4">
      {playArea ? (
        <AddOnStaffSelect
          label={t("wizPlayArea")}
          ariaLabel={t("wizPlayArea")}
          nobodyLabel={t("wizNoPlayArea")}
          staff={playArea.staff}
          value={playArea.value}
          onChange={playArea.onChange}
        />
      ) : null}
      {station ? (
        <AddOnStaffSelect
          label={t("station")}
          ariaLabel={t("station")}
          nobodyLabel={t("unassigned")}
          staff={station.staff}
          value={station.value}
          onChange={station.onChange}
        />
      ) : null}
      {booking ? (
        <AddOnStaffSelect
          label={booking.role}
          ariaLabel={booking.role}
          nobodyLabel={t("unassigned")}
          staff={booking.staff}
          value={booking.value}
          onChange={booking.onChange}
        />
      ) : null}
      {addOns.map((addOn) => (
        <AddOnStaffSelect
          key={addOn.key}
          label={fill(t("wizAddOnStaff"), { name: addOn.name })}
          ariaLabel={t("addOnStaffFor").replace("{name}", addOn.name)}
          nobodyLabel={t("addOnNotAssigned")}
          staff={addOn.staff}
          value={addOn.value}
          onChange={addOn.onChange}
        />
      ))}
    </div>
  );
}
