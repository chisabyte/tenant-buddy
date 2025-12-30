import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("state")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.state) {
    redirect("/onboarding");
  }

  // Get user's properties
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address_text, state")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const property = properties?.[0];

  return (
    <AppShell
      user={{ email: user.email, id: user.id }}
      profile={profile}
      property={property}
    >
      {children}
    </AppShell>
  );
}

