export type CameraProvider = "idogcam" | "abckam";

export type CameraServiceType =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training";

export type CameraAccessRuleType =
  | "active_stay"
  | "operation_hours"
  | "membership"
  | "package"
  | "service_customer";

export type CameraAccessRule =
  | { type: "active_stay"; services: CameraServiceType[] }
  | { type: "operation_hours" }
  | { type: "membership"; membershipPlanIds: string[] }
  | { type: "package"; packageIds: string[] }
  | { type: "service_customer"; services: CameraServiceType[] };

export interface CameraRuleSet {
  enabled: boolean;
  /** "any" = OR logic — customer must pass at least one rule. "all" = AND logic. */
  logic: "any" | "all";
  rules: CameraAccessRule[];
}

export interface CameraProviderCredentials {
  idogcam?: {
    kennelId: string;
    erpCode: string;
    isVerified: boolean;
  };
  abckam?: {
    moegopetId: string;
    isVerified: boolean;
  };
}

export type CameraConnectionStatus =
  | "connected"
  | "disconnected"
  | "pending"
  | "error";

export interface CameraIntegrationConfig {
  isEnabled: boolean;
  provider: CameraProvider | null;
  credentials: CameraProviderCredentials;
  connectionStatus: CameraConnectionStatus;
  lastSyncAt: string | null;
  globalRuleSet: CameraRuleSet;
}

export interface PetCamAccessConfig {
  isCustomerVisible: boolean;
  cameraType: "public" | "private";
  useGlobalRules: boolean;
  customRuleSet?: CameraRuleSet;
}
