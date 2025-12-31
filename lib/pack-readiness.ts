/**
 * Pack Readiness System
 *
 * Calculates how well-prepared an Evidence Pack is for tribunal/dispute submission.
 * Evaluates coverage of open issues, evidence completeness, communications logged,
 * urgency handling, and recency of documentation.
 */

import type { Severity } from "./severity";

export type PackReadinessStatus = "strong" | "moderate" | "weak" | "high-risk";

export interface PackReadiness {
  score: number; // 0-100
  status: PackReadinessStatus;
  statusLabel: string;
  statusDescription: string;
  warnings: PackWarning[];
  coverage: {
    includedIssues: number;
    excludedIssues: number;
    totalOpenIssues: number;
  };
  requiresConfirmation: boolean;
}

export interface PackWarning {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  issueId?: string;
  issueTitle?: string;
}

export interface IssueForPack {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  severity?: Severity | null;
  created_at: string;
  updated_at: string;
  evidence_items?: Array<{
    id: string;
    type: string;
    uploaded_at: string;
  }>;
}

export interface CommsForPack {
  issue_id: string;
  occurred_at: string;
}

/**
 * Calculate pack readiness based on selected issues and available data
 */
export function calculatePackReadiness(
  allIssues: IssueForPack[],
  selectedIssueIds: Set<string>,
  commsData: CommsForPack[]
): PackReadiness {
  const warnings: PackWarning[] = [];
  const now = new Date();

  // Filter to open/in_progress issues only
  const openIssues = allIssues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );

  const selectedIssues = allIssues.filter((i) => selectedIssueIds.has(i.id));
  const excludedOpenIssues = openIssues.filter((i) => !selectedIssueIds.has(i.id));

  // Build comms count map
  const commsCountMap = new Map<string, number>();
  commsData.forEach((c) => {
    commsCountMap.set(c.issue_id, (commsCountMap.get(c.issue_id) || 0) + 1);
  });

  // Coverage stats
  const includedOpenIssues = selectedIssues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );

  const coverage = {
    includedIssues: includedOpenIssues.length,
    excludedIssues: excludedOpenIssues.length,
    totalOpenIssues: openIssues.length,
  };

  // Check for excluded high-severity issues
  const excludedHighSeverity = excludedOpenIssues.filter(
    (i) => i.severity === "Urgent" || i.severity === "High"
  );

  excludedHighSeverity.forEach((issue) => {
    warnings.push({
      type: "critical",
      title: "High-Severity Issue Excluded",
      message: `"${truncate(issue.title, 40)}" is ${issue.severity} severity and will NOT be included in this pack. This may significantly weaken your position.`,
      issueId: issue.id,
      issueTitle: issue.title,
    });
  });

  // Check for excluded issues with evidence
  const excludedWithEvidence = excludedOpenIssues.filter(
    (i) =>
      (i.evidence_items?.length || 0) > 0 &&
      !excludedHighSeverity.find((hs) => hs.id === i.id)
  );

  excludedWithEvidence.forEach((issue) => {
    const evidenceCount = issue.evidence_items?.length || 0;
    warnings.push({
      type: "warning",
      title: "Issue with Evidence Excluded",
      message: `"${truncate(issue.title, 40)}" has ${evidenceCount} evidence item${evidenceCount > 1 ? "s" : ""} but will NOT be included.`,
      issueId: issue.id,
      issueTitle: issue.title,
    });
  });

  // Check for excluded issues with communications
  const excludedWithComms = excludedOpenIssues.filter(
    (i) =>
      (commsCountMap.get(i.id) || 0) > 0 &&
      !excludedHighSeverity.find((hs) => hs.id === i.id) &&
      !excludedWithEvidence.find((we) => we.id === i.id)
  );

  excludedWithComms.forEach((issue) => {
    const commsCount = commsCountMap.get(issue.id) || 0;
    warnings.push({
      type: "warning",
      title: "Issue with Communications Excluded",
      message: `"${truncate(issue.title, 40)}" has ${commsCount} logged communication${commsCount > 1 ? "s" : ""} but will NOT be included.`,
      issueId: issue.id,
      issueTitle: issue.title,
    });
  });

  // Check for included issues with no evidence
  const includedNoEvidence = selectedIssues.filter(
    (i) =>
      (i.status === "open" || i.status === "in_progress") &&
      (!i.evidence_items || i.evidence_items.length === 0)
  );

  includedNoEvidence.forEach((issue) => {
    warnings.push({
      type: "warning",
      title: "Issue Lacks Evidence",
      message: `"${truncate(issue.title, 40)}" is included but has no supporting evidence.`,
      issueId: issue.id,
      issueTitle: issue.title,
    });
  });

  // Check for included issues with no communications
  const includedNoComms = selectedIssues.filter(
    (i) =>
      (i.status === "open" || i.status === "in_progress") &&
      (commsCountMap.get(i.id) || 0) === 0 &&
      !includedNoEvidence.find((ne) => ne.id === i.id)
  );

  includedNoComms.forEach((issue) => {
    warnings.push({
      type: "info",
      title: "No Communications Logged",
      message: `"${truncate(issue.title, 40)}" has no documented communication with landlord/agent.`,
      issueId: issue.id,
      issueTitle: issue.title,
    });
  });

  // Check for stale included issues (no activity in 14+ days)
  const staleIssues = selectedIssues.filter((i) => {
    if (i.status !== "open" && i.status !== "in_progress") return false;
    const updatedDate = new Date(i.updated_at);
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate > 14;
  });

  if (staleIssues.length > 0) {
    warnings.push({
      type: "info",
      title: "Stale Documentation",
      message: `${staleIssues.length} issue${staleIssues.length > 1 ? "s" : ""} included ha${staleIssues.length > 1 ? "ve" : "s"} not been updated in over 14 days.`,
    });
  }

  // Calculate score
  let score = 100;

  // Deduct for coverage gaps
  if (coverage.totalOpenIssues > 0) {
    const coverageRatio = coverage.includedIssues / coverage.totalOpenIssues;
    score -= Math.round((1 - coverageRatio) * 30); // Up to -30 for poor coverage
  }

  // Deduct for excluded high-severity issues
  score -= excludedHighSeverity.length * 25; // -25 per high-severity excluded

  // Deduct for excluded issues with evidence
  score -= excludedWithEvidence.length * 10; // -10 per issue with evidence excluded

  // Deduct for included issues without evidence
  score -= includedNoEvidence.length * 15; // -15 per issue without evidence

  // Deduct for included issues without communications
  score -= includedNoComms.length * 5; // -5 per issue without comms

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine status
  const { status, statusLabel, statusDescription } = getReadinessStatus(score, warnings);

  // Determine if confirmation is required
  const requiresConfirmation =
    status === "weak" ||
    status === "high-risk" ||
    excludedHighSeverity.length > 0 ||
    (excludedOpenIssues.length > 0 && coverage.includedIssues < coverage.totalOpenIssues);

  return {
    score,
    status,
    statusLabel,
    statusDescription,
    warnings,
    coverage,
    requiresConfirmation,
  };
}

