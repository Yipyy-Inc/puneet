import { describe, expect, test } from "bun:test";

import { evaluationConfig } from "@/data/settings";
import {
  dayOffered,
  earliestOpenDay,
  evaluationDay,
  startFor,
  startTakes,
  weekdayOf,
  type DayContext,
} from "@/lib/evaluations/availability";
import {
  evaluationSchedule,
  partOfDay,
  type EvaluationSchedule,
} from "@/lib/evaluations/schedule";
import type { EvaluationConfig } from "@/types/facility";

// When an evaluation can start (the client's mock, 2026-10-02): the strip's
// "N open" / Full / Closed, the chips' "2 of 2 left", the earliest opening —
// and the re-check a booking makes before it is written. One rule.

const H = (h: number, m = 0) => h * 60 + m;

function schedule(over: Partial<EvaluationSchedule> = {}): EvaluationSchedule {
  return {
    mode: "slots",
    weekdays: [1, 2, 3, 4, 5],
    openRange: { start: H(8), end: H(18) },
    windows: [],
    slots: [H(9), H(11), H(13), H(15)],
    minutes: 60,
    capacity: 2,
    buffer: 15,
    dailyLimits: null,
    noticeHours: 24,
    aheadDays: 30,
    ...over,
  };
}

// 2026-10-05 is a Monday.
const MONDAY = "2026-10-05";
const ctx = (over: Partial<DayContext> = {}): DayContext => ({
  date: MONDAY,
  weekday: 1,
  closed: false,
  booked: [],
  ...over,
});

describe("reading evaluation_config", () => {
  test("a config saved before the setup page reads as fixed slots", () => {
    const s = evaluationSchedule(evaluationConfig);
    expect(s.mode).toBe("slots");
    expect(s.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(s.slots).toEqual([H(9), H(11), H(13), H(15)]);
    expect(s.minutes).toBe(120);
    expect(s.dailyLimits).toBeNull();
  });

  test("the setup page's mode wins, and no saved days means every day", () => {
    const config: EvaluationConfig = {
      ...evaluationConfig,
      schedule: {
        ...evaluationConfig.schedule,
        offerMode: "any",
        allowedDays: [],
        openRange: { start: "09:30", end: "16:00" },
      },
    };
    const s = evaluationSchedule(config);
    expect(s.mode).toBe("any");
    expect(s.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.openRange).toEqual({ start: H(9, 30), end: H(16) });
  });

  test("a window-mode config reads as set days & hours", () => {
    const config: EvaluationConfig = {
      ...evaluationConfig,
      schedule: { ...evaluationConfig.schedule, slotMode: "window" },
    };
    expect(evaluationSchedule(config).mode).toBe("window");
  });

  test("daily pet limits apply only once switched on, a weekday's own first", () => {
    const config: EvaluationConfig = {
      ...evaluationConfig,
      dailyPetLimits: {
        enabled: true,
        defaultLimit: 4,
        perDay: { sat: 2 },
      },
    };
    const limits = evaluationSchedule(config).dailyLimits!;
    expect(limits[6]).toBe(2);
    expect(limits[1]).toBe(4);
  });

  test("the mock's groups: morning, afternoon, evening", () => {
    expect(partOfDay(H(11, 30))).toBe("morning");
    expect(partOfDay(H(13))).toBe("afternoon");
    expect(partOfDay(H(17))).toBe("evening");
  });

  test("weekdays are read from the date, not the zone", () => {
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf("2026-10-04")).toBe(0);
  });
});

describe("fixed slots", () => {
  test("each start keeps its own places; the buffer holds the next one", () => {
    const day = evaluationDay(
      schedule({ slots: [H(9), H(10), H(11)] }),
      ctx({ booked: [{ start: H(9), end: H(10), pets: 1 }] }),
      1,
    );
    const left = Object.fromEntries(day.starts.map((s) => [s.start, s.left]));
    // 10:00 starts inside 9:00–10:00 + 15 minutes of buffer.
    expect(left).toEqual({ [H(9)]: 1, [H(10)]: 1, [H(11)]: 2 });
    expect(day.status).toBe("open");
    expect(day.open).toBe(3);
  });

  test("a start with fewer places than pets cannot take the booking", () => {
    const day = evaluationDay(
      schedule(),
      ctx({ booked: [{ start: H(9), end: H(10), pets: 1 }] }),
      2,
    );
    const nine = day.starts.find((s) => s.start === H(9))!;
    expect(nine.left).toBe(1);
    expect(startTakes(nine, 2)).toBe(false);
    expect(day.open).toBe(3);
  });

  test("every start full is a full day, not a closed one", () => {
    const booked = [H(9), H(11), H(13), H(15)].map((start) => ({
      start,
      end: start + 60,
      pets: 2,
    }));
    const day = evaluationDay(schedule(), ctx({ booked }), 1);
    expect(day.status).toBe("full");
    expect(day.starts).toHaveLength(4);
  });
});

