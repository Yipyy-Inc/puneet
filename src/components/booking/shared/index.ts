/**
 * Shared booking components used in both facility and customer flows.
 * Use these to keep portals consistent (service cards, room cards, add-ons,
 * time slider, requirements gate, tip step).
 */

export { ServiceCard } from "./ServiceCard";
export type { ServiceCardItem, ServiceCardProps } from "./ServiceCard";

export { RoomCard } from "./RoomCard";
export type { RoomCardItem, RoomCardProps } from "./RoomCard";

export { AddonCard } from "./AddonCard";
export type {
  AddonCardItem,
  AddonCardProps,
  PetOption as AddonPetOption,
} from "./AddonCard";

export { RequirementsGateStep } from "./RequirementsGateStep";
export type { MissingRequirement } from "./RequirementsGateStep";

export { TipStep } from "./TipStep";
export type { TipSuggestion, TipStepConfig } from "./TipStep";

/** TimeRangeSlider is in UI; re-export for convenience so both flows can import from shared. */
export {
  TimeRangeSlider,
  type TimeRangeSliderProps,
} from "@/components/ui/time-range-slider";
