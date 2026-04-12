import type { AddOnCategory } from "@/types/facility";

export const ADDONS_CATEGORIES_STORAGE_KEY = "settings-addon-categories";

export const defaultAddOnCategories: AddOnCategory[] = [
  {
    id: "cat-activity",
    name: "Activity & Exercise",
    description: "Walks, play sessions, and physical enrichment",
    colorCode: "#22c55e",
    sortOrder: 1,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: "cat-grooming",
    name: "Grooming & Hygiene",
    description: "Bathing, nail trims, and coat care",
    colorCode: "#8b5cf6",
    sortOrder: 2,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: "cat-communication",
    name: "Communication & Monitoring",
    description: "Video calls, webcam access, and progress updates",
    colorCode: "#3b82f6",
    sortOrder: 3,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: "cat-treats",
    name: "Treats & Enrichment",
    description: "Special treats, Kongs, and enrichment activities",
    colorCode: "#f59e0b",
    sortOrder: 4,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: "cat-training",
    name: "Training",
    description: "Mini sessions and obedience reinforcement",
    colorCode: "#ec4899",
    sortOrder: 5,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: "cat-spa",
    name: "Spa & Wellness",
    description: "Massages, aromatherapy, and relaxation services",
    colorCode: "#a855f7",
    sortOrder: 6,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
];
