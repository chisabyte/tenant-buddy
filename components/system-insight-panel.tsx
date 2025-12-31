"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, FileWarning, ArrowRight, CheckCircle } from "lucide-react";
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
  type: "warning" | "info" | "urgent" | "success";
  title: string;
  message: string;
  cta?: {
    label: string;
    href: string;
  };
  priority: number;
}

/**
 * Generates individual actionable insights for each issue.
 * Each issue gets its own insight based on what action is needed.
 */
function generateInsights(data: InsightData): Insight[] {
  const insights: Insight[] = [];
  const { issues, evidenceCountMap, commsCountMap } = data;
  const now = new Date();

  // Filter to active issues only
  const activeIssues = issues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );

  // Generate insights for each active issue
  for (const issue of activeIssues) {
    const evidenceCount = evidenceCountMap.get(issue.id) || 0;
    const commsCount = commsCountMap.get(issue.id) || 0;
    const createdDate = new Date(issue.created_at);
    const updatedDate = new Date(issue.updated_at);
    const daysOld = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isHighSeverity = issue.severity === "Urgent" || issue.severity === "High";

    // Priority 1: High severity with no evidence - URGENT
    if (isHighSeverity && evidenceCount === 0) {
      insights.push({
        id: `urgent-no-evidence-${issue.id}`,
        type: "urgent",
        title: truncate(issue.title, 35),
        message: `${issue.severity} severity issue needs evidence to strengthen your case.`,
        cta: {
          label: "Upload evidence",
          href: `/evidence/upload?issueId=${issue.id}`,
        },
        priority: 1,
      });
      continue; // Only one insight per issue
    }

    // Priority 2: Waiting on agent > 3 days
    if (issue.status === "in_progress" && daysSinceUpdate >= 3) {
      insights.push({
        id: `stale-${issue.id}`,
        type: "warning",
        title: truncate(issue.title, 35),
        message: `No response from agent in ${daysSinceUpdate} days. Consider sending a follow-up.`,
        cta: {
          label: "Send follow-up",
          href: `/comms/new?issueId=${issue.id}`,
        },
        priority: 2,
      });
      continue;
    }

    // Priority 3: Approaching repair deadline (high severity > 5 days, or any > 12 days)
    if ((isHighSeverity && daysOld >= 5) || (daysOld >= 12 && daysOld < 14)) {
      insights.push({
        id: `deadline-${issue.id}`,
        type: "warning",
        title: truncate(issue.title, 35),
        message: `Open for ${daysOld} days. May breach statutory repair timeframes.`,
        cta: {
          label: "View issue",
          href: `/issues/${issue.id}`,
        },
        priority: 3,
      });
      continue;
    }

    // Priority 4: Has evidence but no communications logged
    if (evidenceCount > 0 && commsCount === 0) {
      insights.push({
        id: `no-comms-${issue.id}`,
        type: "info",
        title: truncate(issue.title, 35),
        message: `${evidenceCount} evidence item${evidenceCount > 1 ? "s" : ""} uploaded. Log your communication with the agent.`,
        cta: {
          label: "Log communication",
          href: `/comms/new?issueId=${issue.id}`,
        },
        priority: 4,
      });
      continue;
    }

    // Priority 5: Ready for evidence pack (3+ evidence, 1+ comms)
    if (evidenceCount >= 3 && commsCount >= 1) {
      insights.push({
        id: `ready-pack-${issue.id}`,
        type: "success",
        title: truncate(issue.title, 35),
        message: `Well documented with ${evidenceCount} evidence items and ${commsCount} communication${commsCount > 1 ? "s" : ""}. Ready for tribunal pack.`,
        cta: {
          label: "Generate pack",
          href: `/packs/new?issueId=${issue.id}`,
        },
        priority: 5,
      });
      continue;
    }

    // Priority 6: New issue with no evidence
    if (evidenceCount === 0) {
      insights.push({
        id: `needs-evidence-${issue.id}`,
        type: "info",
        title: truncate(issue.title, 35),
        message: `Logged ${daysOld === 0 ? "today" : daysOld === 1 ? "yesterday" : `${daysOld} days ago`}. Add photos or documents as evidence.`,
        cta: {
          label: "Upload evidence",
          href: `/evidence/upload?issueId=${issue.id}`,
        },
        priority: 6,
      });
      continue;
    }

    // Priority 7: General status update for issues with some progress
    if (evidenceCount > 0) {
      insights.push({
        id: `status-${issue.id}`,
        type: "info",
        title: truncate(issue.title, 35),
        message: `${evidenceCount} evidence item${evidenceCount > 1 ? "s" : ""}, ${commsCount} communication${commsCount !== 1 ? "s" : ""} logged.`,
        cta: {
          label: "View details",
          href: `/issues/${issue.id}`,
        },
        priority: 7,
      });
    }
  }

  // Sort by priority and return all insights
  return insights.sort((a, b) => a.priority - b.priority);
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
    }, 6000); // 6 seconds per insight

    return () => clearInterval(interval);
  }, [insights.length]);

  // Reset index if insights change
  useEffect(() => {
    setCurrentIndex(0);
  }, [insights.length]);

  // Don't render if no insights
  if (insights.length === 0) {
    return null;
  }

  const currentInsight = insights[currentIndex] || insights[0];

  const getIcon = () => {
    switch (currentInsight.type) {
      case "urgent":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <Clock className="h-5 w-5 text-amber-400" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "info":
      default:
        return <FileWarning className="h-5 w-5 text-primary" />;
    }
  };

  const getBorderColor = () => {
    switch (currentInsight.type) {
      case "urgent":
        return "border-red-500/30";
      case "warning":
        return "border-amber-500/30";
      case "success":
        return "border-green-500/30";
      case "info":
      default:
        return "border-card-lighter";
    }
  };

  return (
    <div className={`rounded-xl bg-card-dark border ${getBorderColor()} p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-text-subtle uppercase tracking-wide">
          System Insight
        </p>
        {insights.length > 1 && (
          <span className="text-xs text-text-subtle">
            {currentIndex + 1} of {insights.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className={`transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-0.5 shrink-0">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-1">
              {currentInsight.title}
            </p>
            <p className="text-sm text-text-subtle leading-relaxed">
              {currentInsight.message}
            </p>
          </div>
        </div>

        {currentInsight.cta && (
          <Link
            href={currentInsight.cta.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            {currentInsight.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Progress indicator for multiple insights */}
      {insights.length > 1 && (
        <div className="flex gap-1.5 mt-4 justify-center">
          {insights.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setIsVisible(true);
                }, 150);
              }}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : "bg-card-lighter hover:bg-card-lighter/80"
              }`}
              aria-label={`Go to insight ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
