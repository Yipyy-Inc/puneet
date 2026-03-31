import type { ServiceCategory } from "@/types/service-module";

export interface ModuleRequest {
  id: string;
  facilityId: number;
  facilityName: string;
  requestedAt: string;
  requestedBy: string;
  serviceName: string;
  description: string;
  suggestedCategory: ServiceCategory | "unsure";
  priority: "normal" | "urgent";
  status: "pending" | "in_progress" | "completed" | "declined";
  declineReason?: string;
  completedModuleId?: string;
  notes?: string;
}
