import {
  PawPrint,
  Droplets,
  Car,
  PartyPopper,
  Clock,
  Bed,
  PlusCircle,
  CalendarCheck,
  Waves,
  Truck,
  Sparkles,
  Heart,
  Scissors,
  GraduationCap,
  Sun,
  Star,
  Zap,
  Shield,
  Music,
  Camera,
  Gift,
  Coffee,
  Dumbbell,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { CustomServiceModule } from "@/lib/types";

// ========================================
// ICON RESOLVER
// ========================================

const ICON_MAP: Record<string, LucideIcon> = {
  PawPrint,
  Droplets,
  Car,
  PartyPopper,
  Clock,
  Bed,
  PlusCircle,
  CalendarCheck,
  Waves,
  Truck,
  Sparkles,
  Heart,
  Scissors,
  GraduationCap,
  Sun,
  Star,
  Zap,
  Shield,
  Music,
  Camera,
  Gift,
  Coffee,
  Dumbbell,
  Stethoscope,
};

export function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? PawPrint;
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

// ========================================
// SERVICE CATEGORY SHAPE
// ========================================

export interface ServiceCategoryItem {
  id: string;
  image: string;
  name: string;
  icon: LucideIcon;
  description: string;
  basePrice: number;
  included: string[];
  isCustom?: boolean;
}

// ========================================
// BUILT-IN SERVICE IDS
// ========================================

const BUILTIN_SERVICE_IDS = new Set([
  "daycare",
  "boarding",
  "grooming",
  "training",
  "evaluation",
  "retail",
  "vet",
  "store",
]);

export function isBuiltinService(id: string): boolean {
  return BUILTIN_SERVICE_IDS.has(id);
}

// ========================================
// MERGE CUSTOM MODULES INTO SERVICE LIST
// ========================================

function customModuleToServiceCategory(
  module: CustomServiceModule,
): ServiceCategoryItem {
  return {
    id: module.slug,
    image: "/services/custom-default.jpg",
    name: module.name,
    icon: resolveIcon(module.icon),
    description: module.description,
    basePrice: module.pricing.basePrice,
    included: buildIncludedList(module),
    isCustom: true,
  };
}

function buildIncludedList(module: CustomServiceModule): string[] {
  const items: string[] = [];
  if (module.calendar.enabled) {
    const durations = module.calendar.durationOptions
      .map((d) => d.label)
      .join(" / ");
    items.push(durations + " sessions");
  }
  if (module.checkInOut.enabled) items.push("Check-in/out tracking");
  if (module.staffAssignment.autoAssign) items.push("Staff assigned");
  if (module.onlineBooking.enabled) items.push("Online booking");
  return items;
}

/**
 * Merges built-in SERVICE_CATEGORIES with active custom modules.
 * Pass the built-in array (from constants.ts) + custom modules from context.
 */
export function getAllServiceCategories(
  builtinCategories: Omit<ServiceCategoryItem, "isCustom">[],
  customModules: CustomServiceModule[],
): ServiceCategoryItem[] {
  const activeCustom = customModules
    .filter((m) => m.status === "active" && m.onlineBooking.enabled)
    .map(customModuleToServiceCategory);
  return [...builtinCategories, ...activeCustom];
}

/**
 * Slug utility: converts a service name to a URL-safe slug.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
