import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, getPriceId, getBaseUrl } from "@/lib/stripe/config";
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

    // Owner doesn't need to pay
    if (isOwnerEmail(user.email)) {
      return NextResponse.json(
        { error: "Owner account already has full access." },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { plan, interval } = body as {
      plan?: "plus" | "pro";
      interval?: "monthly" | "yearly";
    };

    // Validate plan
    if (!plan || !["plus", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'plus' or 'pro'." },
        { status: 400 }
      );
    }

    // Validate interval
    if (!interval || !["monthly", "yearly"].includes(interval)) {
      return NextResponse.json(
        { error: "Invalid interval. Must be 'monthly' or 'yearly'." },
        { status: 400 }
      );
    }

    // Get the price ID
    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      console.error(`[Stripe Checkout] Missing price ID for ${plan}/${interval}`);
      return NextResponse.json(
        { error: "Pricing not configured. Please try again later." },
        { status: 500 }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store customer ID (upsert to handle race conditions)
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          status: "inactive",
        },
        { onConflict: "user_id" }
      );
    }

    // Create Checkout Session
    const baseUrl = getBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?billing=success`,
      cancel_url: `${baseUrl}/pricing?billing=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      metadata: {
        supabase_user_id: user.id,
      },
      // Australian locale and currency
      locale: "en-AU",
      currency: "aud",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
