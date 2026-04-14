"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { RoomCategory, FacilityRoom } from "@/types/rooms";
import {
  roomCategories as defaultRoomCategories,
  facilityRooms as defaultFacilityRooms,
} from "@/data/rooms";

interface RoomsContextValue {
  categories: RoomCategory[];
  rooms: FacilityRoom[];

  // Category CRUD
  addCategory: (category: RoomCategory, unitCount?: number) => void;
  updateCategory: (category: RoomCategory) => void;
  deleteCategory: (id: string) => void;

  // Room unit CRUD
  addRoom: (room: FacilityRoom) => void;
  updateRoom: (room: FacilityRoom) => void;
  deleteRoom: (id: string) => void;
  toggleRoom: (id: string) => void;

  // Queries
  getCategoriesByService: (service: RoomCategory["service"]) => RoomCategory[];
  getRoomsByCategory: (categoryId: string) => FacilityRoom[];

  // Reset
  resetRooms: () => void;
}

const RoomsContext = createContext<RoomsContextValue | null>(null);

const CATEGORIES_KEY = "facility-room-categories";
const ROOMS_KEY = "facility-rooms";

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

/**
 * Backfill imageUrl on stored categories from the default mock data.
 * Useful when the default seed is updated (e.g. images added) and users
 * still have an older localStorage snapshot without those fields.
 * User-created categories (not in defaults) are left untouched.
 */
function backfillCategoryImages(stored: RoomCategory[]): RoomCategory[] {
  const defaultsById = new Map(
    defaultRoomCategories.map((c) => [c.id, c] as const),
  );
  return stored.map((c) => {
    if (c.imageUrl) return c;
    const def = defaultsById.get(c.id);
    if (def?.imageUrl) return { ...c, imageUrl: def.imageUrl };
    return c;
  });
}

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<RoomCategory[]>(() =>
    backfillCategoryImages(loadStored(CATEGORIES_KEY, defaultRoomCategories)),
  );
  const [rooms, setRooms] = useState<FacilityRoom[]>(() =>
    loadStored(ROOMS_KEY, defaultFacilityRooms),
  );

  const persistCategories = useCallback(
    (updater: (prev: RoomCategory[]) => RoomCategory[]) => {
      setCategories((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  const persistRooms = useCallback(
    (updater: (prev: FacilityRoom[]) => FacilityRoom[]) => {
      setRooms((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(ROOMS_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  // --- Category CRUD ---

  const addCategory = useCallback(
    (category: RoomCategory, unitCount = 0) => {
      persistCategories((prev) => {
        const exists = prev.find((c) => c.id === category.id);
        if (exists) return prev.map((c) => (c.id === category.id ? category : c));
        return [...prev, { ...category, sortOrder: prev.length + 1 }];
      });

      if (unitCount > 0) {
        const baseTime = Date.now();
        const newUnits: FacilityRoom[] = Array.from(
          { length: unitCount },
          (_, i) => ({
            id: `room-${baseTime}-${i}`,
            categoryId: category.id,
            facilityId: category.facilityId,
            name: `${category.name} ${String(i + 1).padStart(2, "0")}`,
            active: true,
            capacity: undefined,
            staffNotes: "",
            imageUrl: category.imageUrl,
          }),
        );
        persistRooms((prev) => [...prev, ...newUnits]);
      }
    },
    [persistCategories, persistRooms],
  );

  const updateCategory = useCallback(
    (category: RoomCategory) => {
      persistCategories((prev) =>
        prev.map((c) => (c.id === category.id ? category : c)),
      );
    },
    [persistCategories],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      persistCategories((prev) => prev.filter((c) => c.id !== id));
      persistRooms((prev) => prev.filter((r) => r.categoryId !== id));
    },
    [persistCategories, persistRooms],
  );

  // --- Room unit CRUD ---

  const addRoom = useCallback(
    (room: FacilityRoom) => {
      persistRooms((prev) => [...prev, room]);
    },
    [persistRooms],
  );

  const updateRoom = useCallback(
    (room: FacilityRoom) => {
      persistRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
    },
    [persistRooms],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      persistRooms((prev) => prev.filter((r) => r.id !== id));
    },
    [persistRooms],
  );

  const toggleRoom = useCallback(
    (id: string) => {
      persistRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
      );
    },
    [persistRooms],
  );

  // --- Queries ---

  const getCategoriesByService = useCallback(
    (service: RoomCategory["service"]) =>
      categories.filter((c) => c.service === service),
    [categories],
  );

  const getRoomsByCategory = useCallback(
    (categoryId: string) => rooms.filter((r) => r.categoryId === categoryId),
    [rooms],
  );

  // --- Reset ---

  const resetRooms = useCallback(() => {
    persistCategories(() => defaultRoomCategories);
    persistRooms(() => defaultFacilityRooms);
  }, [persistCategories, persistRooms]);

  const value = useMemo<RoomsContextValue>(
    () => ({
      categories,
      rooms,
      addCategory,
      updateCategory,
      deleteCategory,
      addRoom,
      updateRoom,
      deleteRoom,
      toggleRoom,
      getCategoriesByService,
      getRoomsByCategory,
      resetRooms,
    }),
    [
      categories,
      rooms,
      addCategory,
      updateCategory,
      deleteCategory,
      addRoom,
      updateRoom,
      deleteRoom,
      toggleRoom,
      getCategoriesByService,
      getRoomsByCategory,
      resetRooms,
    ],
  );

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}

export function useRooms(): RoomsContextValue {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error("useRooms must be used within a RoomsProvider");
  }
  return context;
}
