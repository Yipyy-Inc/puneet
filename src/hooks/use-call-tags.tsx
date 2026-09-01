"use client";

import { useCallback } from "react";

import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { MAX_CALL_TAGS } from "@/lib/calling/call-tags";
import type { CallTag } from "@/types/calling";

// ============================================================================
// The facility's call-tag vocabulary, kept by the facility.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// A React context holding `useState([...seedTags])`. Adding a tag, renaming
// one or deleting one changed a value in ONE browser tab. It was gone on
// reload, absent from a colleague's screen, and absent from the other portal —
// `CallTagsProvider` was mounted separately in the facility layout and the
// employee layout, so the same person had two independent taxonomies depending
// on which URL they were at.
//
// Tags are not a UI preference. `callLog.tags` stores their ids, the Analytics
// tab counts them and detects spikes per tag, and the in-call panel applies
// them. A taxonomy that only one browser knows about makes every one of those
// readings mean something different to each person looking.
//
// ── WHY THERE IS NO PROVIDER ANY MORE ─────────────────────────────────────
//
// The context existed to share one `useState` across the tree. The state now
// lives in the `calling_tags` settings row and reaches every consumer through
// TanStack Query's cache, which already dedupes and already invalidates — a
// provider on top of it would be indirection that can go stale on its own.
// The hook's shape is unchanged, so its four consumers did not move.
//
// ── WRITES ARE ASYNC AND CAN BE REFUSED ───────────────────────────────────
//
// RLS gates this row on `settings_general`. The mutators return a promise that
// REJECTS on refusal rather than swallowing it, because the previous versions
// returned void and could not have reported anything — a groomer deleting a tag
// would have watched it disappear from their screen and come back on reload.
// ============================================================================

interface CallTagsValue {
  tags: CallTag[];
  /** False once the per-facility cap (MAX_CALL_TAGS) is reached. */
  canAddMore: boolean;
  /**
   * True while the facility's list is still loading.
   *
   * Consumers that WRITE must respect it. The settings query serves documented
   * defaults while in flight, so a write issued before it lands would save the
   * eight shipped tags over whatever the facility actually has — the same trap
   * the settings panel hit, with the same cost.
   */
  isPending: boolean;
  addTag: (input: Omit<CallTag, "id">) => Promise<void>;
  updateTag: (id: string, patch: Partial<Omit<CallTag, "id">>) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
}

/** A slug that stays stable when the list is reordered or an item is removed. */
function tagId(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tag";
  let candidate = `tag-${base}`;
  let n = 2;
  // The old version suffixed `prev.length`, so deleting a tag and adding
  // another could reissue an id a past call already points at.
  while (taken.has(candidate)) candidate = `tag-${base}-${n++}`;
  return candidate;
}

export function useCallTags(): CallTagsValue {
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const tags = settings.calling_tags.value;

  const write = useCallback(
    async (next: CallTag[]) => {
      if (isPending) return;
      await saveSetting.mutateAsync({ domain: "calling_tags", value: next });
    },
    [isPending, saveSetting],
  );

  const addTag = useCallback(
    async (input: Omit<CallTag, "id">) => {
      if (tags.length >= MAX_CALL_TAGS) return;
      const id = tagId(input.name, new Set(tags.map((t) => t.id)));
      await write([...tags, { ...input, id }]);
    },
    [tags, write],
  );

  const updateTag = useCallback(
    async (id: string, patch: Partial<Omit<CallTag, "id">>) => {
      await write(tags.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [tags, write],
  );

  const removeTag = useCallback(
    async (id: string) => {
      await write(tags.filter((t) => t.id !== id));
    },
    [tags, write],
  );

  return {
    tags,
    canAddMore: tags.length < MAX_CALL_TAGS,
    isPending,
    addTag,
    updateTag,
    removeTag,
  };
}
