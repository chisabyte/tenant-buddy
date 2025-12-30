import Stripe from "stripe";

/**
 * Stripe client instance
 * Only use on server-side
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
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
