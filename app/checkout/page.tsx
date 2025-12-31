"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const plan = searchParams?.get("plan") as "plus" | "pro" | null;
  const interval = searchParams?.get("interval") as "monthly" | "yearly" | null;

  useEffect(() => {
    async function initiateCheckout() {
      // Validate query params
      if (!plan || !["plus", "pro"].includes(plan)) {
        setError("Invalid plan selected. Please return to pricing and try again.");
        setLoading(false);
        return;
      }

      if (!interval || !["monthly", "yearly"].includes(interval)) {
        setError("Invalid billing interval. Please return to pricing and try again.");
        setLoading(false);
        return;
      }

      try {
        // Call the checkout API - this will validate auth server-side
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan, interval }),
        });

        const data = await response.json();

        if (!response.ok) {
          // If unauthorized, redirect to sign-in with return URL
          if (response.status === 401) {
            const returnUrl = `/checkout?plan=${plan}&interval=${interval}`;
            router.push(`/auth/login?returnTo=${encodeURIComponent(returnUrl)}`);
            return;
          }
          throw new Error(data.error || "Failed to create checkout session");
        }

        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        setLoading(false);
      }
    }

    initiateCheckout();
  }, [plan, interval, router]);

  if (loading && !error) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <header className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="bg-primary/20 rounded-lg p-1.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Tenant Buddy</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">
              Setting up your checkout...
            </h1>
            <p className="text-text-subtle">
              You&apos;ll be redirected to our secure payment page shortly.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <header className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="bg-primary/20 rounded-lg p-1.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Tenant Buddy</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-card-dark border border-card-lighter p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 mx-auto mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Checkout Error
              </h1>
              <p className="text-text-subtle mb-6">
                {error}
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild className="bg-primary hover:bg-primary/90 text-background-dark font-bold">
                  <Link href="/pricing">Return to Pricing</Link>
                </Button>
                <Button asChild variant="outline" className="border-card-lighter text-white hover:bg-card-lighter">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-dark">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
