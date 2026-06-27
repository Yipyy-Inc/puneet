"use client";

import { useSyncExternalStore } from "react";

import { buildEnhancedAnnouncements } from "@/data/enhanced-announcements";
import { deliverAnnouncement } from "@/lib/announcement-delivery-store";
import type {
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTarget,
  DeliveryMethod,
  EnhancedAnnouncement,
} from "@/types/announcement";

// Admin-side store of ALL announcements (drafts, scheduled, published,
// archived) for the list + composer. Lazy now-anchored seed (SSR-safe). On
// publish it pushes to the cross-portal delivery store so facilities see it.

let state: EnhancedAnnouncement[] | null = null;
const EMPTY: EnhancedAnnouncement[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildEnhancedAnnouncements(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: EnhancedAnnouncement[]) {
  state = next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  emit();
}

function nextId(): string {
  return `ANN-${Date.now()}-${seq++}`;
}

export interface AnnouncementDraft {
  id?: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target: AnnouncementTarget;
  planTiers?: string[];
  businessTypes?: string[];
  facilityIds?: number[];
  deliveryMethod: DeliveryMethod;
  scheduledFor?: string;
  autoArchiveDays?: number | null;
}

/** Create or update an announcement; publishing also delivers it. */
export function upsertAnnouncement(
  draft: AnnouncementDraft,
): EnhancedAnnouncement {
  ensureInit();
  const list = state ?? [];
  const now = new Date().toISOString();
  const existing = draft.id ? list.find((a) => a.id === draft.id) : undefined;
  const published = draft.status === "Published";

  const announcement: EnhancedAnnouncement = {
    id: draft.id ?? nextId(),
    title: draft.title,
    body: draft.body,
    priority: draft.priority,
    status: draft.status,
    target: draft.target,
    planTiers: draft.planTiers,
    businessTypes: draft.businessTypes,
    facilityIds: draft.facilityIds,
    deliveryMethod: draft.deliveryMethod,
    scheduledFor: draft.scheduledFor,
    autoArchiveDays: draft.autoArchiveDays,
    author: existing?.author ?? "Platform Admin",
    createdAt: existing?.createdAt ?? now,
    publishedAt: published
      ? (existing?.publishedAt ?? now)
      : existing?.publishedAt,
  };

  commit([announcement, ...list.filter((a) => a.id !== announcement.id)]);
  if (published) deliverAnnouncement(announcement);
  return announcement;
}

/** Move an announcement to a new status (list-row actions). Publishing delivers. */
export function setAnnouncementStatus(id: string, status: AnnouncementStatus) {
  ensureInit();
  if (!state) return;
  const now = new Date().toISOString();
  let published: EnhancedAnnouncement | null = null;
  const next = state.map((a) => {
    if (a.id !== id) return a;
    const updated: EnhancedAnnouncement = {
      ...a,
      status,
      publishedAt:
        status === "Published" ? (a.publishedAt ?? now) : a.publishedAt,
    };
    if (status === "Published") published = updated;
    return updated;
  });
  commit(next);
  if (published) deliverAnnouncement(published);
}

export function deleteAnnouncement(id: string) {
  ensureInit();
  if (!state) return;
  commit(state.filter((a) => a.id !== id));
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): EnhancedAnnouncement[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): EnhancedAnnouncement[] {
  return EMPTY;
}

export function useAnnouncements(): EnhancedAnnouncement[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
