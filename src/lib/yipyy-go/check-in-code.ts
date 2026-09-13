// ============================================================================
// Reading a check-in code at the desk, and which check-in it opens.
//
// A code arrives three ways: the kiosk link a phone camera opened (the code is
// its `code` query value), a hardware scanner typing that whole link into the
// search box, or the bare token pasted. All three read the same.
//
// Each service checks a dog in through its own write — daycare and training
// attendance, boarding's arrival, grooming's status — and custom services have
// none. The kiosk picks the one for the booking's service; nothing here calls
// anything.
// ============================================================================

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

export function parseCheckInCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const code = url.searchParams.get("code") ?? url.searchParams.get("t");
      return code && TOKEN.test(code) ? code : null;
    } catch {
      return null;
    }
  }
  return TOKEN.test(text) ? text : null;
}

export type CheckInWriter = "daycare" | "boarding" | "training" | "grooming";

export function checkInWriterFor(service: string): CheckInWriter | null {
  switch (service) {
    case "daycare":
    case "boarding":
    case "training":
    case "grooming":
      return service;
    default:
      return null;
  }
}
