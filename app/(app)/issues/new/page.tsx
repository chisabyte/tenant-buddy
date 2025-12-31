"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { issueSchema } from "@/lib/validations";
import { calculateSeverity } from "@/lib/severity";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface Property {
  id: string;
  address_text: string;
}

export default function NewIssuePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProperties() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("properties")
          .select("id, address_text")
          .eq("user_id", user.id);
        if (data) {
          setProperties(data);
          if (data.length === 1) {
            setPropertyId(data[0].id);
          }
        }
      }
    }
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!propertyId || propertyId === "") {
        setError("Please select a property");
        setLoading(false);
        return;
      }

      const validationResult = issueSchema.safeParse({
        propertyId,
        title,
        description,
        status: "open",
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        setError(firstError.message || "Please check your input");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in");
      }

      // Calculate severity based on title and description
      // This is persisted at creation time and NEVER automatically downgraded
      const severity = calculateSeverity(title, description);

      const { error: insertError } = await supabase.from("issues").insert({
        user_id: user.id,
        property_id: propertyId,
        title,
        description: description || null,
        status: "open",
        severity,
      });

      if (insertError) {
        throw new Error(insertError.message || "Failed to create issue");
      }

      router.push("/issues");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[800px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Back Button */}
      <Link
        href="/issues"
        className="inline-flex items-center gap-2 text-text-subtle hover:text-primary transition-colors text-sm font-medium w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Issues
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Log New Issue
          </h1>
        </div>
        <p className="text-text-subtle text-sm">
          Create a new tenancy issue to track and organize evidence
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl bg-card-dark border border-card-lighter p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="property" className="text-white">
              Property
            </Label>
            {properties.length === 0 ? (
              <div className="p-4 border border-dashed border-card-lighter rounded-lg bg-card-lighter/20">
                <p className="text-sm text-text-subtle mb-3">
                  No properties found. Please complete onboarding first.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/onboarding")}
                  className="bg-card-lighter border-card-lighter text-white hover:bg-card-lighter/80"
                >
                  Go to Onboarding
                </Button>
              </div>
            ) : (
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
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">
              Issue Title
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Mould in bathroom, No hot water"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              className="h-11 bg-background-dark border-card-lighter text-white placeholder:text-text-subtle"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description (Optional)
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              className="flex w-full rounded-lg border border-card-lighter bg-background-dark px-3 py-2 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Provide additional details about the issue..."
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
              {loading ? "Creating..." : "Create Issue"}
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
