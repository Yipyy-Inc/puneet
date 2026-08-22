"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  DaycarePlayArea,
  DaycareSection,
  FacilityRoom,
  RoomCategory,
} from "@/types/rooms";
import { useRooms } from "@/hooks/use-rooms";

// ============================================================================
// A facility's daycare yards.
//
// ── WHAT THIS USED TO BE ──────────────────────────────────────────────────
//
// Two localStorage keys — `daycare-play-areas` and `daycare-sections` — seeded
// from a fixture. That would be poor for configuration; it was worse than that
// here, because the BOOKING FLOW reads this hook. `BookingModal` and
// `DaycareDetails` both call it, and `getDaycareAvailabilitySummary` decides
// whether a day has room from these sections.
//
// So a section's CAPACITY lived in one browser. Two people on two terminals
// could hold different numbers for the same yard, each be told the day was
// fine, and each create a real booking in Postgres.
//
// ── WHY THIS IS NOW AN ADAPTER AND NOT A STORE ────────────────────────────
//
// A play area IS a `room_categories` row with `service = 'daycare'`, and a
// section IS a `facility_rooms` row inside it (20260822800000). Both already
// have a full CRUD API and a provider — `useRooms` — so this hook holds no
// state of its own any more. It translates vocabulary and delegates.
//
// The alternative was a second endpoint over the same two tables, which is how
// a codebase ends up with two answers to "what spaces does this facility have".
// ============================================================================

interface DaycareAreasContextValue {
  areas: DaycarePlayArea[];
  sections: DaycareSection[];

  addArea: (area: DaycarePlayArea) => void;
  updateArea: (area: DaycarePlayArea) => void;
  deleteArea: (id: string) => void;
  toggleArea: (id: string) => void;

  addSection: (section: DaycareSection) => void;
  updateSection: (section: DaycareSection) => void;
  deleteSection: (id: string) => void;
  toggleSection: (id: string) => void;

  getSectionsByArea: (areaId: string) => DaycareSection[];
}

const DaycareAreasContext = createContext<DaycareAreasContextValue | null>(
  null,
);

/** A daycare category, read as a play area. */
function categoryToArea(c: RoomCategory): DaycarePlayArea {
  return {
    id: c.id,
    facilityId: c.facilityId,
    name: c.name,
    description: c.description,
    imageUrl: c.imageUrl,
    isActive: c.active,
    sortOrder: c.sortOrder,
  };
}

/** A room in a daycare category, read as a section. */
function roomToSection(r: FacilityRoom, sortOrder: number): DaycareSection {
  return {
    id: r.id,
    playAreaId: r.categoryId,
    facilityId: r.facilityId,
    name: r.name,
    // A section without an explicit capacity admits nobody rather than
    // everybody. The old fixture always carried one; a row created without one
    // must not read as unlimited.
    capacity: r.capacity ?? 0,
    description: r.description,
    imageUrl: r.imageUrl,
    isActive: r.active,
    sortOrder,
    rules: r.rules,
    color: r.color ?? "slate",
  };
}

export function DaycareAreasProvider({ children }: { children: ReactNode }) {
  const {
    categories,
    rooms,
    addCategory,
    updateCategory,
    deleteCategory,
    addRoom,
    updateRoom,
    deleteRoom,
  } = useRooms();

  const areas = useMemo(
    () => categories.filter((c) => c.service === "daycare").map(categoryToArea),
    [categories],
  );

  const areaIds = useMemo(() => new Set(areas.map((a) => a.id)), [areas]);

  const sections = useMemo(
    () =>
      rooms
        .filter((r) => areaIds.has(r.categoryId))
        .map((r, i) => roomToSection(r, i + 1)),
    [rooms, areaIds],
  );

  /** A play area, written back as a daycare category. */
  const areaToCategory = useCallback(
    (a: DaycarePlayArea): RoomCategory => ({
      id: a.id,
      facilityId: a.facilityId,
      service: "daycare",
      name: a.name,
      description: a.description,
      color: "slate",
      sortOrder: a.sortOrder,
      rules: [],
      // The capacity of a yard is the sum of its sections', which the sections
      // carry themselves — so this fallback is never consulted. 1 rather than
      // 0 because the column refuses 0, and it errs toward under-booking.
      defaultCapacity: 1,
      visibleToClients: true,
      imageUrl: a.imageUrl,
      active: a.isActive,
    }),
    [],
  );

  /** A section, written back as a room in its area. */
  const sectionToRoom = useCallback(
    (s: DaycareSection): FacilityRoom => ({
      id: s.id,
      categoryId: s.playAreaId,
      facilityId: s.facilityId,
      name: s.name,
      active: s.isActive,
      capacity: s.capacity,
      imageUrl: s.imageUrl,
      description: s.description,
      rules: s.rules,
      color: s.color,
    }),
    [],
  );

  const addArea = useCallback(
    (area: DaycarePlayArea) => addCategory(areaToCategory(area), 0),
    [addCategory, areaToCategory],
  );

  const updateArea = useCallback(
    (area: DaycarePlayArea) => updateCategory(areaToCategory(area)),
    [updateCategory, areaToCategory],
  );

  // Deleting the area deletes its sections with it — `facility_rooms.category_id`
  // cascades, so this does not walk them by hand the way the localStorage
  // version had to.
  const deleteArea = useCallback(
    (id: string) => deleteCategory(id),
    [deleteCategory],
  );

  const toggleArea = useCallback(
    (id: string) => {
      const area = areas.find((a) => a.id === id);
      if (!area) return;
      updateCategory(areaToCategory({ ...area, isActive: !area.isActive }));
    },
    [areas, updateCategory, areaToCategory],
  );

  const addSection = useCallback(
    (section: DaycareSection) => addRoom(sectionToRoom(section)),
    [addRoom, sectionToRoom],
  );

  const updateSection = useCallback(
    (section: DaycareSection) => updateRoom(sectionToRoom(section)),
    [updateRoom, sectionToRoom],
  );

  const deleteSection = useCallback(
    (id: string) => deleteRoom(id),
    [deleteRoom],
  );

  const toggleSection = useCallback(
    (id: string) => {
      const section = sections.find((s) => s.id === id);
      if (!section) return;
      updateRoom(sectionToRoom({ ...section, isActive: !section.isActive }));
    },
    [sections, updateRoom, sectionToRoom],
  );

  const getSectionsByArea = useCallback(
    (areaId: string) => sections.filter((s) => s.playAreaId === areaId),
    [sections],
  );

  const value = useMemo<DaycareAreasContextValue>(
    () => ({
      areas,
      sections,
      addArea,
      updateArea,
      deleteArea,
      toggleArea,
      addSection,
      updateSection,
      deleteSection,
      toggleSection,
      getSectionsByArea,
    }),
    [
      areas,
      sections,
      addArea,
      updateArea,
      deleteArea,
      toggleArea,
      addSection,
      updateSection,
      deleteSection,
      toggleSection,
      getSectionsByArea,
    ],
  );

  return (
    <DaycareAreasContext.Provider value={value}>
      {children}
    </DaycareAreasContext.Provider>
  );
}

export function useDaycareAreas(): DaycareAreasContextValue {
  const context = useContext(DaycareAreasContext);
  if (!context) {
    throw new Error(
      "useDaycareAreas must be used within a DaycareAreasProvider",
    );
  }
  return context;
}
