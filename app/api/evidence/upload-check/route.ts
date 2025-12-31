import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPlan, checkLimit } from "@/lib/billing";
import { requireAuth, handleApiError, ApiErrors } from "@/lib/api-error-handler";

/**
 * Check if user can upload evidence files based on plan limits
 * Called before client-side upload to verify quota
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    requireAuth(user);

    // Get current plan
    const plan = await getCurrentUserPlan();

    // Count existing evidence files
    const { count: currentEvidenceCount } = await supabase
      .from("evidence_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Check limit
    const limitCheck = await checkLimit(
      user.id,
      "evidenceFiles",
      currentEvidenceCount || 0
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          limit: limitCheck.limit,
          usage: limitCheck.usage,
          planId: limitCheck.planId,
          error: `You have reached your plan limit of ${limitCheck.limit === Number.MAX_SAFE_INTEGER ? "unlimited" : limitCheck.limit} evidence files. Please upgrade your plan to upload more.`,
        },
        { status: 403 }
      );
    }

    // PRODUCTION SAFETY: Additional daily cap for free tier (conservative fallback)
    // Only enforced when ENFORCE_LIMITS=true (default: false for backward compatibility)
    const enforceLimits = process.env.ENFORCE_LIMITS === 'true';
    if (enforceLimits && limitCheck.planId === 'free') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Count uploads today
      const { count: uploadsToday } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("uploaded_at", todayStart.toISOString());

      // Conservative daily cap for free tier: 20 uploads per day
      const FREE_TIER_DAILY_CAP = 20;
      if ((uploadsToday || 0) >= FREE_TIER_DAILY_CAP) {
        return NextResponse.json(
          {
            allowed: false,
            limit: FREE_TIER_DAILY_CAP,
            usage: uploadsToday || 0,
            planId: 'free',
            error: `You have reached the daily upload limit of ${FREE_TIER_DAILY_CAP} files for the free plan. Please try again tomorrow or upgrade your plan.`,
            code: "DAILY_LIMIT_EXCEEDED",
            retryAfter: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
          { 
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((todayStart.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 1000)),
            },
          }
        );
      }
    }

    return NextResponse.json({
      allowed: true,
      limit: limitCheck.limit,
      usage: limitCheck.usage,
      planId: limitCheck.planId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

