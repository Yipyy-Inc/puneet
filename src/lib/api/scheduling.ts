"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchedulingStructure } from "@/app/api/scheduling/structure/route";
import type { ShiftsPayload } from "@/app/api/scheduling/shifts/route";
import type {
  TimeOffDecision,
  TimeOffPayload,
} from "@/app/api/scheduling/time-off/route";
import type {
  SwapDecision,
  SwapsPayload,
} from "@/app/api/scheduling/swaps/route";
import type {
  AvailabilityDecision,
  AvailabilityPayload,
} from "@/app/api/scheduling/availability/route";
import type { ClockPayload } from "@/app/api/scheduling/clock/route";
import type {
  AvailabilityDay,
  ClockEntry,
  RequestStatus,
  TimeOffType,
} from "@/lib/api/mappers/scheduling";
import type { Department, Position, ScheduleShift } from "@/types/scheduling";

// ============================================================================
// The roster, from Postgres.
//
// Replaces the four fixtures RosterView imported directly — `departments`,
// `positions`, `scheduleEmployees` and `scheduleShifts` from
// src/data/scheduling.ts. The employees come from `/api/staff`, because
// employees were always real; only the roster around them was not.
// ============================================================================

export const schedulingKeys = {
  structure: ["scheduling", "structure"] as const,
  shifts: (from: string, to: string) =>
    ["scheduling", "shifts", from, to] as const,
  myShifts: (from: string, to: string) =>
    ["scheduling", "shifts", "mine", from, to] as const,
  timeOff: (status: StatusFilter) =>
    ["scheduling", "time-off", status] as const,
  myTimeOff: () => ["scheduling", "time-off", "mine"] as const,
  swaps: (status: StatusFilter) => ["scheduling", "swaps", status] as const,
  mySwaps: () => ["scheduling", "swaps", "mine"] as const,
  availability: (status: StatusFilter) =>
    ["scheduling", "availability", status] as const,
  clock: (from?: string, to?: string) =>
    ["scheduling", "clock", from ?? "", to ?? ""] as const,
};

/** `"all"` is the absence of a filter, not a fifth status. */
export type StatusFilter = RequestStatus | "all";

async function read<T>(url: string, fallback: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? fallback);
  }
  return (await response.json()) as T;
}

export const schedulingQueries = {
  /** Departments and positions. Pay is included only if the caller may see it. */
  structure: () => ({
    queryKey: schedulingKeys.structure,
    queryFn: () =>
      read<SchedulingStructure>(
        "/api/scheduling/structure",
        "Could not read the departments.",
      ),
    // An org chart changes about once a quarter.
    staleTime: 5 * 60_000,
  }),

  /**
   * The shifts in a window.
   *
   * The window is part of the key, so stepping the roster forward a week is a
   * new query rather than a refetch that discards the week you are looking at.
   */
  shifts: (from: string, to: string) => ({
    queryKey: schedulingKeys.shifts(from, to),
    queryFn: () =>
      read<ShiftsPayload>(
        `/api/scheduling/shifts?from=${from}&to=${to}`,
        "Could not read the roster.",
      ),
    staleTime: 30_000,
  }),

  /**
   * The CALLER's own shifts in a window.
   *
   * A separate key from `shifts`, not a filter over it: a manager holds
   * `scheduling_view_all` and gets the whole roster from that one, so sharing a
   * cache entry would put everybody's shifts on their personal screen the
   * moment the roster had been looked at first.
   */
  myShifts: (from: string, to: string) => ({
    queryKey: schedulingKeys.myShifts(from, to),
    queryFn: () =>
      read<ShiftsPayload>(
        `/api/scheduling/shifts?from=${from}&to=${to}&mine=1`,
        "Could not read your shifts.",
      ),
    staleTime: 30_000,
  }),
};

export interface NewShift {
  employeeId?: string | null;
  departmentId: string;
  positionId: string;
  /** `YYYY-MM-DD`, on the facility's clock. */
  date: string;
  /** `HH:MM`. An end at or before the start is an overnight shift. */
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  notes?: string | null;
  status?: ScheduleShift["status"];
  requiredSkills?: string[];
  urgent?: boolean;
  slots?: number;
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: NewShift): Promise<ScheduleShift> => {
      const response = await fetch("/api/scheduling/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shift),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "That shift was not saved.");
      }
      return body as unknown as ScheduleShift;
    },
    // Every window, because a new shift lands in whichever one is on screen and
    // the caller does not know which windows are cached.
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      }),
  });
}