function getReadinessStatus(
  score: number,
  warnings: PackWarning[]
): {
  status: PackReadinessStatus;
  statusLabel: string;
  statusDescription: string;
} {
  const criticalWarnings = warnings.filter((w) => w.type === "critical");

  if (score >= 80 && criticalWarnings.length === 0) {
    return {
      status: "strong",
      statusLabel: "Strong",
      statusDescription:
        "This pack comprehensively covers your open issues with supporting evidence.",
    };
  }
  if (score >= 60 && criticalWarnings.length === 0) {
    return {
      status: "moderate",
      statusLabel: "Moderate",
      statusDescription:
        "This pack covers most issues but has some gaps. Review warnings before submission.",
    };
  }
  if (score >= 40 || criticalWarnings.length === 0) {
    return {
      status: "weak",
      statusLabel: "Weak",
      statusDescription:
        "This pack has significant gaps that may weaken your position. Address issues before submitting.",
    };
  }
  return {
    status: "high-risk",
    statusLabel: "High Risk",
    statusDescription:
      "Critical issues are excluded or lack documentation. This pack may harm your position if submitted as-is.",
  };
}

/**
 * Get the professional filename for the evidence pack
 */
export function getPackFilename(
  propertyAddress: string,
  date: Date = new Date()
): string {
  // Clean address for filename
  const cleanAddress = propertyAddress
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 40) // Limit length
    .replace(/_+$/, ""); // Remove trailing underscores

  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  return `Evidence_Pack_${cleanAddress}_${dateStr}.pdf`;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}
