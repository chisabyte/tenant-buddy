"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { AustralianState, STATE_RULES, STATE_INFO_DISCLAIMER } from "@/lib/state-rules";
import { Settings, Download, Trash2, Shield, Info, FileText, CreditCard, Check, Star, Crown } from "lucide-react";
import Link from "next/link";

// Plan data for display
const plans = {
  free: { name: "Free", price: 0, icon: Shield },
  plus: { name: "Plus", price: 15, icon: Star },
  pro: { name: "Pro", price: 29, icon: Crown },
};

type PlanId = "free" | "plus" | "pro";

interface SubscriptionInfo {
  planId: PlanId;
  hasActiveSubscription: boolean;
  isOwner: boolean;
  status?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState<AustralianState>("VIC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    planId: "free",
    hasActiveSubscription: false,
    isOwner: false,
  });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("state")
          .eq("id", user.id)
          .single();
        if (profile) {
          setState(profile.state as AustralianState);
        }

        // Fetch subscription info from API
        try {
          const response = await fetch("/api/billing/plan");
          if (response.ok) {
            const data = await response.json();
            setSubscription({
              planId: data.planId || "free",
              hasActiveSubscription: data.hasActiveSubscription || false,
              isOwner: data.isOwner || false,
              status: data.status,
            });
          }
        } catch (err) {
          console.error("Failed to fetch subscription:", err);
        }
      }
    }
    fetchData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ state })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in");
      }

      // Fetch all user data
      const [properties, issues, evidence, comms, packs] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id),
        supabase.from("issues").select("*").eq("user_id", user.id),
        supabase.from("evidence_items").select("*").eq("user_id", user.id),
        supabase.from("comms_logs").select("*").eq("user_id", user.id),
        supabase.from("evidence_pack_runs").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        properties: properties.data || [],
        issues: issues.data || [],
        evidence: evidence.data || [],
        communications: comms.data || [],
        evidence_packs: packs.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenant-buddy-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to export data");
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open subscription portal");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (err: any) {
      setError(err.message || "Failed to open subscription portal");
      setPortalLoading(false);
    }
  };

  const handleCheckout = async (plan: "plus" | "pro") => {
    setCheckoutLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          interval: "monthly",
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
      setError(err.message || "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone and will delete all your data."
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.auth.signOut();
      if (deleteError) throw deleteError;

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to delete account");
    }
  };

  return (
    <div className="flex flex-col max-w-[900px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Settings className="h-7 w-7" />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl">Settings</h1>
          <p className="text-sm text-text-subtle">
            Manage your account preferences
          </p>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-white">Profile</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="state" className="text-white">State/Territory</Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value as AustralianState)}
              className="flex h-12 w-full rounded-lg border border-card-lighter bg-background-dark px-4 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            >
              {Object.keys(STATE_RULES).map((s) => (
                <option key={s} value={s}>
                  {s} - {STATE_RULES[s as AustralianState].tribunalName}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-subtle flex items-start gap-1 mt-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              {STATE_INFO_DISCLAIMER}
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
              Profile updated successfully
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-background-dark font-bold"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Subscription Management */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-white">Subscription</h2>
        </div>

        {/* Current Plan Display */}
        <div className="mb-6 p-4 rounded-lg bg-background-dark border border-card-lighter">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {subscription.planId === "pro" ? (
                <Crown className="h-5 w-5 text-yellow-400" />
              ) : subscription.planId === "plus" ? (
                <Star className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-text-subtle" />
              )}
              <div>
                <p className="font-bold text-white">
                  {plans[subscription.planId].name} Plan
                  {subscription.isOwner && " (Owner)"}
                </p>
                <p className="text-sm text-text-subtle">
                  {subscription.isOwner
                    ? "Full access included"
                    : subscription.planId === "free"
                    ? "Upgrade for more features"
                    : `$${plans[subscription.planId].price} AUD/month`}
                </p>
              </div>
            </div>
            {subscription.planId !== "free" && !subscription.isOwner && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                Active
              </span>
            )}
          </div>
        </div>

        {/* Show upgrade options if on Free plan and not owner */}
        {subscription.planId === "free" && !subscription.isOwner && (
          <div className="space-y-4">
            <p className="text-sm text-text-subtle">
              Upgrade to unlock more properties, issues, and features.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Plus Plan */}
              <div className="p-4 rounded-lg border border-card-lighter hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="font-bold text-white">Plus</span>
                  <span className="text-sm text-text-subtle">$15/mo</span>
                </div>
                <ul className="text-xs text-text-subtle space-y-1 mb-3">
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary" />
                    3 properties, 20 issues
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary" />
                    200 evidence files
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary" />
                    Bulk uploads & tagging
                  </li>
                </ul>
                <Button
                  onClick={() => handleCheckout("plus")}
                  disabled={checkoutLoading !== null}
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold"
                >
                  {checkoutLoading === "plus" ? "Loading..." : "Upgrade to Plus"}
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  <span className="font-bold text-white">Pro</span>
                  <span className="text-sm text-text-subtle">$29/mo</span>
                </div>
                <ul className="text-xs text-text-subtle space-y-1 mb-3">
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-yellow-400" />
                    Unlimited everything
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-yellow-400" />
                    Advanced pack layouts
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-yellow-400" />
                    Priority support
                  </li>
                </ul>
                <Button
                  onClick={() => handleCheckout("pro")}
                  disabled={checkoutLoading !== null}
                  size="sm"
                  variant="outline"
                  className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  {checkoutLoading === "pro" ? "Loading..." : "Upgrade to Pro"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-text-subtle text-center">
              <Link href="/pricing" className="text-primary hover:underline">
                View full pricing comparison
              </Link>
            </p>
          </div>
        )}

        {/* Show manage button if has active subscription */}
        {subscription.hasActiveSubscription && !subscription.isOwner && (
          <div className="space-y-3">
            <p className="text-sm text-text-subtle">
              Manage your subscription, update payment methods, or view billing history.
            </p>
            <Button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              variant="outline"
              className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {portalLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          </div>
        )}

        {/* Owner message */}
        {subscription.isOwner && (
          <p className="text-sm text-text-subtle">
            As the app owner, you have full Pro access at no charge.
          </p>
        )}
      </div>

      {/* Data Export */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-white">Data Export</h2>
        </div>
        <p className="text-sm text-text-subtle mb-4">
          Download all your data as a JSON file for your records.
        </p>
        <Button
          onClick={handleExportData}
          variant="outline"
          className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80"
        >
          <Download className="h-4 w-4 mr-2" />
          Export All Data
        </Button>
      </div>

      {/* Delete Account */}
      <div className="rounded-xl bg-card-dark border border-red-500/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-bold text-white">Delete Account</h2>
        </div>
        <p className="text-sm text-text-subtle mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          onClick={handleDeleteAccount}
          variant="destructive"
          className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </div>

      {/* Legal & About */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-white">Legal & About</h2>
        </div>
        <p className="text-sm text-text-subtle mb-4">
          <span className="font-medium text-white">Not legal advice.</span> This tool helps you organise your tenancy records and generate evidence packs from your own information. You control your data.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/terms"
            className="text-sm text-primary hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-primary hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
