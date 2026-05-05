import {
  PawPrint,
  Utensils,
  Pill,
  Star,
  Droplets,
  SprayCan,
  BedDouble,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import type { DailyCareTaskType } from "@/types/boarding";

export type TaskTypeMeta = {
  label: string;
  Icon: LucideIcon;
  /** Tailwind text color class for the icon */
  color: string;
  /** Tailwind background class for the icon container */
  bg: string;
  /** Border tint for the section header */
  border: string;
};

export const TASK_TYPE_META: Record<DailyCareTaskType, TaskTypeMeta> = {
  potty: {
    label: "Potty Round",
    Icon: PawPrint,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-200 dark:border-green-900/50",
  },
  feeding: {
    label: "Feeding",
    Icon: Utensils,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  medication: {
    label: "Medications",
    Icon: Pill,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-900/50",
  },
  addon: {
    label: "Add-Ons",
    Icon: Star,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-200 dark:border-purple-900/50",
  },
  water_refill: {
    label: "Water Refill",
    Icon: Droplets,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-900/50",
  },
  kennel_clean: {
    label: "Kennel Cleaning",
    Icon: SprayCan,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    border: "border-cyan-200 dark:border-cyan-900/50",
  },
  bedding_change: {
    label: "Bedding Change",
    Icon: BedDouble,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    border: "border-indigo-200 dark:border-indigo-900/50",
  },
  custom: {
    label: "Custom Task",
    Icon: Settings2,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-900/30",
    border: "border-slate-200 dark:border-slate-900/50",
  },
};

/** Map a CareTaskType (potty/feeding/medication/addon/care) plus optional
 *  subType (for "care") onto the appropriate DailyCareTaskType meta entry. */
export function metaFor(
  taskType: "potty" | "feeding" | "medication" | "addon" | "care",
  subType?: string,
): TaskTypeMeta {
  if (taskType === "care") {
    if (subType === "water_refill") return TASK_TYPE_META.water_refill;
    if (subType === "kennel_clean") return TASK_TYPE_META.kennel_clean;
    if (subType === "bedding_change") return TASK_TYPE_META.bedding_change;
    return TASK_TYPE_META.custom;
  }
  return TASK_TYPE_META[taskType];
}
