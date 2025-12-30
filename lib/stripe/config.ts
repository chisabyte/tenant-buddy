import Stripe from "stripe";

/**
 * Get Stripe client instance (lazy initialization)
 * Only use on server-side
 * This prevents initialization errors during build when env vars aren't available
 */
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Stripe client instance (lazy getter - only initializes when accessed)
 * This prevents build-time errors when env vars aren't available
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

/**
 * Stripe Price IDs for each plan/interval combination
 * Set these in your environment variables
 */
export const STRIPE_PRICES = {
  plus: {
    monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || "",
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  },
} as const;

/**
 * Get the price ID for a plan and interval
 */
export function getPriceId(
  plan: "plus" | "pro",
  interval: "monthly" | "yearly"
): string {
  return STRIPE_PRICES[plan][interval];
}

/**
 * Validate that required Stripe env vars are set
 */
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PLUS_MONTHLY",
    "STRIPE_PRICE_PLUS_YEARLY",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_YEARLY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Base URL for redirects
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
