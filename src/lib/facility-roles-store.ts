"use client";

import type {
  AccessScope,
  CustomFacilityRole,
  CustomRolesById,
  PermissionKey,
} from "@/types/facility-staff";

// Persistence layer for facility-defined custom roles. This is the mock
// "backend" that the roles query layer (@/lib/api/roles) reads and writes
// through — swapping to a real API means changing only the api-layer queryFn/
// mutationFn, not the callers.
//
// Custom roles used to live inside the RBAC hook's own localStorage blob
// (`facility-rbac-state-v1`). They now have a dedicated key so the query cache
// is their single source of truth; `migrateFromLegacyOnce` moves any existing
// roles across so nothing is lost on upgrade.

const STORAGE_KEY = "facility-custom-roles-v1";
const LEGACY_RBAC_KEY = "facility-rbac-state-v1";

let migrated = false;

function migrateFromLegacyOnce(): void {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  try {
    // Already migrated / already have a dedicated store — leave it alone.
    if (window.localStorage.getItem(STORAGE_KEY) !== null) return;

    const legacy = window.localStorage.getItem(LEGACY_RBAC_KEY);
    if (!legacy) return;

    const parsed = JSON.parse(legacy) as { customRoles?: CustomRolesById };
    if (parsed?.customRoles && Object.keys(parsed.customRoles).length > 0) {
      write(parsed.customRoles);
    }
  } catch {
    /* ignore malformed legacy state */
  }
}

// Run eagerly at module load (client only) so the migration happens before the
// RBAC provider's persist effect can overwrite the legacy blob.
migrateFromLegacyOnce();

function read(): CustomRolesById {
  if (typeof window === "undefined") return {};
  migrateFromLegacyOnce();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CustomRolesById;
  } catch {
    /* ignore malformed state */
  }
  return {};
}

function write(map: CustomRolesById): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export const facilityRolesStore = {
  getAll(): CustomRolesById {
    return read();
  },

  put(role: CustomFacilityRole): CustomFacilityRole {
    const map = read();
    map[role.id] = role;
    write(map);
    return role;
  },

  update(id: string, patch: Partial<CustomFacilityRole>): CustomRolesById {
    const map = read();
    const existing = map[id];
    if (existing) {
      // id and createdAt are immutable once assigned.
      map[id] = { ...existing, ...patch, id, createdAt: existing.createdAt };
      write(map);
    }
    return map;
  },

  remove(id: string): CustomRolesById {
    const map = read();
    if (id in map) {
      delete map[id];
      write(map);
    }
    return map;
  },

  setPermission(
    id: string,
    key: PermissionKey,
    scope: AccessScope | null,
  ): CustomRolesById {
    const map = read();
    const role = map[id];
    if (role) {
      const permissions = { ...role.permissions };
      if (scope === null) {
        delete permissions[key];
      } else {
        permissions[key] = scope;
      }
      map[id] = { ...role, permissions };
      write(map);
    }
    return map;
  },
};
