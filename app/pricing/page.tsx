"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/public-nav";
import {
  Shield,
  Check,
  X,
  Lock,
  FileText,
  HardDrive,
  Upload,
  FolderOpen,
  Star,
  ChevronDown,
} from "lucide-react";

// Plan data
const plans = {
  free: {
    name: "Free",
    description: "Get started with basic evidence organisation",
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    cta: "Get started free",
    ctaVariant: "outline" as const,
    limits: {
      properties: "1 property",
      issues: "3 issues",
      evidence: "10 evidence files",
      packs: "1 Evidence Pack / month",
      fileSize: "10 MB max file size",
      storage: "100 MB storage",
    },
    features: [
      "Secure evidence uploads (photos, PDFs)",
      "Evidence timeline per issue",
      "SHA-256 file integrity hashing",
      "Basic Evidence Pack PDF",
      "Individual file downloads",
    ],
  },
  plus: {
    name: "Plus",
    description: "For renters who need more organisation power",
    monthlyPrice: 15,
    yearlyPrice: 144, // $12/month billed yearly
    popular: true,
    cta: "Upgrade to Plus",
    ctaVariant: "default" as const,
    limits: {
      properties: "3 properties",
      issues: "20 issues",
      evidence: "200 evidence files",
      packs: "10 Evidence Packs / month",
      fileSize: "25 MB max file size",
      storage: "5 GB storage",
    },
    features: [
      "Everything in Free, plus:",
      "Bulk uploads",
      "Evidence tagging & notes",
      "Custom Evidence Pack titles",
      "Cover page + index in packs",
      "Unlimited downloads",
      "Priority email support",
    ],
  },
  pro: {
    name: "Pro",
    description: "For complex cases and multiple properties",
    monthlyPrice: 29,
    yearlyPrice: 276, // ~$23/month billed yearly
    popular: false,
    cta: "Upgrade to Pro",
    ctaVariant: "outline" as const,
    limits: {
      properties: "Unlimited properties",
      issues: "Unlimited issues",
      evidence: "Unlimited evidence files",
      packs: "Unlimited Evidence Packs",
      fileSize: "50 MB max file size",
      storage: "25+ GB storage",
    },
    features: [
      "Everything in Plus, plus:",
      "Advanced Evidence Pack layouts",
      "Chronology-first ordering",
      "Sectioned packs (photos, messages, receipts)",
      "Evidence Pack version history",
      "Priority support",
      "Early access to new features",
    ],
  },
};

// Comparison table data
const comparisonFeatures = [
  { name: "Properties", free: "1", plus: "3", pro: "Unlimited" },
  { name: "Issues", free: "3", plus: "20", pro: "Unlimited" },
  { name: "Evidence files", free: "10", plus: "200", pro: "Unlimited" },
  { name: "Evidence Packs / month", free: "1", plus: "10", pro: "Unlimited" },
  { name: "Max file size", free: "10 MB", plus: "25 MB", pro: "50 MB" },
  { name: "Storage", free: "100 MB", plus: "5 GB", pro: "25+ GB" },
  { name: "Secure uploads", free: true, plus: true, pro: true },
  { name: "SHA-256 file hashing", free: true, plus: true, pro: true },
  { name: "Evidence timeline", free: true, plus: true, pro: true },
  { name: "Basic Evidence Pack PDF", free: true, plus: true, pro: true },
  { name: "Bulk uploads", free: false, plus: true, pro: true },
  { name: "Evidence tagging & notes", free: false, plus: true, pro: true },
  { name: "Custom pack titles", free: false, plus: true, pro: true },
  { name: "Cover page + index", free: false, plus: true, pro: true },
  { name: "Priority email support", free: false, plus: true, pro: true },
  { name: "Advanced pack layouts", free: false, plus: false, pro: true },
  { name: "Sectioned packs", free: false, plus: false, pro: true },
  { name: "Pack version history", free: false, plus: false, pro: true },
  { name: "Early access to features", free: false, plus: false, pro: true },
];

