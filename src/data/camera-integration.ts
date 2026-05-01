import type {
  CameraIntegrationConfig,
  PetCamAccessConfig,
} from "@/types/camera-integration";

export const cameraIntegrationConfig: CameraIntegrationConfig = {
  isEnabled: true,
  provider: "idogcam",
  credentials: {
    idogcam: {
      kennelId: "DGV-MTL-001",
      erpCode: "ERP-7X9K2M",
      isVerified: true,
    },
  },
  connectionStatus: "connected",
  lastSyncAt: "2026-04-30T14:22:00Z",
  globalRuleSet: {
    enabled: true,
    logic: "any",
    rules: [
      { type: "active_stay", services: ["boarding", "daycare"] },
      { type: "operation_hours" },
    ],
  },
};

// Per-camera access configurations keyed by camera ID
export const petCamAccessConfigs: Record<string, PetCamAccessConfig> = {
  "cam-1": {
    isCustomerVisible: true,
    cameraType: "public",
    useGlobalRules: false,
    customRuleSet: {
      enabled: true,
      logic: "any",
      rules: [
        { type: "active_stay", services: ["boarding", "daycare"] },
        { type: "membership", membershipPlanIds: ["plan-001", "plan-002", "plan-003"] },
        { type: "package", packageIds: ["pkg-001", "pkg-002", "pkg-003"] },
        { type: "service_customer", services: ["daycare"] },
      ],
    },
  },
  "cam-2": {
    isCustomerVisible: true,
    cameraType: "private",
    useGlobalRules: false,
    customRuleSet: {
      enabled: true,
      logic: "any",
      rules: [
        { type: "active_stay", services: ["boarding"] },
        { type: "membership", membershipPlanIds: ["plan-003", "plan-004"] },
      ],
    },
  },
  "cam-3": {
    isCustomerVisible: true,
    cameraType: "public",
    useGlobalRules: true,
  },
  "cam-4": {
    isCustomerVisible: false,
    cameraType: "private",
    useGlobalRules: false,
    customRuleSet: {
      enabled: false,
      logic: "any",
      rules: [],
    },
  },
};
