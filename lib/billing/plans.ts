/**
 * Plan definitions and entitlements for TenantBuddy
 * All limits are defined here as the single source of truth
 */

export type PlanId = "free" | "plus" | "pro";

export interface PlanEntitlements {
  planId: PlanId;
  planName: string;
  isOwner: boolean;
  limits: {
    properties: number;
    issues: number;
    evidenceFiles: number;
    evidencePacksPerMonth: number;
    maxFileSizeMB: number;
    storageMB: number;
  };
  features: {
    bulkUploads: boolean;
    evidenceTagging: boolean;
    customPackTitles: boolean;
    coverPageAndIndex: boolean;
    unlimitedDownloads: boolean;
    prioritySupport: boolean;
    advancedPackLayouts: boolean;
    sectionedPacks: boolean;
    packVersionHistory: boolean;
    earlyAccess: boolean;
  };
}

// Unlimited constant for clarity
const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const PLAN_DEFINITIONS: Record<PlanId, Omit<PlanEntitlements, "isOwner">> = {
  free: {
    planId: "free",
    planName: "Free",
    limits: {
      properties: 1,
      issues: 3,
      evidenceFiles: 10,
      evidencePacksPerMonth: 1,
      maxFileSizeMB: 10,
      storageMB: 100,
    },
    features: {
      bulkUploads: false,
      evidenceTagging: false,
      customPackTitles: false,
      coverPageAndIndex: false,
      unlimitedDownloads: false,
      prioritySupport: false,
      advancedPackLayouts: false,
      sectionedPacks: false,
      packVersionHistory: false,
      earlyAccess: false,
    },
  },
  plus: {
    planId: "plus",
    planName: "Plus",
    limits: {
      properties: 3,
      issues: 20,
      evidenceFiles: 200,
      evidencePacksPerMonth: 10,
      maxFileSizeMB: 25,
      storageMB: 5 * 1024, // 5 GB
    },
    features: {
      bulkUploads: true,
      evidenceTagging: true,
      customPackTitles: true,
      coverPageAndIndex: true,
      unlimitedDownloads: true,
      prioritySupport: true,
      advancedPackLayouts: false,
      sectionedPacks: false,
      packVersionHistory: false,
      earlyAccess: false,
    },
  },
  pro: {
    planId: "pro",
    planName: "Pro",
    limits: {
      properties: UNLIMITED,
      issues: UNLIMITED,
      evidenceFiles: UNLIMITED,
      evidencePacksPerMonth: UNLIMITED,
      maxFileSizeMB: 50,
      storageMB: 25 * 1024, // 25 GB
    },
    features: {
      bulkUploads: true,
      evidenceTagging: true,
      customPackTitles: true,
      coverPageAndIndex: true,
      unlimitedDownloads: true,
      prioritySupport: true,
      advancedPackLayouts: true,
      sectionedPacks: true,
      packVersionHistory: true,
      earlyAccess: true,
    },
  },
};

// Owner gets Pro with truly unlimited everything
export const OWNER_ENTITLEMENTS: PlanEntitlements = {
  planId: "pro",
  planName: "Pro (Owner)",
  isOwner: true,
  limits: {
    properties: UNLIMITED,
    issues: UNLIMITED,
    evidenceFiles: UNLIMITED,
    evidencePacksPerMonth: UNLIMITED,
    maxFileSizeMB: 100, // Still cap file size for safety
    storageMB: UNLIMITED,
  },
  features: {
    bulkUploads: true,
    evidenceTagging: true,
    customPackTitles: true,
    coverPageAndIndex: true,
    unlimitedDownloads: true,
    prioritySupport: true,
    advancedPackLayouts: true,
    sectionedPacks: true,
    packVersionHistory: true,
    earlyAccess: true,
  },
};

/**
 * Stripe Price IDs mapped to plans
 * These should match your Stripe dashboard
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanId> = {
  // Monthly prices
  [process.env.STRIPE_PRICE_PLUS_MONTHLY || "price_plus_monthly"]: "plus",
  [process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly"]: "pro",
  // Yearly prices
  [process.env.STRIPE_PRICE_PLUS_YEARLY || "price_plus_yearly"]: "plus",
  [process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly"]: "pro",
};

/**
 * Get plan ID from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string | null): PlanId {
  if (!priceId) return "free";
  return STRIPE_PRICE_TO_PLAN[priceId] || "free";
}

/**
 * Check if a limit value represents "unlimited"
 */
export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED;
}

/**
 * Format a limit for display
 */
export function formatLimit(value: number): string {
  if (isUnlimited(value)) return "Unlimited";
  return value.toLocaleString();
}
