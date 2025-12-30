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

