"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BoardTab =
  | "scheduled"
  | "checked-in"
  | "going-home"
  | "checked-out";

interface DashboardFiltersContextValue {
  tab: BoardTab;
  setTab: (tab: BoardTab) => void;
  serviceFilter: string;
  setServiceFilter: (key: string) => void;
  query: string;
  setQuery: (q: string) => void;
}

const Ctx = createContext<DashboardFiltersContextValue | null>(null);

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<BoardTab>("scheduled");
  const [serviceFilter, setServiceFilterState] = useState<string>("all");
  const [query, setQuery] = useState("");

  const setTab = useCallback((next: BoardTab) => {
    setTabState(next);
    if (typeof window !== "undefined") {
      const board = document.getElementById("bookings-board");
      board?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const setServiceFilter = useCallback((key: string) => {
    setServiceFilterState(key);
  }, []);

  const value = useMemo(
    () => ({
      tab,
      setTab,
      serviceFilter,
      setServiceFilter,
      query,
      setQuery,
    }),
    [tab, setTab, serviceFilter, setServiceFilter, query],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardFilters(): DashboardFiltersContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useDashboardFilters must be used inside <DashboardFiltersProvider>",
    );
  return ctx;
}
