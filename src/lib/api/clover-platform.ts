"use client";

// ============================================================================
// The deployment's Clover configuration, as booleans.
//
// No fallback to fixtures. This is the screen a platform admin reads to decide
// whether the payment integration is ready to take real money, and an answer
// invented on the client is worse than no answer: "configured" would mean
// "somebody wrote a plausible object" rather than "the credential resolves".
// ============================================================================

export interface CloverEstateStatus {
  environment: "sandbox" | "production";
  /** Both an app id AND a secret resolve for this estate specifically. */
  configured: boolean;
  /** A Remote Application ID exists, without which card-present 401s. */
  terminalsEnabled: boolean;
  connectedFacilities: number;
  facilitiesInError: number;
}

export interface CloverPlatformStatus {
  defaultEnvironment: "sandbox" | "production";
  webhookUrl: string;
  webhookAuthConfigured: boolean;
  estates: CloverEstateStatus[];
}

export const cloverPlatformQueries = {
  status: () => ({
    queryKey: ["clover", "platform-status"] as const,
    queryFn: async (): Promise<CloverPlatformStatus> => {
      const response = await fetch("/api/payments/clover/platform");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as CloverPlatformStatus;
    },
  }),
};
