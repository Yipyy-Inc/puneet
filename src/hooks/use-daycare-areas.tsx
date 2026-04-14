"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { DaycarePlayArea, DaycareSection } from "@/types/rooms";
import {
  daycarePlayAreas as defaultPlayAreas,
  daycareSections as defaultSections,
} from "@/data/daycare-areas";

interface DaycareAreasContextValue {
  areas: DaycarePlayArea[];
  sections: DaycareSection[];

  // Area CRUD
  addArea: (area: DaycarePlayArea) => void;
  updateArea: (area: DaycarePlayArea) => void;
  deleteArea: (id: string) => void;
  toggleArea: (id: string) => void;

  // Section CRUD
  addSection: (section: DaycareSection) => void;
  updateSection: (section: DaycareSection) => void;
  deleteSection: (id: string) => void;
  toggleSection: (id: string) => void;

  // Queries
  getSectionsByArea: (areaId: string) => DaycareSection[];

  // Reset
  resetDaycareAreas: () => void;
}

const DaycareAreasContext = createContext<DaycareAreasContextValue | null>(
  null,
);

const AREAS_KEY = "daycare-play-areas";
const SECTIONS_KEY = "daycare-sections";

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

/** Backfill imageUrl from defaults for areas matching by id. */
function backfillAreaImages(stored: DaycarePlayArea[]): DaycarePlayArea[] {
  const defaultsById = new Map(defaultPlayAreas.map((a) => [a.id, a] as const));
  return stored.map((a) => {
    if (a.imageUrl) return a;
    const def = defaultsById.get(a.id);
    if (def?.imageUrl) return { ...a, imageUrl: def.imageUrl };
    return a;
  });
}

export function DaycareAreasProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<DaycarePlayArea[]>(() =>
    backfillAreaImages(loadStored(AREAS_KEY, defaultPlayAreas)),
  );
  const [sections, setSections] = useState<DaycareSection[]>(() =>
    loadStored(SECTIONS_KEY, defaultSections),
  );

  const persistAreas = useCallback(
    (updater: (prev: DaycarePlayArea[]) => DaycarePlayArea[]) => {
      setAreas((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(AREAS_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  const persistSections = useCallback(
    (updater: (prev: DaycareSection[]) => DaycareSection[]) => {
      setSections((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(SECTIONS_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  // --- Area CRUD ---

  const addArea = useCallback(
    (area: DaycarePlayArea) => {
      persistAreas((prev) => {
        const exists = prev.find((a) => a.id === area.id);
        if (exists) return prev.map((a) => (a.id === area.id ? area : a));
        return [...prev, area];
      });
    },
    [persistAreas],
  );

  const updateArea = useCallback(
    (area: DaycarePlayArea) => {
      persistAreas((prev) => prev.map((a) => (a.id === area.id ? area : a)));
    },
    [persistAreas],
  );

  const deleteArea = useCallback(
    (id: string) => {
      persistAreas((prev) => prev.filter((a) => a.id !== id));
      persistSections((prev) => prev.filter((s) => s.playAreaId !== id));
    },
    [persistAreas, persistSections],
  );

  const toggleArea = useCallback(
    (id: string) => {
      persistAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)),
      );
    },
    [persistAreas],
  );

  // --- Section CRUD ---

  const addSection = useCallback(
    (section: DaycareSection) => {
      persistSections((prev) => {
        const exists = prev.find((s) => s.id === section.id);
        if (exists) return prev.map((s) => (s.id === section.id ? section : s));
        return [...prev, section];
      });
    },
    [persistSections],
  );

  const updateSection = useCallback(
    (section: DaycareSection) => {
      persistSections((prev) =>
        prev.map((s) => (s.id === section.id ? section : s)),
      );
    },
    [persistSections],
  );

  const deleteSection = useCallback(
    (id: string) => {
      persistSections((prev) => prev.filter((s) => s.id !== id));
    },
    [persistSections],
  );

  const toggleSection = useCallback(
    (id: string) => {
      persistSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
      );
    },
    [persistSections],
  );

  // --- Queries ---

  const getSectionsByArea = useCallback(
    (areaId: string) => sections.filter((s) => s.playAreaId === areaId),
    [sections],
  );

  // --- Reset ---

  const resetDaycareAreas = useCallback(() => {
    persistAreas(() => defaultPlayAreas);
    persistSections(() => defaultSections);
  }, [persistAreas, persistSections]);

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
      resetDaycareAreas,
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
      resetDaycareAreas,
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
