/**
 * Waitlist management for custom modules with capacity limits.
 * Persisted to localStorage.
 */

export interface WaitlistEntry {
  id: string;
  moduleId: string;
  bookingDate: string;
  bookingTime: string;
  clientId: number;
  petId: number;
  position: number;
  addedAt: string;
  status: "waiting" | "offered" | "booked" | "expired" | "cancelled";
  notifiedAt?: string;
  expiresAt?: string;
}

const STORAGE_KEY = "yipyy_waitlist";

function load(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function save(entries: WaitlistEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function getWaitlistForSlot(
  moduleId: string,
  date: string,
  time: string,
): WaitlistEntry[] {
  return load()
    .filter(
      (e) =>
        e.moduleId === moduleId &&
        e.bookingDate === date &&
        e.bookingTime === time &&
        e.status === "waiting",
    )
    .sort((a, b) => a.position - b.position);
}

export function getWaitlistForModule(moduleId: string): WaitlistEntry[] {
  return load()
    .filter((e) => e.moduleId === moduleId && e.status === "waiting")
    .sort((a, b) => a.position - b.position);
}

export function getWaitlistForClient(clientId: number): WaitlistEntry[] {
  return load().filter(
    (e) => e.clientId === clientId && e.status === "waiting",
  );
}

export function addToWaitlist(
  moduleId: string,
  date: string,
  time: string,
  clientId: number,
  petId: number,
): WaitlistEntry {
  const entries = load();
  const slotEntries = entries.filter(
    (e) =>
      e.moduleId === moduleId &&
      e.bookingDate === date &&
      e.bookingTime === time &&
      e.status === "waiting",
  );
  const position = slotEntries.length + 1;

  const entry: WaitlistEntry = {
    id: `wl-${Date.now()}`,
    moduleId,
    bookingDate: date,
    bookingTime: time,
    clientId,
    petId,
    position,
    addedAt: new Date().toISOString(),
    status: "waiting",
  };

  entries.push(entry);
  save(entries);
  return entry;
}

export function promoteWaitlist(
  moduleId: string,
  date: string,
  time: string,
): WaitlistEntry | null {
  const entries = load();
  const waiting = entries
    .filter(
      (e) =>
        e.moduleId === moduleId &&
        e.bookingDate === date &&
        e.bookingTime === time &&
        e.status === "waiting",
    )
    .sort((a, b) => a.position - b.position);

  if (waiting.length === 0) return null;

  const promoted = waiting[0];
  const idx = entries.findIndex((e) => e.id === promoted.id);
  if (idx >= 0) {
    entries[idx].status = "offered";
    entries[idx].notifiedAt = new Date().toISOString();
    // Offer expires in 4 hours
    const expires = new Date();
    expires.setHours(expires.getHours() + 4);
    entries[idx].expiresAt = expires.toISOString();
    save(entries);
  }
  return promoted;
}

export function cancelWaitlistEntry(entryId: string) {
  const entries = load();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx >= 0) {
    entries[idx].status = "cancelled";
    save(entries);
  }
}

export function confirmWaitlistEntry(entryId: string) {
  const entries = load();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx >= 0) {
    entries[idx].status = "booked";
    save(entries);
  }
}
