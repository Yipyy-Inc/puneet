// Grooming Prepaid Packages — pre-paid bundles of grooming sessions
// (e.g. "5x Full Groom valid 6 months") that customers buy at a discount.
//
// Distinct from `groomingPackages` in `./grooming.ts`, which are the actual
// grooming SERVICES with size pricing (Bath & Brush, Full Groom, etc.).

export interface GroomingPrepaidPackagePolicy {
  /** Allow cash / card refund on unused passes */
  allowRefundUnused: boolean;
  /** Refund amount per unused pass — usually less than the paid-per-pass rate */
  refundPerUnusedPass?: number;
  /** Convert unused passes to store credit on cancellation */
  allowStoreCreditOnCancel: boolean;
  /** Transfer remaining passes to another customer (e.g. household member) */
  allowTransfer: boolean;
  /** Customer can request an extension on expiring passes */
  allowExtension: boolean;
  /** Maximum number of days the validity window can be extended */
  maxExtensionDays: number;
  /** One-time fee to extend validity (0 = free) */
  extensionFee: number;
  /** Free-text policy explanation shown to customers */
  policyNotes?: string;
}

export interface GroomingPrepaidPackageService {
  /** References a grooming service id (groom-pkg-001 etc.) */
  serviceId: string;
  serviceName: string;
  /** Number of sessions of this service included in the package */
  quantity: number;
  /** Snapshot of the service per-session price at the time the package was created */
  pricePerSession: number;
}

export type GroomingPrepaidPackageStatus = "active" | "inactive" | "seasonal";

export interface GroomingPrepaidPackage {
  id: string;
  name: string;
  description: string;
  /** Grooming services bundled in this package */
  services: GroomingPrepaidPackageService[];
  /** Sum of (pricePerSession * quantity) — what the customer would pay buying à-la-carte */
  regularPrice: number;
  /** What the customer actually pays for the package */
  packagePrice: number;
  /** regularPrice - packagePrice */
  savings: number;
  /** (savings / regularPrice) * 100 */
  savingsPercentage: number;
  /** Days from purchase before unused passes expire */
  validityDays: number;
  status: GroomingPrepaidPackageStatus;
  isPopular?: boolean;
  /** Number of times this package has been purchased */
  purchaseCount: number;
  createdAt: string;
  policy: GroomingPrepaidPackagePolicy;
}

export const defaultGroomingPrepaidPackagePolicy: GroomingPrepaidPackagePolicy = {
  allowRefundUnused: false,
  allowStoreCreditOnCancel: true,
  allowTransfer: false,
  allowExtension: true,
  maxExtensionDays: 30,
  extensionFee: 0,
};

export const groomingPrepaidPackages: GroomingPrepaidPackage[] = [
  {
    id: "gpp-001",
    name: "5x Full Groom Pack",
    description:
      "Five complete grooming sessions to keep your dog looking sharp all season. Save 15% versus à-la-carte pricing.",
    services: [
      {
        serviceId: "groom-pkg-002",
        serviceName: "Full Groom",
        quantity: 5,
        pricePerSession: 65,
      },
    ],
    regularPrice: 325,
    packagePrice: 275,
    savings: 50,
    savingsPercentage: 15.4,
    validityDays: 180,
    status: "active",
    isPopular: true,
    purchaseCount: 87,
    createdAt: "2025-09-01T10:00:00Z",
    policy: {
      allowRefundUnused: true,
      refundPerUnusedPass: 50,
      allowStoreCreditOnCancel: true,
      allowTransfer: true,
      allowExtension: true,
      maxExtensionDays: 60,
      extensionFee: 0,
      policyNotes:
        "Refunds on unused passes issued at $50/pass (below the per-pass price). Free 60-day extension available once per package.",
    },
  },
  {
    id: "gpp-002",
    name: "10x Bath & Brush Pack",
    description:
      "Ten quick bath & brush visits — perfect for regular maintenance between full grooms.",
    services: [
      {
        serviceId: "groom-pkg-001",
        serviceName: "Basic Bath",
        quantity: 10,
        pricePerSession: 35,
      },
    ],
    regularPrice: 350,
    packagePrice: 280,
    savings: 70,
    savingsPercentage: 20,
    validityDays: 365,
    status: "active",
    isPopular: true,
    purchaseCount: 64,
    createdAt: "2025-09-01T10:00:00Z",
    policy: {
      allowRefundUnused: false,
      allowStoreCreditOnCancel: true,
      allowTransfer: false,
      allowExtension: true,
      maxExtensionDays: 30,
      extensionFee: 15,
      policyNotes:
        "Validity extensions available once for up to 30 days ($15 fee). Unused passes convert to store credit on cancellation.",
    },
  },
  {
    id: "gpp-003",
    name: "Puppy First-Year Plan",
    description:
      "6 grooms + 2 baths over the first year — gentle introduction to the salon for puppies.",
    services: [
      {
        serviceId: "groom-pkg-002",
        serviceName: "Full Groom",
        quantity: 6,
        pricePerSession: 65,
      },
      {
        serviceId: "groom-pkg-001",
        serviceName: "Basic Bath",
        quantity: 2,
        pricePerSession: 35,
      },
    ],
    regularPrice: 460,
    packagePrice: 379,
    savings: 81,
    savingsPercentage: 17.6,
    validityDays: 365,
    status: "active",
    purchaseCount: 23,
    createdAt: "2025-10-15T10:00:00Z",
    policy: {
      ...defaultGroomingPrepaidPackagePolicy,
      allowExtension: true,
      maxExtensionDays: 90,
      policyNotes:
        "Up to 90-day extension available for puppies who need more spacing between visits.",
    },
  },
  {
    id: "gpp-004",
    name: "Spa Day Trio",
    description:
      "Three premium spa treatments featuring blueberry facial, paw balm, and de-shedding.",
    services: [
      {
        serviceId: "groom-pkg-002",
        serviceName: "Full Groom",
        quantity: 3,
        pricePerSession: 65,
      },
    ],
    regularPrice: 195,
    packagePrice: 175,
    savings: 20,
    savingsPercentage: 10.3,
    validityDays: 90,
    status: "active",
    purchaseCount: 12,
    createdAt: "2026-01-10T10:00:00Z",
    policy: {
      ...defaultGroomingPrepaidPackagePolicy,
    },
  },
  {
    id: "gpp-005",
    name: "Holiday Sparkle Pack",
    description:
      "Two festive grooms + bow & cologne finish. Perfect for the holiday season.",
    services: [
      {
        serviceId: "groom-pkg-002",
        serviceName: "Full Groom",
        quantity: 2,
        pricePerSession: 65,
      },
    ],
    regularPrice: 130,
    packagePrice: 119,
    savings: 11,
    savingsPercentage: 8.5,
    validityDays: 60,
    status: "seasonal",
    purchaseCount: 41,
    createdAt: "2025-11-15T10:00:00Z",
    policy: {
      ...defaultGroomingPrepaidPackagePolicy,
      allowExtension: false,
      maxExtensionDays: 0,
      policyNotes:
        "Seasonal package — must be redeemed before validity expires (no extensions).",
    },
  },
];
