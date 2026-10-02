import { z } from "zod";

// ============================================================================
// When a facility takes dogs in and hands them back, per service (the client,
// 2026-10-01: "the times it shows for drop off and pick up need to be
// according to the facility — and an option to select a custom time").
//
//   boarding  a drop-off and a pick-up window per weekday (the mock's Sunday
//             is shorter than its weekdays)
//   daycare   the full day, the morning and the afternoon, every day
//
// The booking wizard's time chips come from here. A day or a part not set
// takes the facility's opening hours instead (lib/bookings/wizard/
// time-windows.ts); a one-day change is `drop_off_pick_up_overrides`.
// Customer-visible: the times are what a customer may pick.
// ============================================================================

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeWindowSchema = z
  .object({ start: z.string().regex(HH_MM), end: z.string().regex(HH_MM) })
  .refine((w) => w.start < w.end, {
    message: "A window ends after it starts.",
  });

export const dropOffPickUpHoursSchema = z.object({
  dropOff: timeWindowSchema,
  pickUp: timeWindowSchema,
});

export const serviceTimeWindowsSchema = z
  .object({
    /** Boarding, a weekday at a time: 0 is Sunday, 6 Saturday. */
    boarding: z
      .array(
        dropOffPickUpHoursSchema.extend({
          weekday: z.number().int().min(0).max(6),
        }),
      )
      .optional(),
    /** Daycare's full day, morning and afternoon — the same every day. */
    daycare: z
      .object({
        full: dropOffPickUpHoursSchema.optional(),
        am: dropOffPickUpHoursSchema.optional(),
        pm: dropOffPickUpHoursSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export type ServiceTimeWindows = z.infer<typeof serviceTimeWindowsSchema>;
export type DropOffPickUpHours = z.infer<typeof dropOffPickUpHoursSchema>;

export const NO_SERVICE_TIME_WINDOWS: ServiceTimeWindows = {};

/** The facility's standing hours for one day of a service, or null. */
export function standingHours(
  windows: ServiceTimeWindows | null | undefined,
  input: { service: string; weekday: number; part?: "full" | "am" | "pm" },
): DropOffPickUpHours | null {
  if (!windows) return null;
  if (input.service === "boarding") {
    const day = windows.boarding?.find((d) => d.weekday === input.weekday);
    return day ? { dropOff: day.dropOff, pickUp: day.pickUp } : null;
  }
  if (input.service === "daycare") {
    return windows.daycare?.[input.part ?? "full"] ?? null;
  }
  return null;
}
