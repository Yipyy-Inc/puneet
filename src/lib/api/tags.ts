import type { Tag, TagAssignment, Note, TagNoteSettings } from "@/types/tags";

import {
  tags,
  tagAssignments,
  notes,
  defaultTagNoteSettings,
} from "@/data/tags-notes";

export const tagQueries = {
  all: () => ({
    queryKey: ["tags"] as const,
    queryFn: async (): Promise<Tag[]> => tags,
  }),

  assignments: () => ({
    queryKey: ["tags", "assignments"] as const,
    queryFn: async (): Promise<TagAssignment[]> => tagAssignments,
  }),

  notes: () => ({
    queryKey: ["notes"] as const,
    queryFn: async (): Promise<Note[]> => notes,
  }),

  settings: () => ({
    queryKey: ["tags", "settings"] as const,
    queryFn: async (): Promise<TagNoteSettings> => defaultTagNoteSettings,
  }),
};
