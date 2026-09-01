import { describe, expect, test } from "bun:test";

import {
  computeCallMetrics,
  isFollowUpResolved,
  isMissedCall,
  isOpenMissedTask,
  isResolvedMiss,
  isUnworkedMiss,
  isUnworkedMissedTask,
} from "../../src/lib/calling/call-metrics";
import type { CallLog } from "../../src/types/communications";
import type { MissedCallTask } from "../../src/types/calling";

// ============================================================================
// The four definitions of "missed".
//
// There were four of them across two arrays and none was named, so the Live
// tab's heading badge counted one set while the list beneath it rendered
// another — printing "1" above two cards. And the Analytics tab ran two
// sections over the same logs, one date-filtered and one not, under a
// hardcoded "Last 30 days" label.
//
// These tests exist so both can only come back deliberately.
// See docs/product/calling-metric-dictionary.md.
// ============================================================================

let seq = 0;
function call(over: Partial<CallLog> = {}): CallLog {
  seq += 1;
  return {
    id: `call-${seq}`,
    type: "inbound",
    status: "completed",
    from: "+15145550100",
    to: "+15145550199",
    timestamp: "2026-06-01T10:00:00.000Z",
    duration: 120,
    ...over,
  } as CallLog;
}

function task(over: Partial<MissedCallTask> = {}): MissedCallTask {
  seq += 1;
  return {
    id: `mct-${seq}`,
    callId: `call-${seq}`,
    from: "+15145550100",
    callTime: "2026-06-01T10:00:00.000Z",
    missedBy: "Front desk",
    status: "unresolved",
    autoSMSSent: false,
    ...over,
  };
}

describe("what missed means, over the call log", () => {
  test("a resolved miss is still a miss", () => {
    const c = call({ status: "missed", followUpStatus: "completed" });
    expect(isMissedCall(c)).toBe(true);
    expect(isUnworkedMiss(c)).toBe(false);
    expect(isResolvedMiss(c)).toBe(true);
  });

  test("only a pending follow-up counts as unworked", () => {
    expect(isUnworkedMiss(call({ status: "missed" }))).toBe(false);
    expect(
      isUnworkedMiss(call({ status: "missed", followUpStatus: "pending" })),
    ).toBe(true);
    expect(
      isUnworkedMiss(call({ status: "missed", followUpStatus: "scheduled" })),
    ).toBe(false);
  });

  test("no_action resolves a miss — deciding not to act is acting", () => {
    expect(
      isResolvedMiss(call({ status: "missed", followUpStatus: "no_action" })),
    ).toBe(true);
  });

  test("a completed call is never missed, whatever its follow-up says", () => {
    const c = call({ status: "completed", followUpStatus: "pending" });
    expect(isMissedCall(c)).toBe(false);
    expect(isUnworkedMiss(c)).toBe(false);
    expect(isResolvedMiss(c)).toBe(false);
  });

  test("a resolved follow-up on a voicemail is not a resolved miss", () => {
    // This is the fifth definition, and the reason the per-staff report counts
    // more follow-ups than the facility-wide missed-call tile does.
    const vm = call({ status: "voicemail", followUpStatus: "completed" });
    expect(isFollowUpResolved(vm)).toBe(true);
    expect(isResolvedMiss(vm)).toBe(false);
  });
});

describe("what missed means, over the Live-tab worklist", () => {
  test("a task rung back but not closed is still open", () => {
    const t = task({ status: "called_back" });
    expect(isOpenMissedTask(t)).toBe(true);
    expect(isUnworkedMissedTask(t)).toBe(false);
  });

  test("a resolved task is neither open nor unworked", () => {
    const t = task({ status: "resolved" });
    expect(isOpenMissedTask(t)).toBe(false);
    expect(isUnworkedMissedTask(t)).toBe(false);
  });

  test("the two counts genuinely differ, which is why the badge went wrong", () => {
    // The exact shape of the defect: one unresolved, one called back, one
    // resolved. The list rendered 2 cards; the badge above it read 1.
    const tasks = [
      task({ status: "unresolved" }),
      task({ status: "called_back" }),
      task({ status: "resolved" }),
    ];
    const rendered = tasks.filter(isOpenMissedTask);
    const unworked = tasks.filter(isUnworkedMissedTask);

    expect(rendered).toHaveLength(2);
    expect(unworked).toHaveLength(1);
    // Neither predicate is wrong — they answer different questions. The bug
    // was showing one as a count of the other. The Live tab now renders
    // `openMissed.length` in the badge and keeps the unworked count for the
    // badge's colour and the per-card dot; that binding is a render concern,
    // so what this asserts is the trap: the numbers are not interchangeable.
    expect(rendered.length).not.toBe(unworked.length);
  });
});

describe("computeCallMetrics aggregates the set it is given", () => {
  const logs = [
    call({ status: "completed", outcome: "booking_created", clientId: 1 }),
    call({ status: "completed", clientId: 1 }),
    call({
      status: "missed",
      followUpStatus: "pending",
      queueWaitSeconds: 40,
      clientId: 2,
    }),
    call({ status: "missed", followUpStatus: "completed" }),
    call({ status: "voicemail", duration: 30 }),
    call({ type: "outbound", status: "completed", flagged: true }),
  ];

  const m = computeCallMetrics(logs, []);

  test("counts every miss, worked or not", () => {
    expect(m.missed).toBe(2);
    expect(m.missedRate).toBeCloseTo((2 / 6) * 100);
  });

  test("follow-up completion is over missed calls only", () => {
    expect(m.followUpTotal).toBe(2);
    expect(m.followUpResolved).toBe(1);
    expect(m.followUpRate).toBeCloseTo(50);
  });

  test("abandoned means the caller waited, then hung up", () => {
    // One miss queued, one never got that far.
    expect(m.abandoned).toBe(1);
  });

  test("conversion has two denominators and both are reported", () => {
    expect(m.bookingsCreated).toBe(1);
    expect(m.conversionRate).toBeCloseTo((1 / 6) * 100);
    expect(m.inbound).toBe(5);
    expect(m.leadConversionRate).toBeCloseTo((1 / 5) * 100);
  });

  test("repeat callers are distinct known clients, not call pairs", () => {
    // Client 1 called twice, client 2 once, three calls are anonymous.
    expect(m.repeatCallers).toBe(1);
  });

  test("a flagged call with no recording is not a flagged recording", () => {
    expect(m.flaggedRecordings).toBe(0);
    const withRecording = computeCallMetrics(
      [call({ flagged: true, recordingUrl: "https://example.test/r.mp3" })],
      [],
    );
    expect(withRecording.flaggedRecordings).toBe(1);
  });

  test("sentiment is null rather than zero when nothing was analysed", () => {
    expect(m.avgSentiment).toBeNull();
    expect(m.sentimentSamples).toBe(0);
  });

  test("an empty period divides by nothing and returns zeros, not NaN", () => {
    const empty = computeCallMetrics([], []);
    expect(empty.total).toBe(0);
    expect(empty.missedRate).toBe(0);
    expect(empty.followUpRate).toBe(0);
    expect(empty.conversionRate).toBe(0);
    expect(empty.leadConversionRate).toBe(0);
    expect(empty.avgSentiment).toBeNull();
  });
});
