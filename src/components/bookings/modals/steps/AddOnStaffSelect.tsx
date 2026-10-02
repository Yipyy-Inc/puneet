"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// WHO AN ADD-ON IS ASSIGNED TO (2026-09-30).
//
// An add-on can be set up as needing somebody ("Does this add-on require
// staff?" — Yes). The choice was stored and read by nothing. It is asked here,
// on the confirm step, for each chosen add-on that needs somebody, and saved
// on the add-on's bill line.
//
// Nobody is a real answer: a booking is often made before the rota is, and
// the line can be given to somebody later by editing the booking.
// ============================================================================

/** Radix refuses an empty value, so "nobody" needs one of its own. */
const NOBODY = "__nobody__";

export interface AddOnStaffOption {
  /** The staff member as the staff list names them — legacy id, or uuid. */
  id: string;
  name: string;
  /** Listed with its reason, but not choosable — a full play area, say. */
  disabled?: boolean;
}

export function AddOnStaffSelect({
  label,
  ariaLabel,
  nobodyLabel,
  staff,
  value,
  onChange,
}: {
  /** "Assigned to" — shown beside the control. */
  label: string;
  /** Names the add-on, for a reader who cannot see which row this is. */
  ariaLabel: string;
  nobodyLabel: string;
  staff: readonly AddOnStaffOption[];
  value: string | null;
  onChange: (staffId: string | null) => void;
}) {
  // The caller lists whoever the line already names, active or not, so this
  // is only false for an id the facility's staff list does not hold at all —
  // and a control showing nothing would be worse than one saying "nobody".
  const known = value === null || staff.some((s) => s.id === value);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-ink-secondary text-[13.5px]">{label}</span>
      <Select
        value={known ? (value ?? NOBODY) : NOBODY}
        onValueChange={(next) => onChange(next === NOBODY ? null : next)}
      >
        <SelectTrigger aria-label={ariaLabel} className="max-w-full min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NOBODY}>{nobodyLabel}</SelectItem>
          {staff.map((s) => (
            <SelectItem key={s.id} value={s.id} disabled={s.disabled}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
