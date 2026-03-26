/**
 * QR Code Fast-Track Check-In
 * Token is per booking+pet; no PII in QR (only booking_id, pet_id, secure token).
 */

export interface CheckInTokenPayload {
  bookingId: number;
  petId: number;
  facilityId: number;
}

const tokenStore = new Map<string, CheckInTokenPayload>();

function secureToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate and store a check-in token for this booking+pet. Returns the token. */
export function generateCheckInToken(
  bookingId: number | string,
  petId: number,
  facilityId: number,
): string {
  const token = secureToken();
  tokenStore.set(token, {
    bookingId: Number(bookingId),
    petId,
    facilityId,
  });
  return token;
}

/** Get or create token for a booking+pet (e.g. when form is submitted). */
export function getOrCreateCheckInToken(
  bookingId: number | string,
  petId: number,
  facilityId: number,
): string {
  const existing = Array.from(tokenStore.entries()).find(
    ([_, p]) => p.bookingId === Number(bookingId) && p.petId === petId,
  );
  if (existing) return existing[0];
  return generateCheckInToken(Number(bookingId), petId, facilityId);
}

/** Validate token and return payload; null if invalid. */
export function validateCheckInToken(
  token: string,
): CheckInTokenPayload | null {
  return tokenStore.get(token) ?? null;
}

/** Build the URL that the QR code encodes. Works when scanned from any device. */
export function buildCheckInUrl(token: string, baseOrigin?: string): string {
  const origin =
    baseOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/facility/checkin?t=${encodeURIComponent(token)}`;
}

// Seed demo tokens so facility scan works for example bookings (facility 11)
function seedDemoTokens(): void {
  const demos: [string, CheckInTokenPayload][] = [
    ["qr_demo_3", { bookingId: 3, petId: 3, facilityId: 11 }],
    ["qr_demo_4", { bookingId: 4, petId: 13, facilityId: 11 }],
    ["qr_demo_5", { bookingId: 5, petId: 2, facilityId: 11 }],
    ["qr_demo_6", { bookingId: 6, petId: 14, facilityId: 11 }],
    ["qr_demo_12", { bookingId: 12, petId: 1, facilityId: 11 }],
  ];
  demos.forEach(([token, payload]) => tokenStore.set(token, payload));
}
seedDemoTokens();

/** Record that a booking was checked in via QR (so facility can show status). */
const qrCheckInRecords: {
  bookingId: number;
  facilityId: number;
  checkedInAt: string;
}[] = [];

export function recordQrCheckIn(bookingId: number, facilityId: number): void {
  qrCheckInRecords.push({
    bookingId,
    facilityId,
    checkedInAt: new Date().toISOString(),
  });
}

export function getQrCheckInRecord(
  bookingId: number,
): { checkedInAt: string } | null {
  const r = qrCheckInRecords.find((x) => x.bookingId === bookingId);
  return r ? { checkedInAt: r.checkedInAt } : null;
}
