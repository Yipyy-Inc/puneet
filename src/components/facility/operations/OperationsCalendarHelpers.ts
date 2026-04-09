import type {
  OperationsCalendarFilters,
  OperationsCalendarSavedView,
} from "@/lib/operations-calendar";

export function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function toCsv(values: string[]): string {
  return values.join(",");
}

export function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function parseUserRoleFromCookie(): string {
  if (typeof document === "undefined") return "facility_admin";
  const match = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
  return match?.[1] ?? "facility_admin";
}

export function isManagerOrAdmin(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes("admin") || normalized.includes("manager");
}

export function activeFiltersCount(filters: OperationsCalendarFilters): number {
  return (
    filters.types.length +
    filters.modules.length +
    filters.taskTypes.length +
    filters.staff.length +
    filters.staffRoles.length +
    filters.locations.length +
    filters.statuses.length +
    filters.bookingStatuses.length +
    filters.taskStatuses.length +
    filters.petTags.length +
    filters.customerTags.length +
    (filters.unassignedOnly ? 1 : 0) +
    (filters.showRetailPos ? 1 : 0) +
    (filters.showCompletedTasks ? 0 : 1)
  );
}

export function canAccessSavedView(
  view: OperationsCalendarSavedView,
  role: string,
): boolean {
  if (view.scope === "personal") return true;
  if (view.sharedRoles.length === 0) return true;
  return view.sharedRoles.some((sharedRole) =>
    role.toLowerCase().includes(sharedRole.toLowerCase()),
  );
}
