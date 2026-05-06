import { clients } from "@/data/clients";

export function getBlockedClientIds(): Set<number> {
  return new Set(
    clients.filter((c) => c.isBlocked === true).map((c) => c.id),
  );
}

export function isClientBlocked(clientId: number | null | undefined): boolean {
  if (clientId == null) return false;
  return clients.some((c) => c.id === clientId && c.isBlocked === true);
}

export function excludeBlocked<T>(
  items: T[],
  getClientId: (item: T) => number | null | undefined,
): T[] {
  const blocked = getBlockedClientIds();
  return items.filter((item) => {
    const id = getClientId(item);
    return id == null || !blocked.has(id);
  });
}
