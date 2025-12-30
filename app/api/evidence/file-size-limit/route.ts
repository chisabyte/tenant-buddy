import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPlan } from "@/lib/billing";
import { requireAuth, handleApiError } from "@/lib/api-error-handler";

// Mark as dynamic since it uses cookies for auth
export const dynamic = "force-dynamic";

/**
 * Get the maximum file size allowed for the current user's plan
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    requireAuth(user);

    const plan = await getCurrentUserPlan();

    // Convert MB to bytes
    const maxFileSizeBytes = plan.limits.maxFileSizeMB * 1024 * 1024;

    return NextResponse.json({
      maxFileSizeMB: plan.limits.maxFileSizeMB,
      maxFileSizeBytes,
      planId: plan.planId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

