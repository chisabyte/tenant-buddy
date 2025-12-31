/**
 * Case Health System
 *
 * Calculates how strong a tenant's position would be if a dispute escalates.
 * Score ranges from 0-100, with clear status labels for user guidance.
 *
 * Factors considered:
 * - Issue logged with description
 * - Evidence uploaded and quantity
 * - Communication documented
 * - Recency of activity
 * - Severity classification set
 * - Response timeline tracked
 */

import type { Severity } from "./severity";

export type CaseHealthStatus = "strong" | "adequate" | "weak" | "at-risk";

export interface CaseHealth {
  score: number; // 0-100
  status: CaseHealthStatus;
  statusLabel: string;
  statusDescription: string;
  factors: CaseHealthFactor[];
}

export interface CaseHealthFactor {
  name: string;
  score: number; // Points earned
  maxScore: number; // Max possible points
  status: "good" | "warning" | "critical";
  recommendation?: string;
}

export interface IssueForHealth {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  severity?: Severity | null;
  created_at: string;
  updated_at: string;
}

export interface IssueHealthData {
  issue: IssueForHealth;
  evidenceCount: number;
  commsCount: number;
  lastCommsDate?: string | null;
  lastEvidenceDate?: string | null;
}

/**
 * Calculate Case Health score for a single issue
 */
export function calculateIssueHealth(data: IssueHealthData): CaseHealth {
  const factors: CaseHealthFactor[] = [];
  const now = new Date();
  const createdDate = new Date(data.issue.created_at);
  const daysSinceCreated = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Factor 1: Issue Documentation (max 15 points)
  const hasDescription = !!data.issue.description && data.issue.description.length > 20;
  const docScore = hasDescription ? 15 : 5;
  factors.push({
    name: "Issue documented",
    score: docScore,
    maxScore: 15,
    status: hasDescription ? "good" : "warning",
    recommendation: hasDescription ? undefined : "Add a detailed description to strengthen your case",
  });

  // Factor 2: Evidence Quality (max 30 points)
  let evidenceScore = 0;
  let evidenceStatus: "good" | "warning" | "critical" = "critical";
  let evidenceRec: string | undefined;

  if (data.evidenceCount === 0) {
    evidenceScore = 0;
    evidenceStatus = "critical";
    evidenceRec = "Upload photos or documents as evidence immediately";
  } else if (data.evidenceCount === 1) {
    evidenceScore = 10;
    evidenceStatus = "warning";
    evidenceRec = "Add more evidence to strengthen your position";
  } else if (data.evidenceCount === 2) {
    evidenceScore = 18;
    evidenceStatus = "warning";
    evidenceRec = "One more piece of evidence would help";
  } else if (data.evidenceCount >= 3 && data.evidenceCount < 5) {
    evidenceScore = 25;
    evidenceStatus = "good";
  } else {
    evidenceScore = 30;
    evidenceStatus = "good";
  }

  factors.push({
    name: "Evidence collected",
    score: evidenceScore,
    maxScore: 30,
    status: evidenceStatus,
    recommendation: evidenceRec,
  });

  // Factor 3: Communication Trail (max 25 points)
  let commsScore = 0;
  let commsStatus: "good" | "warning" | "critical" = "critical";
  let commsRec: string | undefined;

  if (data.commsCount === 0) {
    commsScore = 0;
    commsStatus = "critical";
    commsRec = "Log your communication with the landlord/agent";
  } else if (data.commsCount === 1) {
    commsScore = 12;
    commsStatus = "warning";
    commsRec = "Document any follow-up communications";
  } else if (data.commsCount >= 2 && data.commsCount < 4) {
    commsScore = 20;
    commsStatus = "good";
  } else {
    commsScore = 25;
    commsStatus = "good";
  }

  factors.push({
    name: "Communication logged",
    score: commsScore,
    maxScore: 25,
    status: commsStatus,
    recommendation: commsRec,
  });

  // Factor 4: Activity Recency (max 15 points)
  let recencyScore = 0;
  let recencyStatus: "good" | "warning" | "critical" = "critical";
  let recencyRec: string | undefined;

  const lastActivityDate = getLastActivityDate(data);
  const daysSinceActivity = lastActivityDate
    ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreated;

  if (daysSinceActivity <= 3) {
    recencyScore = 15;
    recencyStatus = "good";
  } else if (daysSinceActivity <= 7) {
    recencyScore = 12;
    recencyStatus = "good";
  } else if (daysSinceActivity <= 14) {
    recencyScore = 8;
    recencyStatus = "warning";
    recencyRec = "No activity in " + daysSinceActivity + " days - add updates to show ongoing effort";
  } else {
    recencyScore = 3;
    recencyStatus = "critical";
    recencyRec = "Issue appears dormant - add evidence or log a follow-up";
  }

  factors.push({
    name: "Recent activity",
    score: recencyScore,
    maxScore: 15,
    status: recencyStatus,
    recommendation: recencyRec,
  });

  // Factor 5: Severity Classification (max 15 points)
  let severityScore = 0;
  let severityStatus: "good" | "warning" | "critical" = "warning";
  let severityRec: string | undefined;

  if (!data.issue.severity || data.issue.severity === "Low") {
    severityScore = 10;
    severityStatus = "warning";
    severityRec = "Review if severity level is accurate for your situation";
  } else {
    severityScore = 15;
    severityStatus = "good";
  }

  factors.push({
    name: "Severity classified",
    score: severityScore,
    maxScore: 15,
    status: severityStatus,
    recommendation: severityRec,
  });

  // Calculate total score
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxScore = factors.reduce((sum, f) => sum + f.maxScore, 0);
  const score = Math.round((totalScore / maxScore) * 100);

  // Determine status
  const { status, statusLabel, statusDescription } = getHealthStatus(score);

  return {
    score,
    status,
    statusLabel,
    statusDescription,
    factors,
  };
}

