# Calling — metric dictionary

Every number the Calling module shows a facility, and exactly what it counts.

This exists because the numbers disagreed with each other on screen. There were
**four definitions of "missed"** across two arrays and nothing named any of
them, so the Live tab printed a badge reading `1` above two rendered cards, and
the Analytics tab showed two sections whose totals could not both be right. The
rule from here on: **a counter goes through a named predicate in
[src/lib/calling/call-metrics.ts](../../src/lib/calling/call-metrics.ts), or it
does not ship.**

---

## The four meanings of "missed"

Two of these are about **calls** (`CallLog`, the call log) and two are about
**tasks** (`MissedCallTask`, the Live-tab worklist). They are genuinely
different questions and all four are wanted. What was wrong was that none of
them was named, so which one a given screen used was an accident of whoever
wrote the filter.

| Predicate              | Over             | Means                                                                | Used by                                                            |
| ---------------------- | ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `isMissedCall`         | `CallLog`        | The call did not reach a person. **A resolved miss is still a miss** | Missed Call Rate, recovery rate, abandoned, `no_answer` outcome    |
| `isUnworkedMiss`       | `CallLog`        | Missed **and** follow-up still `pending` — nobody has dealt with it  | The red "needs attention" count in the Calling header and Live tab |
| `isOpenMissedTask`     | `MissedCallTask` | Task not `resolved` — still on the worklist, rung back or not        | The Live-tab card list **and its badge** (these must not diverge)  |
| `isUnworkedMissedTask` | `MissedCallTask` | Task is `unresolved` — nobody has rung back yet                      | The red dot on a card; the badge's colour, not its number          |

**The rule that broke:** the Live tab's badge counted `isUnworkedMissedTask`
while the list below it rendered `isOpenMissedTask`. A task that had been rung
back but not closed rendered as a card and was excluded from the count. Any
count sitting above a list must be that list's length. The distinction is still
shown — it now drives the badge's **colour** (destructive when work remains,
secondary when every open task has been rung back) and the per-card dot.

### A fifth thing that is not "missed"

`isFollowUpResolved` asks only whether a follow-up is closed, and says nothing
about how the call ended. A **voicemail** can carry a follow-up too. This is why
the per-staff report's follow-up denominator (every call with a follow-up) is
larger than the facility-wide Follow-up Completion tile's (missed calls only).
That is deliberate; the two are answering different questions, and neither is
labelled as the other.

---

## Metric tiles — Analytics tab

Every tile is computed by `computeCallMetrics(filtered, summaries)` over the
logs **already filtered** by the tab's date range and location picker, so every
number on the screen shares one period. That was the second defect here: the
tab rendered two sections, and the second one aggregated the **unfiltered**
array under a hardcoded `period: "Last 30 days"` label. A facility reading the
two together saw one screen contradict itself.

| Tile                 | Numerator / value                                     | Denominator          | Null / zero behaviour                       |
| -------------------- | ----------------------------------------------------- | -------------------- | ------------------------------------------- |
| Total Calls          | `logs.length`                                         | —                    | `0` triggers the empty state                |
| Missed Call Rate     | `isMissedCall`                                        | all calls in period  | `0%` when there are no calls                |
| Avg Queue Wait       | mean `queueWaitSeconds`                               | calls that queued    | `0s`, hint states the sample size           |
| Avg Call Duration    | mean `duration`                                       | completed, `> 0s`    | `0:00`, hint states the sample size         |
| Voicemail Rate       | `status === "voicemail"`                              | all calls in period  | `0%`                                        |
| Follow-up Completion | `isResolvedMiss`                                      | `isMissedCall`       | `0%` when nothing was missed                |
| Avg AI Sentiment     | mean `sentimentScore`                                 | calls with a summary | **`—`**, never `0/10`                       |
| Call → Booking       | `outcome === "booking_created"`                       | all calls in period  | `0%`; hint also gives the inbound-only rate |
| Abandoned Calls      | missed **and** had a `queueWaitSeconds`               | —                    | `0`                                         |
| Repeat Callers       | distinct `clientId` appearing more than once          | —                    | `0`; anonymous callers cannot be counted    |
| Flagged for Review   | `flagged && recordingUrl`, **in the selected period** | —                    | `0`                                         |
| Revenue from Calls   | **not measured — renders `—`**                        | —                    | see below                                   |

### Why the outcome donut's "No Answer" is smaller than "18 missed"

They are on the same screen and they are both right. `outcomeCategory` puts
every call in **exactly one** bucket, preferring the explicit `outcome` field
and falling back to `status` only when there is none. A missed call that was
rung back and booked counts as `booking_created`, not `no_answer` — so the
donut's `no_answer` slice is the misses that led nowhere, while the Missed Call
Rate tile is every miss regardless of what happened next.

If those two ever need to match, the fix is a label, not a predicate.

### Revenue from Calls renders an em-dash on purpose

It used to read `$600`, computed as `bookingsCreated × 75`, where `75` was a
constant named `CALL_AVG_BOOKING_VALUE` that existed nowhere but that one file.
No call has ever been joined to a booking, so there was nothing to attribute.

Attribution needs `call_record.booking_id` and an `attribution_source`, which
arrive with call records in Phase 3/4. Until then the tile shows `—` and says
"Attribution arrives with call records".

**`$0` was not an option.** A zero reads as a measurement — a facility would
conclude its phone earns nothing. An em-dash reads as "not measured", which is
the true statement. When attribution does land, the header must state its
denominator ("attributed across 12 of 26 matched calls"), the same rule as
`20260829140000_every_reputation_number_carries_its_denominator.sql`.

---

## Empty state

A period with no calls renders **"No calls in \<period>"**, not a grid of zeros.
A grid of zeros is indistinguishable from a facility whose calls are not
reaching the screen at all — which is the live situation for any facility
without a provisioned number, and exactly the failure this module is most
likely to have.

---

## Where the numbers come from today

**Still fixtures.** [src/data/calling.ts](../../src/data/calling.ts) backs the
whole module; no call is persisted yet (there is no `call_record` table, and
`/api/twilio/recording` parses its payload and discards it). The aggregation
above is real and the shapes are the ones the real table will fill, but the
inputs are seeded. Do not quote these figures to anyone.

The `logs` array is unfiltered by facility, so the location picker uses
`deriveLocationId()`, which assigns a location by **`id mod 3`**. Every
location-scoped calling number today is fabricated by that function; deleting it
is a Phase 7 ticket.

## Related

- [docs/quality/debt-map.md](../quality/debt-map.md) — the calling entries
- `src/lib/calling/call-metrics.ts` — the predicates and every aggregation
- `tests/unit/call-metrics.test.ts` — asserts each predicate and that the badge
  and the list it sits above cannot diverge again
