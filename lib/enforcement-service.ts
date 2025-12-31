/**
 * Enforcement Service
 *
 * Server-side service for checking and logging enforcement actions.
 * This handles the database operations for the enforcement system.
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPlan } from "@/lib/billing";
import {
  checkEnforcement,
  EnforcementAction,
  EnforcementResult,
} from "@/lib/enforcement";
import {
  calculateIssueHealth,
  calculateOverallHealth,
  type IssueHealthData,
  type CaseHealthStatus,
} from "@/lib/case-health";

// ============================================================================
// TYPES
// ============================================================================

export interface EnforcementCheckResult extends EnforcementResult {
  issueId?: string;
  userId: string;
}

export interface LogOverrideParams {
  action: EnforcementAction;
  enforcementLevel: "warned" | "soft-blocked";
  healthStatus: CaseHealthStatus;
  healthScore: number;
  issueId?: string;
  evidenceId?: string;
  commsId?: string;
  packId?: string;
  reason?: string;
}

// ============================================================================
// CHECK ENFORCEMENT FOR ISSUE
// ============================================================================

/**
 * Check enforcement for an action on a specific issue.
 * Fetches issue health data and returns enforcement result.
 */
export async function checkEnforcementForIssue(
  issueId: string,
  action: EnforcementAction
): Promise<EnforcementCheckResult | null> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's plan
  const plan = await getCurrentUserPlan();

  // Get issue with evidence and comms counts
  const { data: issue, error: issueError } = await supabase
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
    .eq("id", issueId)
    .eq("user_id", user.id)
    .single();

  if (issueError || !issue) {
    return null;
  }

  // Get evidence count
  const { count: evidenceCount } = await supabase
    .from("evidence_items")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", issueId);

  // Get comms count and last date
  const { data: commsData } = await supabase
    .from("comms_logs")
    .select("id, occurred_at")
    .eq("issue_id", issueId)
    .order("occurred_at", { ascending: false });

  // Get last evidence date
  const { data: lastEvidence } = await supabase
    .from("evidence_items")
    .select("uploaded_at")
    .eq("issue_id", issueId)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  // Build health data
  const healthData: IssueHealthData = {
    issue: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      severity: issue.severity,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    },
    evidenceCount: evidenceCount || 0,
    commsCount: commsData?.length || 0,
    lastCommsDate: commsData?.[0]?.occurred_at || null,
    lastEvidenceDate: lastEvidence?.[0]?.uploaded_at || null,
  };

  // Calculate health
  const health = calculateIssueHealth(healthData);

  // Check enforcement
  const result = checkEnforcement(
    action,
    health.status,
    health.score,
    plan.planId
  );

  return {
    ...result,
    issueId,
    userId: user.id,
  };
}

/**
 * Check enforcement for an action based on overall case health.
 * Use this for pack generation or when no specific issue is targeted.
 */
export async function checkEnforcementForCase(
  action: EnforcementAction
): Promise<EnforcementCheckResult | null> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's plan
  const plan = await getCurrentUserPlan();

  // Get all active issues with data
  const { data: issues } = await supabase
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
    .in("status", ["open", "in_progress"]);

  if (!issues || issues.length === 0) {
    // No active issues - case is "strong" by default
    const result = checkEnforcement(action, "strong", 100, plan.planId);
    return {
      ...result,
      userId: user.id,
    };
  }

  // Get evidence counts per issue
  const { data: evidenceCounts } = await supabase
    .from("evidence_items")
    .select("issue_id")
    .eq("user_id", user.id);

  const evidenceCountMap = new Map<string, number>();
  evidenceCounts?.forEach((e) => {
    evidenceCountMap.set(
      e.issue_id,
      (evidenceCountMap.get(e.issue_id) || 0) + 1
    );
  });

  // Get comms counts per issue
  const { data: commsData } = await supabase
    .from("comms_logs")
    .select("issue_id, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  const commsCountMap = new Map<string, number>();
  const lastCommsMap = new Map<string, string>();
  commsData?.forEach((c) => {
    commsCountMap.set(c.issue_id, (commsCountMap.get(c.issue_id) || 0) + 1);
    if (!lastCommsMap.has(c.issue_id)) {
      lastCommsMap.set(c.issue_id, c.occurred_at);
    }
  });

  // Build health data for all issues
  const issuesData: IssueHealthData[] = issues.map((issue) => ({
    issue: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      severity: issue.severity,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    },
    evidenceCount: evidenceCountMap.get(issue.id) || 0,
    commsCount: commsCountMap.get(issue.id) || 0,
    lastCommsDate: lastCommsMap.get(issue.id) || null,
    lastEvidenceDate: null, // Would need another query, not critical for overall
  }));

  // Calculate overall health
  const health = calculateOverallHealth(issuesData);

  // Check enforcement
  const result = checkEnforcement(
    action,
    health.status,
    health.score,
    plan.planId
  );

  return {
    ...result,
    userId: user.id,
  };
}

