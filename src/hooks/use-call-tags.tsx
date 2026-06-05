"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { CallTag } from "@/types/calling";
import { callTags as seedTags } from "@/data/calling";
import { MAX_CALL_TAGS } from "@/lib/calling/call-tags";

interface CallTagsValue {
  tags: CallTag[];
  /** False once the per-facility cap (MAX_CALL_TAGS) is reached. */
  canAddMore: boolean;
  addTag: (input: Omit<CallTag, "id">) => void;
  updateTag: (id: string, patch: Partial<Omit<CallTag, "id">>) => void;
  removeTag: (id: string) => void;
}

const CallTagsContext = createContext<CallTagsValue | null>(null);

export function CallTagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<CallTag[]>(() => [...seedTags]);

  const addTag = useCallback((input: Omit<CallTag, "id">) => {
    setTags((prev) => {
      if (prev.length >= MAX_CALL_TAGS) return prev;
      const id = `tag-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${prev.length}`;
      return [...prev, { ...input, id }];
    });
  }, []);

  const updateTag = useCallback(
    (id: string, patch: Partial<Omit<CallTag, "id">>) =>
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  );

  const removeTag = useCallback(
    (id: string) => setTags((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  return (
    <CallTagsContext.Provider
      value={{
        tags,
        canAddMore: tags.length < MAX_CALL_TAGS,
        addTag,
        updateTag,
        removeTag,
      }}
    >
      {children}
    </CallTagsContext.Provider>
  );
}

const FALLBACK: CallTagsValue = {
  tags: [],
  canAddMore: false,
  addTag: () => {},
  updateTag: () => {},
  removeTag: () => {},
};

export function useCallTags(): CallTagsValue {
  return useContext(CallTagsContext) ?? FALLBACK;
}
