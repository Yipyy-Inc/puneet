import type { WaiverServiceTag } from "@/data/additional-features";

export const SERVICE_LABEL: Record<WaiverServiceTag, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
  general: "General",
};

export const SERVICE_BADGE: Record<WaiverServiceTag, string> = {
  boarding: "bg-blue-500/10 text-blue-700 border-blue-200",
  daycare: "bg-green-500/10 text-green-700 border-green-200",
  grooming: "bg-purple-500/10 text-purple-700 border-purple-200",
  training: "bg-orange-500/10 text-orange-700 border-orange-200",
  vet: "bg-rose-500/10 text-rose-700 border-rose-200",
  retail: "bg-amber-500/10 text-amber-700 border-amber-200",
  general: "bg-gray-500/10 text-gray-700 border-gray-200",
};

/** A waiver may carry the legacy single `type` or the newer `services[]`.
 *  Use this to read the canonical list of service tags it applies to. */
export function getWaiverServices(item: {
  type: WaiverServiceTag;
  services?: WaiverServiceTag[];
}): WaiverServiceTag[] {
  return item.services && item.services.length > 0
    ? item.services
    : [item.type];
}
