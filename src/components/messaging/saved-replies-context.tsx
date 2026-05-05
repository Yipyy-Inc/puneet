"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { savedReplies as defaultSavedReplies } from "@/data/saved-replies";
import type { SavedReply } from "@/types/saved-replies";

interface SavedRepliesContextValue {
  replies: SavedReply[];
  add: (reply: SavedReply) => void;
  update: (reply: SavedReply) => void;
  remove: (id: string) => void;
  incrementUse: (id: string) => void;
}

const SavedRepliesContext = createContext<SavedRepliesContextValue | null>(null);

export function SavedRepliesProvider({ children }: { children: React.ReactNode }) {
  const [replies, setReplies] = useState<SavedReply[]>(defaultSavedReplies);

  const add = useCallback((reply: SavedReply) => {
    setReplies((prev) => [reply, ...prev]);
  }, []);

  const update = useCallback((reply: SavedReply) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === reply.id ? reply : r)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const incrementUse = useCallback((id: string) => {
    setReplies((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, useCount: r.useCount + 1 } : r,
      ),
    );
  }, []);

  return (
    <SavedRepliesContext.Provider value={{ replies, add, update, remove, incrementUse }}>
      {children}
    </SavedRepliesContext.Provider>
  );
}

export function useSavedReplies() {
  const ctx = useContext(SavedRepliesContext);
  if (!ctx) {
    throw new Error("useSavedReplies must be used within SavedRepliesProvider");
  }
  return ctx;
}