/** True when the caller may see what a position pays. */
export function useCanSeePay(): boolean {
  const { data } = useQuery(schedulingQueries.structure());
  return data?.canSeePay ?? false;
}

// ============================================================================
// Time off and shift swaps.
//
// Both lists are keyed on the status tab, so switching tabs is a new query
// rather than a refetch that blanks the rows already on screen.
//
// Every decision invalidates the WHOLE family — an approved request leaves the
// Pending tab and arrives in Approved, and the caller cannot know which of
// those two lists somebody is looking at.
// ============================================================================

export const timeOffQueries = {
  list: (status: StatusFilter) => ({
    queryKey: schedulingKeys.timeOff(status),
    queryFn: () =>
      read<TimeOffPayload>(
        `/api/scheduling/time-off?status=${status}`,
        "Could not read the time-off requests.",
      ),
    staleTime: 30_000,
  }),

  /** The caller's OWN leave, every status. The personal screen's list. */
  mine: () => ({
    queryKey: schedulingKeys.myTimeOff(),
    queryFn: () =>
      read<TimeOffPayload>(
        "/api/scheduling/time-off?status=all&mine=1",
        "Could not read your time-off requests.",
      ),
    staleTime: 30_000,
  }),
};

export const swapQueries = {
  list: (status: StatusFilter) => ({
    queryKey: schedulingKeys.swaps(status),
    queryFn: () =>
      read<SwapsPayload>(
        `/api/scheduling/swaps?status=${status}`,
        "Could not read the swap requests.",
      ),
    staleTime: 30_000,
  }),

  /**
   * Swaps the caller is PART OF — raised by them or aimed at them.
   *
   * Both sides, because a personal screen that showed only what you raised
   * would hide the offer somebody made you, which is the half that needs an
   * answer.
   */
  mine: () => ({
    queryKey: schedulingKeys.mySwaps(),
    queryFn: () =>
      read<SwapsPayload>(
        "/api/scheduling/swaps?status=all&mine=1",
        "Could not read your swap requests.",
      ),
    staleTime: 30_000,
  }),
};

async function write<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? fallback);
  return payload as T;
}

export interface NewTimeOff {
  /** Omitted means the signed-in person — the server resolves it, not this. */
  employeeId?: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export function useRequestTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: NewTimeOff) =>
      write<TimeOffDecision>(
        "/api/scheduling/time-off",
        "POST",
        request,
        "That request was not filed.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "time-off"],
      }),
  });
}

export interface Decision {
  id: string;
  status: "approved" | "denied" | "cancelled";
  notes?: string;
}

/**
 * Approve, deny or withdraw leave.
 *
 * The result carries `conflicts` when leave was approved over shifts the person
 * is still rostered for. That is the one thing the screen it replaced could
 * never show, so a caller that ignores it has thrown away the point.
 */
export function useDecideTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (decision: Decision) =>
      write<TimeOffDecision>(
        "/api/scheduling/time-off",
        "PATCH",
        decision,
        "That decision was not saved.",
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "time-off"],
      });
      // Leave does not move a shift, but the roster draws who is away.
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      });
    },
  });
}

export interface NewSwap {
  requestingShiftId: string;
  targetStaffId: string;
  /** Omitted is a hand-off: give the shift up rather than trade for one. */
  targetShiftId?: string;
  reason?: string;
}

export function useRequestSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: NewSwap) =>
      write<SwapDecision>(
        "/api/scheduling/swaps",
        "POST",
        request,
        "That request was not filed.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["scheduling", "swaps"] }),
  });
}

/**
 * Approve, deny or withdraw a swap.
 *
 * Approving MOVES BOTH SHIFTS, so the roster is invalidated too — the store
 * this replaced marked the request approved and left the rota untouched, which
 * is exactly the disagreement a stale cache would recreate.
 */
export function useDecideSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (decision: Decision) =>
      write<SwapDecision>(
        "/api/scheduling/swaps",
        "PATCH",
        decision,
        "That decision was not saved.",
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduling", "swaps"] });
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      });
    },
  });
}