// ============================================================================
// LOG OVERRIDE
// ============================================================================

/**
 * Log an enforcement override to the database.
 * Call this when a user confirms proceeding despite a warning or soft-block.
 */
export async function logOverride(params: LogOverrideParams): Promise<boolean> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Get user's plan
  const plan = await getCurrentUserPlan();

  // Insert override log
  const { error } = await supabase.from("override_logs").insert({
    user_id: user.id,
    action: params.action,
    enforcement_level: params.enforcementLevel,
    health_status: params.healthStatus,
    health_score: params.healthScore,
    issue_id: params.issueId || null,
    evidence_id: params.evidenceId || null,
    comms_id: params.commsId || null,
    pack_id: params.packId || null,
    reason: params.reason || null,
    plan_id: plan.planId,
    plan_mode: plan.planId === "pro" ? "advisor" : "guided",
  });

  if (error) {
    console.error("[logOverride] Error logging override:", error);
    return false;
  }

  return true;
}

// ============================================================================
// GET OVERRIDE HISTORY
// ============================================================================

/**
 * Get override history for the current user.
 * Useful for showing users their past decisions.
 */
export async function getOverrideHistory(limit = 10): Promise<
  Array<{
    id: string;
    action: EnforcementAction;
    enforcementLevel: string;
    healthStatus: CaseHealthStatus;
    healthScore: number;
    issueId?: string;
    reason?: string;
    createdAt: string;
  }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("override_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((log) => ({
    id: log.id,
    action: log.action as EnforcementAction,
    enforcementLevel: log.enforcement_level,
    healthStatus: log.health_status as CaseHealthStatus,
    healthScore: log.health_score,
    issueId: log.issue_id || undefined,
    reason: log.reason || undefined,
    createdAt: log.created_at,
  }));
}

// ============================================================================
// QUICK CHECKS
// ============================================================================

/**
 * Quick check if an issue can be closed/resolved.
 * Returns enforcement result with reason.
 */
export async function canCloseIssue(
  issueId: string
): Promise<EnforcementCheckResult | null> {
  return checkEnforcementForIssue(issueId, "close_issue");
}

/**
 * Quick check if evidence can be deleted.
 * Returns enforcement result with reason.
 */
export async function canDeleteEvidence(
  issueId: string
): Promise<EnforcementCheckResult | null> {
  return checkEnforcementForIssue(issueId, "delete_evidence");
}

/**
 * Quick check if comms can be deleted.
 * Returns enforcement result with reason.
 */
export async function canDeleteComms(
  issueId: string
): Promise<EnforcementCheckResult | null> {
  return checkEnforcementForIssue(issueId, "delete_comms");
}

/**
 * Quick check if pack can be generated.
 * Uses overall case health.
 */
export async function canGeneratePack(): Promise<EnforcementCheckResult | null> {
  return checkEnforcementForCase("generate_pack");
}
