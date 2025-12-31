import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/billing/get-plan";
import { getPlanFromPriceId } from "@/lib/billing/plans";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is owner
    if (isOwnerEmail(user.email)) {
      return NextResponse.json({
        planId: "pro",
        planName: "Pro (Owner)",
        isOwner: true,
        hasActiveSubscription: false,
        status: "owner",
      });
    }

    // Get subscription from database
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("price_id, status, current_period_end")
      .eq("user_id", user.id)
      .single();

    // Check if subscription is active
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const planId = isActive ? getPlanFromPriceId(subscription?.price_id) : "free";

    return NextResponse.json({
      planId,
      planName: planId.charAt(0).toUpperCase() + planId.slice(1),
      isOwner: false,
      hasActiveSubscription: isActive,
      status: subscription?.status || "none",
      currentPeriodEnd: subscription?.current_period_end,
    });
  } catch (error) {
    console.error("[Billing Plan] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
