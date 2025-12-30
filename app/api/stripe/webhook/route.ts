import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Force Node.js runtime for webhook (needed for raw body)
export const runtime = "nodejs";

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Initialize Supabase with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Upsert subscription data to database
 */
async function upsertSubscription(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id || null;

  // Type assertion to access subscription properties that may be expanded
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end as boolean | undefined;

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      price_id: priceId,
      status: subscription.status,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[Webhook] Error upserting subscription:", error);
    throw error;
  }

  console.log(`[Webhook] Upserted subscription for user ${userId}:`, {
    status: subscription.status,
    priceId,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

/**
 * Get user ID from Stripe customer metadata or subscription
 */
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  // First check if we have a subscription record with this customer ID
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (existingSub?.user_id) {
    return existingSub.user_id;
  }

  // Try to get from Stripe customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  return customer.metadata?.supabase_user_id || null;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text();

    // Get Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Webhook] Missing STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const customerId = session.customer as string;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          // Get user ID from metadata or existing record
          let userId: string | null = session.metadata?.supabase_user_id || null;
          if (!userId) {
            userId = await getUserIdFromCustomer(customerId);
          }

          if (userId) {
            // Fetch full subscription details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await upsertSubscription(userId, customerId, subscription);
          } else {
            console.error("[Webhook] checkout.session.completed: No user ID found");
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Get user ID from metadata or existing record
        let userId: string | null = subscription.metadata?.supabase_user_id || null;
        if (!userId) {
          userId = await getUserIdFromCustomer(customerId);
        }

        if (userId) {
          await upsertSubscription(userId, customerId, subscription);
        } else {
          console.error(`[Webhook] ${event.type}: No user ID found for customer ${customerId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Get user ID
        let userId: string | null = subscription.metadata?.supabase_user_id || null;
        if (!userId) {
          userId = await getUserIdFromCustomer(customerId);
        }

        if (userId) {
          // Update subscription status to canceled
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          if (error) {
            console.error("[Webhook] Error updating canceled subscription:", error);
          } else {
            console.log(`[Webhook] Marked subscription as canceled for user ${userId}`);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Subscription renewals are handled by customer.subscription.updated
        console.log(`[Webhook] Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Payment failed for invoice ${invoice.id}`);
        // Stripe will automatically update subscription status to past_due
        // which will be caught by customer.subscription.updated
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