describe("the other ways of offering evaluations", () => {
  test("set days & hours: every half hour that ends inside a window", () => {
    const day = evaluationDay(
      schedule({
        mode: "window",
        windows: [
          { id: "am", label: "Morning", start: H(9), end: H(12) },
          { id: "pm", label: "Afternoon", start: H(13), end: H(16) },
        ],
      }),
      ctx(),
      1,
    );
    const am = day.starts.filter((s) => s.group === "am").map((s) => s.start);
    expect(am).toEqual([H(9), H(9, 30), H(10), H(10, 30), H(11)]);
    expect(day.starts.filter((s) => s.group === "pm")).toHaveLength(5);
  });

  test("any day, any time: inside the start range and opening hours", () => {
    const s = schedule({ mode: "any", openRange: { start: H(8), end: H(18) } });
    const day = evaluationDay(
      s,
      ctx({ hours: { start: H(10), end: H(15) } }),
      1,
    );
    expect(day.starts[0]!.start).toBe(H(10));
    expect(day.starts.at(-1)!.start).toBe(H(14));
    // It follows the facility's own open days, not the chosen weekdays.
    expect(
      dayOffered(s, { closed: false, weekday: 0, hours: { start: 0, end: 1 } }),
    ).toBe(true);
    expect(evaluationDay(s, ctx({ hours: null }), 1).status).toBe("closed");
  });

  test("certain days only: a drop-off time, the whole day's places shared", () => {
    const s = schedule({
      mode: "days",
      openRange: { start: H(8), end: H(10, 30) },
    });
    const day = evaluationDay(
      s,
      ctx({ booked: [{ start: H(8), end: H(11, 30), pets: 1 }] }),
      1,
    );
    expect(day.starts.map((x) => x.start)).toEqual([
      H(8),
      H(8, 30),
      H(9),
      H(9, 30),
      H(10),
      H(10, 30),
    ]);
    // Pick-up after the window and the session: 10:30 + 1 hour.
    expect(day.starts[0]!.end).toBe(H(11, 30));
    expect(day.starts.every((x) => x.left === 1)).toBe(true);
  });
});

describe("closed, too soon and limited days", () => {
  test("a weekday not offered, or a closure, is closed", () => {
    expect(evaluationDay(schedule(), ctx({ weekday: 6 }), 1).status).toBe(
      "closed",
    );
    expect(evaluationDay(schedule(), ctx({ closed: true }), 1).status).toBe(
      "closed",
    );
  });

  test("starts before the notice are gone; none left is closed", () => {
    const day = evaluationDay(schedule(), ctx({ notBefore: H(12) }), 1);
    expect(day.starts.map((s) => s.start)).toEqual([H(13), H(15)]);
    expect(evaluationDay(schedule(), ctx({ notBefore: H(16) }), 1).status).toBe(
      "closed",
    );
  });

  test("a daily pet limit caps every start that day", () => {
    const day = evaluationDay(
      schedule({ dailyLimits: { 1: 3 } }),
      ctx({ booked: [{ start: H(15), end: H(16), pets: 2 }] }),
      2,
    );
    expect(day.starts.find((s) => s.start === H(9))!.left).toBe(1);
    expect(day.status).toBe("full");
  });
});

describe("evaluators", () => {
  const evaluators = [
    {
      id: "sarah",
      working: [{ start: H(9), end: H(12) }],
      busy: [{ start: H(9), end: H(10) }],
    },
    { id: "emily", working: [{ start: H(8), end: H(17) }], busy: [] },
  ];

  test("a named evaluator narrows the starts to when they are free", () => {
    const day = evaluationDay(schedule(), ctx({ evaluators }), 1);
    const nine = day.starts.find((s) => s.start === H(9))!;
    const eleven = day.starts.find((s) => s.start === H(11))!;
    expect(nine.evaluatorIds).toEqual(["emily"]);
    expect(eleven.evaluatorIds).toEqual(["sarah", "emily"]);
    expect(startTakes(nine, 1, "sarah")).toBe(false);
    expect(startTakes(nine, 1)).toBe(true);
  });

  test("the earliest opening and the re-check follow the same rule", () => {
    const days = [
      evaluationDay(schedule(), ctx({ weekday: 6, date: "2026-10-10" }), 1),
      evaluationDay(schedule(), ctx({ evaluators }), 1),
    ];
    expect(earliestOpenDay(days, 1)!.date).toBe(MONDAY);
    expect(startFor(days[1]!, H(9), 1, "sarah")).toBeNull();
    expect(startFor(days[1]!, H(11), 1, "sarah")!.start).toBe(H(11));
    expect(startFor(days[1]!, H(10), 1)).toBeNull();
  });
});