export interface ShiftPatch {
  id: string;
  /** `null` makes the shift OPEN. Absent leaves the assignment alone. */
  employeeId?: string | null;
  departmentId?: string;
  positionId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  notes?: string | null;
  status?: ScheduleShift["status"];
}

/**
 * Change one shift — a drag, an assignment, an edit, a cancellation.
 *
 * Only the fields that changed are sent; the route reads the row and applies
 * them on top, because moving a shift to another day still needs both times to
 * rebuild the instant range and a drag has no business sending six fields it
 * did not touch.
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ShiftPatch) =>
      write<ScheduleShift>(
        "/api/scheduling/shifts",
        "PATCH",
        patch,
        "That change was not saved.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      }),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scheduling/shifts?id=${id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "That shift was not removed.");
      }
      return body as { removed: string };
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      }),
  });
}

export interface PublishWindow {
  departmentId: string;
  from: string;
  to: string;
}

/**
 * Publish every draft in a department's window.
 *
 * One call, not one per shift: a rota half-published is a rota nobody can act
 * on, and the screen has no way to show which half made it.
 */
export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (window: PublishWindow) =>
      write<{ published: number }>(
        "/api/scheduling/shifts/publish",
        "POST",
        window,
        "The schedule was not published.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      }),
  });
}

// ============================================================================
// Availability.
//
// One query for the patterns and the proposals — every screen that draws one
// wants the other, and the approval queue compares them side by side.
// ============================================================================

export const availabilityQueries = {
  all: (status: StatusFilter = "all") => ({
    queryKey: schedulingKeys.availability(status),
    queryFn: () =>
      read<AvailabilityPayload>(
        `/api/scheduling/availability?status=${status}`,
        "Could not read availability.",
      ),
    // A weekly pattern changes about as often as somebody's life does.
    staleTime: 5 * 60_000,
  }),
};

export interface NewAvailabilityProposal {
  /** Omitted means the signed-in person — the server resolves it. */
  employeeId?: string;
  /** Seven days, Sunday first. */
  proposed: AvailabilityDay[];
  effectiveFrom: string;
  reason?: string;
}

export function useProposeAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proposal: NewAvailabilityProposal) =>
      write<AvailabilityDecision>(
        "/api/scheduling/availability",
        "POST",
        proposal,
        "That proposal was not filed.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "availability"],
      }),
  });
}

/**
 * Approve, deny or withdraw a proposed week.
 *
 * Approving APPLIES it, so the shifts are invalidated too: the draft-review
 * warnings are computed against these patterns, and a stale cache would keep
 * showing conflicts against the availability somebody just replaced.
 */
export function useDecideAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (decision: Decision) =>
      write<AvailabilityDecision>(
        "/api/scheduling/availability",
        "PATCH",
        decision,
        "That decision was not saved.",
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "availability"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      });
    },
  });
}

// ============================================================================
// The time clock.
//
// Replaces `src/lib/employee/clock-store.ts`, a `Map` in module scope — clock
// in, refresh, and you were never there.
//
// `refetchInterval` is deliberate and short: this is the one scheduling read
// where the answer changes because somebody ELSE acted. A manager watching who
// is on the floor needs the floor, not a snapshot from when they opened the tab.
// ============================================================================

export const clockQueries = {
  /** Everything the caller may see, plus their own open entry. */
  state: (from?: string, to?: string) => ({
    queryKey: schedulingKeys.clock(from, to),
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      return read<ClockPayload>(
        `/api/scheduling/clock${query ? `?${query}` : ""}`,
        "Could not read the time clock.",
      );
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  }),
};

export interface ClockInInput {
  /** Omitted means the signed-in person — the server resolves it. */
  employeeId?: string;
  shiftId?: string;
  /** ISO instant. Omitted means now. */
  at?: string;
  notes?: string;
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClockInInput = {}) =>
      write<ClockEntry>(
        "/api/scheduling/clock",
        "POST",
        input,
        "That clock-in was not recorded.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["scheduling", "clock"] }),
  });
}

export interface ClockOutInput {
  /** Omitted closes the caller's own open entry, found server-side. */
  id?: string;
  at?: string;
  notes?: string;
  /**
   * Undo a clock-out — back on the clock, same session.
   *
   * Allowed for your own entry within two minutes of the stamp, and for a
   * manager at any time. Beyond that it is editing a timesheet, and the API
   * answers with a sentence saying so rather than failing silently.
   */
  reopen?: boolean;
}

