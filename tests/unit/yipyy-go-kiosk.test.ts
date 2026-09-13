import { describe, expect, test } from "bun:test";

import { checkInWriterFor } from "@/lib/yipyy-go/check-in-writer";
import { parseCheckInCode } from "@/lib/yipyy-go/parse-check-in-code";

// The desk takes a check-in code however it arrives — the link a phone
// camera opens, the link a scanner types, or the bare code — and checks a
// dog in through the write its service already has.

const CODE = "q8Zp3VtX0aL9mK2rB7cW4eN6yH1uJ5sD0fG8iO2pQ3w";

describe("a check-in code at the desk", () => {
  test("comes out of the kiosk link the QR code carries", () => {
    expect(
      parseCheckInCode(`https://paws.yipyy.com/employee/check-in?code=${CODE}`),
    ).toBe(CODE);
  });

  test("comes out of a link with other things in it, and around spaces", () => {
    expect(
      parseCheckInCode(
        `  https://x.test/employee/check-in?lang=fr&code=${CODE} `,
      ),
    ).toBe(CODE);
  });

  test("is taken as it is when it is pasted bare", () => {
    expect(parseCheckInCode(CODE)).toBe(CODE);
  });

  test("a booking number, a name or a link without a code is not a code", () => {
    expect(parseCheckInCode("1042")).toBeNull();
    expect(parseCheckInCode("Kofi Mensah")).toBeNull();
    expect(parseCheckInCode("https://x.test/employee/check-in")).toBeNull();
    expect(parseCheckInCode("")).toBeNull();
  });
});

describe("the write that checks a dog in", () => {
  test("is the service’s own", () => {
    expect(checkInWriterFor("daycare")).toBe("daycare");
    expect(checkInWriterFor("boarding")).toBe("boarding");
    expect(checkInWriterFor("training")).toBe("training");
    expect(checkInWriterFor("grooming")).toBe("grooming");
  });

  test("does not exist for a service with no arrival of its own", () => {
    expect(checkInWriterFor("custom")).toBeNull();
    expect(checkInWriterFor("retail")).toBeNull();
  });
});
