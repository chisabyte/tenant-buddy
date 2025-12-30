import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";
import { getCurrentUserPlan } from "@/lib/billing";
import {
  AlertTriangle,
  CalendarClock,
  FolderCheck,
  Plus,
  Upload,
  Mail,
  FileText,
  Lightbulb,
  Image as ImageIcon,
  FileCheck,
  Crown,
} from "lucide-react";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's properties
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address_text, state")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const property = properties?.[0];

  // Get stats
  const { count: openIssuesCount } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["open", "in_progress"]);

  const { count: evidenceCount } = await supabase
    .from("evidence_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get active issues for the table
  const { data: activeIssues } = await supabase
    .from("issues")
    .select(`
      id,
      title,
      status,
      created_at,
      properties!inner(address_text)
    `)
    .eq("user_id", user.id)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Get user's first name from email
  const userName = user.email?.split("@")[0] || "there";

  // Get current plan
  const plan = await getCurrentUserPlan();

  return (
    <div className="flex flex-col max-w-[1200px] w-full mx-auto p-4 md:p-8 gap-8">
      {/* Hero Section */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-card-dark via-card-dark/90 to-transparent" />
        <div className="relative z-10 flex flex-col gap-4 p-6 md:p-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 w-fit backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-primary tracking-wide uppercase">
                System Secure
              </span>
            </div>
            {plan.isOwner && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 w-fit backdrop-blur-sm">
                <Crown className="h-3 w-3 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400 tracking-wide uppercase">
                  Owner Access
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card-lighter/50 border border-border w-fit backdrop-blur-sm">
              <span className="text-xs font-medium text-white">
                {plan.planName}
              </span>
            </div>
          </div>
          <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-gray-300 text-base md:text-lg font-light leading-relaxed max-w-lg">
            Your tenancy at{" "}
            <span className="text-white font-medium">
              {property?.address_text || "your property"}
            </span>{" "}
            is being monitored. Your latest condition report is safe.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Button asChild className="h-10 px-5 bg-primary text-background-dark font-bold text-sm hover:bg-white">
              <Link href="/issues/new">
                <Plus className="h-5 w-5 mr-2" />
                Log Issue
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 px-5 bg-white/10 text-white font-medium text-sm border border-white/20 hover:bg-white/20 backdrop-blur-sm"
            >
              <Link href="/evidence/upload">
                <Upload className="h-5 w-5 mr-2" />
                Upload Evidence
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Issues"
          value={openIssuesCount || 0}
          icon={AlertTriangle}
          iconColor="orange"
          badge="Needs Action"
          badgeVariant="warning"
        />
        <StatCard
          title="Next Inspection"
          value="14 Days"
          icon={CalendarClock}
          iconColor="primary"
          badge="Upcoming"
          badgeVariant="info"
        />
        <StatCard
          title="Documents Secure"
          value={evidenceCount || 0}
          icon={FolderCheck}
          iconColor="green"
          badge="Encrypted"
          badgeVariant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Issues Table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold tracking-tight">
              Active Tenancy Issues
            </h2>
            <Link
              href="/issues"
              className="text-primary text-sm font-medium hover:text-white transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-card-lighter bg-card-dark">
            <table className="w-full text-left border-collapse">
              <thead className="bg-card-lighter">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-subtle uppercase tracking-wider w-1/3">
                    Issue Title
                  </th>
                  <th className="p-4 text-xs font-semibold text-text-subtle uppercase tracking-wider hidden sm:table-cell">
                    Reported
                  </th>
                  <th className="p-4 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4 text-xs font-semibold text-text-subtle uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-lighter">
                {activeIssues && activeIssues.length > 0 ? (
                  activeIssues.map((issue: any) => {
                    const propertiesArr = issue.properties as unknown as Array<{ address_text: string }>;
                    const properties = propertiesArr?.[0] ?? null;
                    const status = issue.status as string;
                    const statusConfig = getStatusConfig(status);
                    const reportedDate = format(new Date(issue.created_at), "MMM d");

                    return (
                      <tr
                        key={issue.id}
                        className="group hover:bg-card-lighter/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-white font-medium text-sm">
                              {issue.title}
                            </span>
                            <span className="text-text-subtle text-xs sm:hidden mt-1">
                              Reported {reportedDate}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-text-subtle text-sm hidden sm:table-cell">
                          {reportedDate}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.classes}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
                            />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/issues/${issue.id}`}
                            className="text-text-subtle hover:text-primary transition-colors text-sm font-medium"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-subtle text-sm">
                      No active issues
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Activity/Feed */}
          <div className="mt-4">
            <h2 className="text-white text-xl font-bold tracking-tight mb-4">
              Recent Activity
            </h2>
            <div className="flex flex-col gap-3">
              {/* Placeholder activity items - would be replaced with real data */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card-dark border border-card-lighter">
                <div className="p-2 rounded-lg bg-card-lighter text-text-subtle shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-start">
                    <p className="text-white text-sm font-medium">
                      Email sent to Agent
                    </p>
                    <span className="text-text-subtle text-xs">2h ago</span>
                  </div>
                  <p className="text-text-subtle text-sm">
                    Re: Maintenance Follow up
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Tools */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions Card */}
          <div className="p-6 rounded-xl bg-card-dark border border-card-lighter">
            <h3 className="text-white text-lg font-bold mb-4">Quick Tools</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button
                asChild
                variant="ghost"
                className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter hover:bg-card-lighter/80 border border-transparent hover:border-primary/50 transition-all group justify-start h-auto"
              >
                <Link href="/evidence/upload">
                  <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">
                      Upload Photo
                    </span>
                    <span className="text-text-subtle text-xs">
                      Add evidence securely
                    </span>
                  </div>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter hover:bg-card-lighter/80 border border-transparent hover:border-primary/50 transition-all group justify-start h-auto"
              >
                <Link href="/comms/new">
                  <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">
                      Email Template
                    </span>
                    <span className="text-text-subtle text-xs">
                      Contact property manager
                    </span>
                  </div>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter hover:bg-card-lighter/80 border border-transparent hover:border-primary/50 transition-all group justify-start h-auto"
              >
                <Link href="/packs/new">
                  <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">
                      Generate Evidence Pack
                    </span>
                    <span className="text-text-subtle text-xs">
                      Export for VCAT/Tribunal
                    </span>
                  </div>
                </Link>
              </Button>
            </div>
          </div>

          {/* Promo/Tip Card */}
          <div className="relative p-6 rounded-xl overflow-hidden bg-card-dark border border-primary/30">
            <div className="relative z-10 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background-dark mb-1">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h3 className="text-white text-lg font-bold">Renting Tip</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Did you know? In Victoria, you must be given at least 24 hours
                notice before an inspection. Keep your &quot;Entry Notice&quot; emails
                saved in the locker.
              </p>
              <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm font-bold text-left hover:text-white transition-colors mt-2 inline-block"
              >
                Read Tenant Rights →
              </a>
            </div>
            {/* Abstract decoration */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-card-lighter pt-8 pb-4 text-center md:text-left">
        <p className="text-text-subtle text-xs">
          © {new Date().getFullYear()} Tenant Buddy Australia. All data is
          encrypted locally.{" "}
          <Link href="/privacy" className="text-primary hover:underline ml-2">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-primary hover:underline ml-2">
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; classes: string; dotColor: string }> = {
    open: {
      label: "Open",
      classes: "bg-primary/10 text-primary border-primary/20",
      dotColor: "bg-primary",
    },
    in_progress: {
      label: "Evidence Collected",
      classes: "bg-primary/10 text-primary border-primary/20",
      dotColor: "bg-primary",
    },
    waiting: {
      label: "Waiting for Landlord",
      classes: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      dotColor: "bg-orange-400",
    },
    resolved: {
      label: "Repair Scheduled",
      classes: "bg-green-500/10 text-green-400 border-green-500/20",
      dotColor: "bg-green-400",
    },
    closed: {
      label: "Closed",
      classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      dotColor: "bg-slate-400",
    },
  };

  return (
    configs[status] || {
      label: status.replace("_", " "),
      classes: "bg-primary/10 text-primary border-primary/20",
      dotColor: "bg-primary",
    }
  );
}