// FAQ data
const faqs = [
  {
    question: "Are prices in AUD?",
    answer:
      "Yes, all prices shown are in Australian Dollars (AUD). We're an Australian company built specifically for Australian renters.",
  },
  {
    question: "Is this legal advice?",
    answer:
      "No. Tenant Buddy is an evidence organisation tool only. We help you organise and present your tenancy records clearly, but we do not provide legal advice, assess your situation, or predict outcomes. For legal advice, please consult a qualified professional or your local Tenants' Union.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer:
      "Yes, you can change your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, your current plan continues until the end of your billing period, then switches to the new plan.",
  },
  {
    question: "What happens if I hit a limit?",
    answer:
      "We'll notify you when you're approaching your limits. If you reach a limit, you won't lose any data — you simply won't be able to add more until you upgrade or the limit resets (for monthly limits like Evidence Packs).",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. Your access continues until the end of your billing period, and you can always export your data. We don't believe in lock-in.",
  },
  {
    question: "Is my evidence private?",
    answer:
      "Absolutely. Your evidence is private by default. Files are encrypted at rest, and only you have access to your data. We never share, sell, or access your evidence without your explicit permission.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment processor. All transactions are encrypted and secure.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not satisfied within the first 14 days, contact us for a full refund, no questions asked.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const yearlyDiscount = 20;

  const handleCheckout = async (plan: "plus" | "pro") => {
    setError(null);
    setLoading(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          interval: billingPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred. Please try again.";
      setError(errorMessage);
      setLoading(null);
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPrice = (plan: (typeof plans)[keyof typeof plans]) => {
    if (plan.monthlyPrice === 0) return "$0";
    if (billingPeriod === "yearly") {
      const monthlyEquivalent = Math.round(plan.yearlyPrice / 12);
      return `$${monthlyEquivalent}`;
    }
    return `$${plan.monthlyPrice}`;
  };

  const getPeriodLabel = () => {
    return billingPeriod === "yearly" ? "/ month, billed yearly" : "/ month";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <PublicNav />

      <main className="flex flex-col flex-1">
        {/* Hero Section */}
        <section className="pt-16 pb-8 lg:pt-24 lg:pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Organise your rental evidence and generate professional Evidence
              Packs. Choose the plan that fits your needs.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Built for Australian renters
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium">All prices in AUD</span>
              </span>
            </div>
          </div>
        </section>

        {/* Billing Toggle */}
        <section className="pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-4">
              <div className="inline-flex items-center rounded-full bg-card border border-border p-1">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    billingPeriod === "monthly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                    billingPeriod === "yearly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      billingPeriod === "yearly"
                        ? "bg-white/20 text-white"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    Save {yearlyDiscount}%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <section className="pb-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm text-center">
                {error}
              </div>
            </div>
          </section>
        )}

        {/* Pricing Cards */}
        <section className="pb-16 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {Object.entries(plans).map(([key, plan]) => (
                <div
                  key={key}
                  className={`relative flex flex-col rounded-2xl border ${
                    plan.popular
                      ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]"
                      : "border-border"
                  } bg-card p-8`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                        <Star className="h-4 w-4" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">
                        {getPrice(plan)}
                      </span>
                      <span className="text-lg font-medium text-foreground">
                        AUD
                      </span>
                    </div>
                    {plan.monthlyPrice > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getPeriodLabel()}
                      </p>
                    )}
                    {plan.monthlyPrice === 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Free forever
                      </p>
                    )}
                  </div>

                  {key === "free" ? (
                    <Button
                      asChild
                      variant={plan.ctaVariant}
                      className={`w-full h-12 font-bold ${
                        plan.popular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                          : ""
                      }`}
                    >
                      <Link href="/auth/signup">{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(key as "plus" | "pro")}
                      disabled={loading !== null}
                      variant={plan.ctaVariant}
                      className={`w-full h-12 font-bold ${
                        plan.popular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                          : ""
                      }`}
                    >
                      {loading === key ? "Loading..." : plan.cta}
                    </Button>
                  )}

                  <div className="mt-8 space-y-4">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                      Limits
                    </h4>
                    <ul className="space-y-3">
                      {Object.values(plan.limits).map((limit, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {i === 0 && <FolderOpen className="h-3 w-3" />}
                            {i === 1 && <FileText className="h-3 w-3" />}
                            {i === 2 && <Upload className="h-3 w-3" />}
                            {i === 3 && <FileText className="h-3 w-3" />}
                            {i === 4 && <Upload className="h-3 w-3" />}
                            {i === 5 && <HardDrive className="h-3 w-3" />}
                          </div>
                          {limit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-8 border-t border-border space-y-4">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                      Features
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-3 text-sm ${
                            feature.startsWith("Everything")
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 lg:py-24 bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">
                Compare all features
              </h2>
              <p className="mt-4 text-muted-foreground">
                See exactly what&apos;s included in each plan
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-bold text-foreground">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-foreground">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-primary">
                      Plus
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-foreground">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparisonFeatures.map((feature, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 text-sm text-foreground">
                        {feature.name}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof feature.free === "boolean" ? (
                          feature.free ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {feature.free}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center bg-primary/5">
                        {typeof feature.plus === "boolean" ? (
                          feature.plus ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {feature.plus}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {feature.pro}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Trust & Safety Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">
                Your evidence, your control
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                We take your privacy and security seriously. Your tenancy
                records belong to you.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Private by default
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your evidence is only accessible by you. We never share or
                  sell your data.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Files encrypted at rest
                </h3>
                <p className="text-sm text-muted-foreground">
                  All your files are encrypted using industry-standard
                  encryption.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Your evidence belongs to you
                </h3>
                <p className="text-sm text-muted-foreground">
                  Export all your data anytime. You maintain full ownership of
                  your records.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Not legal advice
                </h3>
                <p className="text-sm text-muted-foreground">
                  We help you organise evidence. We don&apos;t provide legal
                  advice or predict outcomes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-card">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-muted-foreground">
                Got questions? We&apos;ve got answers.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-border bg-background"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-foreground">
                    <span>{faq.question}</span>
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-6 text-muted-foreground">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-primary/5 dark:bg-white/5">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">
              Ready to organise your evidence?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start for free, no credit card required. Upgrade anytime as your
              needs grow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 font-bold shadow-lg shadow-primary/20"
              >
                <Link href="/auth/signup">Get started for free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <Link href="/dashboard">View dashboard</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              All prices in AUD. 14-day money-back guarantee on paid plans.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-bold text-foreground">Tenant Buddy</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Tenant Buddy. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