/**
 * Undo a clock-out.
 *
 * The same endpoint as clocking out, because it is the same row — the session
 * that was ended is put back, rather than a second one started. Two rows would
 * record a break that never happened.
 */
export function useUndoClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      write<ClockEntry>(
        "/api/scheduling/clock",
        "PATCH",
        { id, reopen: true },
        "That clock-out could not be undone.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["scheduling", "clock"] }),
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClockOutInput = {}) =>
      write<ClockEntry>(
        "/api/scheduling/clock",
        "PATCH",
        input,
        "That clock-out was not recorded.",
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["scheduling", "clock"] }),
  });
}

/**
 * Whether the signed-in person is on the clock, and since when.
 *
 * The shape the in-memory store exposed, so the surfaces reading it change
 * their import rather than their logic — but `isPending` is new and matters:
 * the old store answered instantly and wrongly, and a pill that renders "off
 * the clock" while the answer is still in flight is the same lie in a hurry.
 */
export function useOwnClock(): {
  clockedIn: boolean;
  clockedInAt?: string;
  isPending: boolean;
} {
  const { data, isPending } = useQuery(clockQueries.state());
  return {
    clockedIn: Boolean(data?.open),
    clockedInAt: data?.open?.clockedInAt,
    isPending,
  };
}

// ============================================================================
// The org chart, edited.
//
// The Departments and Positions screens held all of this in `useState` over a
// fixture while the calendar, roster and payroll read the real tables — so a
// facility could add a department, watch it appear, reload, and find it gone.
// Converting the readers first and not the editors was worse than leaving both
// alone.
//
// Every one of these invalidates the STRUCTURE key, which is what the calendar,
// roster, payroll and availability screens all read their org chart from.
// ============================================================================

export interface NewDepartment {
  name: string;
  color?: string;
  description?: string | null;
}

export interface NewPosition {
  name: string;
  departmentId: string;
  color?: string;
  description?: string | null;
  payType?: "hourly" | "salary";
  hourlyRate?: number | null;
  salary?: number | null;
}

/** The position POST/PATCH answer, which may carry a pay-specific complaint. */
type PositionResult = Position & { payProblem?: string };

function useStructureMutation<TInput, TResult>(
  method: "POST" | "PATCH" | "PUT",
  fallback: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TInput) =>
      write<TResult>("/api/scheduling/structure", method, input, fallback),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: schedulingKeys.structure,
      }),
  });
}

export function useCreateDepartment() {
  return useStructureMutation<
    NewDepartment & { kind?: "department" },
    Department
  >("POST", "That department was not created.");
}

export function useUpdateDepartment() {
  return useStructureMutation<
    Partial<NewDepartment> & {
      id: string;
      kind?: "department";
      isActive?: boolean;
    },
    Department
  >("PATCH", "That department was not saved.");
}

export function useCreatePosition() {
  return useStructureMutation<
    NewPosition & { kind?: "position" },
    PositionResult
  >("POST", "That position was not created.");
}

export function useUpdatePosition() {
  return useStructureMutation<
    Partial<NewPosition> & {
      id: string;
      kind?: "position";
      isActive?: boolean;
    },
    PositionResult
  >("PATCH", "That position was not saved.");
}

/**
 * Set who is in a department — the COMPLETE set, not a diff.
 *
 * `staff_departments` had no writer at all until now: the table shipped with
 * the roster, the structure route read it, and nothing populated it.
 */
export function useSetDepartmentMembers() {
  return useStructureMutation<
    { departmentId: string; employeeIds: string[] },
    { departmentId: string; employeeIds: string[] }
  >("PUT", "Those members were not saved.");
}

export function useRemoveStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      target: { department: string } | { position: string },
    ) => {
      const param =
        "department" in target
          ? `department=${target.department}`
          : `position=${target.position}`;
      const response = await fetch(`/api/scheduling/structure?${param}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        // "That department still has positions in it" arrives from a RESTRICT
        // foreign key, and it is the sentence to show — deleting the shape of
        // an organisation out from under its shifts is refused on purpose.
        throw new Error(body.error ?? "That could not be removed.");
      }
      return body as { removed: string };
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: schedulingKeys.structure,
      }),
  });
}
