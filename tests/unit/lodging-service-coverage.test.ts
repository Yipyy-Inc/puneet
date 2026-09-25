import { describe, expect, test } from "bun:test";

import { lodgingTypesNoServiceCanBook } from "@/lib/pricing/boarding-service-choice";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// Which kennel classes the rooms screen warns about: the ones no active
// boarding service can be booked into. The ids are the shapes real rows carry
// — a class's app id is its legacy slug, its `rowId` a uuid, and a service's
// `lodgingTypeIds` holds uuids — because the comparison has two plausible
// sides and only one is right.

const SUITES = {
  id: "cat-1786136174939",
  rowId: "c3db4d81-0c5a-4d03-b1a3-5395dc895ef0",
};
const CONDOS = {
  id: "cat-1789260254917",
  rowId: "ed46e7c7-58ac-4264-aac9-e526b578e85d",
};
const NEW_CLASS = {
  id: "cat-1790000000000",
  rowId: "0b8a7e1c-2f3d-4c5b-8a9e-1f2d3c4b5a6f",
};

function service(lodgingTypeIds: string[], isActive = true) {
  return { lodgingTypeIds, isActive };
}

describe("the kennel classes no service can book", () => {
  test("a class made after the cutover is flagged; the migrated ones are not", () => {
    const flagged = lodgingTypesNoServiceCanBook(
      [SUITES, CONDOS, NEW_CLASS],
      [service([SUITES.rowId]), service([CONDOS.rowId])],
    );
    expect(flagged).toEqual([NEW_CLASS]);
  });

  test("NEGATIVE CONTROL: a service naming the class by its app id covers nothing", () => {
    // `lodgingTypeIds` holds uuids. A restriction written with the legacy id
    // would match no class, so the class is still flagged — which is what the
    // wizard would do with it too.
    const flagged = lodgingTypesNoServiceCanBook(
      [SUITES],
      [service([SUITES.id])],
    );
    expect(flagged).toEqual([SUITES]);
  });

  test("a service open to every type covers every class", () => {
    const flagged = lodgingTypesNoServiceCanBook(
      [SUITES, NEW_CLASS],
      [service([SUITES.rowId]), service([])],
    );
    expect(flagged).toEqual([]);
  });

  test("an inactive service covers nothing", () => {
    const flagged = lodgingTypesNoServiceCanBook(
      [SUITES],
      [service([SUITES.rowId], false), service([CONDOS.rowId])],
    );
    expect(flagged).toEqual([SUITES]);
  });

  test("with no active service at all there is nothing to warn about", () => {
    // The pre-cutover path: every class books at its own rate.
    expect(lodgingTypesNoServiceCanBook([SUITES, NEW_CLASS], [])).toEqual([]);
    expect(
      lodgingTypesNoServiceCanBook([SUITES], [service([CONDOS.rowId], false)]),
    ).toEqual([]);
  });
});
