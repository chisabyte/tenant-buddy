"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { commsLogSchema } from "@/lib/validations";
import { ArrowLeft, Mail, Phone, MessageSquare } from "lucide-react";
import { AIDraftHelper } from "@/components/ai-draft-helper";

interface Property {
  id: string;
  address_text: string;
}

function NewCommsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueId = searchParams?.get("issueId") ?? null;

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState(issueId || "");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [channel, setChannel] = useState<
    "email" | "phone" | "sms" | "in_person" | "letter" | "app" | "other"
  >("email");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: props } = await supabase
          .from("properties")
          .select("id, address_text")
          .eq("user_id", user.id);
        if (props) {
          setProperties(props);
          if (props.length === 1) {
            setPropertyId(props[0].id);
          }
        }
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      commsLogSchema.parse({
        propertyId,
        issueId: selectedIssueId || null,
        occurredAt,
        channel,
        summary,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in");
      }

      const { error: insertError } = await supabase.from("comms_logs").insert({
        user_id: user.id,
        property_id: propertyId,
        issue_id: selectedIssueId || null,
        occurred_at: occurredAt,
        channel,
        summary,
      });

      if (insertError) throw insertError;

      if (selectedIssueId) {
        router.push(`/issues/${selectedIssueId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    phone: <Phone className="h-4 w-4" />,
    sms: <MessageSquare className="h-4 w-4" />,
  };

  return (
    <div className="flex flex-col max-w-[800px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white hover:text-primary transition-colors text-sm font-medium w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Log Communication
          </h1>
        </div>
        <p className="text-text-subtle text-sm">
          Record interactions with landlords, agents, or property managers
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="property" className="text-white">
              Property
            </Label>
            <select
              id="property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            >
              <option value="">Select a property</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.address_text}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel" className="text-white">
              Channel
            </Label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="flex h-11 w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
              <option value="in_person">In Person</option>
              <option value="letter">Letter</option>
              <option value="app">App/Portal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurredAt" className="text-white">
              Date/Time
            </Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              disabled={loading}
              className="h-11 bg-background-dark border-card-lighter text-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-white">
                Summary
              </Label>
              <AIDraftHelper
                propertyAddress={properties.find(p => p.id === propertyId)?.address_text}
                onUseDraft={(draft) => setSummary(draft)}
              />
            </div>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={loading}
              rows={5}
              className="flex w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe what was discussed or communicated..."
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-background-dark font-bold h-11 px-6"
              disabled={loading}
            >
              {loading ? "Saving..." : "Log Communication"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80 h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewCommsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-text-subtle">Loading...</div>
        </div>
      }
    >
      <NewCommsForm />
    </Suspense>
  );
}
