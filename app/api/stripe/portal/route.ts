import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, getBaseUrl } from "@/lib/stripe/config";
import { isOwnerEmail } from "@/lib/billing/get-plan";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Owner sees a different message
    if (isOwnerEmail(user.email)) {
      return NextResponse.json(
        { error: "Owner account does not have a subscription to manage." },
        { status: 400 }
      );
    }

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. Subscribe to a plan first." },
        { status: 400 }
      );
    }

    // Create Customer Portal session
    const baseUrl = getBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to open subscription portal. Please try again." },
      { status: 500 }
    );
  }
}
