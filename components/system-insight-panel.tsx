"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, FileWarning, ArrowRight } from "lucide-react";
import type { Severity } from "@/lib/severity";

interface Issue {
  id: string;
  title: string;
  status: string;
  severity: Severity;
  created_at: string;
  updated_at: string;
}

interface InsightData {
  issues: Issue[];
  evidenceCountMap: Map<string, number>;
  commsCountMap: Map<string, number>;
}

interface Insight {
  id: string;
  type: "warning" | "info" | "urgent";
  message: string;
  cta?: {
    label: string;
    href: string;
  };
  priority: number;
}

/**
 * Generates actionable insights from user data.
 * Returns insights in priority order.
 * Returns empty array if nothing important to show.
 */
function generateInsights(data: InsightData): Insight[] {
  const insights: Insight[] = [];
  const { issues, evidenceCountMap, commsCountMap } = data;

  // Filter to active issues only
  const activeIssues = issues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );

  // 1. HIGH/URGENT severity issues without evidence (PRIORITY 1)
  const highSeverityNoEvidence = activeIssues.filter((issue) => {
    const severity = issue.severity;
    const evidenceCount = evidenceCountMap.get(issue.id) || 0;
    return (severity === "Urgent" || severity === "High") && evidenceCount === 0;
  });

  if (highSeverityNoEvidence.length > 0) {
    if (highSeverityNoEvidence.length === 1) {
      const issue = highSeverityNoEvidence[0];
      insights.push({
        id: `high-no-evidence-${issue.id}`,
        type: "urgent",
        message: `"${truncate(issue.title, 30)}" has no evidence attached.`,
        cta: {
          label: "Upload evidence",
          href: `/evidence/upload?issueId=${issue.id}`,
        },
        priority: 1,
      });
    } else {
      insights.push({
        id: "high-no-evidence-multiple",
        type: "urgent",
        message: `${highSeverityNoEvidence.length} high-severity issues have no evidence attached.`,
        cta: {
          label: "View issues",
          href: "/issues",
        },
        priority: 1,
      });
    }
  }

  // 2. Issues waiting on agent response beyond threshold (PRIORITY 2)
  const now = new Date();
  const waitingOnAgent = activeIssues.filter((issue) => {
    if (issue.status !== "in_progress") return false;
    const updatedDate = new Date(issue.updated_at);
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate >= 3;
  });

  if (waitingOnAgent.length > 0) {
    // Sort by longest wait
    waitingOnAgent.sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );
    const oldest = waitingOnAgent[0];
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(oldest.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    insights.push({
      id: `waiting-agent-${oldest.id}`,
      type: "warning",
      message: `"${truncate(oldest.title, 25)}" — no follow-up sent in ${daysSinceUpdate} days.`,
      cta: {
        label: "Send follow-up",
        href: `/comms/new?issueId=${oldest.id}`,
      },
      priority: 2,
    });
  }

  // 3. Issues approaching repair timeframes (PRIORITY 3)
  // For Australian tenancy, urgent repairs typically need response within 24-48 hours
  // Non-urgent repairs within 14 days
  const approachingDeadline = activeIssues.filter((issue) => {
    const createdDate = new Date(issue.created_at);
    const daysOld = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Urgent/High issues older than 5 days with no resolution
    if ((issue.severity === "Urgent" || issue.severity === "High") && daysOld >= 5) {
      return true;
    }

    // Any issue older than 12 days approaching 14-day threshold
    if (daysOld >= 12 && daysOld < 14) {
      return true;
    }

    return false;
  });

  if (approachingDeadline.length > 0) {
    const issue = approachingDeadline[0];
    insights.push({
      id: `deadline-${issue.id}`,
      type: "warning",
      message: `"${truncate(issue.title, 30)}" may breach repair timeframes soon.`,
      cta: {
        label: "View issue",
        href: `/issues/${issue.id}`,
      },
      priority: 3,
    });
  }

  // 4. Suggested next action - issues with evidence but no comms (PRIORITY 4)
  const needsFollowUp = activeIssues.filter((issue) => {
    const evidenceCount = evidenceCountMap.get(issue.id) || 0;
    const commsCount = commsCountMap.get(issue.id) || 0;
    return evidenceCount > 0 && commsCount === 0;
  });

  if (needsFollowUp.length > 0 && insights.length < 2) {
    const issue = needsFollowUp[0];
    insights.push({
      id: `needs-followup-${issue.id}`,
      type: "info",
      message: `"${truncate(issue.title, 30)}" has evidence but no logged communication.`,
      cta: {
        label: "Log communication",
        href: `/comms/new?issueId=${issue.id}`,
      },
      priority: 4,
    });
  }

  // 5. Ready for evidence pack (PRIORITY 5)
  const readyForPack = activeIssues.filter((issue) => {
    const evidenceCount = evidenceCountMap.get(issue.id) || 0;
    const commsCount = commsCountMap.get(issue.id) || 0;
    return evidenceCount >= 3 && commsCount >= 1;
  });

  if (readyForPack.length > 0 && insights.length < 2) {
    const issue = readyForPack[0];
    insights.push({
      id: `ready-pack-${issue.id}`,
      type: "info",
      message: `"${truncate(issue.title, 30)}" is ready for an evidence pack.`,
      cta: {
        label: "Generate pack",
        href: `/packs/new?issueId=${issue.id}`,
      },
      priority: 5,
    });
  }

  // Sort by priority and return top insights
  return insights.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}

interface SystemInsightPanelProps {
  issues: Issue[];
  evidenceCountMap: Map<string, number>;
  commsCountMap?: Map<string, number>;
}

export function SystemInsightPanel({
  issues,
  evidenceCountMap,
  commsCountMap = new Map(),
}: SystemInsightPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const insights = useMemo(
    () => generateInsights({ issues, evidenceCountMap, commsCountMap }),
    [issues, evidenceCountMap, commsCountMap]
  );

  // Rotate through insights with fade animation
  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);

      // After fade out, change insight and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
        setIsVisible(true);
      }, 300);
    }, 8000); // 8 seconds per insight

    return () => clearInterval(interval);
  }, [insights.length]);

  // Don't render if no insights
  if (insights.length === 0) {
    return null;
  }

  const currentInsight = insights[currentIndex];

  const getIcon = () => {
    switch (currentInsight.type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "warning":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "info":
        return <FileWarning className="h-4 w-4 text-primary" />;
      default:
        return <FileWarning className="h-4 w-4 text-primary" />;
    }
  };

  const getBorderColor = () => {
    switch (currentInsight.type) {
      case "urgent":
        return "border-red-500/30";
      case "warning":
        return "border-amber-500/30";
      case "info":
        return "border-primary/30";
      default:
        return "border-card-lighter";
    }
  };

  return (
    <div
      className={`rounded-xl bg-card-dark border ${getBorderColor()} p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 shrink-0">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-subtle uppercase tracking-wide mb-1">
              System Insight
            </p>
            <p className="text-sm text-white">{currentInsight.message}</p>
          </div>
        </div>

        {currentInsight.cta && (
          <Link
            href={currentInsight.cta.href}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {currentInsight.cta.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Progress indicator for multiple insights */}
      {insights.length > 1 && (
        <div className="flex gap-1 mt-3 justify-center">
          {insights.map((_, index) => (
            <div
              key={index}
              className={`h-1 w-6 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : "bg-card-lighter"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
