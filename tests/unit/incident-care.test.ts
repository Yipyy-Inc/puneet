import { describe, expect, test } from "bun:test";

import {
  incidentCareLogWriteSchema,
  toIncidentCare,
  type IncidentCareItemRow,
  type IncidentCareLogRow,
} from "../../src/lib/api/mappers/incident-care";

// In-stay care rows become the three lists an incident's screens read. The
// cases worth pinning: a stopped medication is care no longer to give, a log
// points at the right list, and a detail that does not parse is skipped rather
// than rendered half-empty.

const item = (over: Partial<IncidentCareItemRow>): IncidentCareItemRow => ({
  id: "item-1",
  incident_id: "inc-uuid",
  kind: "action",
  name: "Ice the paw",
  detail: {
    frequency: "twice_daily",
    duration: "until_checkout",
    starts: "immediately",
  },
  active: true,
  created_by_name: "Morgan Manager",
  created_at: "2026-09-14T10:00:00Z",
  ...over,
});

describe("toIncidentCare", () => {
  test("a care action keeps its schedule and whether it is stopped", () => {
    const care = toIncidentCare("42", [item({ active: false })], []);
    expect(care.careActions).toHaveLength(1);
    expect(care.careActions[0]).toMatchObject({
      id: "item-1",
      incidentId: "42",
      frequency: "twice_daily",
      active: false,
      staffInstructions: "",
      requiresPhoto: false,
    });
  });

  test("a stopped medication is left off", () => {
    const med = item({
      id: "med-1",
      kind: "medication",
      name: "Amoxicillin",
      detail: { medType: "oral", dosage: "250mg" },
    });
    expect(toIncidentCare("42", [med], []).incidentMedications).toHaveLength(1);
    expect(
      toIncidentCare("42", [{ ...med, active: false }], []).incidentMedications,
    ).toHaveLength(0);
  });

  test("a log points at the list its item is in", () => {
    const med = item({
      id: "med-1",
      kind: "medication",
      name: "Amoxicillin",
      detail: { medType: "oral" },
    });
    const logs: IncidentCareLogRow[] = [
      {
        id: "log-1",
        incident_id: "inc-uuid",
        care_item_id: "med-1",
        note: null,
        photo_url: null,
        logged_by_name: "Cara Caretaker",
        logged_at: "2026-09-14T12:00:00Z",
      },
      {
        id: "log-2",
        incident_id: "inc-uuid",
        care_item_id: "item-1",
        note: "Swelling down",
        photo_url: null,
        logged_by_name: "Cara Caretaker",
        logged_at: "2026-09-14T18:00:00Z",
      },
    ];
    const { careLogs } = toIncidentCare("42", [item({}), med], logs);
    expect(careLogs[0]).toMatchObject({ medicationId: "med-1" });
    expect(careLogs[0].careActionId).toBeUndefined();
    expect(careLogs[1]).toMatchObject({
      careActionId: "item-1",
      note: "Swelling down",
    });
  });

  test("an item whose detail does not parse is skipped", () => {
    const broken = item({ detail: { frequency: "whenever" } });
    expect(toIncidentCare("42", [broken], []).careActions).toHaveLength(0);
  });
});

describe("incidentCareLogWriteSchema", () => {
  test("a browser blob URL is never accepted as a photo", () => {
    const careItemId = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
    expect(
      incidentCareLogWriteSchema.safeParse({
        careItemId,
        photoUrl: "blob:http://localhost/abc",
      }).success,
    ).toBe(false);
    expect(
      incidentCareLogWriteSchema.safeParse({
        careItemId,
        photoUrl: "https://files.example/photo.jpg",
      }).success,
    ).toBe(true);
  });
});