/**
 * Calculate overall Case Health across all issues
 */
export function calculateOverallHealth(issuesData: IssueHealthData[]): CaseHealth {
  // Filter to active issues only
  const activeIssues = issuesData.filter(
    (d) => d.issue.status === "open" || d.issue.status === "in_progress"
  );

  if (activeIssues.length === 0) {
    return {
      score: 100,
      status: "strong",
      statusLabel: "No Active Issues",
      statusDescription: "You have no unresolved issues at this time.",
      factors: [],
    };
  }

  // Calculate health for each issue
  const issueHealths = activeIssues.map((d) => calculateIssueHealth(d));

  // Overall score is the MINIMUM (weakest link)
  const lowestScore = Math.min(...issueHealths.map((h) => h.score));

  // Aggregate factors across all issues (show critical ones first)
  const allFactors = issueHealths
    .flatMap((h) => h.factors.filter((f) => f.recommendation))
    .sort((a, b) => {
      const statusOrder = { critical: 0, warning: 1, good: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  const uniqueFactors = allFactors.reduce((acc, factor) => {
    const existing = acc.find((f) => f.name === factor.name);
    if (!existing || factor.status === "critical") {
      return [...acc.filter((f) => f.name !== factor.name), factor];
    }
    return acc;
  }, [] as CaseHealthFactor[]);

  const { status, statusLabel, statusDescription } = getHealthStatus(lowestScore);

  return {
    score: lowestScore,
    status,
    statusLabel,
    statusDescription,
    factors: uniqueFactors.slice(0, 3), // Top 3 most critical factors
  };
}

/**
 * Get the weakest issue that needs attention
 */
export function getWeakestIssue(
  issuesData: IssueHealthData[]
): { issue: IssueForHealth; health: CaseHealth; recommendation: NextStep } | null {
  const activeIssues = issuesData.filter(
    (d) => d.issue.status === "open" || d.issue.status === "in_progress"
  );

  if (activeIssues.length === 0) return null;

  const issueHealths = activeIssues.map((d) => ({
    data: d,
    health: calculateIssueHealth(d),
  }));

  // Sort by score ascending (lowest/weakest first)
  issueHealths.sort((a, b) => a.health.score - b.health.score);

  const weakest = issueHealths[0];
  const recommendation = getRecommendedNextStep(weakest.data, weakest.health);

  return {
    issue: weakest.data.issue,
    health: weakest.health,
    recommendation,
  };
}

export interface NextStep {
  action: string;
  description: string;
  href: string;
  urgency: "critical" | "high" | "medium" | "low";
  icon: "upload" | "message" | "document" | "calendar" | "check";
}

/**
 * Get the single most important next step for an issue
 */
export function getRecommendedNextStep(
  data: IssueHealthData,
  health: CaseHealth
): NextStep {
  const { issue, evidenceCount, commsCount } = data;

  // Priority 1: No evidence on high severity
  if (
    evidenceCount === 0 &&
    (issue.severity === "Urgent" || issue.severity === "High")
  ) {
    return {
      action: "Add Evidence Now",
      description: `"${truncate(issue.title, 30)}" is ${issue.severity} severity with no evidence. Add photos or documents immediately.`,
      href: `/evidence/upload?issueId=${issue.id}`,
      urgency: "critical",
      icon: "upload",
    };
  }

  // Priority 2: No evidence at all
  if (evidenceCount === 0) {
    return {
      action: "Add Evidence",
      description: `"${truncate(issue.title, 30)}" has no supporting evidence. Upload photos or documents to protect your position.`,
      href: `/evidence/upload?issueId=${issue.id}`,
      urgency: "high",
      icon: "upload",
    };
  }

  // Priority 3: No communication logged
  if (commsCount === 0) {
    return {
      action: "Log Communication",
      description: `Document your communication with the landlord/agent about "${truncate(issue.title, 30)}".`,
      href: `/comms/new?issueId=${issue.id}`,
      urgency: "high",
      icon: "message",
    };
  }

  // Priority 4: Stale issue (no recent activity)
  const criticalFactor = health.factors.find(
    (f) => f.name === "Recent activity" && f.status === "critical"
  );
  if (criticalFactor) {
    return {
      action: "Follow Up",
      description: `"${truncate(issue.title, 30)}" has been inactive. Send a follow-up or add new evidence.`,
      href: `/comms/new?issueId=${issue.id}`,
      urgency: "medium",
      icon: "message",
    };
  }

  // Priority 5: Ready for evidence pack
  if (evidenceCount >= 3 && commsCount >= 1 && health.score >= 70) {
    return {
      action: "Prepare Evidence Pack",
      description: `"${truncate(issue.title, 30)}" is well documented. Generate an evidence pack for tribunal.`,
      href: `/packs/new?issueId=${issue.id}`,
      urgency: "low",
      icon: "document",
    };
  }

  // Default: Add more evidence
  return {
    action: "Strengthen Case",
    description: `Add more evidence to "${truncate(issue.title, 30)}" to improve your position.`,
    href: `/evidence/upload?issueId=${issue.id}`,
    urgency: "medium",
    icon: "upload",
  };
}

function getHealthStatus(score: number): {
  status: CaseHealthStatus;
  statusLabel: string;
  statusDescription: string;
} {
  if (score >= 80) {
    return {
      status: "strong",
      statusLabel: "Strong",
      statusDescription: "Your documentation is solid. Continue maintaining records.",
    };
  }
  if (score >= 60) {
    return {
      status: "adequate",
      statusLabel: "Adequate",
      statusDescription: "Your case has some gaps. Address the recommendations below.",
    };
  }
  if (score >= 40) {
    return {
      status: "weak",
      statusLabel: "Weak",
      statusDescription: "Your position is vulnerable. Take action to strengthen your case.",
    };
  }
  return {
    status: "at-risk",
    statusLabel: "At Risk",
    statusDescription: "Your case is unprotected. Immediate action required.",
  };
}

function getLastActivityDate(data: IssueHealthData): Date | null {
  const dates: Date[] = [];

  if (data.lastCommsDate) dates.push(new Date(data.lastCommsDate));
  if (data.lastEvidenceDate) dates.push(new Date(data.lastEvidenceDate));
  dates.push(new Date(data.issue.updated_at));

  if (dates.length === 0) return null;

  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}
