import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RiskMetric } from "@/components/risk-metric";
import { CaseHealthCard } from "@/components/case-health-card";
import { NextStepCard, NoActionNeededCard } from "@/components/next-step-card";
import Link from "next/link";
import { getCurrentUserPlan } from "@/lib/billing";
import {
  calculateOverallHealth,
  getWeakestIssue,
  type IssueHealthData,
} from "@/lib/case-health";
import {
  AlertTriangle,
  Clock,
  FileWarning,
  ShieldAlert,
  Plus,
  Upload,
  Mail,
  FileText,
  Crown,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { differenceInDays } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Get all issues with details
  const { data: allIssues } = await supabase
    .from("issues")
    .select(
      `
      id,
      title,
      description,
      status,
      severity,
      created_at,
      updated_at
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get evidence items with dates
  const { data: evidenceItems } = await supabase
    .from("evidence_items")
    .select("issue_id, created_at")
    .eq("user_id", user.id)
    .not("issue_id", "is", null)
    .order("created_at", { ascending: false });

  // Get comms logs with dates
  const { data: commsItems } = await supabase
    .from("comms_logs")
    .select("issue_id, occurred_at")
    .eq("user_id", user.id)
    .not("issue_id", "is", null)
    .order("occurred_at", { ascending: false });

  // Build evidence data maps
  const evidenceCountMap = new Map<string, number>();
  const lastEvidenceMap = new Map<string, string>();
  evidenceItems?.forEach((item) => {
    if (item.issue_id) {
      evidenceCountMap.set(
        item.issue_id,
        (evidenceCountMap.get(item.issue_id) || 0) + 1
      );
      if (!lastEvidenceMap.has(item.issue_id)) {
        lastEvidenceMap.set(item.issue_id, item.created_at);
      }
    }
  });

  // Build comms data maps
  const commsCountMap = new Map<string, number>();
  const lastCommsMap = new Map<string, string>();
  commsItems?.forEach((item) => {
    if (item.issue_id) {
      commsCountMap.set(
        item.issue_id,
        (commsCountMap.get(item.issue_id) || 0) + 1
      );
      if (!lastCommsMap.has(item.issue_id)) {
        lastCommsMap.set(item.issue_id, item.occurred_at);
      }
    }
  });

  // Prepare issue health data
  const issuesHealthData: IssueHealthData[] = (allIssues || []).map((issue) => ({
    issue: {
      ...issue,
      severity: issue.severity || undefined,
    },
    evidenceCount: evidenceCountMap.get(issue.id) || 0,
    commsCount: commsCountMap.get(issue.id) || 0,
    lastEvidenceDate: lastEvidenceMap.get(issue.id) || null,
    lastCommsDate: lastCommsMap.get(issue.id) || null,
  }));

  // Calculate case health
  const overallHealth = calculateOverallHealth(issuesHealthData);
  const weakestIssue = getWeakestIssue(issuesHealthData);

  // Filter active issues
  const activeIssues = (allIssues || []).filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );

  // Calculate risk metrics
  const issuesWithNoEvidence = activeIssues.filter(
    (i) => !evidenceCountMap.has(i.id) || evidenceCountMap.get(i.id) === 0
  );

  // Find days since last communication across all issues
  const allCommsArray = commsItems || [];
  let daysSinceLastComms: number | null = null;
  if (allCommsArray.length > 0) {
    const latestComms = new Date(allCommsArray[0].occurred_at);
    daysSinceLastComms = differenceInDays(new Date(), latestComms);
  }

  // Get high severity unresolved issues
  const highSeverityIssues = activeIssues.filter(
    (i) => i.severity === "Urgent" || i.severity === "High"
  );

  // Get current plan
  const plan = await getCurrentUserPlan();

  // Determine hero message based on case health
  const getHeroMessage = () => {
    if (activeIssues.length === 0) {
      return {
        headline: "No Active Issues",
        subtext: "Your tenancy records are secure. Log any new issues as they arise.",
        statusClass: "bg-green-400",
        statusText: "All Clear",
      };
    }
    if (overallHealth.status === "at-risk") {
      return {
        headline: "Your Case Needs Attention",
        subtext: `${issuesWithNoEvidence.length} issue${issuesWithNoEvidence.length !== 1 ? "s" : ""} without evidence. Take action now to protect your position.`,
        statusClass: "bg-red-400",
        statusText: "At Risk",
      };
    }
    if (overallHealth.status === "weak") {
      return {
        headline: "Strengthen Your Position",
        subtext: "Your documentation has gaps. Address the recommendations below.",
        statusClass: "bg-amber-400",
        statusText: "Needs Work",
      };
    }
    if (overallHealth.status === "adequate") {
      return {
        headline: "Good Progress",
        subtext: "Your case is building. Continue documenting to strengthen your position.",
        statusClass: "bg-primary",
        statusText: "On Track",
      };
    }
    return {
      headline: "Well Documented",
      subtext: "Your tenancy records are strong. Continue maintaining your documentation.",
      statusClass: "bg-green-400",
      statusText: "Protected",
    };
  };

  const heroMessage = getHeroMessage();

  return (
    <div className="flex flex-col max-w-[1200px] w-full mx-auto p-4 md:p-8 gap-6">
      {/* Hero Section - Risk-Aware */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-card-dark border border-card-lighter">
        <div className="relative z-10 flex flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card-lighter border border-card-lighter w-fit">
              <span className={`w-2 h-2 rounded-full ${heroMessage.statusClass}`} />
              <span className="text-xs font-medium text-text-subtle tracking-wide uppercase">
                {heroMessage.statusText}
              </span>
            </div>
            {plan.isOwner && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 w-fit">
                <Crown className="h-3 w-3 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400 tracking-wide uppercase">
                  Owner
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-text-subtle text-sm mb-1">
              {property?.address_text || "Your property"}
            </p>
            <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">
              {heroMessage.headline}
            </h1>
          </div>
          <p className="text-text-subtle text-base max-w-xl">
            {heroMessage.subtext}
          </p>
        </div>
      </div>

      {/* Primary CTA: Recommended Next Step */}
      {weakestIssue ? (
        <NextStepCard step={weakestIssue.recommendation} />
      ) : activeIssues.length === 0 ? (
        <NoActionNeededCard />
      ) : null}

      {/* Case Health + Risk Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Case Health Card - Takes 1 column */}
        <CaseHealthCard health={overallHealth} />

        {/* Risk Metrics - Takes 2 columns */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RiskMetric
            label="Unprotected Issues"
            value={issuesWithNoEvidence.length}
            subtext={issuesWithNoEvidence.length > 0 ? "need evidence" : "all documented"}
            icon={FileWarning}
            status={
              issuesWithNoEvidence.length === 0
                ? "good"
                : issuesWithNoEvidence.length >= 2
                ? "critical"
                : "warning"
            }
          />
          <RiskMetric
            label="High Severity Open"
            value={highSeverityIssues.length}
            subtext={highSeverityIssues.length > 0 ? "require attention" : "none"}
            icon={ShieldAlert}
            status={
              highSeverityIssues.length === 0
                ? "good"
                : highSeverityIssues.length >= 2
                ? "critical"
                : "warning"
            }
          />
          <RiskMetric
            label="Days Since Last Contact"
            value={daysSinceLastComms !== null ? daysSinceLastComms : "—"}
            subtext={daysSinceLastComms !== null ? "days ago" : "no comms logged"}
            icon={Clock}
            status={
              daysSinceLastComms === null
                ? activeIssues.length > 0
                  ? "warning"
                  : "neutral"
                : daysSinceLastComms > 14
                ? "warning"
                : "good"
            }
          />
          <RiskMetric
            label="Open Issues"
            value={activeIssues.length}
            subtext="requiring resolution"
            icon={AlertTriangle}
            status={
              activeIssues.length === 0
                ? "good"
                : activeIssues.length >= 3
                ? "warning"
                : "neutral"
            }
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Issues Requiring Action */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-bold">
              Issues Requiring Action
            </h2>
            <Link
              href="/issues"
              className="text-primary text-sm font-medium hover:text-white transition-colors inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {activeIssues.length > 0 ? (
            <div className="space-y-3">
              {activeIssues.slice(0, 5).map((issue) => {
                const evidenceCount = evidenceCountMap.get(issue.id) || 0;
                const commsCount = commsCountMap.get(issue.id) || 0;
                const daysOld = differenceInDays(
                  new Date(),
                  new Date(issue.created_at)
                );

                // Determine issue status label
                const getIssueStatus = () => {
                  if (evidenceCount === 0) {
                    return {
                      label: "No Evidence",
                      classes: "bg-red-500/10 text-red-400 border-red-500/20",
                      dotColor: "bg-red-400",
                    };
                  }
                  if (commsCount === 0) {
                    return {
                      label: "No Comms Logged",
                      classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                      dotColor: "bg-amber-400",
                    };
                  }
                  if (evidenceCount >= 3 && commsCount >= 1) {
                    return {
                      label: "Well Documented",
                      classes: "bg-green-500/10 text-green-400 border-green-500/20",
                      dotColor: "bg-green-400",
                    };
                  }
                  return {
                    label: "In Progress",
                    classes: "bg-primary/10 text-primary border-primary/20",
                    dotColor: "bg-primary",
                  };
                };

                const statusConfig = getIssueStatus();
                const isHighSeverity =
                  issue.severity === "Urgent" || issue.severity === "High";

                return (
                  <Link
                    key={issue.id}
                    href={`/issues/${issue.id}`}
                    className="block p-4 rounded-xl bg-card-dark border border-card-lighter hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          {isHighSeverity && (
                            <span className="text-xs font-medium text-red-400 shrink-0">
                              {issue.severity}
                            </span>
                          )}
                          <h3 className="text-white font-medium line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-0">
                            {issue.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-subtle">
                          <span>
                            {daysOld === 0
                              ? "Today"
                              : daysOld === 1
                              ? "Yesterday"
                              : `${daysOld} days ago`}
                          </span>
                          <span>•</span>
                          <span>
                            {evidenceCount} evidence
                          </span>
                          <span>•</span>
                          <span>{commsCount} comms</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.classes} whitespace-nowrap`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
                          />
                          {statusConfig.label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-text-subtle group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-card-dark border border-card-lighter text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <ShieldAlert className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <h3 className="text-white font-bold mb-2">No Active Issues</h3>
              <p className="text-text-subtle text-sm mb-4">
                You have no unresolved issues. Log a new issue when something comes up.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-background-dark font-bold">
                <Link href="/issues/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Log New Issue
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions */}
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-xl bg-card-dark border border-card-lighter">
            <h3 className="text-white text-lg font-bold mb-4">Take Action</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button
                asChild
                variant="ghost"
                className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter hover:bg-card-lighter/80 border border-transparent hover:border-primary/50 transition-all group justify-start h-auto"
              >
                <Link href="/issues/new">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">
                      Log New Issue
                    </span>
                    <span className="text-text-subtle text-xs">
                      Report a problem immediately
                    </span>
                  </div>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="flex items-center gap-3 p-3 rounded-lg bg-card-lighter hover:bg-card-lighter/80 border border-transparent hover:border-primary/50 transition-all group justify-start h-auto"
              >
                <Link href="/evidence/upload">
                  <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">
                      Add Evidence
                    </span>
                    <span className="text-text-subtle text-xs">
                      Upload photos or documents
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
                      Log Communication
                    </span>
                    <span className="text-text-subtle text-xs">
                      Document landlord/agent contact
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
                      Export for tribunal/dispute
                    </span>
                  </div>
                </Link>
              </Button>
            </div>
          </div>

          {/* Deadline reminder if applicable */}
          {highSeverityIssues.length > 0 && (
            <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-red-400" />
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide">
                  Urgent Attention
                </p>
              </div>
              <p className="text-sm text-text-subtle">
                You have {highSeverityIssues.length} high-severity issue
                {highSeverityIssues.length !== 1 ? "s" : ""} that may have
                statutory repair timeframes. Ensure you document all
                communications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 border-t border-card-lighter pt-6 pb-4 text-center md:text-left">
        <p className="text-text-subtle text-xs">
          © {new Date().getFullYear()} Tenant Buddy Australia.{" "}
          <span className="text-white font-medium">Not legal advice.</span> This
          tool helps you organise tenancy records.
          <Link href="/privacy" className="text-primary hover:underline ml-2">
            Privacy
          </Link>
          <Link href="/terms" className="text-primary hover:underline ml-2">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
