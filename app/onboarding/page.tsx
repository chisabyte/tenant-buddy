"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { onboardingSchema } from "@/lib/validations";
import { AustralianState, STATE_RULES } from "@/lib/state-rules";

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<AustralianState>("VIC");
  const [addressText, setAddressText] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate input
      onboardingSchema.parse({ state, addressText, leaseStartDate });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to complete onboarding");
      }

      // Update profile with state
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ state })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Create property
      const { error: propertyError } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          address_text: addressText,
          state,
          lease_start_date: leaseStartDate,
        });

      if (propertyError) throw propertyError;

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mobile-padding py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            We need a few details to set up your evidence organiser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="state">State/Territory</Label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value as AustralianState)}
                className="flex h-10 w-full rounded-md border border-card-lighter bg-background-dark text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 thumb-friendly"
                required
                disabled={loading}
              >
                {Object.keys(STATE_RULES).map((s) => (
                  <option key={s} value={s}>
                    {s} - {STATE_RULES[s as AustralianState].tribunalName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                This is used for labels and headings in your exports. This information is general and may not apply to your situation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Rental Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="Suburb and postcode (e.g., Melbourne VIC 3000)"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseStartDate">Lease Start Date</Label>
              <Input
                id="leaseStartDate"
                type="date"
                value={leaseStartDate}
                onChange={(e) => setLeaseStartDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full thumb-friendly" disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> This application helps you organise your tenancy records. It does not provide legal advice,
              assess your situation, or predict outcomes. Always consult with a qualified professional or your local Tenants&apos; Union.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

