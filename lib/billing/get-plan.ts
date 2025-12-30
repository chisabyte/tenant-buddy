import { createClient } from "@/lib/supabase/server";
import {
  PlanEntitlements,
  PLAN_DEFINITIONS,
  OWNER_ENTITLEMENTS,
  getPlanFromPriceId,
  PlanId,
} from "./plans";

/**
 * Owner email from environment variable
 * This user always gets Pro access regardless of Stripe state
 */
const OWNER_EMAIL = (process.env.APP_OWNER_EMAIL || "").trim().toLowerCase();

/**
 * Check if an email matches the owner email
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email || !OWNER_EMAIL) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

/**
 * Subscription status values that indicate an active subscription
 */
const ACTIVE_STATUSES = ["active", "trialing"];

/**
 * Database subscription record type
 */
export interface SubscriptionRecord {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

/**
 * Get the current user's plan and entitlements
 *
 * This is the SINGLE SOURCE OF TRUTH for plan resolution.
 * All gating checks must use this function.
 *
 * Resolution order:
 * 1. If user email matches APP_OWNER_EMAIL → Pro with owner flag
 * 2. If user has active subscription → plan from price_id
 * 3. Otherwise → Free plan
 */
export async function getPlan(
  user: { id: string; email?: string | null } | null
): Promise<PlanEntitlements> {
  // No user = Free plan
  if (!user) {
    return { ...PLAN_DEFINITIONS.free, isOwner: false };
  }

  // OWNER OVERRIDE: Always Pro for owner email
  // This works even if Stripe/webhooks are broken
  if (isOwnerEmail(user.email)) {
    return OWNER_ENTITLEMENTS;
  }

  // Look up subscription in database
  try {
    const supabase = await createClient();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !subscription) {
      // No subscription record = Free plan
      return { ...PLAN_DEFINITIONS.free, isOwner: false };
    }

    // Check if subscription is active
    const isActive = ACTIVE_STATUSES.includes(subscription.status || "");

    if (!isActive) {
      // Inactive subscription = Free plan
      return { ...PLAN_DEFINITIONS.free, isOwner: false };
    }

    // Get plan from price ID
    const planId = getPlanFromPriceId(subscription.price_id);
    const planDef = PLAN_DEFINITIONS[planId];

    return { ...planDef, isOwner: false };
  } catch (error) {
    // Database error - fail safe to Free plan
    console.error("[getPlan] Error fetching subscription:", error);
    return { ...PLAN_DEFINITIONS.free, isOwner: false };
  }
}

/**
 * Get plan for a user by ID (fetches user data first)
 * Use this when you only have the user ID
 */
export async function getPlanByUserId(userId: string): Promise<PlanEntitlements> {
  try {
    const supabase = await createClient();

    // Get user email
    const { data: { user }, error } = await supabase.auth.admin?.getUserById(userId) || { data: { user: null }, error: null };

    // If admin API not available, try to get from auth
    if (!user) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.id === userId) {
        return getPlan(authData.user);
      }
    }

    return getPlan(user ? { id: user.id, email: user.email } : null);
  } catch (error) {
    console.error("[getPlanByUserId] Error:", error);
    return { ...PLAN_DEFINITIONS.free, isOwner: false };
  }
}

/**
 * Get plan for the currently authenticated user
 * Most common usage - call this in server components/actions
 */
export async function getCurrentUserPlan(): Promise<PlanEntitlements> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { ...PLAN_DEFINITIONS.free, isOwner: false };
    }

    return getPlan({ id: user.id, email: user.email });
  } catch (error) {
    console.error("[getCurrentUserPlan] Error:", error);
    return { ...PLAN_DEFINITIONS.free, isOwner: false };
  }
}

/**
 * Check if user can perform an action based on current usage
 */
export async function checkLimit(
  userId: string,
  limitType: keyof PlanEntitlements["limits"],
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; usage: number; planId: PlanId }> {
  const plan = await getPlanByUserId(userId);
  const limit = plan.limits[limitType];

  return {
    allowed: currentUsage < limit,
    limit,
    usage: currentUsage,
    planId: plan.planId,
  };
}

/**
 * Check if user has a specific feature enabled
 */
export async function hasFeature(
  userId: string,
  feature: keyof PlanEntitlements["features"]
): Promise<boolean> {
  const plan = await getPlanByUserId(userId);
  return plan.features[feature];
}
